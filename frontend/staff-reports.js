const staffDocumentTitles={
  definition:'تعريف معلم',
  continuity:'تقرير استمرارية عمل',
  commencement:'رسالة مباشرة عمل',
  information:'بطاقة معلومات الموظف',
  efficiency:'تقرير كفاءة موظف'
};
const staffInformationSections=[
  ['البيانات الشخصية',[
    ['name','الاسم بالكامل'],['national','الرقم الوطني'],['mother','اسم الأم'],['birthplace','مكان الميلاد'],
    ['birth','تاريخ الميلاد'],['gender','الجنس'],['nation','الجنسية'],['religion','الديانة'],['civil','الحالة الاجتماعية'],
    ['children','عدد الأبناء'],['health','الحالة الصحية'],['address','مكان الإقامة'],['union','رقم بطاقة النقابة'],
    ['social','رقم بطاقة الضمان'],['passport','رقم جواز السفر'],['residency','رقم الإقامة']
  ]],
  ['البيانات المالية',[['financial','الرقم المالي'],['bank','المصرف'],['bank_branch','الفرع'],['bank_account','رقم الحساب']]],
  ['المؤهلات والدورات',[
    ['qualification','المؤهل العلمي'],['qualification_type','نوع المؤهل'],['graduate','سنة التخرج'],
    ['degree_year','سنة الحصول عليه'],['specialty','التخصص'],['university','جهة الحصول عليه'],['courses','الدورات']
  ]],
  ['البيانات الوظيفية',[
    ['employment','الوضع الوظيفي'],['start','تاريخ أول مباشرة'],['decision','رقم قرار التعيين'],
    ['appointment_date','تاريخ التعيين'],['entry_grade','الدرجة عند التعيين'],['grade','الدرجة الحالية'],
    ['grade_date','تاريخ الحصول عليها'],['bonus','العلاوة الحالية'],['due','شهر الاستحقاق'],
    ['status','الحالة الوظيفية'],['secondment','الجهة المنتدب منها / إليها'],['job','الوظيفة الحالية'],
    ['admin_number','الرقم الإداري'],['school_reg','رقم قيد المدرسة'],['stage','المرحلة التعليمية'],['supervision','اسم المراقبة']
  ]]
];
function staffReportMenu() {
  return `<div class="report-buttons">${[
    ['continuity','تقرير استمرارية عمل'],['commencement','رسالة مباشرة عمل'],
    ['information','بطاقة معلومات'],['definition','تعريف معلم']
  ].map(([kind,title])=>btn('طباعة '+title+' للجميع','staff-doc',kind,'outline-blue')).join('')}
    ${btn('طباعة قائمة المعلمين (كشف)','staff-roster','','outline-blue')}</div>`;
}
actions['staff-row-reports']=id=>{
  const person=lookup('staff',id);
  const labels={information:'إصدار بطاقة معلومات الموظف',efficiency:'إصدار تقرير كفاءة'};
  showDialog('تقارير · '+person.name,'<div class="report-buttons">'+Object.entries(staffDocumentTitles)
    .map(([kind,title])=>btn(labels[kind]||title,'staff-doc',kind+'|'+id,'outline-blue')).join('')+'</div>');
};
actions['staff-card']=id=>actions['staff-doc']('information|'+id);

