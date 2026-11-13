import {STAFF_FIELDS,YEARS} from './data.js';
import {transferSourceScope} from './transfer-data.mjs';

const staffText=value=>String(value??'').trim();
const staffDigits=value=>staffText(value).replace(/[٠-٩۰-۹]/g,char=>String(char.charCodeAt(0)%16));
const staffKey=value=>staffDigits(value).normalize('NFKC').toLowerCase().replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}]/gu,'');
const staffIdentifier=value=>{
  const identifier=staffDigits(value);
  return /^(?:0+|[-—–]+)$/.test(identifier)?'':identifier;
};
const staffImportAliases={name:['اسم الموظف','اسم المعلم','الاسم'],national:['رقم وطني','رقم الهوية'],
  education:['رقم تعليمي'],financial:['رقم مالي'],shift:['الدوام'],year:['العام الدراسي']};

function staffImportDate(value) {
  const text=staffDigits(value);
  if(!text||/^0+(?:[/-]0+)*$/.test(text))return '';
  const parts=text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const iso=parts?parts[3]+'-'+parts[2].padStart(2,'0')+'-'+parts[1].padStart(2,'0'):
    /^\d{4,5}$/.test(text)?new Date(Date.UTC(1899,11,30)+Number(text)*86400000).toISOString().slice(0,10):text.replaceAll('/','-');
  const date=new Date(iso+'T00:00:00Z');
  return /^\d{4}-\d\d-\d\d$/.test(iso)&&Number.isFinite(+date)&&date.toISOString().slice(0,10)===iso?iso:text;
}

export function prepareStaffImport(staff,rows,{year,replace=false}) {
  if(!YEARS.includes(year))throw new Error('اختر سنة دراسية صالحة.');
  const [header,...records]=rows;
  const keys=Array.from(header||[],staffKey);
  const mapping=STAFF_FIELDS.map(([key,label,type])=>{
    const labels=[label,...(staffImportAliases[key]||[])].map(staffKey);
    return {key,type,column:keys.findIndex(value=>labels.includes(value))};
  }).filter(({column})=>column>=0);
  if(!mapping.some(({key})=>key==='name'))throw new Error('يلزم وجود عمود الاسم الكامل في كشف الموظفين.');
  const identifiers=['national','education','financial'];
  const identityKeys=row=>identifiers.flatMap(key=>{
    const value=staffIdentifier(row[key]);
    return value?[row.year+'|'+key+'|'+value]:[];
  });
  const existing=new Map(), ambiguous=new Set(), seen=new Set();
  for(const row of staff)for(const key of identityKeys(row)){
    if(existing.has(key)&&existing.get(key)!==row)ambiguous.add(key);
    existing.set(key,row);
  }
  const changes=[], summary={total:0,added:0,updated:0,skipped:0,errors:[]};
  for(const [index,cells] of records.entries()){
    if(!cells.some(value=>staffText(value)))continue;
    summary.total++;
    const input=Object.fromEntries(mapping.map(({key,type,column})=>{
      const value=staffText(cells[column]);
      return [key,type==='checkbox'?['1','نعم','true','yes'].includes(staffKey(value)):
        type==='date'?staffImportDate(value):identifiers.includes(key)?staffIdentifier(value):value];
    }));
    try{
      if(!input.name)throw new Error('أدخل اسم الموظف.');
      if(input.name.length>180)throw new Error('اسم الموظف أطول من 180 حرفًا.');
      const fileYear=transferSourceScope({year:input.year}).year;
      if(input.year&&!fileYear)throw new Error('السنة الدراسية في الملف غير صالحة.');
      input.year=fileYear||year;
      if(input.national&&!/^\d{12}$/.test(input.national))throw new Error('تحقق من الرقم الوطني أو اتركه فارغًا.');
      const identities=identityKeys(input);
      if(identities.some(key=>ambiguous.has(key)))throw new Error('يوجد معرّف مكرر في سجلات الموظفين الحالية.');
      const matches=new Set(identities.map(key=>existing.get(key)).filter(Boolean));
      if(matches.size>1)throw new Error('تشير أرقام الموظف إلى سجلات مختلفة.');
      const prior=[...matches][0];
      if(prior&&identifiers.some(key=>staffIdentifier(prior[key])&&input[key]&&staffIdentifier(prior[key])!==input[key]))
        throw new Error('تتعارض معرّفات الموظف مع السجل الموجود.');
      const rowKeys=[...identities,...(prior?['id|'+prior.id]:[])];
      if(rowKeys.some(key=>seen.has(key)))throw new Error('تكرر الموظف في الملف.');
      rowKeys.forEach(key=>seen.add(key));
      if(prior&&!replace){summary.skipped++;continue;}
      const row={...prior,...Object.fromEntries(Object.entries(input).filter(([,value])=>value!==''))};
      if(!['صباحية','مسائية'].includes(row.shift))throw new Error('حدد الفترة الصباحية أو المسائية.');
      if(prior&&Object.keys(row).every(key=>row[key]===prior[key])){summary.skipped++;continue;}
      changes.push({id:prior?.id||'',row});
      summary[prior?'updated':'added']++;
    }catch(error){summary.errors.push({line:index+2,reason:error.message});}
  }
  if(!summary.total)throw new Error('الملف لا يحتوي على سجلات موظفين.');
  return {changes,summary};
}

export function applyStaffImport(staff,plan,createId) {
  if(plan.summary.errors.length)throw new Error('صحح الصفوف المبينة في معاينة استيراد الموظفين.');
  const byId=new Map(staff.map(row=>[row.id,row]));
  for(const {id,row} of plan.changes){
    if(id)Object.assign(byId.get(id),row);
    else staff.push({...row,id:createId(),created:Date.now()});
  }
}
