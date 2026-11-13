const homeLinks=[['دخول الإدارة','login'],['تسجيل مدرسة جديدة','register'],['بوابة أولياء الأمور','parents'],['الاستعلام عن نتيجة طالب','results']];
pages.home=()=>{
  const features=[['♟','إدارة الطلبة','إضافة وتعديل بيانات الطلبة وتصنيفهم حسب الصفوف والفصول.'],['◆','تسجيل الدرجات والتقارير','رصد الدرجات حسب المرحلة وطباعة كشوف النتائج.'],['▦','إدارة الجداول','إدارة الصفوف والمواد وإسناد الحصص وإنشاء الجداول.'],['◉','التقارير المالية','تسجيل الرسوم والمدفوعات وطباعة كشوف الحساب.'],['◌','الدردشة','مراسلة داخلية في سجل التجربة.'],['▤','طباعة النماذج','معاينة الكشوف وبطاقات الجلوس والنتائج وتصديرها.']];
  return `<nav class="home-nav"><div class="container">${link('▤ منظومة الطلبة لشؤون الطلبة والامتحانات','home')}<div class="nav-links">${[['عن المنظومة','about'],['المزايا','features'],['روابط مهمة','pages'],['طريقة الاستخدام','how'],['عن التجربة','contact']].map(([label,id])=>link(label,id)).join('')}</div></div></nav>
    <header class="home-hero"><div class="container split"><div><h1 tabindex="-1">منظومة الطلبة</h1><p class="lead">نظام لإدارة بيانات الطلبة والدرجات والجداول والتقارير المالية.</p><div class="btns">${homeLinks.slice(0,3).map(([label,id],i)=>link(label,id,i===0?'warning':'outline-light')).join('')}</div><div class="btns gap">${link(homeLinks[3][0],'results','outline-light')}${link('تصفح الصفحات','pages','outline-light')}</div></div>
      <aside class="card"><h3>تنبيهات سريعة</h3>${sharedMode&&!sharedDemo?'<ul><li>تُحفظ السجلات في قاعدة المدرسة المشتركة.</li><li>يطلب الاستعلام رمز المدرسة ورمز الوصول الذي تسلّمه الإدارة.</li></ul>':'<ul><li>اختر «دخول المدرسة التجريبية الأولى» لتجربة لوحة الإدارة.</li><li>المدرسة الثانية تستقبل طلبات النقل والمراسلات.</li><li>رقم القيد التجريبي <bdi class="key">900001</bdi> لاختبار النتيجة.</li></ul>'}</aside></div></header>
    <section class="home-section" id="about"><div class="container split"><div><h2>عن المنظومة</h2><p>واجهة عربية لإدارة سجلات الطلبة والموظفين، ورصد الدرجات، وتنظيم الحضور والامتحانات والجداول، وطباعة الكشوف.</p><p>تضم المنظومة بوابات لأولياء الأمور والمعلمين ونقطة بيع المقصف.</p></div>${card(sharedMode?'<p>تُحفظ التعديلات في قاعدة بيانات واحدة ويمكن الاطلاع عليها من الأجهزة المتصلة بالخادم.</p>':'<p>تُحفظ التعديلات محليًا في المتصفح. استخدم أسماء وأرقامًا وهمية.</p>',sharedMode?'التشغيل المشترك':'بيانات التجربة')}</div></section>
    <section class="home-section" id="features"><div class="container"><h2>مزايا أساسية</h2><div class="grid3">${features.map(([icon,title,desc])=>`<article class="card feature"><span class="symbol" aria-hidden="true">${esc(icon)}</span><h3>${esc(title)}</h3><p>${esc(desc)}</p></article>`).join('')}</div></div></section>
    <section class="home-section" id="pages"><div class="container"><h2>روابط مهمة داخل المنظومة</h2><div class="grid3">${[...homeLinks,['بوابة المعلمين','teachers'],['استعلام الموظفين','staff-portal'],['المقصف المدرسي','canteen'],['حفظ البيانات','privacy']].map(([label,id])=>`<a class="card pad home-link" href="#${id}">${esc(label)}</a>`).join('')}</div></div></section>
    <section class="home-section" id="how"><div class="container"><h2>طريقة الدخول والتسجيل</h2><div class="grid2">${card('<ol><li>افتح دخول الإدارة.</li><li>أدخل اسم المستخدم وكلمة المرور.</li><li>انتقل من لوحة التحكم إلى القسم المطلوب.</li></ol>','للمدارس')}${card('<ol><li>افتح الاستعلام عن النتيجة أو بوابة أولياء الأمور.</li><li>أدخل رقم القيد أو المعرّف الظاهر في النموذج.</li><li>اطبع كشف النتيجة من شاشة المعاينة.</li></ol>','لأولياء الأمور والطلبة')}</div></div></section>
    <section class="home-section" id="contact"><div class="container"><h2>عن هذه النسخة</h2><p>تعرض خريطة الشاشات داخل لوحة الإدارة صفحات شؤون الطلبة والامتحانات والمالية والموارد البشرية.</p></div></section>
    <footer class="home-footer"><div class="container">منظومة الطلبة · شؤون الطلبة والامتحانات</div></footer>`;
};
const REGISTER_FIELDS=[
  ['name','اسم المدرسة','text',true], ['principal','اسم مدير المدرسة','text',true], ['exam','اسم مشرف الامتحانات','text',true],
  ['entry','اسم مدخل البيانات','text',true], ['phone','رقم الهاتف','tel',true], ['type','نوع المدرسة',SCHOOL_TYPES,true],
  ['region','البلدية / المنطقة',REGIONS,true], ['email','البريد الإلكتروني','email',true], ['username','اسم المستخدم','text',true],
  ['password','كلمة المرور','password',true], ['confirm','تأكيد كلمة المرور','password',true], ['photo','صورة المدرسة / الحساب','file']
];
let registered = '';
pages.login=()=>`<main class="public-screen"><section class="card auth-card">${wordmark()}<h1 class="auth-title" tabindex="-1">تسجيل الدخول</h1>
  ${registered?notice('تم إنشاء المدرسة. سجّل الدخول بالاسم الذي اخترته.','ok'):''}
  <form data-form="login" class="stack">${field(['username','اسم المستخدم','text',true],registered,{autocomplete:'off'})}${field(['password','كلمة المرور','password',true],'',{autocomplete:'off'})}
  ${submit('تسجيل دخول','block')}${demoAccess('دخول المدرسة التجريبية الأولى','demo-login','sample')}${demoAccess('دخول المدرسة التجريبية الثانية','demo-login','sample2')}</form>
  <p class="center small gap">إذا لم يكن لديك حساب</p>${link('إنشاء حساب جديد','register','soft block')}${returnHome()}</section></main>`;
