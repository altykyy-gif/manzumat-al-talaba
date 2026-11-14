const staffColumns=[['name','الاسم'],['job','الوظيفة'],['shift','الفترة'],['national','الرقم الوطني'],['gender','الجنس'],['status','الحالة']];
function staffForm(staff={},compact=false) {
  const fields=STAFF_FIELDS.map(([key,label,type,required])=>[
    key,label,Array.isArray(type)&&staff[key]&&!type.includes(staff[key])?[...type,staff[key]]:
      type==='month'&&staff[key]&&!/^\d{4}-\d\d$/.test(staff[key])?'text':type,required
  ]);
  return `<form data-form="staff" data-id="${esc(staff.id||'')}" class="stack"><div class="${compact?'fields':'fields tight'}">${formFields(fields,staff)}</div>${submit('حفظ')}</form>`;
}
function validateStaff(staff,s,id='') {
  staff.national=digits(staff.national);
  if(!staff.name||!YEARS.includes(staff.year)||!['صباحية','مسائية'].includes(staff.shift))throw new Error('أكمل الاسم والسنة والفترة.');
  if(staff.national&&!/^\d{12}$/.test(staff.national))throw new Error('أدخل رقمًا وطنيًا من 12 رقمًا.');
  if(staff.national&&s.staff.some(x=>x.year===staff.year&&x.id!==id&&x.national===staff.national))throw new Error('الرقم الوطني مسجل بالفعل لهذه السنة.');
}
pages['add-staff']=()=>header('الموارد البشرية - إضافة معلم/موظف')+card(staffForm(),'بيانات الموظف')+`<div class="gap">${importCard('staff','الموظفين')}</div>`;
let staffWorkbook=null;
async function previewStaffWorkbook(data,form) {
  const schoolId=activeSchoolId, page=route, rows=await readExcel(data.file);
  if(!form.isConnected||schoolId!==activeSchoolId||page!==route)return;
  const settings={year:data.year,replace:Boolean(data.replace)};
  const plan=prepareStaffImport(school().staff,rows,settings);
  const {total,added,updated,skipped,errors}=plan.summary;
  staffWorkbook={schoolId,page,rows,settings,changes:plan.changes};
  const details=errors.length?table(['صف الكشف','المشكلة'],errors.slice(0,30).map(error=>[error.line,error.reason])):'';
  const save=!errors.length&&added+updated?`<form data-form="staff-import-apply">${submit('حفظ استيراد الموظفين')}</form>`:'';
  showDialog('معاينة استيراد الموظفين',`<div class="stack"><p>${total} سجل · ${added} إضافة · ${updated} تحديث · ${skipped} موجود مسبقًا · ${errors.length} خطأ</p>${details}${save}</div>`);
}
forms['staff-import-apply']=async()=>{
  const review=staffWorkbook;
  if(!review||review.schoolId!==activeSchoolId||review.page!==route)throw new Error('أعد معاينة الملف داخل المدرسة المختارة.');
  let summary;
  await update(s=>{
    const plan=prepareStaffImport(s.staff,review.rows,review.settings);
    if(JSON.stringify(plan.changes)!==JSON.stringify(review.changes))throw new Error('تغيّرت سجلات الموظفين. أعد معاينة الملف.');
    applyStaffImport(s.staff,plan,uid);
    summary=plan.summary;
  });
  staffWorkbook=null;
  $('#modal').close();render();flash('تم الاستيراد · '+summary.added+' إضافة · '+summary.updated+' تحديث.');
};
$('#modal').addEventListener('close',()=>{if(!$('#modal').open)staffWorkbook=null;});
actions['staff-edit']=id=>showDialog('تعديل بيانات الموظف',staffForm(lookup('staff',id),true));
forms.staff=async(data,form)=>{
  const id=form.dataset.id||uid(), row={...formText(data),id};
  for(const [key,,type] of STAFF_FIELDS)if(type==='checkbox')row[key]=Boolean(data[key]);
  await update(s=>{
    const existing=s.staff.find(x=>x.id===id);
    if(existing&&existing.year!==row.year)throw new Error('أنشئ سجلًا جديدًا إذا أردت تغيير السنة.');
    validateStaff(row,s,id);
    if(existing)Object.assign(existing,row);
    else s.staff.push({...row,created:Date.now()});
  });
  $('#modal').close();render();flash('حُفظت بيانات الموظف.');
};
function staffRows(f) {
  return onlyYear(school().staff,f.year).filter(s=>(!f.job||s.job===f.job)&&(!f.status||s.status===f.status)&&finds([s.name,s.education,s.national,s.financial,s.job,s.phone].join(' '),f.q)).sort((a,b)=>localeCompare(a.name,b.name));
}
pages['all-staff']=()=>{
  const f=filterData(route), page=paginate(route,staffRows(f),f), staff=onlyYear(school().staff,f.year);
  const jobs=[...new Set(staff.map(s=>s.job).filter(Boolean))], states=[...new Set(staff.map(s=>s.status).filter(Boolean))];
  return header('جميع الموظفين','قائمة بيانات العاملين',f.year)+card(filterForm(route,[FILTER_YEAR,['q','بحث','search'],['job','الوظيفة',jobs],['status','الحالة الوظيفية',states],FILTER_LIMIT],f))+
    `<div class="btns gap">${link('إضافة معلم/موظف','add-staff','green')}${btn('استيراد الموظفين','staff-import-dialog','','outline-blue')}${btn('تنزيل إكسل','staff-export')}${btn('أدوات الطباعة والتقارير','staff-report')}</div>${table(['#',...labelsFor(staffColumns),'إجراءات'],page.rows.map((s,i)=>{
      const reports=btn('التقارير','staff-row-reports',s.id,'tiny outline-blue').replace('<button ','<button aria-label="تقارير '+esc(s.name)+'" ');
      return [page.offset+i+1,...valuesFor(s,staffColumns),raw(`<div class="row-tools">${btn('تعديل','staff-edit',s.id,'tiny soft')}${reports}</div>`)];
    }))}${page.tools}`;
};
actions['staff-import-dialog']=()=>showDialog('استيراد الموظفين',importCard('staff','الموظفين',filterData(route).year));
actions['staff-export']=()=>downloadExcel('سجل العاملين',labelsFor(STAFF_FIELDS),staffRows(filterData(route)).map(s=>valuesFor(s,STAFF_FIELDS)));
const staffReports={
  roster:['كشف العاملين',['education','name','job','shift','status']],
  records:['كشف البيانات الوظيفية',['education','name','job','employment','appointed','decision','start','status']],
  financial:['كشف الأرقام المالية',['education','name','financial','job','grade','status']],
  qualifications:['كشف المؤهلات العلمية',['education','name','qualification','university','graduate','job']],
  contact:['كشف بيانات الاتصال',['education','name','job','phone','address']],
  continuity:['كشف استمرارية العمل',['education','name','job','shift','status']],
  stats:['إحصائية العاملين',[]]
};
function staffContinuityRows(rows) {
  return rows.filter(person=>['يعمل','مستمر','على رأس العمل','مباشر'].includes(person.status));
}
actions['staff-report']=kind=>{
  if(!Object.hasOwn(staffReports,kind))return showDialog('أدوات الطباعة والتقارير',staffReportMenu()+`<div class="report-buttons gap">${Object.entries(staffReports).map(([key,[label]])=>btn(label,'staff-report',key,'soft')).join('')}${btn('إفادة استمرارية العمل','staff-continuity','','soft')}${link('تقارير حضور وغياب الموظفين','staff-attendance','soft')}</div>`);
  const f=filterData(route), staff=staffRows(f), [title,keys]=staffReports[kind];
  if(kind==='stats'){
    const jobs=new Map();
    for(const person of staff){
      const job=person.job||'غير محدد';
      const counts=jobs.get(job)||[0,0,0];
      counts[person.gender==='ذكر'?0:person.gender==='أنثى'?1:2]++;
      jobs.set(job,counts);
    }
    const rows=[...jobs].sort(([a],[b])=>localeCompare(a,b)).map(([job,counts])=>[job,...counts,sum(counts)]);
    return schoolListReport(title,f.year,['الوظيفة','ذكور','إناث','غير محدد','المجموع'],[{rows}]);
  }
  const columns=keys.map(key=>STAFF_FIELDS.find(([name])=>name===key));
  const people=kind==='continuity'?staffContinuityRows(staff):staff;
  schoolListReport(title,f.year,['ر.م',...labelsFor(columns)],[{rows:people.map((person,index)=>[index+1,...valuesFor(person,columns)])}],
    {orientation:keys.length>5?'أفقي':'عمودي',fontSize:11,rowsPerPage:24});
};
actions['staff-continuity']=()=>{
  const people=staffContinuityRows(staffRows(filterData(route)));
  if(!people.length)throw new Error('لا يوجد موظف بحالة عمل مستمرة ضمن الاختيارات.');
  const choices=people.map(person=>[person.id,[person.name,person.education,person.job].filter(Boolean).join(' · ')]);
  showDialog('إفادة استمرارية العمل',`<form class="stack" data-form="staff-continuity"><div class="fields tight">
    ${field(['staff','الموظف',choices,true],people.length===1?people[0].id:'',{blank:'اختر الموظف'})}
    ${field(['date','تاريخ الإفادة','date',true],dayISO())}
    ${field(['recipient','الجهة الموجّه إليها','text'],'',{maxlength:160})}
    ${field(['reference','رقم الإشارة','text'],'',{maxlength:50})}</div>${submit('معاينة الإفادة')}</form>`);
};
forms['staff-continuity']=data=>{
  const staff=lookup('staff',data.staff);
  if(!staffContinuityRows([staff]).length)throw new Error('حالة الموظف في السجل لا تدل على استمرارية العمل.');
  const details=[['الاسم',staff.name],['الوظيفة',staff.job],['الحالة الوظيفية',staff.status],['السنة الدراسية',staff.year]];
  if(staff.education)details.splice(1,0,['الرقم التعليمي',staff.education]);
  if(staff.financial)details.splice(1,0,['الرقم المالي',staff.financial]);
  if(staff.start)details.push(['تاريخ المباشرة المسجل',staff.start]);
  continuityDocument('إفادة استمرارية العمل',staff.year,details,
    'تفيد إدارة المدرسة بأن الموظف الواردة بياناته أدناه مستمر في العمل لديها حسب سجلاتها للعام الدراسي الموضح.',data);
};
function parseMoney(value) {
  const input=digits(value);
  if(!/^\d{1,8}(\.\d{1,3})?$/.test(input))throw new Error('أدخل مبلغًا صحيحًا بثلاث خانات عشرية على الأكثر.');
  return Math.round(Number(input)*1000);
}
const amountField=(key,label,value='')=>field([key,label,'number',true],value,{min:0,step:.001});
function financeOf(s,schoolData=school()) {
  const tuition=schoolData.fees[yearKey(s.year,s.cls)]||0;
  const items=(schoolData.feeItems||[]).filter(row=>row.year===s.year&&(!row.cls||row.cls===s.cls));
  const carried=sum(Object.values(schoolData.carriedBalances?.[s.id]||{}));
  const gross=tuition+carried+sum(items.map(row=>row.amount));
  const discount=schoolData.discounts[s.id]||0;
  const net=Math.max(0,gross-discount);
  const paid=sum(schoolData.receipts.filter(r=>r.student===s.id&&!r.void).map(r=>r.amount));
  return {tuition,items,carried,gross,discount,net,paid,left:Math.max(0,net-paid),status:!gross?'بلا رسوم':paid>=net?'مسدد':paid?'سداد جزئي':'غير مسدد'};
}
const PAYMENT_HEADERS=['#','الطالب','الصف','الرسوم الأصلية','مجموع الأقساط','الخصم','الصافي بعد الخصم','المدفوع','المتبقي','الحالة'];
const payRows=(f)=>filterStudents(f).filter(s=>!f.status||financeOf(s).status===f.status);
const payValues=(s,i)=>{
  const a=financeOf(s);
  return [i+1,s.name,s.cls,money(a.gross),money(a.net),money(a.discount),money(a.net),money(a.paid),money(a.left),a.status];
};
pages.payments=()=>{
  const f=filterData(route), page=paginate(route,payRows(f),f);
  return header('إدارة المدفوعات','',f.year)+card(filterForm(route,[FILTER_YEAR,FILTER_CLASS,FILTER_SECTION,['status','حالة السداد',['بلا رسوم','مسدد','سداد جزئي','غير مسدد']],FILTER_LIMIT,['q','ابحث برقم القيد أو الاسم','search']],f))+
    `<div class="btns gap">${btn('تحديد الرسوم الدراسية','fee-settings')}${btn('توليد الأقساط الدراسية','installments')}${btn('إضافة بند رسوم','fee-item')}${btn('المصروفات العامة','ledger','expenses')}${btn('الإيرادات الخارجية','ledger','income')}${btn('ترحيل الأرصدة للسنة التالية','carry-balances')}${btn('مطالبة مالية جماعية','payments-report','due')}${btn('استيراد وتصدير إكسل','payment-workbook')}${btn('طباعة','payments-report','print')}</div>${table([...PAYMENT_HEADERS,'تفاصيل'],page.rows.map((s,i)=>[...payValues(s,i),raw(btn('تفاصيل','payment-student',s.id,'tiny soft'))]))}${page.tools}`;
};
actions['fee-settings']=()=>{
  const f=filterData(route);
  showDialog('تحديد الرسوم الدراسية',`<form data-form="fees" class="stack"><input type="hidden" name="year" value="${esc(f.year)}"><p>السنة الدراسية ${esc(f.year)}</p><div class="fields">${CLASSES.map((cls,i)=>amountField('fee'+i,cls,money(school().fees[yearKey(f.year,cls)]))).join('')}</div>${submit('حفظ الرسوم')}</form>`);
};
forms.fees=async data=>{
  await update(s=>{CLASSES.forEach((cls,i)=>{s.fees[yearKey(data.year,cls)]=parseMoney(data['fee'+i]);});});
  $('#modal').close();render();flash('حُفظت رسوم الصفوف.');
};
actions.installments=()=>{
  const f=filterData(route);
  showDialog('توليد الأقساط الدراسية',`<form data-form="installments" class="stack">${field(FILTER_YEAR,f.year)}${field(['cls','الصف',CLASSES,true],f.cls,{blank:'اختار'})}${field(['count','عدد الأقساط','number',true],4,{min:1,max:12})}${field(['start','تاريخ القسط الأول','date',true],dayISO())}${submit('حفظ خطة الأقساط')}</form>`);
};
forms.installments=async data=>{
  const count=Number(data.count);
  if(!Number.isInteger(count)||count<1||count>12)throw new Error('أدخل عدد أقساط بين 1 و12.');
  await update(s=>{(s.installments ||= {})[yearKey(data.year,data.cls)]={count,start:data.start};});
  $('#modal').close();render();flash('حُفظت خطة الأقساط.');
};
function installmentRows(s,account) {
  const plan=school().installments?.[yearKey(s.year,s.cls)];
  if(!plan)return [];
  const first=new Date(plan.start+'T12:00:00'), normal=Math.floor(account.net/plan.count);
  let paid=account.paid;
  return Array.from({length:plan.count},(_,i)=>{
    const date=new Date(first.getFullYear(),first.getMonth()+i,1,12);
    const last=new Date(date.getFullYear(),date.getMonth()+1,0,12).getDate();
    date.setDate(Math.min(first.getDate(),last));
    const amount=i===plan.count-1?account.net-normal*i:normal;
    const received=Math.min(amount,paid);paid-=received;
    return [i+1,dayISO(date),money(amount),money(received),money(amount-received)];
  });
}
actions['payment-student']=id=>{
  const s=lookup('students',id), account=financeOf(s), receipts=school().receipts.filter(r=>r.student===s.id), installments=installmentRows(s,account);
  const payment=`<form data-form="receipt" data-id="${esc(id)}" class="stack"><div class="fields">${amountField('amount','قيمة الدفعة')}${field(['date','تاريخ الدفع','date',true],dayISO())}${field(['method','طريقة الدفع',['نقدي','تحويل','صك']],'نقدي')}${field(['note','ملاحظات','text'])}</div>${submit('حفظ الدفعة')}</form>`;
  const discount=`<form data-form="discount" data-id="${esc(id)}" class="btns">${amountField('amount','الخصم',money(account.discount))}${submit('حفظ الخصم','soft')}</form>`;
  const feeRows=[['الرسوم الدراسية',account.tuition],...account.items.map(x=>[x.name,x.amount]),...(account.carried?[['رصيد مرحّل',account.carried]]:[])];
  showDialog('حساب الطالب · '+s.name,`<div class="stack"><p>الرسوم ${money(account.gross)} د.ل · المدفوع ${money(account.paid)} د.ل · المتبقي ${money(account.left)} د.ل</p>${table(['بند الرسوم','المبلغ (د.ل)'],feeRows.map(([label,amount])=>[label,money(amount)]))}${discount}${account.left?payment:''}
    ${installments.length?'<h3>الأقساط الدراسية</h3>'+table(['#','الاستحقاق','القيمة','المدفوع','المتبقي'],installments):''}
    <h3>الإيصالات</h3>${table(['رقم الإيصال','التاريخ','المبلغ','طريقة الدفع','الحالة','إجراءات'],receipts.map(r=>[r.number,r.date,money(r.amount),r.method,r.void?'ملغى':'ساري',raw(`<div class="row-tools">${btn('طباعة إيصال','receipt-print',r.id,'tiny soft')}${r.void?'':btn('إلغاء','receipt-void',r.id,'tiny danger')}</div>`)]))}</div>`);
};
forms.discount=async(data,form)=>{
  const id=form.dataset.id, amount=parseMoney(data.amount);
  await update(s=>{
    const student=s.students.find(x=>x.id===id), f=financeOf(student,s);
    if(amount>f.gross)throw new Error('الخصم يتجاوز الرسوم الأصلية.');
    if(f.gross-amount<f.paid)throw new Error('الخصم يجعل المدفوع أكثر من صافي الرسوم.');
    s.discounts[id]=amount;
  });
  render();actions['payment-student'](id);flash('حُفظ الخصم.');
};
forms.receipt=async(data,form)=>{
  const id=form.dataset.id, amount=parseMoney(data.amount);
  if(amount<=0)throw new Error('أدخل مبلغًا أكبر من صفر.');
  await update(s=>{
    const student=s.students.find(x=>x.id===id&&!x.archive);
    if(!student||amount>financeOf(student,s).left)throw new Error('المبلغ يتجاوز المتبقي أو السجل غير متاح.');
    const number=Math.max(0,...s.receipts.map(r=>r.number))+1;
    s.receipts.push({...formText(data),id:uid(),number,amount,student:id,year:student.year});
  });
  render();actions['payment-student'](id);flash('حُفظ الإيصال.');
};
actions['receipt-print']=id=>{
  const r=lookup('receipts',id), s=lookup('students',r.student);
  showReport('إيصال استلام مبلغ · '+r.number,r.year,['اسم الطالب','رقم القيد','التاريخ','طريقة الدفع','المبلغ (د.ل)','الحالة'],[[s.name,s.reg,r.date,r.method,money(r.amount),r.void?'ملغى':'ساري']],r.note?'<p>'+esc(r.note)+'</p>':'');
};
actions['receipt-void']=id=>showDialog('إلغاء الإيصال',`<form data-form="receipt-void" data-id="${esc(id)}" class="stack">${field(['reason','سبب الإلغاء','text',true])}${submit('تأكيد الإلغاء','danger')}</form>`);
forms['receipt-void']=async(data,form)=>{
  const id=form.dataset.id;
  await update(s=>{const r=s.receipts.find(x=>x.id===id);if(!r||r.void)throw new Error('الإيصال غير متاح.');r.void={date:dayISO(),reason:str(data.reason)};});
  const r=lookup('receipts',id);render();actions['payment-student'](r.student);flash('أُلغي الإيصال.');
};
actions['payments-report']=mode=>{
  const f=filterData(route), rows=payRows(f).filter(s=>mode!=='due'||financeOf(s).left>0).map(payValues);
  if(mode==='excel')return downloadExcel('إدارة المدفوعات',PAYMENT_HEADERS,rows);
  showReport(mode==='due'?'مطالبة مالية جماعية':'كشف حسابات الطلبة',f.year,PAYMENT_HEADERS,rows);
};
actions['fee-item']=()=>{
  const f=filterData(route), rows=onlyYear(school().feeItems,f.year);
  showDialog('إضافة بند رسوم',`<form data-form="fee-item" data-year="${esc(f.year)}" class="stack"><div class="fields">${field(['name','اسم بند الرسوم','text',true],'',{maxlength:120})}${field(['cls','الصف',CLASSES],f.cls,{blank:'كل الصفوف'})}${amountField('amount','المبلغ بالدينار')}</div>${submit('حفظ بند الرسوم')}</form><div class="gap">${table(['اسم البند','الصف','المبلغ'],rows.map(x=>[x.name,x.cls||'كل الصفوف',money(x.amount)]))}</div>`);
};
forms['fee-item']=async(data,form)=>{
  const year=form.dataset.year, name=str(data.name), cls=str(data.cls), amount=parseMoney(data.amount);
  if(!name||!amount||cls&&!CLASSES.includes(cls))throw new Error('راجع اسم البند والصف والمبلغ.');
  await update(s=>{
    if(s.feeItems.some(x=>x.year===year&&x.cls===cls&&normalized(x.name)===normalized(name)))throw new Error('بند الرسوم موجود بالفعل.');
    s.feeItems.push({id:uid(),year,name,cls,amount});
  });
  render();actions['fee-item']();flash('حُفظ بند الرسوم.');
};
actions['carry-balances']=()=>{
  const f=filterData(route), next=YEARS[Math.max(0,YEARS.indexOf(f.year)-1)];
  showDialog('ترحيل الأرصدة للسنة التالية',`<form data-form="carry-balances" class="stack">${field(['from','السنة المصدر',YEARS],f.year===YEAR?YEARS[1]:f.year)}${field(['to','السنة المستقبلة',YEARS],next)}<p class="muted small">تُطابق السجلات برقم القيد، ويُضاف المتبقي إلى حساب الطالب في السنة المستقبلة.</p>${submit('ترحيل الأرصدة')}</form>`);
};
forms['carry-balances']=async data=>{
  if(!YEARS.includes(data.from)||!YEARS.includes(data.to)||Number(data.to.slice(0,4))!==Number(data.from.slice(0,4))+1)throw new Error('اختر سنتين دراسيتين متتاليتين.');
  let added=0, missing=0;
  await update(s=>{
    const previous=onlyYear(s.students,data.from), next=onlyYear(s.students,data.to).filter(row=>!row.archive);
    const matches=new Map(next.map(row=>[normalized(row.reg),row]));
    for(const student of previous){
      const remainder=financeOf(student,s).left, destination=matches.get(normalized(student.reg));
      if(!remainder)continue;
      if(!destination){missing++;continue;}
      if(destination.national&&student.national&&destination.national!==student.national){missing++;continue;}
      const balances=s.carriedBalances[destination.id] ||= {};
      if(Object.hasOwn(balances,data.from))continue;
      balances[data.from]=remainder;
      added++;
    }
  });
  $('#modal').close();render();flash('رُحّل رصيد '+added+' سجل'+(missing?' · تعذر العثور على '+missing+' سجل مطابق.':'.'));
};
const paymentWorkbookHeaders=['مرجع الاستيراد','رقم القيد','المبلغ','التاريخ','طريقة الدفع','ملاحظة'];
actions['payment-workbook']=()=>showDialog('استيراد وتصدير إكسل',`<form data-form="import-payments" class="stack"><p>حمّل القالب، واكتب مرجعًا فريدًا لكل دفعة ورقم القيد والمبلغ والتاريخ.</p>${field(FILTER_YEAR,filterData(route).year)}${field(['file','ملف Excel','file',true],'',{accept:'.xlsx'})}<div class="btns">${submit('استيراد الدفعات')}${btn('تنزيل قالب الدفعات','payment-template')}${btn('تصدير كشف الحسابات','payments-report','excel')}</div></form>`);
actions['payment-template']=()=>downloadExcel('قالب استيراد الدفعات',paymentWorkbookHeaders,[]);
forms['import-payments']=async data=>{
  const rows=await readExcel(data.file), headings=rows.shift()||[];
  const columns=paymentWorkbookHeaders.map(label=>headings.findIndex(x=>normalized(x)===normalized(label)));
  if(columns.slice(0,4).some(i=>i<0))throw new Error('أعمدة الملف غير مطابقة لقالب الدفعات.');
  let imported=0, duplicate=0;
  await update(s=>{
    const refs=new Map(s.receipts.filter(r=>r.year===data.year&&r.importRef).map(r=>[r.importRef,r]));
    const students=new Map(onlyYear(s.students,data.year).filter(row=>!row.archive).map(row=>[normalized(row.reg),row]));
    let number=Math.max(0,...s.receipts.map(r=>r.number));
    for(const [i,row] of rows.entries()){
      if(!row.some(value=>str(value)))continue;
      try{
        const [ref,reg,rawAmount,rawDate,method,note]=columns.map(col=>str(row[col]));
        const amount=parseMoney(rawAmount), date=excelDate(rawDate), student=students.get(normalized(reg));
        if(!ref||ref.length>100||!student||!amount||!/^\d{4}-\d{2}-\d{2}$/.test(date)||method&&!['نقدي','تحويل','صك'].includes(method))throw new Error('راجع المرجع ورقم القيد والمبلغ والتاريخ وطريقة الدفع.');
        const old=refs.get(ref);
        if(old){
          if(old.student!==student.id||old.amount!==amount||old.date!==date)throw new Error('مرجع الدفعة مستخدم لقيد مختلف.');
          duplicate++;continue;
        }
        if(amount>financeOf(student,s).left)throw new Error('المبلغ يتجاوز المتبقي.');
        const receipt={id:uid(),student:student.id,year:data.year,number:++number,amount,date,method:method||'نقدي',note,importRef:ref};
        s.receipts.push(receipt);refs.set(ref,receipt);imported++;
      }catch(error){throw new Error('الصف '+(i+2)+' · '+error.message);}
    }
    if(!imported&&!duplicate)throw new Error('لا توجد دفعات في الملف.');
  });
  $('#modal').close();render();flash('استُوردت '+imported+' دفعة'+(duplicate?' · سبق تسجيل '+duplicate:''));
};
actions.ledger=type=>{
  const year=filterData(route).year, title=type==='expenses'?'المصروفات العامة':'الإيرادات الخارجية';
  const rows=onlyYear(school()[type],year);
  showDialog(title,`<form data-form="ledger" data-type="${type}" data-year="${esc(year)}" class="stack">${field(['name','البيان','text',true])}${amountField('amount','المبلغ بالدينار')}${field(['date','التاريخ','date',true],dayISO())}${submit('حفظ')}</form><div class="gap">${table(['البيان','التاريخ','المبلغ'],rows.map(r=>[r.name,r.date,money(r.amount)]))}</div>`);
};
forms.ledger=async(data,form)=>{
  const type=form.dataset.type, amount=parseMoney(data.amount);
  if(!amount)throw new Error('أدخل مبلغًا أكبر من صفر.');
  await update(s=>s[type].push({...formText(data),id:uid(),amount,year:form.dataset.year}));
  render();actions.ledger(type);flash('حُفظ القيد.');
};
function financialTotals(year) {
  const students=activeStudents(year), values=students.map(s=>financeOf(s));
  const paid=sum(onlyYear(school().receipts,year).filter(r=>!r.void).map(r=>r.amount));
  const other=sum(onlyYear(school().income,year).map(r=>r.amount)), spent=sum(onlyYear(school().expenses,year).map(r=>r.amount));
  return [['إجمالي الطلاب',students.length],['صافي الرسوم',money(sum(values.map(v=>v.net)))+' د.ل'],['المقبوض من الطلبة',money(paid)+' د.ل'],['المتبقي على الطلبة',money(sum(values.map(v=>v.left)))+' د.ل'],['الإيرادات الخارجية',money(other)+' د.ل'],['المصروفات العامة',money(spent)+' د.ل'],['صافي المقبوضات',money(paid+other-spent)+' د.ل']];
}
pages['finance-report']=()=>{
  const f=filterData(route);
  return header('التقارير المالية','',f.year)+card(filterForm(route,[FILTER_YEAR],f))+`<div class="grid3 gap">${financialTotals(f.year).map(([title,value])=>`<article class="card metric"><h3>${esc(title)}</h3><strong>${esc(value)}</strong></article>`).join('')}</div>${btn('طباعة التقرير','financial-report')}`;
};
actions['financial-report']=()=>{const f=filterData(route);showReport('التقرير المالي',f.year,['البيان','الإجمالي'],financialTotals(f.year));};
const payrollMonth=()=>dayISO().slice(0,7);
function payrollRows(f) {
  return staffRows(f).filter(s=>!f.paid||Boolean(school().payroll[f.month+'|'+s.id]?.paid)===(f.paid==='مصروف'));
}
function payrollData(staff,month) {
  const r=school().payroll[month+'|'+staff.id]||{};
  return {...r,net:Math.max(0,(r.base||0)+(r.lessons||0)*(r.rate||0)-(r.deduct||0))};
}
const payrollHeaders=['#','الموظف','الوظيفة','الحالة','الراتب المعتمد','إجمالي الراتب','حالة الصرف'];
function payrollLine(staff,i,month) {
  const r=payrollData(staff,month);
  return [i+1,staff.name,staff.job,staff.status,money(r.base),money(r.net),r.paid?'مصروف':'غير مصروف'];
}
pages['staff-payments']=()=>{
  const f=filterData(route,{month:payrollMonth(),paid:''}), staff=payrollRows(f);
  return header('مالية الموظفين','حساب تجريبي للمرتب والحصص والخصم',f.year)+card(filterForm(route,[FILTER_YEAR,['month','الشهر','month'],['q','بحث بالاسم / الوظيفة','search'],['paid','حالة الصرف',[['','الكل'],'مصروف','غير مصروف']]],f))+
    `<div class="btns gap">${btn('الطباعة والتقارير','payroll-report')}${btn('تصدير إكسل','payroll-report','excel')}</div>${table([...payrollHeaders,'إجراءات'],staff.map((x,i)=>[...payrollLine(x,i,f.month),raw(btn('تعديل','payroll-edit',x.id,'tiny soft'))]))}`;
};
actions['payroll-edit']=id=>{
  const staff=lookup('staff',id), f=filterData(route,{month:payrollMonth()}), r=payrollData(staff,f.month);
  showDialog('مرتب · '+staff.name,`<form data-form="payroll" data-id="${esc(id)}" data-month="${esc(f.month)}" class="stack">${amountField('base','الراتب المعتمد',money(r.base))}${field(['lessons','عدد الحصص','number',true],r.lessons||0,{min:0,max:500})}${amountField('rate','سعر الحصة',money(r.rate))}${amountField('deduct','الخصم',money(r.deduct))}${field(['paid','تم الصرف','checkbox'],r.paid)}${submit('حفظ')}</form>`);
};
forms.payroll=async(data,form)=>{
  const row={base:parseMoney(data.base),rate:parseMoney(data.rate),deduct:parseMoney(data.deduct),lessons:Number(data.lessons),paid:Boolean(data.paid)};
  await update(s=>{s.payroll[form.dataset.month+'|'+form.dataset.id]=row;});
  $('#modal').close();render();flash('حُفظت البيانات المالية.');
};
actions['payroll-report']=mode=>{
  const f=filterData(route,{month:payrollMonth(),paid:''}), rows=payrollRows(f).map((x,i)=>payrollLine(x,i,f.month));
  if(mode==='excel')return downloadExcel('مالية الموظفين '+f.month,payrollHeaders,rows);
  showReport('مالية الموظفين · '+f.month,f.year,payrollHeaders,rows);
};

