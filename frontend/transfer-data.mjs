import {CLASSES,SECTIONS,STUDENT_EXPORT,YEARS,gradePlan,routeForClass} from './data.js';
import {gradeRouteAccepts,setGradeMark,validatedGrade} from './policy.mjs';

const TRANSFER_MAX_ROWS=5000, TRANSFER_MAX_COLUMNS=96;
const transferText=value=>String(value??'').trim();
const transferDigits=value=>transferText(value).replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,'').trim().replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)%16));
const transferKey=value=>transferDigits(value).normalize('NFKC').toLowerCase().replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي')
  .replace(/ة/g,'ه').replace(/[\u064b-\u065f\u0670ـ]/g,'').replace(/[^\p{L}\p{N}]+/gu,'');
const transferReg=value=>transferDigits(transferText(value).normalize('NFKC')).toLowerCase();
const transferNumericReg=value=>/^\d+$/.test(value)?value.replace(/^0+(?=\d)/,''):'';
const transferNational=value=>{
  const digits=transferDigits(value);
  return /^\d{12}$/.test(digits)?digits:'';
};
const transferScopedStream=cls=>['الثاني ثانوي','الثالث ثانوي'].includes(cls);
const transferKinds=[['students','بيانات الطلبة'],['grades','درجات أعمال السنة والامتحان'],['activities','تقديرات النشاط والغياب']];
const transferAliases={
  reg:['رقم القيد','رقم قيد الطالب','رقم التسجيل','رقم تسجيل الطالب','رقم الطالب','رقم قيد','قيد الطالب','الرقم المدرسي','رقم الملف','رقم دراسي','رقم التلميذ','reg','registration no','registration number','student number'],
  national:['الرقم الوطني','رقم وطني','الرقم الوطني للطالب','الرقم الوطني للتلميذ','رقم الهوية الوطنية','national id','national number'],
  name:['الاسم','اسم الطالب','اسم التلميذ','اسم التلميذ / الطالب','اسم الطالبة','اسم الطالب الكامل','اسم الطالب رباعي','الاسم رباعي','الاسم الرباعي','اسم الطالب بالكامل','اسم الطالب رباعياً','الاسم الكامل','الاسم الثلاثي','student name','full name','name'],
  mother:['اسم الأم','الاسم الكامل للأم','اسم والدة الطالب','mother name'],
  nation:['الجنسية','جنسية الطالب','nationality'],
  gender:['الجنس','النوع','جنس الطالب','نوع الجنس','gender','sex'],
  birth:['تاريخ الميلاد','الميلاد','تاريخ ميلاد الطالب','تاريخ الولادة','date of birth','birth date','dob'],
  cls:['الصف','الصف الدراسي','المستوى الدراسي','المرحلة الدراسية','مرحلة الطالب','صف الطالب','grade level','class level','class'],
  section:['الفصل','الشعبة','فصل الطالب','الفصل الدراسي للطالب','الفصل / الشعبة','الشعبة الدراسية','section','class section'],
  stream:['التخصص','القسم','الشعبة العلمية','المسار','track','stream'],
  phone:['رقم هاتف ولي الأمر','هاتف ولي الأمر','رقم هاتف الوالد','هاتف الوالد','هاتف الطالب','رقم الهاتف','phone','guardian phone']
};
const transferClassAliases=CLASSES.map((cls,i)=>{
  if(i<2)return [cls,['تمهيدي '+(i+1),'روضة '+(i+1),'رياض أطفال '+(i+1),'kg'+(i+1)]];
  const ordinal=cls.split(' ')[0], variant=['أول','ثاني','ثالث','رابع','خامس','سادس','سابع','ثامن','تاسع'][i-2];
  return [cls,i<11?[String(i-1),'الصف '+ordinal,ordinal+' أساسي','الصف '+ordinal+' أساسي',variant,variant+' أساسي',i-1+' أساسي']:
    [i-10+' ثانوي','الصف '+cls,ordinal+' الثانوي','الصف '+ordinal+' الثانوي',['أول','ثاني','ثالث'][i-11]+' ثانوي']];
});
const transferClassNames=new Map(transferClassAliases.flatMap(([cls,aliases])=>[cls,...aliases].map(alias=>[transferKey(alias),cls])));
const transferClass=value=>transferClassNames.get(transferKey(value))||transferText(value);
const transferYear=value=>{
  const year=transferDigits(value).match(/^(20\d{2})\s*[-–/]\s*(20\d{2})$/);
  return year?year.slice(1).sort().join('-'):'';
};
export function transferSourceScope(source) {
  const year=transferYear(source?.year), cls=transferClass(source?.cls), section=transferSection(source?.section), stream=transferStream(source?.stream);
  return {year:YEARS.includes(year)?year:'',cls:CLASSES.includes(cls)?cls:'',section:SECTIONS.includes(section)?section:'',
    stream:transferScopedStream(cls)&&['علمي','أدبي'].includes(stream)?stream:''};
}
function transferWorkbookScope(table) {
  const keys=table.headers.map(transferKey);
  const columns=[
    ['year',['السنة الدراسية','العام الدراسي'],transferYear],
    ['cls',transferAliases.cls,transferClass],
    ['section',transferAliases.section,transferSection],
    ['stream',transferAliases.stream,transferStream]
  ];
  return Object.fromEntries(columns.flatMap(([key,aliases,normalize])=>{
    const indexes=aliases.map(transferKey);
    const matches=keys.flatMap((header,index)=>indexes.includes(header)?[index]:[]);
    if(matches.length!==1)return [];
    const values=new Set(table.rows.map(row=>normalize(row[matches[0]])).filter(Boolean));
    return values.size===1?[[key,[...values][0]]]:[];
  }));
}
function transferWorkbookKind(headers) {
  const keys=headers.map(transferKey);
  if(keys.some(key=>/اعمال|امتحان|درجات|مجموعالفصلاول|مجموعالفصلالاول/.test(key)))return 'grades';
  if(keys.some(key=>/غيابمشروع|غيابغيرمشروع|تقديراتالنشاط/.test(key)))return 'activities';
  if(keys.some(key=>/^(?:الجنس|الجنسية|الجنسيه|اسمالام|تاريخالميلاد|اسمالوالده)$/.test(key)))return 'students';
  return '';
}
const transferGender=value=>({
  ذكر:'ذكر',ذكور:'ذكر',طالب:'ذكر',ولد:'ذكر',male:'ذكر',m:'ذكر',
  انثي:'أنثى',انث:'أنثى',اناث:'أنثى',طالبه:'أنثى',بنت:'أنثى',female:'أنثى',f:'أنثى'
})[transferKey(value)]||transferText(value);
const transferStream=value=>({
  علمي:'علمي',العلمي:'علمي',قسمعلمي:'علمي',القسمالعلمي:'علمي',science:'علمي',
  ادبي:'أدبي',الادبي:'أدبي',قسمادبي:'أدبي',القسمالادبي:'أدبي',literary:'أدبي'
})[transferKey(value)]||transferText(value);
const transferSection=value=>{
  const text=transferDigits(value), key=transferKey(text);
  const numbered=key.match(/^(?:(?:الفصل|فصل|الشعبه|شعبه))?(10|[1-9])$/);
  return numbered?'الفصل '+numbered[1]:text;
};
function transferBirth(value) {
  const text=transferDigits(value);
  if(!text)return '';
  const dmy=text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const ymd=text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  const iso=dmy?[dmy[3],dmy[2].padStart(2,'0'),dmy[1].padStart(2,'0')].join('-'):
    ymd?[ymd[1],ymd[2].padStart(2,'0'),ymd[3].padStart(2,'0')].join('-'):
    /^\d{4,5}$/.test(text)?new Date(Date.UTC(1899,11,30)+Number(text)*86400000).toISOString().slice(0,10):text;
  const time=Date.parse(iso+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)||!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==iso)
    throw new Error('تاريخ الميلاد غير صالح.');
  return iso;
}
export function transferTable(raw) {
  if(!Array.isArray(raw?.headers)||!Array.isArray(raw.rows)||raw.headers.length<2||raw.headers.length>TRANSFER_MAX_COLUMNS||
    !raw.rows.length||raw.rows.length>TRANSFER_MAX_ROWS)throw new Error('يلزم جدول من عمودين على الأقل وبحد أقصى 5000 سجل و96 عمودًا.');
  let size=0;
  const cell=value=>{
    if(value!=null&&!['string','number','boolean'].includes(typeof value))throw new Error('توجد خلية غير صالحة.');
    const text=transferText(value);
    size+=text.length;
    if(text.length>4096||size>2_500_000)throw new Error('الكشف كبير. قسّمه إلى ملفات أصغر.');
    return text;
  };
  const headers=Array.from(raw.headers,(value,i)=>cell(value)||'العمود '+(i+1));
  const rows=raw.rows.map(row=>{
    if(!Array.isArray(row)||row.length>headers.length)throw new Error('عدد الأعمدة في أحد الصفوف أكبر من عدد العناوين.');
    return Array.from(headers,(_,i)=>cell(row[i]));
  });
  if(!rows.some(row=>row.some(Boolean)))throw new Error('الكشف لا يحتوي على سجلات.');
  return {headers,rows};
}
export function transferDelimited(text,extension='') {
  const first=text.replace(/^\s*\r?\n/gm,'').split(/\r?\n/,1)[0];
  const separators=[',',';','\t'];
  const counts=separators.map(()=>0);
  let quoted=false;
  for(const ch of first){
    if(ch==='"')quoted=!quoted;
    else if(!quoted&&separators.includes(ch))counts[separators.indexOf(ch)]++;
  }
  const delimiter=extension==='tsv'?'\t':separators[counts.indexOf(Math.max(...counts))];
  const rows=[];
  let row=[], cell='';
  quoted=false;
  const nextRow=()=>{
    row.push(cell);
    if(row.some(value=>value.trim()))rows.push(row);
    if(rows.length>TRANSFER_MAX_ROWS+1)throw new Error('يدعم الاستيراد 5000 سجل في العملية الواحدة.');
    row=[];cell='';
  };
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){
      if(ch!=='"')cell+=ch;
      else if(text[i+1]==='"'){cell+='"';i++;}
      else quoted=false;
    }else if(ch==='"'&&!cell)quoted=true;
    else if(ch===delimiter){row.push(cell);cell='';}
    else if(ch==='\r'||ch==='\n'){if(ch==='\r'&&text[i+1]==='\n')i++;nextRow();}
    else cell+=ch;
  }
  if(quoted)throw new Error('علامات الاقتباس في الملف غير مكتملة.');
  nextRow();
  const headers=rows.shift()||[];
  return transferTable({headers,rows});
}
function transferScope(raw,withMap=false) {
  const {kind,year}=raw||{}, cls=transferText(raw?.cls), section=transferText(raw?.section);
  if(!transferKinds.some(([key])=>key===kind)||!YEARS.includes(year))throw new Error('اختر نوع الكشف والسنة الدراسية.');
  if((kind!=='students'||cls)&&!CLASSES.includes(cls))throw new Error('اختر الصف الدراسي.');
  if(section&&!SECTIONS.includes(section))throw new Error('اختر الفصل من القائمة.');
  if(kind==='activities'&&!gradeRouteAccepts('add_activity_grades',cls,year))throw new Error('اختر صفًا يدعم تقديرات النشاط.');
  const stream=transferScopedStream(cls)?transferText(raw.stream):'';
  if(kind!=='students'&&transferScopedStream(cls)&&!['علمي','أدبي'].includes(stream))throw new Error('اختر التخصص.');
  if(stream&&!['علمي','أدبي'].includes(stream))throw new Error('التخصص غير صالح.');
  return {kind,year,cls,section,stream,replace:raw.replace===true,matchUnassigned:kind!=='students'&&Boolean(section)&&raw.matchUnassigned===true,
    convertScale:kind==='grades'&&raw.convertScale===true,...(withMap?{mapping:raw.mapping}:{}),
    source:kind==='activities'?'add_activity_grades':routeForClass(cls)};
}
const transferGradeColumnKey=value=>transferKey(transferDigits(value)
  .replace(/(^|\s)(?:درجة|درجات)\s+(?=(?:ال)?(?:أعمال|اختبار|امتحان))/g,'$1')
  .replace(/(^|\s)ال(أعمال|أختبار|اختبار|امتحان)(?=\s|$)/g,'$1$2'));
