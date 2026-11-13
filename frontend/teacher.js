const teacherFilterDefaults={limit:'20',job:'',status:''};
function teacherAccounts(f=filterData('manage-teacher-accounts',teacherFilterDefaults)) {
  const s=school();
  return onlyYear(s.staff,f.year).filter(row=>{
    const code=s.teacherCodes[row.id];
    return (s.teachers.includes(row.id)||code||/معلم/.test(row.job))&&(!f.job||f.job===row.job)&&
      (!f.status||(code?.active?'active':'inactive')===f.status)&&finds([row.name,row.national,code?.pin].join(' '),f.q);
  }).sort((a,b)=>localeCompare(a.name,b.name));
}
function teacherAccountTime(value) {
  if(!value)return '—';
  const date=new Date(value);
  return value.includes('T')&&!Number.isNaN(+date)?new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Tripoli',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(date):value;
}
pages['manage-teacher-accounts']=()=>{
  const pageName='manage-teacher-accounts', f=filterData(pageName,teacherFilterDefaults), s=school();
  const all=teacherAccounts({...f,job:'',status:'',q:''}), rows=teacherAccounts(f), paging=paginate(pageName,rows,f);
  const registered=all.filter(x=>s.teacherCodes[x.id]?.configured||s.teacherCodes[x.id]?.pin);
  const counts=[
    ['إجمالي الحسابات المسجلة',registered.length,'حساب','group'],
    ['الحسابات المفعلة',registered.filter(x=>s.teacherCodes[x.id].active).length,'مفعل','check'],
    ['الحسابات الموقوفة / المعطلة',registered.filter(x=>!s.teacherCodes[x.id].active).length,'معطل','lock'],
    ['سجلوا الدخول للبوابة',registered.filter(x=>s.teacherCodes[x.id].last).length,'معلم','enter']
  ];
  const summary=`<section class="card teacher-summary"><div class="card-header toolbar"><h3>ملخص بيانات حسابات المعلمين</h3><span class="year">السنة الدراسية: <bdi>${esc(f.year)}</bdi></span></div><div class="pad grid4">${counts.map(([label,n,unit,glyph])=>`<div class="teacher-count">${icon(glyph)}<span>${label}</span><strong>${n} <small>${unit}</small></strong></div>`).join('')}</div></section>`;
  const search=`<form data-form="filter" data-page="${pageName}" class="teacher-search" role="search">${field(['q','بحث','search'],f.q,{placeholder:'ابحث باسم المعلم، الرقم الوطني، كود الدخول'})}${submit('بحث','outline-blue')}</form>`;
  const headings=['#','اسم المعلم','الرقم الوطني','كود الدخول (PIN)','الوظيفة / الصفة','حالة الحساب','آخر دخول','إجراءات'];
  const matrix=paging.rows.map((x,i)=>{
    const code=s.teacherCodes[x.id];
    const toggle=code?.configured||code?.pin?`<label class="teacher-switch"><input type="checkbox" data-teacher-switch="${esc(x.id)}" aria-label="${esc('تفعيل حساب '+x.name)}"${code.active?' checked':''}><span>${code.active?'مفعل':'معطل'}</span></label>`:'غير معيّن';
    const tools=btn('تعديل','teacher-code',x.id,'tiny outline-blue')+btn('طباعة','teacher-card',x.id,'tiny outline-dark');
    return [paging.offset+i+1,x.name,x.national,raw(`<bdi class="teacher-pin-chip">${code?.pin?esc(code.pin):code?.configured?'مُعيّن':'—'}</bdi>`),x.job,raw(toggle),teacherAccountTime(code?.last),raw('<div class="row-tools">'+tools+'</div>')];
  });
  const toolbar=`<div class="card-header teacher-list-header"><div class="toolbar"><h3>المعلمون المطابقون للفلاتر</h3>${search}</div><div class="btns">${btn('طباعة جميع البطاقات','teacher-card','all','outline-dark')}${portalButton('رابط بوابة المعلمين','teachers','outline-blue')}${btn('إعدادات بوابة المعلمين','teacher-settings','','outline-blue')}</div></div>`;
  return header('إدارة بوابة المعلمين','','')+`<div class="stack teacher-admin">${summary}${card(filterForm(pageName,[FILTER_YEAR,['job','الوظيفة / الصفة',[...new Set(all.map(x=>x.job).filter(Boolean))]],['status','حالة الحساب',[['active','مفعل'],['inactive','معطل']]],['limit','عدد المعلمين',['10','20','50','100','200']]],f),'الفلاتر')}<section class="card">${toolbar}<div class="pad">${table(headings,matrix,{className:'table-dark teacher-accounts-table'})}${paging.tools}</div></section>${card('<p class="muted">عدد المعلمين المطابقين: '+rows.length+'</p>','معلومات النتائج')}</div>`;
};
function randomTeacherPin() {
  let value;
  do value=crypto.getRandomValues(new Uint32Array(1))[0];while(value>=2**32-(2**32%9000));
  return String(1000+value%9000);
}
actions['teacher-code']=id=>{
  const x=lookup('staff',id), code=school().teacherCodes[id]||{};
  showDialog('تعديل بيانات دخول المعلم',`<form data-form="teacher-code" data-id="${esc(id)}" class="stack">
    ${field(['name','اسم المعلم','text',true],x.name,{maxlength:150})}
    ${field(['national','الرقم الوطني (المستخدم لتسجيل الدخول)','text',true],x.national,{inputmode:'numeric',maxlength:12})}
    ${field(['pin','كود الدخول السري (PIN)','text',!code.configured&&!code.pin],code.pin||'',{inputmode:'numeric',maxlength:8,placeholder:code.configured?'اتركه فارغًا للإبقاء على الرمز الحالي':''})}
    <div class="btns">${btn('توليد عشوائي','teacher-pin-generate','','outline-blue')}${field(['active','تفعيل الحساب','checkbox'],code.active??true)}</div>${submit('حفظ التعديلات')}</form>`);
};
actions['teacher-pin-generate']=(_value,button)=>{
  const input=button.form.elements.pin;
  input.value=randomTeacherPin();input.focus();input.select();
};
async function saveTeacherAccount(payload) {
  await runWorkflow('teacher-code',payload,s=>{
    const {id,name,national,pin,active}=payload;
    if(name!==undefined)updateTeacherAccount(s,id,name,national);
    const prior=s.teacherCodes[id]||{};
    if(!pin&&!prior.pin)throw new Error('أدخل رمز الدخول أولًا.');
    s.teacherCodes[id]={...prior,pin:pin||prior.pin,active};
  });
}
forms['teacher-code']=async(data,form)=>{
  const id=form.dataset.id,pin=digits(data.pin),national=digits(data.national),active=Boolean(data.active);
  if(pin&&!/^\d{4,8}$/.test(pin))throw new Error('أدخل كودًا من 4 إلى 8 أرقام.');
  await saveTeacherAccount({id,pin,active,national,name:str(data.name)});
  $('#modal').close();render();flash('حُفظت بيانات دخول المعلم.');
};
document.addEventListener('change',async event=>{
  const control=event.target;
  if(!control.matches('[data-teacher-switch]'))return;
  const active=control.checked;
  control.disabled=true;
  try{await saveTeacherAccount({id:control.dataset.teacherSwitch,active});render();flash('حُفظت حالة الحساب.');}
  catch(error){control.checked=!active;control.disabled=false;flash(error.message,'error');}
});
const teacherSubjectOptions=()=>Object.entries(SUBJECTS).filter(([key])=>!['ex','un'].includes(key));
let teacherSettingsTab='locks';
function teacherSettingsDialog() {
  const s=school(), f=filterData('manage-teacher-accounts'), flags=teacherFlags(s);
  const lock=s.teacherSettings;
  const lockRows=(lock.locks||[]).filter(x=>x.year===f.year).map(x=>[x.cls||'الكل',x.section||'الكل',SUBJECTS[x.subject]||'الكل',TEACHER_PERIODS.find(([key])=>key===x.period)?.[1]||'الكل',raw(btn('فتح الرصد','teacher-lock-remove',x.id,'tiny outline-blue'))]);
  const locks=`<form data-form="teacher-global-lock" class="teacher-lock-global btns">${field(['lockAll','قفل شامل لرصد الدرجات','checkbox'],lock.lockAll)}${submit('حفظ الإعدادات')}</form>
    <form data-form="teacher-lock-add" class="fields teacher-lock-add"><input type="hidden" name="year" value="${esc(f.year)}">
    ${field(['cls','الصف الدراسي',CLASSES.slice(2)],'',{blank:'الكل (كافة الصفوف)'})}
    ${field(['section','الشعبة / الفصل',SECTIONS],'',{blank:'الكل (كافة الشعب)'})}
    ${field(['subject','المادة الدراسية',teacherSubjectOptions()],'',{blank:'الكل (كافة المواد)'})}
    ${field(['period','الفترة / الفصل',TEACHER_PERIODS],'',{blank:'الكل (كافة الفترات والفصول)'})}<div class="form-actions">${submit('قفل الآن','red')}</div></form>
    <h3 class="gap">قائمة أقفال الرصد المخصصة الحالية</h3>${table(['الصف','الشعبة','المادة','الفترة','إجراء'],lockRows)}`;
  const features=`<form data-form="teacher-settings" class="stack">${Object.entries(TEACHER_OPTIONS).map(([key,label])=>field([key,label,'checkbox'],flags[key])).join('')}${submit('حفظ الإعدادات')}</form>`;
  const dialog=`<div class="panel-tabs teacher-settings-tabs">${[['locks','إغلاق رصد الدرجات'],['features','صفحات ووظائف البوابة']].map(([id,label])=>`<button type="button" class="panel-tab${teacherSettingsTab===id?' active':''}" data-action="teacher-settings-tab" data-value="${id}">${label}</button>`).join('')}</div><div class="gap">${teacherSettingsTab==='locks'?locks:features}</div>`;
  showDialog('إعدادات وصلاحيات بوابة المعلمين',dialog,'teacher-settings-dialog');
}
actions['teacher-settings']=()=>{teacherSettingsTab='locks';teacherSettingsDialog();};
actions['teacher-settings-tab']=tab=>{teacherSettingsTab=tab;teacherSettingsDialog();};
async function saveTeacherSettings(changes) {
  const s=school(), config={...teacherFlags(s),lockAll:Boolean(s.teacherSettings.lockAll),...changes};
  await runWorkflow('teacher-settings',config,s=>{s.teacherSettings={...s.teacherSettings,...normalizeTeacherSettings(config)};});
  render();teacherSettingsDialog();flash('حُفظت إعدادات بوابة المعلمين.');
}
forms['teacher-settings']=data=>saveTeacherSettings(Object.fromEntries(Object.keys(TEACHER_OPTIONS).map(key=>[key,Boolean(data[key])])));
forms['teacher-global-lock']=data=>saveTeacherSettings({lockAll:Boolean(data.lockAll)});
forms['teacher-lock-add']=async data=>{
  await runWorkflow('teacher-lock',data,s=>teacherGradeLock(s,data,uid()));
  teacherSettingsDialog();flash('أُغلق الرصد للنطاق المحدد.');
};
actions['teacher-lock-remove']=async id=>{
  await runWorkflow('teacher-lock',{remove:id},s=>{s.teacherSettings.locks=(s.teacherSettings.locks||[]).filter(row=>row.id!==id);});
  teacherSettingsDialog();flash('أُعيد فتح الرصد للنطاق المحدد.');
};
actions['teacher-card']=id=>{
  const f=filterData('manage-teacher-accounts',teacherFilterDefaults), s=school(), entries=id==='all'?teacherAccounts(f):[lookup('staff',id)];
  const rows=entries.filter(x=>s.teacherCodes[x.id]?.pin&&x.national);
  if(!rows.length)throw new Error('عيّن كود الدخول في حساب المعلم لتتمكن من طباعة البطاقة.');
  const url=portalURL('teachers');
  const portalAddress=location.protocol==='file:'?'ملف منظومة الطلبة ← دخول بوابة المعلم':url;
  const markup=rows.map(x=>{
    const badge=s.teacherCodes[x.id].pin;
    return `<article class="teacher-slip" dir="rtl"><header class="teacher-slip-header"><strong>${esc(s.profile.name)}</strong><span>بوابة المعلمين</span></header>
      <div class="teacher-slip-name">${esc(x.name)}</div><div class="teacher-slip-meta">الرقم الوطني: <strong><bdi>${esc(x.national)}</bdi></strong> · السنة الدراسية: <strong><bdi>${esc(x.year)}</bdi></strong></div>
      <div class="teacher-slip-pin"><div>كود الدخول السري (PIN)</div><strong><bdi>${esc(badge)}</bdi></strong></div>
      <footer class="teacher-slip-footer"><span>رابط البوابة:</span><bdi>${esc(portalAddress)}</bdi></footer></article>`;
  }).join('');
  showDocument('طباعة بطاقات دخول المعلمين',[],[],`<section class="teacher-print-sheet"><div class="teacher-print-grid">${markup}</div></section>`,'عمودي',null,{margin:10,fixed:true});
};