function staffDocumentPeople(id,kind) {
  const people=id?[lookup('staff',id)]:staffRows(filterData('all-staff'));
  const included=kind==='continuity'?staffContinuityRows(people):people;
  if(!included.length)throw new Error(kind==='continuity'?
    'لا يوجد موظف بحالة عمل مستمرة ضمن الاختيارات.':'لا يوجد موظفون ضمن الاختيارات.');
  return included;
}
actions['staff-doc']=value=>{
  const [kind,id='']=value.split('|');
  if(!Object.hasOwn(staffDocumentTitles,kind))throw new Error('نموذج الطباعة غير متاح.');
  const people=staffDocumentPeople(id,kind);
  if(['information','efficiency'].includes(kind))return staffDocumentReport(kind,people);
  const date=kind==='commencement'?(id?people[0].start:''):dayISO();
  const caption=id?people[0].name:'عدد الموظفين المشمولين بالطباعة '+people.length;
  showDialog(staffDocumentTitles[kind],`<form class="stack" data-form="staff-doc" data-kind="${kind}" data-id="${esc(id)}">
    <p>${esc(caption)}</p><div class="fields tight">
    ${field(['date',kind==='commencement'?'تاريخ المباشرة':'تاريخ الإفادة','date',kind!=='commencement'],date)}
    ${field(['recipient','الجهة الموجّه إليها','text'],'',{maxlength:160})}
    ${field(['reference','رقم الإشارة','text'],'',{maxlength:50})}
    </div>${submit('معاينة الطباعة')}</form>`);
};
forms['staff-doc']=(data,form)=>{
  const {kind,id}=form.dataset;
  if(!['continuity','commencement','definition'].includes(kind))throw new Error('نموذج الطباعة غير متاح.');
  const details={
    date:str(data.date),recipient:str(data.recipient).slice(0,160),reference:str(data.reference).slice(0,50)
  };
  if(details.date||kind!=='commencement')attendanceReportDates(details.date,'يومي');
  staffDocumentReport(kind,staffDocumentPeople(id,kind),details);
};