pages['parent-portal']=()=>{
  const f=filterData(route), page=paginate(route,filterStudents(f),f);
  return header('إدارة بوابة أولياء الأمور','إدارة ملاحظات الطلاب',f.year)+card(filterForm(route,[FILTER_YEAR,FILTER_CLASS,FILTER_SECTION,FILTER_LIMIT,['q','ابحث برقم القيد أو الرقم الوطني أو الاسم','search']],f))+
    `<div class="btns gap">${portalButton('رابط بوابة أولياء الأمور','parents')}${link('اعتماد صور الطلاب','approve-photos','soft')}${btn('آخر الملاحظات المضافة','parent-notes')}</div>${table(['#','الصورة','رقم القيد','الرقم الوطني','اسم الطالب','الصف','رقم هاتف ولي الأمر','التخصص','الفصل','إجراءات'],page.rows.map((x,i)=>[i+1,raw(studentAvatar(x)),x.reg,x.national,x.name,x.cls,x.phone,x.stream,x.section,raw('<div class="row-tools">'+btn('إضافة ملاحظة','parent-note',x.id,'tiny soft')+(sharedMode?btn(school().guardianCodes[x.id]?'تعديل رمز الوصول':'إعداد رمز الوصول','guardian-code',x.id,'tiny soft'):'')+'</div>')]))}${page.tools}`;
};
actions['parent-note']=id=>showDialog('إضافة ملاحظة لولي الأمر',`<p>${esc(lookup('students',id).name)}</p><form data-form="parent-note" data-id="${esc(id)}" class="stack">${field(['text','الملاحظة','textarea',true],'',{maxlength:1500})}${submit('حفظ الملاحظة')}</form>`);
forms['parent-note']=async(data,form)=>{
  const text=str(data.text);
  if(!text)throw new Error('اكتب الملاحظة أولًا.');
  await update(s=>s.notes.push({id:uid(),student:form.dataset.id,date:dayISO(),text}));
  $('#modal').close();render();flash('حُفظت الملاحظة.');
};
actions['parent-notes']=()=>showDialog('آخر الملاحظات المضافة',table(['الطالب','التاريخ','الملاحظة'],[...school().notes].reverse().slice(0,30).map(n=>[lookup('students',n.student).name,n.date,n.text])));
pages.chat=()=>{
  const rows=[...school().chat].reverse().slice(0,60);
  return header('نظام الدردشة','محادثة حسابات المدرسة','')+card(`<form data-form="chat" class="stack">${field(['message','اكتب رسالتك هنا...','textarea',true],'',{maxlength:1200})}${submit('إرسال الرسالة')}</form>`)+
    `<section class="gap stack">${rows.map(row=>card(textBlock(row.text)+'<small>'+esc(row.sender)+' · '+esc(row.date)+'</small>')).join('')||notice('لا توجد رسائل.')}</section>`;
};
forms.chat=async data=>{
  const text=str(data.message);
  if(!text)throw new Error('اكتب الرسالة أولًا.');
  await update(s=>s.chat.push({id:uid(),text,sender:session?.role==='subuser'?s.users.find(u=>u.id===session.userId)?.name||'مستخدم فرعي':'الإدارة',date:dayISO()}));
  render();flash('أُضيفت الرسالة إلى المحادثة.');
};