let teacherSession='',teacherData=null,teacherSchoolId='',teacherTab='home',teacherHomeworkTab='add',teacherFilters={attendanceMode:'daily'};
function resetTeacher() {
  teacherSession='';teacherData=null;teacherSchoolId='';teacherTab='home';teacherHomeworkTab='add';teacherFilters={attendanceMode:'daily'};
}
function teacherAccessData() {
  if(sharedMode)return teacherData;
  const s=state.schools[teacherSchoolId];
  const staff=s?.staff.find(x=>x.id===teacherSession&&x.year===YEAR&&s.teacherCodes[x.id]?.active);
  return staff?teacherWorkspace(s,staff,teacherFilters):null;
}
function teacherLoginMarkup() {
  const codeValue=new URLSearchParams(location.search).get('school')||sharedPayload.schoolCode||(sharedDemo?'DEMO':'');
  const schoolField=sharedMode&&!codeValue?sharedSchoolInput():sharedMode?`<input type="hidden" name="school" value="${esc(codeValue)}">`:'';
  return `<main class="teacher-entry"><section class="teacher-login-card" aria-labelledby="teacher-login-title">
    <div class="wordmark"><span class="emblem" aria-hidden="true">${icon('cap')}</span><div><strong>منظومة الطلبة</strong><small>شؤون الطلبة والامتحانات</small></div></div>
    <h1 id="teacher-login-title" tabindex="-1">بوابة المعلمين</h1>
    <p class="teacher-login-lead">رصد الحصص والغياب اليومي ودرجات أعمال السنة</p>
    <form data-form="teacher-login" class="teacher-login-form">
    ${schoolField}
    <label class="teacher-login-field"><span>${icon('id')} الرقم الوطني للمعلم:</span><input name="national" type="text" inputmode="numeric" autocomplete="username" maxlength="12" placeholder="أدخل الرقم الوطني الخاص بك" required autofocus></label>
    <div class="teacher-login-field"><label for="teacher-access-pin">${icon('key')} كود الدخول السري (PIN):</label>
    <div class="teacher-pin-input"><input id="teacher-access-pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="8" placeholder="أدخل كود المعلم السري" required><button type="button" aria-label="إظهار كود الدخول" aria-pressed="false" data-action="teacher-show-pin">${icon('eye')}</button></div>
    <small>الكود الخاص المسلّم لك من قبل إدارة مدرستك.</small></div>
    <button class="teacher-submit" type="submit">${icon('enter')} دخول إلى البوابة</button>
    </form>
    <footer>${icon('shield')} نظام آمن ومستقل لرصد الحصص والدرجات</footer>
    ${!sharedMode||sharedDemo?'<div class="teacher-demo-link">'+btn('دخول بحساب معلم تجريبي','teacher-demo-login','','tiny outline-blue')+'</div>':''}
    </section></main>`;
}
actions['teacher-show-pin']=(_value,button)=>{
  const input=$('#teacher-access-pin'), visible=input.type==='password';
  input.type=visible?'text':'password';
  button.setAttribute('aria-pressed',String(visible));
  button.setAttribute('aria-label',visible?'إخفاء كود الدخول':'إظهار كود الدخول');
  button.innerHTML=icon(visible?'eyeOff':'eye');
};
const groupLabel=group=>[group.cls,group.section,group.label,group.stream,group.shift].filter(Boolean).join(' · ');
function teacherGroupField(data,label='اختر الفصل والمادة:',required=false) {
  return field(['assignment',label,data.groups.map(group=>[group.id,groupLabel(group)]),required],data.assignment,{blank:'-- اختر الفصل والمادة --'});
}
function teacherHeading(title,caption) {
  return `<header class="teacher-page-heading"><h1 tabindex="-1">${esc(title)}</h1><p>${esc(caption)}</p></header>`;
}
function teacherPanel(title,glyph,body,actionsMarkup='',className='') {
  return `<section class="card teacher-panel ${className}">${title?`<div class="teacher-panel-head toolbar"><h2>${icon(glyph)} ${esc(title)}</h2>${actionsMarkup}</div>`:''}<div class="pad">${body}</div></section>`;
}
function teacherEmpty(title,message='',glyph='book',action='') {
  return `<div class="teacher-empty">${icon(glyph)}<h3>${esc(title)}</h3>${message?'<p>'+esc(message)+'</p>':''}${action}</div>`;
}
function teacherNavButton(key,label,glyph,style='soft') {
  return `<button type="button" class="btn ${style}" data-action="teacher-tab" data-value="${key}">${icon(glyph)} ${esc(label)}</button>`;
}
function teacherHome(data) {
  const {flags,groups,school:profile}=data;
  const pending=data.inquiries.filter(row=>!row.answer);
  const weekday=data.todayName;
  const date=data.today.split('-').reverse().join('/');
  const stats=[
    ['الفصول المسندة',new Set(groups.map(group=>group.cls+'|'+group.section)).size,'group','blue'],
    ['المواد الدراسية',new Set(groups.map(group=>group.label)).size,'book','green'],
    ['حصص اليوم ('+weekday+')',data.todaySlots.length,'clock','yellow'],
    ['إجمالي الحصص الأسبوعية',data.weekCount,'calendar','cyan']
  ];
  const hero=`<header class="teacher-welcome toolbar"><div><h1 tabindex="-1">أهلاً بك، ${esc(data.staff.name)}</h1><p>اليوم: ${esc(weekday)} (<bdi>${date}</bdi>) <span> | </span> السنة الدراسية: <bdi>${esc(data.staff.year)}</bdi></p></div>${flags.schedule?teacherNavButton('schedule','عرض جدولي الأسبوعي الكامل','calendar','soft'):''}</header>`;
  const countCards=`<div class="teacher-home-stats">${stats.map(([label,count,glyph,color])=>`<article class="card teacher-stat"><div><p>${esc(label)}</p><strong>${count}</strong></div><span class="teacher-stat-icon ${color}">${icon(glyph)}</span></article>`).join('')}</div>`;
  const inbox=flags.homework&&flags.inquiries?teacherPanel('استفسارات وملاحظات أولياء الأمور','chat',
    pending.length?teacherInquiryTable(pending):teacherEmpty('لا توجد استفسارات جديدة من أولياء الأمور حالياً','تظهر استفسارات أولياء الأمور عن فصولك وموادك هنا.','chat'),
    teacherNavButton('inquiries','إدارة الاستفسارات والرد عليها ('+pending.length+')','chat','warning'),'teacher-home-inbox'):'';
  const today=flags.schedule?teacherPanel('جدول حصص اليوم ('+weekday+')','clock',data.todaySlots.length?
    table(['الحصة','المادة','الصف والفصل','الفترة'],data.todaySlots.map(row=>[PERIODS[row.lesson-1],row.subject,row.cls+' · '+row.section,row.shift]),{className:'teacher-today'}):
    teacherEmpty('لا توجد حصص مجدولة لك اليوم ('+weekday+')','يمكنك استعراض جدولك الأسبوعي لمعرفة مواعيد حصص الأيام الأخرى.','calendar',teacherNavButton('schedule','عرض الجدول الأسبوعي','calendar','tiny outline-blue')),'','teacher-home-today'):'';
  const assigned=teacherPanel('فصولي وموادي المسندة','teacher',groups.length?
    table(['الصف والفصل','المادة','الحصص'],groups.map(x=>[x.cls+' · '+x.section,x.label,x.lessons]),{className:'teacher-today'}):
    teacherEmpty('لم يتم إسناد فصول لك بعد من قبل إدارة المدرسة في جدول الحصص.','','teacher'),'','teacher-home-today');
  const quick=`<section class="card teacher-quick"><h2>وصول سريع للمهام اليومية:</h2><div class="teacher-quick-grid">${flags.attendance?teacherNavButton('attendance','رصد الحضور اليومي','check','outline-green'):''}${teacherNavButton('grades','رصد درجات الطلاب','cap','outline-blue')}${flags.homework?teacherNavButton('homework','الواجبات والملاحظات','book','outline-warning'):''}${flags.schedule?teacherNavButton('schedule','طباعة جدولي الأسبوعي','print','outline-info'):''}</div></section>`;
  return hero+countCards+inbox+`<div class="teacher-home-grid">${today}${assigned}</div>`+quick;
}
function teacherGradeTitle(current,data) {
  if(!current)return '';
  if(data.gradeFields.length===2&&/^أعمال فصل/.test(current.label))return current.index===0?'أعمال الفصل الدراسي الأول':'أعمال الفصل الدراسي الثاني';
  return current.label;
}
function teacherGradePage(data) {
  const {gradeFields,students}=data;
  const current=gradeFields.find(x=>x.index===Number(teacherFilters.index))||gradeFields[0];
  const label=teacherGradeTitle(current,data);
  const fallback=[['0','أعمال الفصل الدراسي الأول'],['2','أعمال الفصل الدراسي الثاني']];
  const periods=gradeFields.length?gradeFields.map(x=>[String(x.index),teacherGradeTitle(x,data)+(x.locked?' (مغلق للرصد)':' ✓ (متاحة للرصد)')]):fallback.map(([id,title])=>[id,title+' ✓ (متاحة للرصد)']);
  const select=`<form class="teacher-form-grid cols2" data-form="teacher-filter">${teacherGroupField(data)}${field(['index','الفصل الدراسي:',periods],String(current?.index??0))}</form>`;
  const group=data.groups.find(x=>x.id===data.assignment);
  const heading=`<div class="teacher-panel-head teacher-grades-heading toolbar"><div><h2>${group?esc(group.cls+' ('+group.section+') - مادة: '+group.label):'() - مادة:'}</h2><small>العدد الإجمالي: ${students.length} طالب${label?' | رصد أعمال: '+esc(label.replace(/^أعمال\s+/,' ')):''}</small></div>${current&&current.max!==null?'<span class="teacher-badge cyan">الدرجة الكبرى الإجمالية: '+current.max+'</span>':''}</div>`;
  const intro=teacherHeading('رصد درجات أعمال السنة','إدخال الدرجات المفصلة مع جمع تلقائي للمجموع وحفظ مباشر');
  const filtersPanel=teacherPanel('تصفية الفصل والمادة','filter',select,'','teacher-filter-panel');
  if(!current||!students.length)return intro+filtersPanel+`<section class="card teacher-panel">${heading}<div class="pad">${teacherEmpty('لا يوجد طلاب مسجلين في هذا الفصل حالياً','يرجى التأكد من اختيار الفصل أو الشعبة الصحيحة من القائمة أعلاه.','people')}</div></section>`;
  const blocked=students.every(row=>!row.fields.some(f=>f.index===current.index&&!f.locked));
  const rows=students.map((x,i)=>{
    const j=x.fields.findIndex(f=>f.index===current.index), period=x.fields[j], mark=x.marks[j]??'';
    const attrs=`class="table-input" name="mark!${esc(x.id)}" data-prior="${esc(mark)}" aria-label="${esc(x.name+' · '+label)}"${!period||period.locked?' disabled':''}`;
    const input=!period?'—':period.choices.length?`<select ${attrs}>${options(period.choices,mark,'—')}</select>`:
      `<input type="text" inputmode="decimal" maxlength="10" value="${esc(mark)}" data-max="${period.max}" ${attrs}>`;
    return [i+1,x.reg,x.name,raw(input),raw(`<span data-teacher-total="${esc(x.id)}">${esc(mark===''?'—':mark)}</span>`)];
  });
  const gradeLabel=raw(esc(label)+(current.max===null?'':'<small>الدرجة الكبرى: '+current.max+'</small>'));
  const editor=`<form data-form="teacher-grades" data-index="${current.index}" class="stack">${table(['#','رقم القيد','اسم الطالب',gradeLabel,'المجموع'],rows,{className:'table-dark teacher-marks'})}${blocked?notice('رصد هذه الفترة مغلق من إدارة المدرسة.','warn'):'<div class="toolbar">'+submit('حفظ الدرجات')+'<span role="status" class="muted small" id="teacher-grade-state"></span></div>'}</form>`;
  return intro+filtersPanel+`<section class="card teacher-panel">${heading}<div class="pad">${editor}</div></section>`;
}
function teacherAttendancePage(data) {
  const group=data.groups.find(x=>x.id===data.assignment);
  const slots=data.dateSlots.map(x=>[x.id,PERIODS[x.lesson-1]+' · '+x.subject+' · '+x.cls+' · '+x.section]);
  const caption='التاريخ: ('+data.day+')'+(data.schoolDay?'':' عطلة');
  const select=`<form data-form="teacher-filter" class="teacher-form-grid cols3">${field(['date',caption,'date',true],data.date)}
    ${field(['scheduledSlot','حصص المعلم حسب الجدول الدراسي',slots],teacherFilters.scheduledSlot||'',{blank:slots.length?'-- اختر الحصة --':'لا توجد حصص مجدولة'})}
    ${teacherGroupField(data,'الفصل المسند إليك:')}</form>`;
  const off=!data.schoolDay?notice('تنبيه: هذا اليوم عطلة رسمية للمدرسة ('+data.day+' - '+data.date+')','warn'):'';
  const rows=data.students.map((x,i)=>[i+1,x.reg,x.name,raw(`<select class="table-input" name="mark!${esc(x.id)}" data-prior="${esc(x.attendance)}" aria-label="${esc('حضور '+x.name)}"${data.schoolDay?'':' disabled'}>${options(TEACHER_ATTENDANCE,x.attendance,'—')}</select>`)]);
  const tools=data.schoolDay&&rows.length?`<div class="toolbar"><label class="check"><input type="checkbox" data-teacher-all="حاضر"> تحضير الكل «حاضر»</label>${submit('حفظ الحضور')}</div>`:'';
  const editor=rows.length?`<form data-form="teacher-attendance" class="stack">${tools}${table(['#','رقم القيد','اسم الطالب','الحالة'],rows,{className:'table-dark'})}</form>`:
    teacherEmpty('لا توجد بيانات طلاب لهذا الفصل أو لم يتم اختيار الفصل بعد.','','people');
  const title='قائمة الطلاب: '+(group?group.cls+' - '+group.section:'- فصل ()');
  const action=!data.schoolDay?'<span class="teacher-badge slate">عطلة مدرسية (الرصد مغلق)</span>':'';
  return teacherHeading('رصد الحضور والغياب اليومي','تحضير طلاب الفصل وحفظ السجلات فورياً في المنظومة وبوابة ولي الأمر')+
    teacherPanel('', 'filter',select,'','teacher-att-filter')+off+teacherPanel(title,'people',editor,action);
}
function teacherScheduleTable(data,printing=false) {
  const rows=data.schedule.map(([day,...values])=>[day,...values.map(value=>value==='-'?raw('<span class="teacher-no-lesson">-</span>'):raw('<span class="teacher-lesson">'+esc(value)+'</span>'))]);
  return table(['اليوم / الحصة',...data.periods],rows,{className:'teacher-week'+(printing?' teacher-week-print':''),name:'جدول الحصص الأسبوعي'});
}
function teacherScheduleCard(data,printing=false) {
  const heading='<header class="teacher-panel-head toolbar"><h2>'+icon('clock')+' مواعيد الحصص خلال الأسبوع</h2><span class="teacher-badge cyan">العام الدراسي: <bdi>'+esc(data.staff.year)+'</bdi></span></header>';
  return `<section class="card teacher-panel teacher-schedule-panel${printing?' teacher-schedule-paper':''}">${heading}<div class="pad">${teacherScheduleTable(data,printing)}</div></section>`;
}
function teacherSchedulePage(data) {
  return `<header class="teacher-page-heading teacher-schedule-heading toolbar"><div><h1 tabindex="-1">${icon('calendar')} جدول الحصص الأسبوعي</h1><p>جدول توزيع الحصص الدراسية للأستاذ/ة ${esc(data.staff.name)}</p></div><button type="button" class="btn" data-action="teacher-schedule-print">${icon('print')} طباعة الجدول</button></header>`+teacherScheduleCard(data);
}
function teacherInquiryTable(rows) {
  return table(['الطالب','الواجب','الاستفسار','الرد','إجراء'],rows.map(x=>[x.studentName,x.title,x.text,x.answer||'—',raw(btn(x.answer?'تعديل الرد':'الرد','teacher-inquiry-answer',x.id,'tiny outline-blue'))]),{className:'teacher-homework-table'});
}
function teacherHomeworkPage(data) {
  const {flags}=data;
  const items=[
    ...(flags.addHomework?[['add','نشر واجب جديد','add']]:[]),
    ...(flags.listHomework?[['list','قائمة الواجبات المنشورة ('+data.homeworkCount+')','list']]:[]),
    ...(flags.notes?[['note','إرسال ملاحظة لولي أمر طالب','edit']]:[]),
    ...(flags.inquiries?[['inquiries','استفسارات أولياء الأمور ('+data.inquiries.length+')','chat']]:[])
  ];
  if(!items.some(([key])=>key===teacherHomeworkTab))teacherHomeworkTab=items[0]?.[0]||'';
  const add=()=>`<form data-form="teacher-homework" class="stack teacher-homework-form">
    <div class="teacher-form-grid cols3">${teacherGroupField(data,'اختر الفصل والمادة:',true)}${field(['due','تاريخ التسليم المطلوب:','date',true],data.today)}
    ${field(['attachment','مرفق اختياري (PDF أو صورة):','file'],'',{accept:'application/pdf,.pdf,'+LOGO_ACCEPT})}</div>
    ${field(['title','عنوان الواجب (موجز):','text',true],'',{maxlength:140,placeholder:'مثال: حل تدريبات الدرس الثاني ص 45'})}
    ${field(['text','تفاصيل الواجب والتعليمات للطلاب:','textarea',true],'',{maxlength:2400,placeholder:'اكتب المطلوب بالتفصيل، رقم التمارين، ملاحظات الحل...'})}
    ${submit('نشر الواجب لجميع أولياء الأمور')}</form>`;
  const homework=()=>data.homework.length?table(['التاريخ','الصف والفصل','المادة','العنوان','الواجب','موعد التسليم','المرفق'],data.homework.map(row=>[row.date,row.cls+' · '+row.section,row.subject,row.title,row.text,row.due||'—',raw(row.attachmentName?btn('تنزيل المرفق','homework-attachment',row.id,'tiny outline-blue'):'—')]),{className:'table-dark teacher-homework-table'}):
    teacherEmpty('لا توجد واجبات منشورة حتى الآن.','','book');
  const note=()=>`<form data-form="teacher-note" class="stack teacher-homework-form"><div class="teacher-form-grid cols3">${teacherGroupField(data,'اختر الفصل والمادة المسندة:',true)}${field(['student','اختر الطالب:',data.students.map(x=>[x.id,x.name]),true],'',{blank:'-- اختر الطالب --'})}
    ${field(['category','نوع الملاحظة:',TEACHER_NOTE_TYPES,true],TEACHER_NOTE_TYPES[0][0])}</div>
    ${field(['text','نص الملاحظة الموجهة لولي الأمر:','textarea',true],'',{maxlength:1500,placeholder:'اكتب الملاحظة بوضوح لتصل إلى بوابة ولي الأمر باسمك والمادة المسندة لك...'})}${submit('إرسال الملاحظة لولي الأمر')}</form>
    ${data.notes.length?'<div class="gap">'+table(['التاريخ','الطالب','النوع','الملاحظة'],data.notes.map(x=>[x.date,x.student,x.category||'—',x.text]),{className:'teacher-homework-table'})+'</div>':''}`;
  const inquiries=()=>`<h2 class="teacher-inquiry-heading">استفسارات أولياء الأمور حول المستوى والتحصيل العلمي</h2>${data.inquiries.length?teacherInquiryTable(data.inquiries):teacherEmpty('لا توجد استفسارات من أولياء الأمور حالياً.','','chat')}`;
  const panels={add, list:homework, note, inquiries};
  const tabs=`<div class="teacher-homework-tabs" aria-label="الواجبات والملاحظات">${items.map(([key,label,glyph])=>`<button type="button" data-action="teacher-homework-tab" data-value="${key}" class="${key===teacherHomeworkTab?'active':''}" aria-pressed="${key===teacherHomeworkTab}">${icon(glyph)} ${label}</button>`).join('')}</div>`;
  return teacherHeading('الواجبات والملاحظات المدرسية','نشر الواجبات اليومية وكتابة الملاحظات التقديرية والسلوكية لتظهر في بوابة ولي الأمر')+`<section class="card teacher-panel teacher-homework">${tabs}<div class="pad">${panels[teacherHomeworkTab]?.()||notice('لا توجد وظائف واجبات مفعّلة.')}</div></section>`;
}
function teacherPortal(data) {
  const links=[['home','الرئيسية','dashboard'],...(data.flags.schedule?[['schedule','جدولي الأسبوعي','calendar']]:[]),...(data.flags.attendance?[['attendance','رصد الحضور','check']]:[]),['grades','رصد الدرجات','cap'],...(data.flags.homework?[['homework','الواجبات والملاحظات','book']]:[])];
  if(!links.some(([id])=>id===teacherTab))teacherTab='home';
  const panels={home:teacherHome,grades:teacherGradePage,attendance:teacherAttendancePage,schedule:teacherSchedulePage,homework:teacherHomeworkPage};
  const photo=imageMarkup(data.school.photo,'شعار المدرسة','teacher-brand-photo')||`<span class="teacher-brand-photo teacher-brand-placeholder">${icon('book')}</span>`;
  const logo=`<button type="button" class="teacher-brand" data-action="teacher-tab" data-value="home">${photo}<span><strong>${esc(data.school.name)}</strong><small>بوابة المعلم</small></span></button>`;
  const navigation=`<nav class="teacher-navbar" aria-label="أقسام بوابة المعلم"><div class="teacher-nav-inner">${logo}<div class="teacher-nav-links">${links.map(([key,label,glyph])=>`<button type="button" class="teacher-nav-link${key===teacherTab?' active':''}" data-action="teacher-tab" data-value="${key}"${key===teacherTab?' aria-current="page"':''}>${icon(glyph)} ${label}</button>`).join('')}</div><div class="teacher-nav-account"><span>${icon('user')} ${esc(data.staff.name)}</span>${btn('خروج','teacher-logout','','teacher-logout tiny')}</div></div></nav>`;
  return navigation+`<main class="teacher-workspace">${panels[teacherTab](data)}</main><footer class="teacher-portal-footer">${esc(data.school.name)} · بوابة المعلم</footer>`;
}
pages.teachers=()=>{
  const data=teacherAccessData();
  return data?teacherPortal(data):teacherLoginMarkup();
};
async function loginTeacher(data) {
  const national=digits(data.national),pin=digits(data.pin);
  if(!/^\d{12}$/.test(national)||!/^\d{4,8}$/.test(pin))throw new Error('تحقق من الرقم الوطني وكود الدخول.');
  resetTeacher();
  if(sharedMode){
    teacherData=await sharedAPI('/api/teacher',{school:str(data.school),national,pin});
  }else{
    state=await dbState();
    const candidates=Object.entries(state.schools).map(([id,s])=>[id,s.staff?.find(x=>x.year===YEAR&&x.national===national&&s.teacherCodes[x.id]?.active&&s.teacherCodes[x.id].pin===pin)]).filter(([,staff])=>staff);
    const candidate=candidates.length===1?candidates[0]:session?candidates.find(([id])=>id===activeSchoolId):null;
    if(!candidate)throw new Error('بيانات الدخول غير صحيحة أو الحساب غير مفعّل.');
    [teacherSchoolId]=candidate;
    teacherSession=candidate[1].id;
    await updateLocalSchool(teacherSchoolId,s=>{s.teacherCodes[teacherSession].last=new Date().toISOString();});
  }
  render();
  $('h1',content)?.focus();
}
forms['teacher-login']=data=>loginTeacher(data);
actions['teacher-demo-login']=()=>{
  if(sharedMode&&!sharedDemo)throw new Error('الحساب التجريبي غير مفعّل.');
  return loginTeacher({school:'DEMO',national:'000000000100',pin:'2468'});
};
async function refreshTeacher() {
  if(!sharedMode){state=await dbState();return;}
  try{teacherData=await sharedAPI('/api/teacher-state',teacherFilters);}
  catch(error){if(error.status===401)resetTeacher();else throw error;}
}
actions['teacher-logout']=async()=>{
  if(sharedMode)await sharedAPI('/api/teacher-logout',{});
  resetTeacher();$('#modal').close();render();
};
actions['teacher-tab']=async tab=>{
  if(tab==='inquiries'){teacherTab='homework';teacherHomeworkTab='inquiries';}
  else teacherTab=tab;
  await refreshTeacher();render();
};
actions['teacher-homework-tab']=tab=>{teacherHomeworkTab=tab;render();};
forms['teacher-filter']=async data=>{
  teacherFilters={...teacherFilters,...data};
  await refreshTeacher();render();
};
document.addEventListener('change',event=>{
  const control=event.target;
  if(control.matches('form[data-form="teacher-filter"] select, form[data-form="teacher-filter"] input[type=date], .teacher-homework select[name=assignment]')){
    if(control.name==='scheduledSlot'){
      const slot=teacherAccessData()?.dateSlots.find(x=>x.id===control.value);
      const next=slot?{scheduledSlot:slot.id,assignment:slot.assignment,lesson:slot.lesson,attendanceMode:'lesson'}:{scheduledSlot:'',attendanceMode:'daily',lesson:1};
      void forms['teacher-filter'](next).catch(error=>flash(error.message,'error'));
    }else if(control.form.dataset.form==='teacher-filter'){
      if(teacherTab==='attendance'){
        void forms['teacher-filter']({...Object.fromEntries(new FormData(control.form)),scheduledSlot:'',attendanceMode:'daily',lesson:1}).catch(error=>flash(error.message,'error'));
      }else control.form.requestSubmit();
    }
    else void forms['teacher-filter']({assignment:control.value}).catch(error=>flash(error.message,'error'));
  }
  if(control.matches('[data-teacher-all]')&&control.checked){
    for(const select of $$('select[name^="mark!"]:not(:disabled)',control.form))select.value=control.dataset.teacherAll;
    control.form.requestSubmit();
  }
  if(control.matches('form[data-form="teacher-grades"] [data-prior],form[data-form="teacher-attendance"] [data-prior]'))queueTeacherField(control);
});
document.addEventListener('focusout',event=>{
  const input=event.target;
  if(input.matches('form[data-form="teacher-grades"] input[data-prior]'))queueTeacherField(input);
});
document.addEventListener('input',event=>{
  const input=event.target;
  if(!input.matches('form[data-form="teacher-grades"] input[data-prior]'))return;
  const student=input.name.slice(5), out=$(`[data-teacher-total="${CSS.escape(student)}"]`,input.closest('tr'));
  if(out)out.textContent=input.value||'—';
});
let teacherSaveQueue=Promise.resolve();
function queueTeacherField(control) {
  const form=control.form, data=teacherAccessData(), value=control.value;
  if(!data||value===control.dataset.prior||control.dataset.saving===value)return;
  const {assignment,date,lesson,attendanceMode}=data;
  const action=form.dataset.form==='teacher-grades'?'grades':'attendance';
  const identity=data.staff.id;
  control.dataset.saving=value;
  teacherSaveQueue=teacherSaveQueue.then(async()=>{
    if(teacherAccessData()?.staff.id!==identity||control.dataset.saving!==value)return;
    const student=control.name.slice(5), marks=[{student,value,before:control.dataset.prior}];
    const details={assignment,marks,date,lesson,attendanceMode,index:Number(form.dataset.index)};
    const text=action==='grades'?'حُفظت الدرجة.':'حُفظ سجل الحضور والغياب.';
    await commitTeacher(action,details,text,false);
    const record=teacherAccessData()?.students.find(x=>x.id===student);
    const saved=action==='grades'?record?.marks[record.fields.findIndex(f=>f.index===details.index)]??value:record?.attendance??value;
    control.dataset.prior=String(saved);
    if(control.value===value){
      control.value=String(saved);
      const total=$('[data-teacher-total]',control.closest('tr'));
      if(total)total.textContent=saved===''?'—':String(saved);
    }
    control.removeAttribute('aria-invalid');
    if($('#teacher-grade-state')&&action==='grades')$('#teacher-grade-state').textContent=text;
    else if(route==='teachers')flash(text);
  }).catch(error=>{
    control.setAttribute('aria-invalid','true');
    if(route==='teachers')flash(error.message,'error');
  }).finally(()=>{if(control.dataset.saving===value)delete control.dataset.saving;});
}
async function commitTeacher(action,details,notification,redraw=true) {
  const data=teacherAccessData();
  if(!data)throw new Error('سجّل دخول بوابة المعلمين أولًا.');
  const filters={...teacherFilters,assignment:data.assignment};
  const payload={...details,assignment:details.assignment||data.assignment};
  if(sharedMode){
    try{teacherData=(await sharedAPI('/api/teacher-action',{action,details:payload,filters})).workspace;}
    catch(error){
      if(error.status===401){resetTeacher();$('#modal').close();render();}
      else if(redraw){await refreshTeacher();render();}
      throw error;
    }
  }else await updateLocalSchool(teacherSchoolId,s=>{
    const staff=s.staff.find(x=>x.id===teacherSession&&x.year===YEAR&&s.teacherCodes[x.id]?.active);
    if(!staff)throw new Error('حساب المعلم غير مفعّل.');
    applyTeacherAction(s,staff,action,payload,uid());
  });
  if(redraw){$('#modal').close();render();flash(notification);}
}
function teacherEditedMarks(form) {
  return $$('[data-prior]',form).filter(x=>!x.disabled&&x.value!==x.dataset.prior&&x.dataset.saving!==x.value).map(x=>({student:x.name.split('!')[1],value:x.value,before:x.dataset.prior}));
}
forms['teacher-grades']=(_data,form)=>{
  const marks=teacherEditedMarks(form);
  if(!marks.length)return flash('لا توجد درجات جديدة للحفظ.');
  return commitTeacher('grades',{index:Number(form.dataset.index),marks},'حُفظت درجات أعمال السنة.');
};
forms['teacher-attendance']=(_data,form)=>{
  const data=teacherAccessData(),marks=teacherEditedMarks(form);
  if(!marks.length)return flash('لا توجد حالات جديدة للحفظ.');
  return commitTeacher('attendance',{marks,date:data.date,lesson:data.lesson,attendanceMode:data.attendanceMode},'حُفظ سجل الحضور والغياب.');
};
async function teacherHomeworkFile(file) {
  if(!file?.name&&!file?.size)return null;
  if(file.size>TEACHER_ATTACHMENT_LIMIT)throw new Error('اختر مرفقًا لا يتجاوز 5 ميغابايت.');
  const header=new TextDecoder().decode(await file.slice(0,5).arrayBuffer());
  const data=header==='%PDF-'?await readDataURL(new Blob([file],{type:'application/pdf'})):await logoFile(file);
  return {name:file.name.slice(0,180),data};
}
forms['teacher-homework']=async data=>{
  const attachment=await teacherHomeworkFile(data.attachment);
  await commitTeacher('homework',{...data,attachment},'حُفظ الواجب المدرسي.');
};
forms['teacher-note']=data=>commitTeacher('note',data,'حُفظت الملاحظة لولي الأمر.');
actions['teacher-inquiry-answer']=id=>{
  const row=teacherAccessData()?.inquiries.find(x=>x.id===id);
  if(!row)throw new Error('الاستفسار غير متاح.');
  showDialog('الرد على الاستفسار',`<p>${esc(row.text)}</p><form data-form="teacher-answer" data-id="${esc(id)}" class="stack">${field(['answer','الرد','textarea',true],row.answer,{maxlength:1800})}${submit('حفظ الرد')}</form>`);
};
forms['teacher-answer']=(data,form)=>commitTeacher('answer',{...data,id:form.dataset.id},'حُفظ الرد على الاستفسار.');
actions['teacher-schedule-print']=()=>{
  const data=teacherAccessData();
  if(!data?.flags.schedule)throw new Error('جدول الحصص غير متاح.');
  showDocument('جدول الحصص الأسبوعي',[],[],teacherScheduleCard(data,true),'عمودي',null,{margin:12,fixed:true,paperSize:'A3'});
};
actions['homework-attachment']=async id=>{
  const parent=route==='parents';
  const staff=parent||sharedMode?null:teacherAccessData()?.staff;
  if(!parent&&!sharedMode&&!staff)throw new Error('سجّل دخول بوابة المعلمين أولًا.');
  const file=sharedMode?await sharedAPI('/api/homework-attachment',{id,...(parent?{proof:publicProof}:{})}):
    parent?homeworkAttachment(publicSchool(),id,publicMatches):homeworkAttachment(state.schools[teacherSchoolId],id,[],staff);
  const match=file.data.match(/^data:([^;]+);base64,(.+)$/);
  if(!match)throw new Error('المرفق غير صالح.');
  const bytes=Uint8Array.from(atob(match[2]),letter=>letter.charCodeAt(0));
  downloadBlob(new Blob([bytes],{type:match[1]}),file.name);
};