function transferGradeHeader(value) {
  const text=transferDigits(value).normalize('NFKC');
  const max=text.match(/\s*(?:[(/|]\s*(?:(?:من|الدرجة الكبرى|الدرجة العظمى|النهاية الكبرى|النهاية العظمى)\s*[:：]?\s*)?|(?:من|الدرجة الكبرى|الدرجة العظمى|النهاية الكبرى|النهاية العظمى)\s+)(\d+(?:[.,٫]\d+)?)\s*\)?\s*$/);
  const name=max?text.slice(0,max.index).trim():text;
  const total=/(?:مجموع|اجمالي|اجماليه|حصيله|محصله|total)/.test(transferKey(name));
  const maximum=max?Number(max[1].replace(/[,٫]/g,'.')):null;
  return {name,total,maximum:maximum>0?maximum:null};
}
export function transferFields(scope) {
  if(scope.kind==='students')return STUDENT_EXPORT.map(([key,label])=>({key,label,aliases:transferAliases[key]}));
  const identity=['reg','national','name'].map(key=>({key,label:STUDENT_EXPORT.find(x=>x[0]===key)[1],aliases:transferAliases[key]}));
  if(!CLASSES.includes(scope.cls))return identity;
  const plan=gradePlan(scope.kind==='activities'?'add_activity_grades':routeForClass(scope.cls),scope.cls,scope.stream,scope.year);
  const alternateSubjects={
    q:['القرآن'],i:['الإسلامية','التربية الدينية'],a:['العربية','اللغة العربية','اللغة العربية (النحو والقراءة والنصوص)','النحو والقراءة والنصوص'],e:['الإنجليزية','اللغة الإنكليزية'],
    w:['الكتابة','التعبير والإملاء والخط','اللغة العربية (الكتابة)'],
    g:['الاجتماعيات','المواد الاجتماعية'],u:['علم النفس','التربية وعلم النفس'],
    m:['رياضيات'],b:['الأحياء'],p:['فيزياء','الفيزياء (الحرارية والميكانيكا)','الفيزياء (الكهرباء والميكانيكا)'],k:['كيمياء'],ar:['الفنية'],mu:['الموسيقية'],sp:['البدنية']
  };
  const terms=plan.components.map((component,index)=>{
    const names=[component];
    if(plan.components.length===4){
      const term=index<2?'الأول':'الثاني', number=index<2?1:2;
      const labels=index%2?['امتحان','اختبار','امتحان نهاية','اختبار نهاية']:['أعمال','أعمال سنة','أعمال السنة'];
      for(const termName of ['الفصل '+term,'الفصل الدراسي '+term,'فصل '+term,'الفصل '+number,'الفصل الدراسي '+number])
        for(const label of labels)names.push(label+' '+termName,termName+' '+label);
    }else if(plan.certificate&&index===2){
      names.push('امتحان نهاية السنة','امتحان نهاية العام الدراسي','الامتحان النهائي','الامتحان الختامي','الفترة الثالثة','امتحان الفترة الثالثة');
    }else if(/فترة/.test(component)){
      const ordinal=['الأولى','الثانية','الثالثة'][index];
      names.push('الفترة '+ordinal,'فترة '+(index+1),'أعمال الفترة '+ordinal,'أعمال فترة '+(index+1));
    }else if(scope.kind==='activities')names.push(index===0?'الفصل الدراسي الأول':'الفصل الدراسي الثاني');
    return names;
  });
  const marks=plan.items.flatMap(item=>plan.components.map((component,index)=>({
    key:item.key+'|'+index,label:item.label+' / '+component,item,index,
    aliases:[item.label,...(alternateSubjects[item.key]||[])].flatMap(subject=>terms[index].flatMap(label=>[subject+' / '+label,label+' / '+subject]))
  })));
  return identity.concat(marks);
}
export function transferSuggestedMapping(headers,fields) {
  const keys=fields.map(field=>[field,new Set([field.label,...(field.aliases||[])].map(field.item?transferGradeColumnKey:transferKey))]);
  const matched=headers.map(label=>{
    const {name,total}=transferGradeHeader(label);
    const parts=name.split(/\s*[/|›»]\s*/).filter(Boolean);
    const combinations=new Set(parts.map((part,i)=>transferGradeColumnKey([part,...parts.filter((_,index)=>i!==index)].join(' '))));
    return keys.filter(([field,aliases])=>field.item?
      !total&&[...combinations].some(key=>aliases.has(key)):aliases.has(transferKey(label))).map(([field])=>field.key);
  });
  return matched.map(list=>list.length===1&&matched.filter(row=>row.length===1&&row[0]===list[0]).length===1?list[0]:'');
}
function transferStudentRecord(values,prior,scope) {
  const limits={reg:45,name:180,mother:180,nation:100,gender:16,birth:30,cls:60,section:32,stream:30,phone:10};
  const record=Object.fromEntries(STUDENT_EXPORT.map(([key])=>[key,transferText(values[key]||prior?.[key]||
    (key==='cls'?scope.cls:key==='section'?scope.section:key==='stream'?scope.stream:''))]));
  for(const key of ['reg','phone'])record[key]=transferDigits(record[key]);
  record.national=values.national||transferNational(prior?.national);
  record.cls=transferClass(record.cls);
  record.gender=transferGender(record.gender);
  record.section=transferSection(record.section);
  record.stream=transferScopedStream(record.cls)?transferStream(record.stream):'';
  record.birth=transferBirth(record.birth);
  if(!record.reg||!record.name)throw new Error('أكمل رقم القيد واسم الطالب.');
  if(!CLASSES.includes(record.cls))throw new Error('اختر الصف الدراسي في بيانات المدرسة المستقبلة أو طابق عمود الصف.');
  if(record.gender&&!['ذكر','أنثى'].includes(record.gender))throw new Error('قيمة الجنس غير معروفة.');
  if(record.phone&&!/^09\d{8}$/.test(record.phone))throw new Error('هاتف ولي الأمر يجب أن يبدأ بـ09 ويتكون من 10 أرقام.');
  if(record.section&&!SECTIONS.includes(record.section))throw new Error('الفصل غير معروف. اختر رقمًا من 1 إلى 10.');
  if(transferScopedStream(record.cls)&&!['علمي','أدبي'].includes(record.stream))throw new Error('حدد التخصص العلمي أو الأدبي.');
  if(Object.entries(limits).some(([key,n])=>record[key].length>n))throw new Error('إحدى القيم أطول من الحد المسموح.');
  return {...record,year:scope.year};
}
function transferMatchingStudent(byReg,byNational,reg,national,byNumericReg) {
  const regKey=transferReg(reg), numeric=transferNumericReg(regKey);
  const exact=reg&&byReg.get(regKey), one=exact??(numeric&&byNumericReg?.get(numeric)), two=national&&byNational.get(national);
  if(one===false||two===false)throw new Error('المعرّف مكرر في سجلات السنة المحددة.');
  const storedNational=transferNational(one?.national);
  if(one&&two&&one.id!==two.id||storedNational&&national&&storedNational!==national)
    throw new Error('رقم القيد والرقم الوطني يشيران إلى سجلين مختلفين.');
  return one||two||null;
}
function transferStudentIndex(students,field) {
  const index=new Map();
  for(const student of students){
    const id=field(student);
    if(id)index.set(id,index.has(id)?false:student);
  }
  return index;
}
function transferGradeStudent(student,scope,reg,national,otherYears) {
  if(!student){
    const numeric=transferNumericReg(transferReg(reg));
    const years=[...new Set([...(otherYears.get('reg:'+transferReg(reg))||[]),...(otherYears.get('numeric:'+numeric)||[]),
      ...(otherYears.get('national:'+national)||[])])].sort();
    if(years.length)return {reason:'الطالب مسجّل في سنة دراسية أخرى.',detail:'السنة المطلوبة '+scope.year+' · السنوات المسجّلة '+years.join('، ')};
    return {reason:'معرّف الطالب غير موجود في سجلات المدرسة.',detail:'استورد بيانات الطالب للسنة '+scope.year+' أولًا.'};
  }
  if(student.cls!==scope.cls||scope.stream&&student.stream!==scope.stream)
    return {reason:'الصف أو التخصص في سجل الطالب يختلف عن الكشف.',detail:'السجل: '+[student.cls,student.stream].filter(Boolean).join(' · ')+' / الكشف: '+[scope.cls,scope.stream].filter(Boolean).join(' · ')};
  if(!scope.section||student.section===scope.section)return null;
  if(!student.section)return scope.matchUnassigned?null:{reason:'لم يُحدد فصل للطالب في سجل المدرسة.',detail:'عيّن فصل الطالب أو فعّل مطابقة الطلبة الذين لم يُحدد فصلهم.'};
  return {reason:'الطالب مسجّل في فصل آخر.',detail:'السجل: '+student.section+' / الكشف: '+scope.section};
}
function transferGradeValue(raw,field,header,convertScale) {
  const text=transferDigits(raw);
  if(field.item.choices)return {value:validatedGrade(field.item.choices.find(choice=>transferKey(choice)===transferKey(text))||text,field.item,field.index)};
  if(header.total)throw new Error('عمود المجموع لا يطابق خانة رصد منفردة.');
  const upper=field.item.max[field.index], normalized=text.replace(/[٫,]/g,'.');
  const fraction=normalized.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  const value=fraction?fraction[1]:normalized, maximum=fraction?Number(fraction[2]):header.maximum;
  if(fraction&&header.maximum!==null&&maximum!==header.maximum)throw new Error('الدرجة الكبرى في الخلية تخالف عنوان العمود.');
  if(maximum!==null&&maximum!==upper){
    if(!convertScale)throw new Error('الدرجة الكبرى في المصدر '+maximum+'، وفي خانة الرصد '+upper+'.');
    if(maximum<=0||!/^\d+(?:\.\d+)?$/.test(value)||Number(value)>maximum)
      throw new Error('الدرجة خارج سلم المصدر من 0 إلى '+maximum+'.');
    return {value:validatedGrade(String(Math.round(Number(value)/maximum*upper*10)/10),field.item,field.index),converted:maximum};
  }
  return {value:validatedGrade(value,field.item,field.index)};
}
export function prepareDataTransfer(school,rawTable,rawScope,pendingIds=new Set()) {
  const table=transferTable(rawTable), scope=transferScope(rawScope,true), fields=transferFields(scope);
  const byField=new Map(fields.map(field=>[field.key,field]));
  const mapping=scope.mapping;
  if(!Array.isArray(mapping)||mapping.length!==table.headers.length||mapping.some(k=>k!==''&&!byField.has(k)))
    throw new Error('اختر الحقول المقابلة لأعمدة الكشف.');
  const chosen=mapping.filter(Boolean);
  if(new Set(chosen).size!==chosen.length)throw new Error('اربط كل حقل بعمود واحد فقط.');
  const studentsMode=scope.kind==='students';
  const gradeFields=chosen.filter(k=>byField.get(k).item);
  const gradeHeaders=new Map(mapping.flatMap((key,i)=>byField.get(key)?.item?[[key,transferGradeHeader(table.headers[i])]]:[]));
  if(!chosen.includes('reg')&&!chosen.includes('national')||!studentsMode&&!gradeFields.length)
    throw new Error(studentsMode?'اربط عمود رقم القيد أو الرقم الوطني.':'اربط معرّف الطالب وعمودًا واحدًا للدرجات على الأقل.');
  if(!studentsMode&&gradeFields.some(key=>gradeHeaders.get(key).total))throw new Error('ألغِ مطابقة أعمدة المجاميع مع خانات الرصد.');
  const roster=school.students.filter(row=>row.year===scope.year);
  const byReg=transferStudentIndex(roster,row=>transferReg(row.reg));
  const byNational=transferStudentIndex(roster,row=>transferNational(row.national));
  const byNumericReg=studentsMode?null:transferStudentIndex(roster,row=>transferNumericReg(transferReg(row.reg)));
  const otherYears=new Map();
  if(!studentsMode)for(const row of school.students){
    if(row.year===scope.year)continue;
    const reg=transferReg(row.reg), national=transferNational(row.national);
    const numeric=transferNumericReg(reg);
    for(const key of [reg&&'reg:'+reg,numeric&&'numeric:'+numeric,national&&'national:'+national].filter(Boolean)){
      if(!otherYears.has(key))otherYears.set(key,new Set());
      otherYears.get(key).add(row.year);
    }
  }
  const seen=new Set(), changes=[], entries=[];
  const counters={added:0,updated:0,grades:0,skipped:0,existingMarks:0,ignoredNational:0,missingGender:0,converted:0,unassigned:0,errors:0};
  for(const [index,row] of table.rows.entries()){
    if(!row.some(Boolean))continue;
    const values=Object.fromEntries(mapping.flatMap((key,i)=>key?[[key,row[i]]]:[]));
    const reg=transferDigits(values.reg), national=transferNational(values.national);
    if(values.national&&!national)counters.ignoredNational++;
    values.national=national;
    const item={line:index+2,id:reg||national||'—',name:values.name||'',message:''};
    try{
      if(!reg&&!national)throw new Error('أدخل رقم القيد عند غياب رقم وطني كامل.');
      const student=transferMatchingStudent(byReg,byNational,reg,national,byNumericReg);
      if(student?.archive)throw new Error('الطالب في الأرشيف.');
      const numeric=transferNumericReg(transferReg(reg));
      if(!studentsMode&&student&&reg&&transferReg(student.reg)!==transferReg(reg)&&(!numeric||byNumericReg.get(numeric)?.id!==student.id))
        throw new Error('رقم القيد لا يطابق سجل صاحب الرقم الوطني.');
      const identities=[student&&'student:'+student.id,reg&&'reg:'+transferReg(reg),national&&'national:'+national].filter(Boolean);
      if(identities.some(id=>seen.has(id)))throw new Error('تكرر الطالب داخل الكشف.');
      for(const id of identities)seen.add(id);
      item.name ||= student?.name||'';
      if(studentsMode){
        if(student&&!scope.replace){counters.skipped++;item.message='موجود مسبقًا';}
        else {
          if(student&&pendingIds.has(student.id))throw new Error('السجل مرتبط بطلب نقل قيد المراجعة.');
          const record=transferStudentRecord(values,student,scope);
          if(student&&(student.cls!==record.cls||(student.stream||'')!==record.stream)&&Object.keys(school.grades[student.id]||{}).length)
            throw new Error('الطالب مرتبط بدرجات في صفه الحالي.');
          const before=student&&Object.fromEntries(Object.keys(record).map(key=>[key,student[key]??'']));
          if(before&&JSON.stringify(before)===JSON.stringify(record)){
            counters.skipped++;item.message='مطابق';
          }else {
            changes.push({id:student?.id||'',record,before});
            if(!record.gender)counters.missingGender++;
            if(student){counters.updated++;item.message='تحديث بيانات';}
            else {counters.added++;item.message='إضافة طالب';}
          }
        }
      }else{
        const mismatch=transferGradeStudent(student,scope,reg,national,otherYears);
        if(mismatch){item.detail=mismatch.detail;throw new Error(mismatch.reason);}
        const marks=[], issues=[];
        let preserved=0;
        for(const key of gradeFields){
          if(!values[key]||/^[—–-]$/.test(values[key]))continue;
          const field=byField.get(key), header=gradeHeaders.get(key);
          let grade;
          try{grade=transferGradeValue(values[key],field,header,scope.convertScale);}
          catch(error){
            issues.push({reason:field.label+' · '+error.message,detail:header.name.slice(0,100)+' = '+values[key].slice(0,50)});
            continue;
          }
          const before=school.grades[student.id]?.[scope.source+'|'+key]??'';
          if(String(before)===String(grade.value))continue;
          if(before!==''&&!scope.replace){preserved++;continue;}
          marks.push({subject:field.item.key,index:field.index,...grade,before});
        }
        if(issues.length){
          item.reasons=issues.map(issue=>issue.reason);
          item.detail=issues.slice(0,4).map(issue=>issue.reason+' ('+issue.detail+')').join('، ');
          if(issues.length>4)item.detail+=' · '+(issues.length-4)+' مشكلات أخرى';
          throw new Error('توجد درجات تحتاج مراجعة.');
        }
        counters.existingMarks+=preserved;
        if(marks.length){
          changes.push({id:student.id,source:scope.source,marks});
          counters.grades+=marks.length;
          counters.converted+=marks.filter(mark=>mark.converted).length;
          if(scope.section&&!student.section)counters.unassigned++;
          item.message=marks.length+' درجة للحفظ'+(preserved?' · '+preserved+' محفوظة سابقًا':'');
          item.detail=marks.map(mark=>{
            const field=byField.get(mark.subject+'|'+mark.index);
            return field.label+' · '+(mark.before===''?'فارغ':mark.before)+' ← '+mark.value+
              (mark.converted?' (من سلم '+mark.converted+' إلى '+field.item.max[mark.index]+')':'');
          }).join('، ');
        }else {counters.skipped++;item.message=preserved?'الدرجات محفوظة سابقًا':'لا تغييرات';}
      }
    }catch(error){counters.errors++;item.error=true;item.message=error.message;}
    entries.push(item);
  }
  const errors=new Map();
  for(const entry of entries)if(entry.error)for(const reason of new Set(entry.reasons||[entry.message]))
    errors.set(reason,(errors.get(reason)||0)+1);
  const eligible=entries.filter(entry=>!entry.error).slice(0,18);
  const issues=entries.filter(row=>row.error).slice(0,30).map(({reasons,...entry})=>entry);
  return {changes,scope,summary:{total:entries.length,...counters,errorCounts:[...errors],examples:eligible,issues}};
}
export function applyDataTransfer(school,plan,createId,validOnly=false) {
  if(plan.summary.errors&&(!validOnly||plan.scope.kind==='students'))throw new Error('راجع صفوف الكشف المبينة في المعاينة قبل الحفظ.');
  if(!plan.changes.length)throw new Error('لا توجد تغييرات للحفظ.');
  const students=new Map(school.students.map(row=>[row.id,row]));
  for(const change of plan.changes){
    if(change.record){
      if(change.id)Object.assign(students.get(change.id),change.record);
      else school.students.push({...change.record,id:createId(),created:Date.now()});
    }else for(const mark of change.marks)setGradeMark(school,students.get(change.id),change.source,mark.subject,mark.index,mark.value);
  }
}
export function exportDataTransfer(school,rawScope) {
  const scope=transferScope(rawScope), fields=transferFields(scope);
  const rows=school.students.filter(student=>!student.archive&&student.year===scope.year&&(!scope.cls||student.cls===scope.cls)&&
    (!scope.section||student.section===scope.section)&&(!scope.stream||student.stream===scope.stream));
  rows.sort((a,b)=>CLASSES.indexOf(a.cls)-CLASSES.indexOf(b.cls)||a.name.localeCompare(b.name,'ar'));
  const scopeFields=[['year','السنة الدراسية'],...(scope.kind==='students'?[]:[['cls','الصف'],['section','الفصل'],['stream','التخصص']])];
  return {headers:[...fields.map(field=>field.label),...scopeFields.map(([,label])=>label)],rows:rows.map(student=>[
    ...fields.map(({key,item})=>item?school.grades[student.id]?.[scope.source+'|'+key]??'':student[key]??''),
    ...scopeFields.map(([key])=>student[key]??'')
  ])};
}