pages['user-profile']=()=>{
  const p=school().profile, keys=['name','principal','exam','entry','phone','type','region','email'];
  const panel=(title,body,classes='')=>`<section class="profile-card ${classes}"><h2>${title}</h2>${body}</section>`;
  const entries=REGISTER_FIELDS.filter(([key])=>keys.includes(key));
  const info=`<dl class="profile-info">${entries.map(([key,label])=>`<dt>${esc(label)}</dt><dd>${esc(p[key]||'—')}</dd>`).join('')}</dl>${btn('تعديل الحساب','profile-edit','','info block')}`;
  const portals=`${sharedMode?'<p>رمز المدرسة <bdi class="key">'+esc(p.code)+'</bdi></p>':''}<div class="btns">${portalButton('رابط أولياء الأمور','parents')}${portalButton('رابط المعلمين','teachers')}${portalButton('رابط استعلام الموظفين','staff-portal')}</div>`;
  const help=`<small class="logo-formats">${LOGO_FORMATS} · حتى 20 ميغابايت</small>`;
  const photo=imageMarkup(p.photo,'صورة المدرسة','profile-logo')||`<span class="profile-logo logo-placeholder" aria-hidden="true">${icon('book')}</span>`;
  const schoolLogo=`${photo}<form data-form="profile-photo" class="stack logo-form">${field(['photo','اختر صورة المدرسة','file',true],'',{accept:LOGO_ACCEPT})}${help}${submit('تحديث الصورة','info block')}</form>${p.photo?`<div class="grid2 logo-actions">${btn(p.photoHidden?'إظهار في الطباعة':'إخفاء من الطباعة','school-logo-visibility','','warning')}${btn('حذف الصورة','logo-remove','photo','red')}</div>`:''}`;
  const printProfile=`<form data-form="print-logo" class="stack logo-form">${imageMarkup(p.printLogo,'شعار الجهة التعليمية','profile-logo authority-logo')}${field(['logo','شعار الجهة التعليمية','file'],'',{accept:LOGO_ACCEPT})}${help}${field(['hide','إيقاف ظهور الشعار في الطباعة','checkbox'],p.printLogoHidden)}${submit('حفظ الاختيار','info block')}</form>${p.printLogo?'<div class="btns logo-actions">'+btn('حذف شعار الجهة التعليمية','logo-remove','printLogo','danger')+'</div>':''}`;
  return `<h1 class="sr-only" tabindex="-1">الملف الشخصي</h1><div class="grid2 profile-grid"><div class="stack">${panel('معلومات الحساب',info)}${panel('روابط البوابات',portals)}</div><div class="stack">${panel('صورة المدرسة',schoolLogo,'profile-image-card')}${panel('اختيار شعار الكشوف',printProfile,'profile-image-card')}</div></div>`;
};
actions['profile-edit']=()=>{
  const keys=['name','principal','exam','entry','phone','type','region','email'];
  showDialog('تعديل الحساب',`<form data-form="profile" class="stack">${formFields(REGISTER_FIELDS.filter(([key])=>keys.includes(key)),school().profile)}${submit('حفظ الحساب')}</form>`);
};
forms.profile=async data=>{
  const p=formText(data);
  if(!/^09\d{8}$/.test(p.phone))throw new Error('رقم الهاتف يبدأ بـ09 ويتكون من 10 أرقام.');
  await update(s=>Object.assign(s.profile,p));
  $('#modal').close();render();flash('حُفظت معلومات الحساب.');
};
forms['profile-photo']=async data=>{
  const photo=await logoFile(data.photo);
  if(!photo)throw new Error('اختر صورة المدرسة أولًا.');
  await update(s=>{s.profile.photo=photo;});render();flash('حُفظت الصورة.');
};
forms['print-logo']=async data=>{
  const logo=await logoFile(data.logo);
  await update(s=>{
    if(logo)s.profile.printLogo=logo;
    s.profile.printLogoHidden=Boolean(data.hide);
  });
  render();flash('حُفظ إعداد الشعار.');
};
actions['school-logo-visibility']=async()=>{
  await update(s=>{s.profile.photoHidden=!s.profile.photoHidden;});
  render();flash('حُفظ إعداد ظهور صورة المدرسة في الطباعة.');
};
actions['logo-remove']=key=>{
  if(!['photo','printLogo'].includes(key))return;
  showDialog('حذف الصورة',`<form data-form="logo-remove" data-key="${key}" class="stack"><p>ستُزال الصورة المحفوظة من الملف الشخصي.</p>${submit('حذف الصورة','red')}</form>`);
};
forms['logo-remove']=async(_data,form)=>{
  const key=form.dataset.key;
  if(!['photo','printLogo'].includes(key))return;
  await update(s=>{s.profile[key]='';});
  $('#modal').close();render();flash('حُذفت الصورة.');
};
pages['sub-users']=()=>header('إدارة المستخدمين الفرعيين','صلاحيات الوصول إلى الأقسام','')+
  `<div class="btns gap">${btn('إضافة مستخدم فرعي','subuser-edit','','green')}</div>${table(['#','اسم المستخدم','الاسم الكامل','الحالة','الصلاحيات','إجراءات'],school().users.map((u,i)=>[i+1,u.username,u.name,u.active?'فعال':'متوقف',u.permissions.length,raw(btn('تعديل','subuser-edit',u.id,'tiny soft'))]))}`;