function staffPrintValue(person,key) {
  if(key==='secondment')return [person.loaned,person.loaned_to].filter(Boolean).join(' / ');
  if(key==='appointment_date')return person.appointment_date||person.appointed;
  if(key==='grade')return person.grade||person.job_grade;
  if(key==='courses')return [
    ...[['icdl','شهادة ICDL'],['languages','لغات'],['modern','تعليم حديث'],['curriculum','دورات منهجية'],
      ['trained','تأهيل تعليمي']].filter(([flag])=>person[flag]===true).map(([,label])=>label),
    person.training
  ].filter(Boolean).join('، ');
  return person[key];
}
function staffDetailGrid(person,fields) {
  return `<dl class="staff-detail-grid">${fields.map(([key,label])=>
    `<div><dt>${esc(label)}</dt><dd>${esc(staffPrintValue(person,key)??'')}</dd></div>`).join('')}</dl>`;
}
function staffPrintSignature(profile) {
  return `<div class="staff-print-sign"><div><strong>صدر عن شؤون الموظفين</strong><p>التوقيع ....................................</p>
    <p>صورة إلى الملف الشخصي للموظف</p></div><div><strong>مدير المدرسة</strong>
    <p>${esc(profile.principal||'....................................')}</p><p>التوقيع والختم ....................................</p></div></div>`;
}
function staffEfficiencyBody(person) {
  const fields=[
    ['name','الاسم بالكامل'],['financial','الرقم المالي'],['birth','تاريخ الميلاد'],['qualification','المؤهل العلمي'],
    ['university','جهة الحصول على المؤهل'],['graduate','سنة التخرج'],['start','تاريخ أول مباشرة'],['appointment_date','تاريخ التعيين'],
    ['entry_grade','الدرجة عند التعيين'],['grade','الدرجة الحالية'],['grade_date','تاريخ الحصول عليها'],['job','الوظيفة الحالية']
  ];
  const criteria=[
    ['أداء الواجب','جودة العمل، المحافظة على أدواته ومواده، والتنسيق في أدائه','45%'],
    ['المواظبة على العمل','استغلال وقت الدوام الرسمي واحترام العمل','15%'],
    ['القدرات','الاستعداد، تقبّل النقد، الابتكار، تحمّل أعباء الوظيفة، حسن التصرف والمحافظة على المظهر','20%'],
    ['العلاقات الإنسانية','التعامل مع الزملاء والرؤساء والجمهور والمشاركة في العمل العام','20%']
  ].map(([label,details,weight])=>[raw('<strong>'+esc(label)+'</strong><br>'+esc(details)),weight,'','','']);
  criteria.push(['المجموع','100%','','','']);
  return `<h3>القسم الأول · بيانات الموظف الأساسية</h3>${staffDetailGrid(person,fields)}
    <div class="staff-print-sign"><span>توقيع الموظف بصحة وسلامة البيانات ........................</span><span>توقيع أمين الوحدة الإدارية والموظف المختص ........................</span></div>
    <h3>القسم الثاني · كفاءة الأداء والصفات الشخصية</h3>${paperTable(['عناصر التقييم','درجة النهاية العظمى','درجة كفاءة الموظف · الرئيس المباشر','درجة الكفاءة المعدلة · الرئيس الأعلى','مبررات تعديل الدرجة'],criteria)}
    <div class="staff-evaluation-comment"><strong>رأي الرئيس المباشر</strong><p>................................................................................................................</p></div>
    <div class="staff-print-sign">${['الرئيس المباشر','الرئيس الأعلى'].map(label=>`<div><strong>${label}</strong><p>الوظيفة والدرجة ....................................</p><p>التوقيع ....................................</p><p>التاريخ ....................................</p></div>`).join('')}</div>`;
}
function staffDocumentReport(kind,people,details={}) {
  const title=staffDocumentTitles[kind], profile=school().profile;
  const markup=people.map(person=>{
    const letter=kind!=='information'&&kind!=='efficiency';
    let body;
    if(kind==='information'){
      body=staffInformationSections.map(([label,fields],i)=>
        `<section><h3>القسم ${['الأول','الثاني','الثالث','الرابع'][i]} · ${label}</h3>${staffDetailGrid(person,fields)}</section>`).join('')+staffPrintSignature(profile);
    }else if(kind==='efficiency'){
      body=staffEfficiencyBody(person);
    }else{
      const date=details.date||(kind==='commencement'?person.start:'')||'........................';
      const recipient=details.recipient||'................................................';
      const reference=details.reference?`<span>رقم الإشارة <bdi>${esc(details.reference)}</bdi></span>`:'';
      const top=`<div class="staff-letter-meta">${reference}<span>التاريخ <bdi>${esc(date)}</bdi></span></div><p><strong>السيد المحترم / ${esc(recipient)}</strong></p>`;
      if(kind==='definition'){
        const columns=[['national','الرقم الوطني'],['financial','الرقم المالي'],['qualification','المؤهل'],
          ['specialty','التخصص'],['bank_account','رقم الحساب'],['bank','المصرف']];
        const role=/معلم|مدرّ?س/.test(person.job||'')?'من أعضاء هيئة التدريس':'من العاملين';
        body=top+`<p>تفيد إدارة المدرسة بأن السيد / <strong>${esc(person.name)}</strong> ${role} بالمدرسة خلال العام الدراسي <bdi>${esc(person.year)}</bdi>، وبياناته موضحة أدناه.</p>`+
          paperTable(labelsFor(columns),[columns.map(([key])=>staffPrintValue(person,key)??'')],title);
      }else if(kind==='continuity'){
        body=top+`<p>تفيد إدارة المدرسة بأن السيد / <strong>${esc(person.name)}</strong> مستمر في العمل لديها حسب سجلاتها للعام الدراسي <bdi>${esc(person.year)}</bdi>${person.job?'، ويشغل وظيفة '+esc(person.job):''}.</p>`;
      }else{
        const columns=[['name','الاسم بالكامل'],['national','الرقم الوطني'],['qualification','المؤهل العلمي'],
          ['specialty','التخصص'],['bank','المصرف'],['bank_branch','الفرع'],['bank_account','رقم الحساب'],['job','الوظيفة']];
        body=top+`<p>نفيدكم ببيانات الموظف أدناه. تاريخ مباشرة العمل بالمدرسة <bdi>${esc(date)}</bdi>.</p>${staffDetailGrid(person,columns)}`;
      }
      body=`<div class="staff-letter">${body}<p>وتفضلوا بقبول فائق الاحترام.</p>${staffPrintSignature(profile)}</div>`;
    }
    return paperFrame(title,person.year,`<div class="staff-report-body${letter?' staff-report-letter':''}">${body}</div>`,{
      variant:letter?'staff-letter':'staff-sheet',profile,authorityLine:person.supervision||'',signatures:false,
      settings:{font:'Tajawal',fontSize:letter?15:13,cellPadding:4}
    });
  }).join('');
  showDocument(title,[],[],markup,'عمودي',null,{fixed:true});
}