pages.register=()=>`<main class="public-screen"><section class="card auth-card registration">${wordmark()}<h1 class="auth-title" tabindex="-1">إنشاء حساب جديد</h1>
  ${!sharedMode||sharedDemo?notice('إنشاء مدرسة تجريبية. استخدم بيانات وهمية.'):''}
  <form data-form="register" class="stack">${REGISTER_FIELDS.map(def=>{
    const key=def[0], attrs={};
    if(key==='region')attrs.blank='اختر البلدية / المنطقة';
    if(key==='phone'){attrs.pattern='09[0-9]{8}';attrs.title='يجب أن يبدأ بـ09 ويتكون من 10 أرقام';}
    if(key==='username')attrs.minlength=3;
    if(key==='photo')attrs.accept=LOGO_ACCEPT;
    if(['password','confirm'].includes(key))attrs.autocomplete='new-password';
    return field(def,key==='type'?SCHOOL_TYPES[0]:'',attrs);
  }).join('')}${sharedMode&&!sharedDemo?field(['setup','رمز إنشاء المدرسة','password',true],'',{autocomplete:'off'}):''}${submit('إنشاء الحساب','block')}${demoAccess('تعبئة ببيانات وهمية','fill-register')}</form><p class="sample-footer center">إذا كان لديك حساب بالفعل، ${link('تسجيل الدخول','login')}</p>${returnHome()}</section></main>`;
actions['fill-register']=()=>{
  const form=$('form[data-form=register]');
  const data={...demoProfile,name:'مدرسة العرض '+String(Math.floor(1000+Math.random()*9000)),username:'demo-'+uid().slice(0,7),password:'مدرسة-عرض-2026',confirm:'مدرسة-عرض-2026'};
  for(const [key,value] of Object.entries(data)) if(form.elements[key]) form.elements[key].value=value;
};
async function passwordHash(password,salt) {
  if(!crypto.subtle)throw new Error('فتح النموذج في متصفح حديث مطلوب لإنشاء حساب العرض.');
  const key=await crypto.subtle.importKey('raw',utf8.encode(password),'PBKDF2',false,['deriveBits']);
  const result=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:utf8.encode(salt),iterations:150000},key,256);
  return [...new Uint8Array(result)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
async function photoFile(file) {
  if(!file?.size)return '';
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>1_500_000) throw new Error('اختر صورة PNG أو JPEG أو WebP بحجم أقل من 1.5 ميغابايت.');
  return readDataURL(file);
}
forms.register=async data=>{
  const {password,confirm,photo,setup,...profile}=data;
  if(password!==confirm)throw new Error('كلمة المرور وتأكيدها غير متطابقين.');
  for(const key of Object.keys(profile))profile[key]=str(profile[key]);
  if(Object.values(profile).some(v=>!v)||profile.username.length<3||!/^09\d{8}$/.test(profile.phone)) throw new Error('راجع الحقول المطلوبة ورقم الهاتف واسم المستخدم.');
  if(sharedMode) {
    const result=await sharedAPI('/api/register',{...profile,password,setup,photo:await logoFile(photo)});
    registered=profile.username;
    go('login');
    flash('تم إنشاء الحساب. رمز المدرسة '+result.code);
    return;
  }
  const id=uid(), salt=uid();
  profile.salt=salt;
  profile.digest=await passwordHash(password,salt);
  profile.photo=await logoFile(photo);
  state=await dbState(root=>{
    if(Object.values(root.schools).some(s=>[s.profile,...s.users].some(user=>normalized(user.username)===normalized(profile.username))))throw new Error('اسم المستخدم مستخدم بالفعل.');
    root.schools[id]=emptySchool(profile);
  });
  registered=profile.username;
  go('login');
};
function enterSchool(id,role='admin',userId='') {
  resetTransferPage();
  activeSchoolId=id;
  session={role,userId};
  publicProof=null;publicMatches=[];publicPage='';teacherSession='';staffPortalRecord=null;staffPortalProof=null;canteenSession='';
  registered='';
  storeSession();
  go('dashboard');
}
actions['demo-login']=id=>sharedMode?loginShared(id==='sample2'?'demo2':'demo','عرض-2026'):enterSchool(id==='sample2'?'sample2':'sample');
forms.login=async data=>{
  if(sharedMode)return loginShared(data.username,data.password);
  state=await dbState();
  const username=normalized(data.username);
  if(['demo','demo2'].includes(username)&&data.password==='عرض-2026')return enterSchool(username==='demo2'?'sample2':'sample');
  for(const [id,s] of Object.entries(state.schools)) {
    if(normalized(s.profile.username)===username&&s.profile.salt&&await passwordHash(data.password,s.profile.salt)===s.profile.digest) return enterSchool(id);
    const user=s.users.find(u=>u.active&&normalized(u.username)===username);
    if(user&&await passwordHash(data.password,user.salt)===user.digest)return enterSchool(id,'subuser',user.id);
  }
  throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة.');
};
pages.privacy=()=>`<main class="container gap"><article class="card pad privacy-card stack">${wordmark()}<h1 tabindex="-1">حفظ البيانات</h1>${sharedMode?'<p>يحفظ الخادم سجلات المدرسة في قاعدة بيانات مشتركة. يحدد حساب المدرسة والصلاحيات البيانات المتاحة لكل مستخدم.</p>':'<p>نسخة عرض محلية تحفظ سجلاتها في المتصفح. استخدم بيانات وهمية وكلمة مرور مخصصة للتجربة.</p>'}<p>تتضمن التقارير المطبوعة اسم المدرسة والسنة الدراسية وتاريخ إعداد الكشف.</p>${link('الصفحة الرئيسية','home','soft')}</article></main>`;