actions['subuser-edit']=id=>{
  const u=id?lookup('users',id):{permissions:[],active:true};
  const resources=Object.entries(TITLES).filter(([key])=>!PUBLIC.includes(key)&&!['dashboard','user-profile','sub-users'].includes(key)&&pages[key]&&(!sharedMode||SHARED_DELEGATED.has(key)));
  showDialog(id?'تعديل مستخدم فرعي':'إضافة مستخدم فرعي',`<form data-form="subuser" data-id="${esc(id)}" class="stack">${field(['name','الاسم الكامل','text',true],u.name)}${field(['username','اسم المستخدم','text',true],u.username,{minlength:3})}${field(['password',id?'كلمة المرور (اتركها فارغة عند عدم التغيير)':'كلمة المرور','password',!id],'',{autocomplete:'new-password'})}${field(['active','فعال','checkbox'],u.active)}<h3>الصلاحيات</h3><div class="fields tight">${resources.map(([key,label])=>field(['perm!'+key,label,'checkbox'],u.permissions.includes(key))).join('')}</div>${submit('حفظ')}</form>`);
};
forms.subuser=async(data,form)=>{
  const id=form.dataset.id||uid(), username=str(data.username), name=str(data.name);
  if(username.length<3||!name)throw new Error('أكمل الاسم واسم المستخدم.');
  const row={id,username,name,active:Boolean(data.active),permissions:Object.keys(data).filter(k=>k.startsWith('perm!')).map(k=>k.slice(5))};
  if(sharedMode){
    await runWorkflow('subuser-save',{...row,id:form.dataset.id,password:data.password});
    $('#modal').close();render();flash('حُفظ المستخدم الفرعي.');
    return;
  }
  if(data.password){row.salt=uid();row.digest=await passwordHash(data.password,row.salt);}
  await update((s,root)=>{
    const users=Object.values(root.schools).flatMap(x=>[x.profile,...x.users]);
    if(users.some(x=>x.id!==id&&normalized(x.username)===normalized(username)))throw new Error('اسم المستخدم مستخدم بالفعل.');
    const existing=s.users.find(u=>u.id===id);
    if(existing)Object.assign(existing,row);
    else if(row.digest)s.users.push(row);
    else throw new Error('أدخل كلمة مرور للتجربة.');
  });
  $('#modal').close();render();flash('حُفظ المستخدم الفرعي.');
};
function canAccess(page) {
  if(page==='data-transfer')return session?.role==='admin';
  if(PUBLIC.includes(page)||session?.role==='admin')return true;
  if(sharedMode)return Boolean(session&&(page==='dashboard'||page==='reference'||session.permissions.includes(page)));
  const user=school().users.find(u=>u.id===session?.userId&&u.active);
  return Boolean(user&&(page==='dashboard'||page==='reference'||user.permissions.includes(page)));
}