const staffRosterDefaults=['job','shift','national','gender'];
actions['staff-roster']=()=>{
  const people=staffRows(filterData('all-staff'));
  const jobs=[...new Set(people.map(person=>person.job).filter(Boolean))];
  const columns=STAFF_FIELDS.filter(([key])=>!['name','year'].includes(key));
  showDialog('طباعة كشف المعلمين',`<form class="stack" data-form="staff-roster">
    <div class="fields tight"><label class="field"><span>الوظيفة (يمكن اختيار متعدد)</span><select name="jobs" multiple>${options(jobs)}</select></label>
    ${field(['shift','الفترة',['صباحية','مسائية']],'',{blank:'الكل'})}</div>
    <fieldset><legend>الأعمدة المراد طباعتها (الاسم ثابت)</legend>
    <div class="btns gap">${btn('تحديد الكل','staff-roster-columns','all','tiny soft')}${btn('إلغاء التحديد','staff-roster-columns','none','tiny soft')}</div>
    <div class="fields tight">${columns.map(([key,label])=>field(['col:'+key,label,'checkbox'],staffRosterDefaults.includes(key))).join('')}</div>
    </fieldset>${submit('طباعة الكشف')}</form>`);
};
actions['staff-roster-columns']=(scope,button)=>{
  for(const input of $$('input[type=checkbox]',button.form))input.checked=scope==='all';
};
forms['staff-roster']=(data,form)=>{
  const jobs=[...form.elements.jobs.selectedOptions].map(option=>option.value);
  const f=filterData('all-staff'), people=staffRows(f).filter(person=>
    (!data.shift||person.shift===data.shift)&&(!jobs.length||jobs.includes(person.job)));
  const columns=STAFF_FIELDS.filter(([key])=>key!=='name'&&key!=='year'&&Boolean(data['col:'+key]));
  const batchSize=10, pages=Math.max(1,Math.ceil(columns.length/batchSize));
  const title='كشف المعلمين';
  const row=(person,i,fields)=>[i+1,person.name,...fields.map(([key])=>{
    const value=staffPrintValue(person,key);
    return typeof value==='boolean'?(value?'نعم':'لا'):value??'';
  })];
  const headers=['ر.م','الاسم',...labelsFor(columns)], rows=people.map((person,i)=>row(person,i,columns));
  const orientation=columns.length>5?'أفقي':'عمودي';
  const markup=Array.from({length:pages},(_,i)=>{
    const fields=columns.slice(i*batchSize,(i+1)*batchSize);
    return paperPages(title,f.year,['ر.م','الاسم',...labelsFor(fields)],[{rows:people.map((person,j)=>row(person,j,fields)),
      meta:pages>1?'الأعمدة '+(i*batchSize+1)+'–'+(i*batchSize+fields.length):''}],
      {orientation,font:'Tajawal',fontSize:13,rowsPerPage:24}).markup;
  }).join('');
  showDocument(title,headers,rows,markup,orientation,null,{fixed:true});
};