let publicMatches=[], publicKey='', publicPage='', publicSchoolId='sample', publicData=null;
const publicSchool=()=>sharedMode?publicData:state.schools[publicSchoolId];
function lookupScreen(parent) {
  const title=parent?'بوابة أولياء الأمور':'الاستعلام عن النتيجة 🔍';
  const label=parent?'الرقم الوطني أو رقم القيد أو هاتف ولي الأمر':'رقم القيد أو الرقم الوطني';
  const value=publicPage===route?publicKey:'';
  const form=`<form data-form="${parent?'parent-lookup':'result-lookup'}" class="stack">${sharedMode?sharedSchoolInput():''}${field(['query',label,'text',true],value,{placeholder:parent?'أدخل الرقم الوطني أو رقم القيد أو رقم الهاتف':'أدخل رقم القيد أو الرقم الوطني',inputmode:'numeric',autocomplete:'off'})}${field(FILTER_YEAR,publicProof?.year||YEAR)}${sharedMode?field(['pin','رمز الوصول','password',!sharedDemo],'',{inputmode:'numeric',autocomplete:'off'}):''}${parent?'<p class="small muted">يمكن لولي الأمر إدخال رقم هاتفه المسجل للوصول إلى بيانات أبنائه.</p>':''}<div class="btns center">${submit(parent?'دخول إلى البوابة':'🔍 بحث',parent?'block':'green')}</div></form>
    ${!sharedMode||sharedDemo?'<div class="sample-footer btns center">'+btn(parent?'جرّب هاتف ولي الأمر':'جرّب رقم قيد 900001','sample-lookup',parent?'0900000001':'900001','tiny soft')+'</div>':''}`;
  const matches=publicPage===route?publicMatches:[];
  const lessons=parent&&matches.length?(sharedMode?publicSchool().lessonAttendance||{}:parentLessonAttendance(publicSchool(),matches)):{};
  const records=matches.map(student=>{
    const result=studentResult(student,publicSchool());
    const certificate=publicSchool().certificateResults?.[student.id];
    const official=certificate?.public?'<h3>نتيجة الشهادة</h3>'+table(['رقم الجلوس','المجموع','المعدل','الحالة'],[[certificate.seat,certificate.total,certificate.percent+'%',certificate.status]]):'';
    const gradeDisplay=official+(result.available&&result.published?table(['المادة','الدرجة','الدرجة الكبرى'],result.rows):official?'':notice('لم تُنشر النتيجة بعد.'));
    const notes=parent?publicSchool().notes.filter(n=>n.student===student.id).map(n=>`<p>${[n.date,n.category,n.subject,n.teacherName,n.text].filter(Boolean).map(esc).join(' · ')}</p>`).join(''):'';
    const record=`<div class="toolbar"><div><h3>${esc(student.name)}</h3><p class="muted">رقم القيد <bdi>${esc(student.reg)}</bdi> · ${esc(student.cls)} · ${esc(student.year)}</p></div>${result.available&&result.published?btn('طباعة النتيجة','student-result',student.id):''}</div>${gradeDisplay}${parent?'<h3 class="gap">ملاحظات المدرسة</h3>'+(notes||'<p class="muted">لا توجد ملاحظات.</p>')+parentAttendance(student,publicSchool(),lessons[student.id]):''}`;
    return card(studentAvatar(student,true)+record+(parent?parentHomeworkPanel(student,publicSchool())+parentPhotoPanel(student,publicSchool()):''),'بيانات الطالب');
  }).join('');
  if(parent)return `<main class="public-screen ${matches.length?'':'mid'}"><section class="card auth-card guardian">${wordmark()}<h1 class="auth-title" tabindex="-1">${title}</h1><p class="center muted">تابع مسيرة طفلك التعليمية بكل سهولة</p>${form}${returnHome()}</section>${records?'<div class="container gap stack">'+records+'</div>':''}</main>`;
  return `<main class="public-screen result-screen"><div class="container">${wordmark()}<h1 class="center" tabindex="-1" style="font-size:32px;margin-bottom:24px">${title}</h1><div class="card pad result-search">${form}</div>${records?'<div class="gap stack">'+records+'</div>':''}<footer class="result-footer">منظومة الطلبة · استعلام تجريبي · ${link('الصفحة الرئيسية','home')}</footer></div></main>`;
}
pages.parents=()=>lookupScreen(true);
pages.results=()=>lookupScreen(false);
async function findPublic(data,parent,schoolId=activeSchoolId) {
  const key=digits(data.query);
  const year=YEARS.includes(data.year)?data.year:YEAR;
  if(!key)throw new Error('أدخل رقم القيد أو الرقم الوطني.');
  let rows;
  if(sharedMode) {
    publicProof={school:str(data.school),query:key,pin:digits(data.pin),kind:parent?'parents':'results',year};
    try {
      publicData=await sharedAPI('/api/lookup',publicProof);
      rows=publicData.students;
    } catch(error) {
      if(error.status!==404)throw error;
      publicData=null;publicMatches=[];publicProof=null;publicPage=route;publicKey=key;
      render();resultError(error.message);
      return;
    }
  } else {
    state=await dbState();
    const s=state.schools[schoolId];
    rows=onlyYear(s.students,year).filter(s=>!s.archive&&[s.reg,s.national,...(parent?[s.phone]:[])].some(v=>v&&digits(v)===key));
    publicProof={school:schoolId,query:key,kind:parent?'parents':'results',year};
  }
  publicSchoolId=schoolId;
  publicMatches=rows;
  publicKey=key;
  publicPage=route;
  render();
  if(!rows.length)resultError();
}
forms['parent-lookup']=data=>findPublic(data,true);
forms['result-lookup']=data=>findPublic(data,false);
actions['sample-lookup']=value=>findPublic({query:value,school:'DEMO'},route==='parents','sample');
function parentAttendance(student,s,lessons=[]) {
  const entries=Object.entries(s.attendance).filter(([key,record])=>key.startsWith(student.year+'|')&&record[student.id]).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,8);
  const daily='<h3 class="gap">سجل الحضور</h3>'+table(['التاريخ','الفترة الأولى','الفترة الثانية','الفترة الثالثة'],entries.map(([key,record])=>[key.split('|')[1],...Array.from({length:3},(_,i)=>record[student.id][i]||'—')]));
  return daily+(lessons.length?'<h3 class="gap">حضور الحصص</h3>'+table(['التاريخ','الحصة','المادة','الحالة'],lessons.map(row=>[row.date,PERIODS[row.lesson-1]||row.lesson,row.subject,row.status])):'');
}