function walletOf(id,s=school()) {
  const rows=s.wallet.filter(r=>r.student===id);
  return {balance:sum(rows.map(r=>r.amount)),spent:sum(rows.filter(r=>r.amount<0&&r.date===dayISO()).map(r=>-r.amount)),limit:s.walletLimits?.[id]||0};
}
pages['manage-canteen']=()=>{
  const f=filterData(route), page=paginate(route,filterStudents(f),f);
  return header('إدارة المقصف المدرسي والكارت الذكي','المحفظة ونقطة البيع',f.year)+card(filterForm(route,[FILTER_YEAR,FILTER_CLASS,FILTER_SECTION,FILTER_LIMIT,['q','ابحث برقم القيد أو الاسم','search']],f))+
    `<div class="btns gap">${btn('الأصناف والوجبات','canteen-items')}${btn('سجل المبيعات والعمليات','canteen-report')}${btn('إعدادات المقصف وكود الدخول','canteen-code')}${portalButton('نقطة بيع المقصف (الكاشير)','canteen')}</div>
    ${table(['#','رقم القيد','اسم الطالب','الصف','الفصل','الرصيد المتاح','سقف الصرف','المصروف اليوم','إجراءات'],page.rows.map((x,i)=>{const w=walletOf(x.id);return [i+1,x.reg,x.name,x.cls,x.section,money(w.balance),w.limit?money(w.limit):'—',money(w.spent),raw(btn('شحن المحفظة','wallet-topup',x.id,'tiny soft'))];}))}${page.tools}`;
};
actions['canteen-items']=()=>showDialog('الأصناف والوجبات',`<form data-form="canteen-item" class="stack">${field(['name','اسم الصنف','text',true])}${amountField('price','السعر بالدينار')}${field(['stock','الكمية','number',true],1,{min:1,max:10000})}${submit('حفظ الصنف')}</form><div class="gap">${table(['الصنف','السعر','الكمية'],school().items.map(x=>[x.name,money(x.price),x.stock]))}</div>`);
forms['canteen-item']=async data=>{
  const price=parseMoney(data.price), stock=Number(data.stock), name=str(data.name);
  if(!price||!name||!Number.isInteger(stock)||stock<1)throw new Error('أدخل اسمًا وسعرًا وكمية صالحة.');
  await update(s=>{
    const existing=s.items.find(x=>normalized(x.name)===normalized(name));
    if(existing){existing.stock+=stock;existing.price=price;}
    else s.items.push({id:uid(),name,price,stock});
  });actions['canteen-items']();flash('حُفظ الصنف.');
};
actions['wallet-topup']=id=>{
  const s=lookup('students',id), w=walletOf(id);
  showDialog('شحن المحفظة · '+s.name,`<form data-form="wallet-topup" data-id="${esc(id)}" class="stack">${amountField('amount','قيمة الشحن','0.000')}${amountField('limit','سقف الصرف اليومي (صفر بلا سقف)',money(w.limit))}${submit('حفظ')}</form>`);
};
forms['wallet-topup']=async(data,form)=>{
  const amount=parseMoney(data.amount), limit=parseMoney(data.limit), id=form.dataset.id;
  await update(s=>{
    (s.walletLimits ||= {})[id]=limit;
    if(amount)s.wallet.push({id:uid(),student:id,date:dayISO(),label:'شحن',amount});
  });
  $('#modal').close();render();flash('حُفظت المحفظة.');
};
actions['canteen-report']=()=>showReport('سجل مبيعات المقصف والعمليات',YEAR,['الطالب','التاريخ','البيان','القيمة'],school().wallet.map(r=>[lookup('students',r.student).name,r.date,r.label,money(r.amount)]));
let canteenSession='', canteenItems=[], canteenProof='';
pages.canteen=()=>{
  const open=sharedMode?Boolean(canteenProof):canteenSession===activeSchoolId;
  if(!open)return `<main class="public-screen mid"><section class="card auth-card guardian">${wordmark()}<h1 class="auth-title">المقصف المدرسي</h1><form data-form="canteen-login" class="stack">${sharedMode?sharedSchoolInput():''}${field(['pin','كود المقصف السري (Canteen PIN)','password',true],'',{inputmode:'numeric'})}${submit('دخول نقطة البيع (POS)','block')}</form>${!sharedMode||sharedDemo?'<p class="small muted gap">كود نقطة البيع التجريبية <bdi>1234</bdi></p>':''}${returnHome()}</section></main>`;
  const items=sharedMode?canteenItems:school().items.filter(i=>i.stock>0);
  return `<main class="container gap">${header('نقطة بيع المقصف','',YEAR)}${card(`<form data-form="canteen-sale" data-request="${uid()}" class="stack">${field(['reg','رقم قيد الطالب','text',true],'',{inputmode:'numeric'})}${field(['item','الصنف',items.map(i=>[i.id,i.name+' · '+money(i.price)+' د.ل']),true],'',{blank:'اختر الصنف'})}${field(['quantity','الكمية','number',true],1,{min:1,max:50})}${submit('تسجيل البيع')}</form>`)}<div class="btns gap">${btn('خروج','canteen-logout')}${link('الصفحة الرئيسية','home','soft')}</div></main>`;
};
forms['canteen-login']=async data=>{
  if(sharedMode){
    const result=await sharedAPI('/api/canteen-login',{school:str(data.school),pin:digits(data.pin)});
    canteenProof=result.token;canteenItems=result.items;render();
    return;
  }
  if(digits(data.pin)!==school().canteenPin)throw new Error('كود الدخول غير صحيح.');
  canteenSession=activeSchoolId;render();
};
actions['canteen-logout']=async()=>{
  if(sharedMode&&canteenProof)await sharedAPI('/api/canteen-logout',{token:canteenProof});
  canteenSession='';canteenProof='';canteenItems=[];render();
};
forms['canteen-sale']=async(data,form)=>{
  if(sharedMode){
    try{
      const result=await sharedAPI('/api/canteen-sale',{token:canteenProof,requestId:form.dataset.request,reg:digits(data.reg),item:data.item,quantity:Number(data.quantity)});
      canteenItems=result.items;render();flash('سُجل البيع. الرصيد المتبقي '+money(result.balance)+' د.ل');
    }catch(error){
      if(error.status===401){canteenProof='';canteenItems=[];render();}
      throw error;
    }
    return;
  }
  if(canteenSession!==activeSchoolId)throw new Error('افتح نقطة البيع أولًا.');
  const quantity=Number(data.quantity);
  if(!Number.isInteger(quantity)||quantity<1||quantity>50)throw new Error('أدخل كمية صالحة.');
  await update(s=>canteenSale(s,digits(data.reg),data.item,quantity,YEAR,dayISO(),uid()));
  render();flash('سُجل البيع.');
};
actions['canteen-code']=()=>showDialog('إعدادات المقصف وكود الدخول',`<form data-form="canteen-code" class="stack">${field(['pin','كود المقصف من 4 إلى 8 أرقام','text',true],'',{pattern:'[0-9]{4,8}',inputmode:'numeric'})}${submit('حفظ الكود')}</form>`);
forms['canteen-code']=async data=>{
  const pin=digits(data.pin);
  await runWorkflow('canteen-code',{pin},s=>{s.canteenPin=pin;});
  $('#modal').close();render();flash('حُفظ كود المقصف.');
};