const staffAttendanceTitles={
  signatures:'كشف توقيع الحضور والانصراف',
  absences:'كشف حصر أيام الغياب للموظفين',
  'bank-absences':'كشف الغياب حسب المصرف والفرع'
};
function staffAttendanceReportMenu() {
  return `<div class="report-buttons">${Object.entries(staffAttendanceTitles).map(([kind,label])=>
    btn((kind==='bank-absences'?'':'طباعة ')+label,'staff-attendance-report',kind,'outline-blue')).join('')}</div>`;
}
actions['staff-attendance-report']=kind=>{
  if(!Object.hasOwn(staffAttendanceTitles,kind))throw new Error('كشف الحضور غير متاح.');
  const f=filterData('staff-attendance',{date:dayISO()}), people=attendanceRows(true,{...f,shift:'',status:''});
  const choices=key=>[...new Set(people.map(person=>person[key]).filter(Boolean))].sort(localeCompare);
  const list=(key,label)=>field([key,label,choices(key)],'',{blank:'الكل'});
  const signatures=kind==='signatures';
  const scope=signatures?
    field(['date','التاريخ','date',true],f.date)+field(['gender','الجنس',['ذكر','أنثى']],'',{blank:'الكل'})+
      `<label class="field"><span>الوظيفة (يمكن اختيار متعدد)</span><select name="jobs" multiple>${options(choices('job'))}</select></label>`:
    field(['month','الشهر','month',true],f.date.slice(0,7))+(kind==='bank-absences'?list('bank','المصرف')+list('bank_branch','الفرع'):'');
  showDialog(staffAttendanceTitles[kind],`<form class="stack" data-form="staff-attendance-special" data-kind="${kind}">
    <div class="fields tight">${scope}${field(['shift','الفترة',['صباحية','مسائية']],f.shift,{blank:'الكل'})}</div>${submit('معاينة الطباعة')}</form>`);
};
forms['staff-attendance-special']=(data,form)=>{
  const {kind}=form.dataset;
  if(!Object.hasOwn(staffAttendanceTitles,kind))throw new Error('كشف الحضور غير متاح.');
  const f=filterData('staff-attendance',{date:dayISO()});
  const bankReport=kind==='bank-absences', signatures=kind==='signatures';
  const jobs=signatures?[...form.elements.jobs.selectedOptions].map(option=>option.value):[];
  const people=attendanceRows(true,{...f,shift:data.shift,status:''}).filter(person=>
    (!data.gender||person.gender===data.gender)&&(!jobs.length||jobs.includes(person.job))&&
    (!bankReport||(!data.bank||person.bank===data.bank)&&(!data.bank_branch||person.bank_branch===data.bank_branch)));
  const {dates,label}=attendanceReportDates(signatures?data.date:data.month+'-01',signatures?'يومي':'شهري');
  const meta=[label,data.shift,bankReport&&data.bank,bankReport&&data.bank_branch].filter(Boolean)
    .map(value=>'<span>'+esc(value)+'</span>').join('');
  const title=staffAttendanceTitles[kind];
  if(signatures){
    const rows=people.map((person,i)=>[i+1,person.name,person.job||'',person.shift||'','','','','']);
    return schoolListReport(title,f.year,['ر.م','اسم الموظف','الوظيفة','الفترة','وقت الحضور','التوقيع','وقت الانصراف','التوقيع'],[{rows,meta}],
      {orientation:'أفقي',font:'Tajawal',fontSize:14,rowsPerPage:22});
  }
  const records=school().staffAttendance;
  const rows=people.flatMap(person=>{
    const absent=dates.filter(({date})=>records[f.year+'|'+date]?.[person.id]?.[0]==='غائب').map(({day})=>day);
    return absent.length?[[person.name,person.job||'',person.financial||'',
      ...(bankReport?[person.bank||'',person.bank_branch||'',person.bank_account||'']:[]),absent.join('، '),absent.length]]:[];
  }).map((row,i)=>[i+1,...row]);
  const headers=['ر.م','اسم الموظف','الوظيفة','الرقم المالي',...(bankReport?['المصرف','الفرع','رقم الحساب']:[]),'أيام الغياب','عدد الأيام'];
  schoolListReport(title,f.year,headers,[{rows,meta}],{orientation:bankReport?'أفقي':'عمودي',font:'Tajawal',fontSize:13,rowsPerPage:24});
};