pages.dashboard=()=>{
  const rows=activeStudents(), stages=CLASSES.map(cls=>{
    const group=rows.filter(s=>s.cls===cls);
    return {cls,count:group.length,boys:group.filter(s=>s.gender==='ذكر').length,girls:group.filter(s=>s.gender==='أنثى').length};
  }).filter(g=>g.count);
  const groups=sharedStats?.stages||stages;
  const step=Math.max(1,Math.ceil(Math.max(0,...groups.map(g=>g.count))/5));
  const max=step*5;
  const chart=groups.length?`<div class="dash-chart" style="--line-step:20%" role="img" aria-label="${esc(groups.map(s=>s.cls+' '+s.count).join('، '))}"><div class="chart-axis" aria-hidden="true">${Array.from({length:6},(_,i)=>'<span>'+step*(5-i)+'</span>').join('')}</div><div class="chart" aria-hidden="true">${groups.map(g=>`<span class="bar" style="height:${100*g.count/max}%" title="${esc(g.cls+' · '+g.count)}"></span>`).join('')}</div><div class="chart-labels" aria-hidden="true">${groups.map(g=>'<span>'+esc(g.cls)+'</span>').join('')}</div></div>`:'<p class="muted">أضف طلبة لعرض الرسم.</p>';
  const latest=sharedStats?.recent||[...rows].sort((a,b)=>b.created-a.created).slice(0,8);
  const profile=school().profile;
  return `<header class="card dash-banner grid2"><div class="dash-heading"><h1 tabindex="-1">${icon('dashboard')}لوحة التحكم</h1><div class="dash-caption"><span class="muted">الإحصائيات العامة والتحكم في النظام</span> <span class="year">${icon('cap')}السنة الدراسية: <bdi>${YEAR}</bdi></span></div></div>
    <div class="dash-date"><div>${icon('date')}<bdi id="dash-day">${dayISO().replaceAll('-','/')}</bdi></div><div>${icon('clock')}<bdi id="dash-time">${dashTime()}</bdi></div><div>${icon('sun')}<span id="dash-weekday">${dashDay()}</span></div></div></header>
    <section class="grid3 dash-cards"><article class="card metric">${icon('people')}<h3>عدد الطلاب</h3><strong>${sharedStats?.count??rows.length}</strong></article><article class="card metric">${icon('user')}<h3>مرحباً، ${esc(profile.name)}</h3>${imageMarkup(profile.photo,'صورة المدرسة','avatar')||'<span class="demo-school-icon" aria-hidden="true">'+icon('book')+'</span>'}</article><article class="card metric"><h3>الطلاب حسب الصف</h3>${chart}</article></section>
    <section class="card pad gap dash-extra"><h3>إحصائيات الطلاب حسب الصفوف</h3><div class="grid4">${groups.map(g=>`<article class="card metric"><h3>${esc(g.cls)}</h3><strong>${g.count}</strong><small>إجمالي الطلاب</small><div class="stat-line"><span>ذكور ${g.boys}</span><span>إناث ${g.girls}</span></div></article>`).join('')}</div></section>
    ${session?.role==='admin'?'<section class="card pad gap"><div class="toolbar"><h3>آخر الطلاب المضافين</h3>'+link('عرض الكل','all-student','soft')+'</div>'+table(['الصورة','اسم الطالب','رقم القيد','الصف','الرقم الوطني','تاريخ الميلاد'],latest.map(s=>[raw(studentAvatar(s)),s.name,s.reg,s.cls,s.national,s.birth]))+'</section>':''}`;
};
const tripoliClock = new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Tripoli',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true});
const tripoliWeekday = new Intl.DateTimeFormat('ar-LY',{timeZone:'Africa/Tripoli',weekday:'long'});
const dashTime=()=>tripoliClock.format().replace(/^(.*)\s+(AM|PM)$/,'$2 $1');
const dashDay=()=>tripoliWeekday.format();
setInterval(()=>{
  if(route!=='dashboard'||!$('#dash-time'))return;
  $('#dash-day').textContent=dayISO().replaceAll('-','/');
  $('#dash-time').textContent=dashTime();
  $('#dash-weekday').textContent=dashDay();
},1000);