function parentHomeworkPanel(student,s) {
  const own=s.homework||[], inquiries=s.homeworkInquiries||[];
  const records=own.filter(row=>row.year===student.year&&row.cls===student.cls&&row.section===student.section&&(!row.stream||row.stream===student.stream));
  if(!records.length)return '';
  const rows=records.slice(-15).reverse().map(row=>[row.subject,row.title,row.text,row.due||'—',raw((row.attachment||row.attachmentName?btn('تنزيل المرفق','homework-attachment',row.id,'tiny soft')+' ':'')+btn('استفسار','homework-question',student.id+'|'+row.id,'tiny outline-blue'))]);
  const answers=inquiries.filter(row=>row.student===student.id);
  return '<h3 class="gap">الواجبات المدرسية</h3>'+table(['المادة','العنوان','الواجب','موعد التسليم','إجراء'],rows)+
    (answers.length?'<h3 class="gap">استفسارات الواجبات</h3>'+table(['التاريخ','الاستفسار','رد المعلم'],answers.map(row=>[row.date,row.text,row.answer||'بانتظار الرد'])):'');
}
actions['homework-question']=value=>{
  const [student,homework]=value.split('|');
  showDialog('استفسار عن الواجب',`<form data-form="homework-question" data-student="${esc(student)}" data-homework="${esc(homework)}" class="stack">${field(['text','الاستفسار','textarea',true],'',{maxlength:1000})}${submit('إرسال الاستفسار')}</form>`);
};
forms['homework-question']=async(data,form)=>{
  const {student,homework}=form.dataset;
  const record=publicMatches.find(x=>x.id===student);
  if(!record||route!=='parents')throw new Error('الطالب خارج هذه الجلسة.');
  if(sharedMode){
    publicData=await sharedAPI('/api/homework-question',{proof:publicProof,student,homework,text:data.text});
    publicMatches=publicData.students;
  }else await updateLocalSchool(publicSchoolId,s=>askHomework(s,record,homework,data.text,uid()));
  $('#modal').close();render();flash('حُفظ استفسار الواجب.');
};