function studentForm(student={},quick=false) {
  const defs=quick?STUDENT_FIELDS.filter(def=>['year','reg','name','cls','gender','section','stream'].includes(def[0])):STUDENT_FIELDS;
  const stream=defs.find(([key])=>key==='stream');
  const needsStream=['الثاني ثانوي','الثالث ثانوي'].includes(student.cls);
  return `<form data-form="student" data-id="${esc(student.id||'')}" class="stack">${formFields(defs.filter(([key])=>key!=='stream'),student)}<div class="student-stream"${needsStream?'':' hidden'}>${field([stream[0],stream[1],stream[2],needsStream],student.stream,{blank:'اختر التخصص'})}</div>${submit('حفظ المعلومات','green block')}</form>`;
}
document.addEventListener('change',event=>{
  const select=event.target;
  if(!select.matches('form[data-form=student] select[name=cls]'))return;
  const stream=select.form.elements.stream;
  const required=['الثاني ثانوي','الثالث ثانوي'].includes(select.value);
  stream.closest('.student-stream').hidden=!required;
  stream.required=required;
  if(!required)stream.value='';
});
function importCard(type,label,year=YEAR) {
  return card(`<form data-form="import-rows" data-type="${type}" class="stack">${field(FILTER_YEAR,year)}${field(['replace','تفعيل تحديث البيانات بدلاً من الاستيراد','checkbox'])}<div class="dropzone">${field(['file','اختر ملف Excel','file',true],'',{accept:'.xlsx'})}</div><div class="btns">${submit('استيراد '+label)}${btn('تنزيل قالب Excel فارغ','template',type)}</div></form>`,'استيراد '+label+' من Excel');
}
const INTAKE_TEMPLATE=STUDENT_EXPORT.filter(([key])=>key!=='phone');
pages['add-student']=()=>`<div class="intake-heading">${header('إضافة الطلاب','إضافة طالب جديد أو استيراد مجموعة من الطلاب','')}<span>السنة الدراسية: </span><span class="year"><bdi>${YEAR}</bdi></span></div>
  <div class="grid2 intake-grid"><section class="card"><div class="card-header toolbar"><h3>إضافة طالب فردي</h3>${btn('إضافة سريعة','quick-student','','green tiny')}</div><div class="pad">${studentForm()}</div></section>
  ${card(`<form data-form="import-rows" data-type="students" class="stack">${field(['replace','تفعيل تحديث البيانات بدلاً من الاستيراد','checkbox'])}${field(['file','اختر ملف Excel','file',true],'',{accept:'.xlsx'})}<div class="btns">${submit('استيراد الطلاب')}${btn('تحميل نموذج Excel','template','students','outline-green')}</div>${field(FILTER_YEAR,YEAR)}</form><div class="example-sheet"><h4>مثال لترتيب أعمدة ملف Excel</h4>${table(labelsFor(INTAKE_TEMPLATE),[['900901','000000000901','طالب تجريبي','اسم الأم','ليبيا','ذكر','2015-01-01','السابع','الفصل 1','']],{className:'table-dark'})}</div>`,'استيراد الطلاب من Excel')}</div>`;
actions['quick-student']=()=>showDialog('إضافة سريعة',studentForm({},true));
actions['edit-student']=id=>showDialog('تعديل بيانات الطالب',studentForm(lookup('students',id)));
function validateStudent(row,schoolData,id='') {
  for(const key of ['reg','national','phone'])row[key]=digits(row[key]);
  if(!row.reg||!row.name||!YEARS.includes(row.year)||!CLASSES.includes(row.cls)) throw new Error('أكمل السنة ورقم القيد والاسم والصف.');
  if(row.gender&&!['ذكر','أنثى'].includes(row.gender))throw new Error('قيمة الجنس غير معروفة.');
  if(row.phone&&!/^09\d{8}$/.test(row.phone))throw new Error('رقم هاتف ولي الأمر يبدأ بـ09 ويتكون من 10 أرقام.');
  if(row.national&&!/^\d{12}$/.test(row.national))throw new Error('الرقم الوطني يتكون من 12 رقمًا.');
  if(['الثاني ثانوي','الثالث ثانوي'].includes(row.cls)) {
    if(!['علمي','أدبي'].includes(row.stream))throw new Error('حدد التخصص للصف الثانوي.');
  } else row.stream='';
  if(row.section&&!SECTIONS.includes(row.section))throw new Error('اختر فصلًا من القائمة.');
  const previous=id?schoolData.students.find(student=>student.id===id):null;
  if(previous&&(previous.cls!==row.cls||(previous.stream||'')!==(row.stream||''))&&Object.keys(schoolData.grades[id]||{}).length)throw new Error('السجل مرتبط بدرجات محفوظة في صفه الحالي.');
  const duplicate=schoolData.students.find(s=>s.year===row.year&&s.id!==id&&(normalized(s.reg)===normalized(row.reg)||row.national&&s.national===row.national));
  if(duplicate)throw new Error('رقم القيد أو الرقم الوطني مسجل بالفعل في السنة المختارة.');
}
const formText = data => Object.fromEntries(Object.entries(data).map(([k,v])=>[k,str(v)]));
forms.student=async(data,form)=>{
  const id=form.dataset.id;
  const entry=formText(data);
  await update(s=>{
    const existing=s.students.find(x=>x.id===id);
    if(id&&!existing)throw new Error('هذا السجل لم يعد موجودًا.');
    if(existing&&entry.year!==existing.year)throw new Error('استخدم الترحيل لإنشاء سجل في سنة دراسية أخرى.');
    const row={...existing,...entry,id:existing?.id||uid(),created:existing?.created||Date.now()};
    validateStudent(row,s,id);
    if(existing)Object.assign(existing,row);
    else s.students.push(row);
  });
  $('#modal').close();
  render();
  flash('حُفظت بيانات الطالب.');
};
function studentDataTable(rows,archive=false,offset=0) {
  if(archive)return table(['#','رقم القيد','الاسم','الصف','الفصل','التخصص','ملاحظات النقل','تاريخ النقل','إجراءات'],rows.map((s,i)=>[i+1,s.reg,s.name,s.cls,s.section,s.stream,s.archive.note,s.archive.date,raw(s.archive.interTransfer?'نقل معتمد':btn('استرجاع','restore-student',s.id,'tiny soft'))]));
  const action=(label,name,id,glyph,color)=>`<button type="button" class="btn tiny ${color}" aria-label="${esc(label)}" title="${esc(label)}" data-action="${name}" data-value="${esc(id)}">${icon(glyph)}</button>`;
  return table(['#','رقم القيد','الرقم الوطني','اسم الطالب','اسم الام','الجنسية','الجنس','تاريخ الميلاد','الصف','التخصص','الفصل','الصورة','إجراءات'],rows.map((s,i)=>[i+offset+1,s.reg,s.national,s.name,s.mother,s.nation,s.gender,s.birth,s.cls,s.stream,s.section,raw(studentAvatar(s)),raw(`<div class="row-tools">${action('تعديل','edit-student',s.id,'edit','warning')}${action('نقل','transfer-student',s.id,'transfer','info')}${action('حذف','delete-student',s.id,'remove','red')}${action('بطاقة بيانات','student-card',s.id,'list','secondary')}</div>`)]),{className:'table-dark'});
}
function studentRowsFor(page) {
  const f=filterData(page,page==='all-student'?{limit:'10',sort:'الافتراضي'}:{});
  return filterStudents(f,onlyYear(school().students,f.year).filter(s=>Boolean(s.archive)===(page==='transferred-students')));
}
pages['all-student']=()=>{
  const f=filterData(route,{limit:'10',sort:'الافتراضي',panel:'filters'}), page=paginate(route,studentRowsFor(route),f);
  const panels=[['filters','الفلاتر'],['move','نقل طلاب بين فصول'],['print','طباعة كشف بأسماء الطلبة'],['reports','أدوات الطباعة والتقارير']];
  const bodies={
    filters:()=>filterForm(route,[FILTER_YEAR,FILTER_CLASS,FILTER_SECTION,['sort','ترتيب حسب',['الافتراضي','اسم الطالب','رقم القيد','الصف','الفصل']],['limit','عدد الطلبة',['10','20','50','100','200']]],f),
    move:()=>moveClassForm(f)+(canAccess('inter-school-transfers')?'<div class="btns gap">'+link('النقل عبر المدارس','inter-school-transfers','outline-blue')+'</div>':''),
    print:()=>studentReportForm(),reports:()=>studentReportMenu()
  };
  const search=`<form data-form="filter" data-page="all-student" class="btns roster-search" role="search">${field(['q','بحث','search'],f.q,{placeholder:'ابحث برقم القيد، الرقم الوطني، اسم الطالب، اسم الأم، رقم هاتف ولي الأمر','aria-label':'البحث في بيانات الطلاب'})}${submit('بحث','outline-blue')}</form>`;
  return header('جميع الطلاب','قائمة بيانات الطلاب المسجلين','')+tabs(route,f.panel,panels,bodies[f.panel]())+
    `<div class="roster-table spaced-panel">${card(`<div class="toolbar roster-toolbar"><h3>جدول بيانات الطلاب</h3><div class="btns">${search}${btn('تحميل Excel','export-students','','outline-green')}</div></div>${studentDataTable(page.rows,false,page.offset)}${page.tools}`)}</div>`;
};
pages['transferred-students']=()=>{
  const f=filterData(route);
  return header('الطلبة المنتقلون الارشيف','',f.year)+card(filterForm(route,[FILTER_YEAR,FILTER_CLASS],f))+`<div class="btns gap">${btn('كشف بأسماء الطلبة المنتقلين','student-print','archive')}</div>${studentDataTable(studentRowsFor(route),true)}`;
};
actions['transfer-student']=id=>{
  const student=lookup('students',id);
  showDialog('نقل الطالب',`<p>${esc(student.name)}</p><form data-form="transfer" data-id="${esc(id)}" class="stack">${field(['to','المدرسة المنقول إليها','text',true])}${field(['date','تاريخ النقل','date',true],dayISO())}${field(['note','ملاحظات النقل','textarea'])}${submit('نقل إلى الأرشيف')}</form>`);
};
forms.transfer=async(data,form)=>{
  await update((s,root)=>{
    const row=s.students.find(student=>student.id===form.dataset.id&&!student.archive);
    if(!row)throw new Error('السجل غير متاح للنقل.');
    if(root.transfers.some(t=>t.from===activeSchoolId&&t.student===row.id&&t.status==='pending'))throw new Error('يوجد طلب نقل قيد المراجعة لهذا الطالب.');
    row.archive={...formText(data),note:[data.to,data.note].filter(Boolean).join(' · ')};
  });
  $('#modal').close();render();flash('نُقل السجل إلى الأرشيف.');
};
actions['restore-student']=async id=>{
  await update(s=>{const row=s.students.find(student=>student.id===id);if(row?.archive?.interTransfer)throw new Error('الطالب نُقل إلى مدرسة أخرى بطلب معتمد.');if(row)delete row.archive;});
  render();flash('استُرجع الطالب إلى القائمة.');
};
actions['delete-student']=id=>{
  const row=lookup('students',id);
  showDialog('حذف سجل الطالب',`<p>سيُحذف سجل ${esc(row.name)} من هذه السنة التجريبية.</p><form data-form="delete-student" data-id="${esc(id)}">${submit('تأكيد الحذف','danger')}</form>`);
};
forms['delete-student']=async(_data,form)=>{
  const id=form.dataset.id;
  await update((s,root)=>{
    if(root.transfers.some(t=>t.from===activeSchoolId&&t.student===id&&['pending','accepted'].includes(t.status)))throw new Error('يوجد طلب نقل مرتبط بالسجل.');
    if(s.receipts.some(r=>r.student===id)||s.notes.some(r=>r.student===id)||s.wallet.some(r=>r.student===id))throw new Error('للسجل معاملات مرتبطة. استخدم النقل إلى الأرشيف.');
    s.students=s.students.filter(row=>row.id!==id);
    if(sharedMode)return;
    delete s.grades[id]; delete s.hall[id]; delete s.books[id]; delete s.discounts[id]; delete s.guardianCodes[id];
    delete s.certificateResults[id];delete s.walletLimits?.[id];
    delete s.carriedBalances[id];
    s.photoRequests=s.photoRequests.filter(x=>x.student!==id);
    for(const day of Object.values(s.attendance))delete day[id];
  });
  $('#modal').close();render();flash('حُذف السجل التجريبي.');
};
function moveClassForm(f) {
  return `<form data-form="move-class" class="fields">${field(FILTER_YEAR,f.year)}${field(['cls','الصف',CLASSES,true],f.cls,{blank:'اختار'})}${field(['from','من الفصل',SECTIONS,true],f.section,{blank:'اختار'})}${field(['to','إلى الفصل',SECTIONS,true],'',{blank:'اختار'})}<div class="form-actions">${submit('نقل الطلاب بين الفصول')}</div></form>`;
}
actions['move-class']=()=>showDialog('نقل الطلاب بين الفصول',moveClassForm(filterData(route)));
forms['move-class']=async data=>{
  if(data.from===data.to)throw new Error('اختر فصلين مختلفين.');
  let n=0;
  await update(s=>{for(const row of s.students)if(row.year===data.year&&row.cls===data.cls&&row.section===data.from&&!row.archive){row.section=data.to;n++;}});
  $('#modal').close();render();flash('تم نقل '+n+' طالب بين الفصول.');
};
const valuesFor=(row,defs)=>defs.map(([key])=>typeof row[key]==='boolean'?(row[key]?'نعم':'لا'):row[key]??'');
const labelsFor=defs=>defs.map(([,label])=>label);
actions['export-students']=()=>downloadExcel('كشف الطلبة',labelsFor(STUDENT_EXPORT),studentRowsFor(route).map(s=>valuesFor(s,STUDENT_EXPORT)));
actions['student-card']=id=>{
  return actions['student-doc']('profiles|'+id);
};
const ROSTER_PAPER_COLUMNS=[['index','ر.م.'],...STUDENT_EXPORT.filter(([key])=>!['cls','phone'].includes(key)),['remarks','ملاحظات']];
const DEFAULT_ROSTER_COLUMNS=['index','reg','name','section'];
const ROSTER_TITLE='قائمة بالطلبة المسجلين حسب المستوى الدراسي';
function studentReportForm() {
  const prior=studentPrintOptions();
  const cols=prior.columns?[...(prior.index?['index']:[]),...prior.columns]:[];
  const fields=ROSTER_PAPER_COLUMNS.map(([key,label])=>field(['col_'+key,label,'checkbox'],cols.includes(key))).join('');
  const fonts=['Simplified Arabic','Calibri','Cairo','Tajawal','Arial','Times New Roman'];
  const font=fonts.includes(prior.font)?prior.font:({الافتراضي:'Cairo',واضح:'Arial',تقليدي:'Times New Roman'}[prior.font]||fonts[0]);
  return `<form class="stack roster-options" data-form="student-report"><div class="fields tight">
    ${field(['rows','عدد الطلبة/الصفحة A4','number',true],prior.rowsPerPage||28,{min:5,max:100})}
    ${field(['font','نوع الخط',fonts],font)}${field(['orientation','الاتجاه',['عمودي','أفقي']],prior.orientation||'عمودي')}
    ${field(['borderWidth','العرض','number',true],prior.borderWidth||1,{min:1,max:6})}
    ${field(['borderType','حدود الجدول',[['grid','شبكة'],['box','إحاطة']]],prior.borderType||'grid')}
    ${field(['borderStyle','نمط الحدود',[['solid','متصل'],['dashed','متقطع'],['dotted','منقط'],['double','مزدوج']]],prior.borderStyle||'solid')}
    ${field(['shade','تظليل الصفوف',[['none','بدون'],['light','فاتح'],['medium','متوسط'],['dark','غامق']]],prior.shade||(prior.shading?'light':'none'))}
    ${field(['fontSize','حجم الخط','number',true],prior.fontSize||14,{min:10,max:24})}
    ${field(['bold','خط عريض','checkbox'],prior.bold)}<div><span>المحاذاة</span><div class="segmented">${['يمين','وسط','يسار'].map(align=>`<label><input type="radio" name="align" value="${align}"${(prior.align||'وسط')===align?' checked':''}>${align}</label>`).join('')}</div></div>
    ${field(['gender','طباعة حسب الجنس',[['الجميع','الكل'],['ذكر','ذكور فقط'],['أنثى','إناث فقط']]],prior.gender||'الجميع')}${field(['two','طباعة بعمودين','checkbox'],prior.twoColumns)}</div>
    <fieldset><legend>أعمدة الكشف</legend><div class="fields tight">${fields}</div></fieldset>
    <div class="fields">${field(['title','عنوان الكشف','text'],prior.title||'',{placeholder:'سيتم طباعته كعنوان…'})}${field(['sectionFormat','اسم الفصل',[['letters','حروف (أ ، ب ، ج …)'],['numbers','أرقام (1 ، 2 ، 3 …)']]],prior.sectionFormat||'letters')}</div>
    <div class="btns">${submit('طباعة الكشف','outline-dark')}<button type="submit" name="excel" class="btn outline-green">${icon('excel')} تحميل Excel</button><button type="submit" name="save" class="btn outline-blue">حفظ إعدادات الطباعة</button></div></form>`;
}
actions['student-print-settings']=()=>showDialog('طباعة كشف بأسماء الطلبة',studentReportForm());
function studentPrintOptions() {
  try{return JSON.parse(localStorage.getItem('ahmad-roster-print')||'{}');}catch{return {};}
}
forms['student-report']=(data,_form,event)=>{
  const chosen=ROSTER_PAPER_COLUMNS.filter(([key])=>data['col_'+key]);
  const cols=chosen.length?chosen:ROSTER_PAPER_COLUMNS.filter(([key])=>DEFAULT_ROSTER_COLUMNS.includes(key));
  if(data.two&&cols.length>6)throw new Error('اختر ستة أعمدة أو أقل للطباعة بعمودين.');
  const settings={title:str(data.title),gender:data.gender,orientation:data.orientation,rowsPerPage:bounded(data.rows,5,100,28),fontSize:bounded(data.fontSize,10,24,14),font:data.font,align:data.align,shade:data.shade,bold:Boolean(data.bold),twoColumns:Boolean(data.two),borderWidth:bounded(data.borderWidth,1,6,1),borderType:data.borderType,borderStyle:data.borderStyle,sectionFormat:data.sectionFormat,index:Boolean(data.col_index),columns:chosen.filter(([key])=>key!=='index').map(([key])=>key)};
  if(event.submitter?.name==='save'){
    try{localStorage.setItem('ahmad-roster-print',JSON.stringify(settings));}catch{throw new Error('تعذر حفظ إعدادات الطباعة في هذا المتصفح.');}
    flash('حُفظت إعدادات الطباعة.');
    return;
  }
  const f=filterData(route);
  const rows=studentRowsFor(route).filter(s=>!data.gender||data.gender==='الجميع'||s.gender===data.gender);
  const groupMap=new Map();
  const sectionLabel=section=>{
    const i=SECTIONS.indexOf(section);
    return i<0?section:(settings.sectionFormat==='numbers'?String(i+1):['أ','ب','ج','د','هـ','و','ز','ح','ط','ي'][i]);
  };
  for(const s of rows.sort((a,b)=>CLASSES.indexOf(a.cls)-CLASSES.indexOf(b.cls)||localeCompare(a.stream,b.stream))){
    const key=[s.cls,s.stream].join('|');
    if(!groupMap.has(key))groupMap.set(key,{rows:[],meta:`<span>الصف: <strong>${esc(s.cls)}</strong></span><span>الفصل: <strong>${esc(f.section?sectionLabel(f.section):'الكل')}</strong></span>${s.stream?'<span>التخصص: <strong>'+esc(s.stream)+'</strong></span>':''}`});
    const group=groupMap.get(key);
    group.rows.push(cols.map(([col])=>col==='index'?group.rows.length+1:col==='section'?sectionLabel(s.section):s[col]??''));
  }
  const title=settings.title||ROSTER_TITLE, headings=labelsFor(cols), groups=[...groupMap.values()];
  if(event.submitter?.name==='excel')return downloadExcel(title,headings,groups.flatMap(group=>group.rows));
  schoolListReport(title,f.year,headings,groups,settings);
};
actions['student-print']=kind=>{
  const rows=studentRowsFor(route), f=filterData(route);
  if(kind==='archive')return schoolListReport('كشف الطلبة المنتقلين',f.year,['رقم القيد','اسم الطالب','الصف','الفصل','ملاحظات النقل','تاريخ النقل'],[{rows:rows.map(s=>[s.reg,s.name,s.cls,s.section,s.archive.note,s.archive.date])}]);
  schoolListReport('كشف الطلبة الأجانب',f.year,labelsFor(INTAKE_TEMPLATE),[{rows:rows.filter(s=>s.nation&&s.nation!=='ليبيا').map(s=>valuesFor(s,INTAKE_TEMPLATE))}],{orientation:'أفقي',fontSize:12});
};
actions['student-stats']=()=>{
  const rows=studentRowsFor(route);
  const result=CLASSES.map(cls=>{const group=rows.filter(s=>s.cls===cls), boys=group.filter(s=>s.gender==='ذكر').length, girls=group.filter(s=>s.gender==='أنثى').length;return [cls,boys,girls,group.length-boys-girls,group.length];}).filter(row=>row[4]>0);
  schoolListReport('إحصائية الطلبة',filterData(route).year,['الصف','ذكور','إناث','غير محدد','المجموع'],[{rows:result}]);
};
actions.template=type=>{
  const defs=type==='students'?INTAKE_TEMPLATE:STAFF_FIELDS.filter(def=>def[0]!=='year');
  downloadExcel(type==='students'?'قالب استيراد الطلبة':'قالب استيراد الموظفين',labelsFor(defs),[]);
};
function excelDate(value) {
  const text=str(value);
  if(!text)return '';
  if(/^\d{4}-\d\d-\d\d$/.test(text))return text;
  const format=text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if(format)return format[3]+'-'+format[2].padStart(2,'0')+'-'+format[1].padStart(2,'0');
  if(/^\d{4,5}$/.test(text))return new Date(Date.UTC(1899,11,30)+Number(text)*86400000).toISOString().slice(0,10);
  return text;
}
forms['import-rows']=async(data,form)=>{
  const type=form.dataset.type, student=type==='students';
  if(!student)return previewStaffWorkbook(data,form);
  const defs=STUDENT_EXPORT;
  const rows=await readExcel(data.file);
  const headings=rows.shift()||[];
  const map=defs.map(([key,label,type])=>[key,headings.findIndex(h=>normalized(h)===normalized(label)||(key==='name'&&normalized(h)===normalized('اسم الطالب'))),type]);
  if(map.find(([,col])=>col>=0)===undefined||map.find(([key])=>key==='name')[1]<0)throw new Error('تعذر مطابقة رؤوس الأعمدة. استخدم القالب الفارغ.');
  const records=rows.filter(row=>row.some(v=>str(v))).map((row,index)=>({index:index+2,row:{...Object.fromEntries(map.filter(([,col])=>col>=0).map(([key,col,type])=>[key,key==='birth'||type==='date'?excelDate(row[col]):type==='checkbox'?['1','نعم','TRUE'].includes(str(row[col])):str(row[col])])),year:data.year}}));
  if(!records.length)throw new Error('الملف لا يحتوي على سجلات.');
  await update(s=>{
    for(const record of records){
      const item=record.row, idValue=digits(item.reg);
      const existing=s.students.find(x=>x.year===item.year&&idValue&&x.reg===idValue);
      try {
        if(existing&&!data.replace)throw new Error('السجل موجود. فعّل تحديث البيانات للاستيراد إليه.');
        const next={...existing,...item,id:existing?.id||uid(),created:existing?.created||Date.now()};
        validateStudent(next,s,existing?.id);
        if(existing)Object.assign(existing,next);
        else s.students.push(next);
      }catch(error){throw new Error('الصف '+record.index+' · '+error.message);}
    }
  });
  render();flash('تم استيراد '+records.length+' سجل.');
};

function referencePage() {
  return header('صفحة غير متاحة','','')+`<p class="gap">${link('خريطة الشاشات','reference','soft')}</p>`;
}
pages.reference=()=>{
  const entries=Object.entries(TITLES);
  return header('خريطة الشاشات','','')+card(table(['القسم','الشاشة'],entries.filter(([id])=>canAccess(id)&&pages[id]).map(([id,label])=>[GROUPS[id],raw(link(label,id))])));
};
