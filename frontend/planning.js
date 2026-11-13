const examsClasses=CLASSES.slice(5);
function hallRows(f) {return filterStudents(f).filter(s=>school().hall[s.id]);}
function hallColumns(rows,includeTools=false) {
  return rows.map((s,i)=>{
    const h=school().hall[s.id];
    return [i+1,s.reg,s.name,s.cls,s.gender,h.seat,h.secret,h.room,h.exam,h.head,...(includeTools?[raw(btn('بطاقة الجلوس','hall-card',s.id,'tiny soft'))]:[])];
  });
}
const HALL_HEADERS=['ر.م','رقم القيد','اسم الطالب','الصف','الجنس','رقم الجلوس','الرقم السري','رقم القاعة','مشرف الامتحانات','رئيس اللجنة'];
const HALL_MODES=[['count','حسب عدد القاعات'],['range','حسب نطاق القاعات'],['gender','حسب الجنس'],['custom','حسب عدد القاعات وعدد الطلبة في كل قاعة'],['class_based','توزيع القاعات حسب الصفوف']];
const NUMBER_MODES=[['random','عشوائي'],['range','نطاق الأرقام'],['step','بفاصل']];
const GENERATION_ORDER=[['ordered','مرتب'],['random','عشوائي']];
const HALL_TABS=[['sheets','طباعة كشوفات'],['delivery','طباعة كشوفات تسليم أوراق الإجابة'],['shading','طباعة نموذج تضليل - للشهائد'],['mirror','طباعة مرايا رصد الدرجات للصفوف النقل'],['secret','طباعة كشف رصد درجات برقم السري']];
const HALL_PRINT_SETS={sheets:['room','secret-room','secret-room-class','secret','room-parallel','secret-parallel','class','secret-seats','cards','stats','room-class'],delivery:['answer'],shading:['shading'],mirror:['mirror'],secret:['marks-secret']};
function roomField(name,label,value='',maximum=999) {
  return field([name,label,'number',true],value,{min:1,max:maximum});
}
function hallForm(f) {
  const span=(a,b,first,last)=>roomField(a,first)+roomField(b,last);
  return `<form data-form="hall" class="stack hall-form">${field(FILTER_YEAR,f.year)}
    <section class="hall-block"><h3 class="hall-section-title">اختر الصفوف المستهدفة</h3><div class="fields tight">${examsClasses.map((cls,i)=>field(['class'+i,cls,'checkbox'],cls==='السابع',{'data-hall-class':i})).join('')}</div>${field(['remedial','توزيع فقط طلبة الدور الثاني','checkbox'])}</section>
    <section class="hall-block"><h3 class="hall-section-title">اسم المشرف ورئيس اللجنة</h3><div class="grid2">${field(['exam','اسم مشرف الامتحانات','text',true],school().profile.exam,{maxlength:150})}${field(['head','اسم رئيس اللجنة','text',true],school().profile.principal,{maxlength:150})}</div></section>
    <section class="hall-block stack"><h3 class="hall-section-title">بيانات القاعات</h3>${field(['mode','طريقة إدخال القاعات',HALL_MODES],'count')}
      <fieldset data-hall-mode="count" class="fields">${roomField('rooms','عدد القاعات',2,100)}</fieldset>
      <fieldset data-hall-mode="range" class="fields" hidden disabled>${span('hallFrom','hallTo','من القاعة','إلى القاعة')}</fieldset>
      <fieldset data-hall-mode="gender" class="fields" hidden disabled>${span('maleFrom','maleTo','قاعات الذكور من','قاعات الذكور إلى')}${span('femaleFrom','femaleTo','قاعات الإناث من','قاعات الإناث إلى')}</fieldset>
      <fieldset data-hall-mode="custom" class="stack" hidden disabled>${field(['customType','نوع إدخال القاعات',[['count','حسب عدد القاعات'],['range','حسب نطاق القاعات (من - إلى)']]],'count')}
        <fieldset data-hall-custom="count">${roomField('customCount','عدد القاعات',2,50)}</fieldset><fieldset data-hall-custom="range" class="fields" hidden disabled>${span('customFrom','customTo','من القاعة','إلى القاعة')}</fieldset><div class="fields" data-room-capacities></div></fieldset>
      <fieldset data-hall-mode="class_based" class="stack" hidden disabled>${examsClasses.map((cls,i)=>`<fieldset class="fields" data-class-rooms="${i}"${cls==='السابع'?'':' hidden disabled'}><legend>${esc(cls)}</legend>${span('classFrom'+i,'classTo'+i,'من القاعة','إلى القاعة')}</fieldset>`).join('')}</fieldset>
      <div class="fields">${field(['distribution','طريقة توزيع الطلبة على القاعات',GENERATION_ORDER],'ordered')}${field(['order','ترتيب التعبئة',['متتابع','متوازي']],'متوازي')}</div>
    </section>
    <section class="hall-block stack"><h3 class="hall-section-title">إعدادات توليد الأرقام</h3>${field(['generation','طريقة توليد أرقام الجلوس والأرقام السرية',NUMBER_MODES],'range')}
      <fieldset data-number-range class="fields">${field(['seatOrder','ترتيب أرقام الجلوس',GENERATION_ORDER],'ordered')}${field(['secretOrder','ترتيب الأرقام السرية',GENERATION_ORDER],'random')}${field(['first','بداية أرقام الجلوس','number',true],100001,{min:100000,max:999999})}${field(['seatEnd','نهاية أرقام الجلوس','number',true],999999,{min:100000,max:999999})}${field(['secretStart','بداية الأرقام السرية','number',true],1000,{min:1000,max:9999})}${field(['secretEnd','نهاية الأرقام السرية','number',true],9999,{min:1000,max:9999})}</fieldset>
      <fieldset data-number-step hidden disabled>${roomField('step','قيمة الفاصل',1,100000)}</fieldset></section>
    ${submit('تنفيذ كل المهام')}</form>`;
}
function hallPrintPanel(f) {
  const controls=HALL_PRINT_SETS[f.panel].map(kind=>{
    const label=HALL_REPORTS.find(([id])=>id===kind)[1];
    return btn(label,'hall-report',kind,'outline-blue');
  });
  return `<div class="report-set"><h3>${HALL_TABS.find(([id])=>id===f.panel)[1]}</h3><div class="hall-print-grid">${controls.join('')}</div></div>`;
}
pages['students-hall']=()=>{
  const f=filterData(route,{panel:'sheets',limit:'10'}), rows=hallRows(f), page=paginate(route,rows,f);
  const stats=new Map(), rooms=new Map();
  for(const student of activeStudents(f.year)){
    const key=student.cls+'|'+student.section;
    stats.set(key,(stats.get(key)||0)+1);
    const room=school().hall[student.id]?.room;
    if(room)rooms.set(room,(rooms.get(room)||0)+1);
  }
  const roomStats=table(['القاعة','عدد الطلاب'],[...rooms].sort(([a],[b])=>a-b));
  const classStats=table(['الصف','الفصل','عدد الطلاب'],[...stats].map(([key,n])=>[...key.split('|'),n]));
  return header('إدارة بيانات الامتحان - السنة الدراسية: '+f.year,'','')+card(filterForm(route,[FILTER_YEAR],f))+
    `<div class="grid2 spaced-panel">${card(hallForm(f),'إدارة بيانات الامتحان')}<div class="hall-stat-card">${card(`${roomStats}<h3 class="gap">عدد الطلاب في كل فصل</h3>${classStats}`,'إحصائية توزيع الطلاب على القاعات')}</div></div>
    <div class="spaced-panel">${tabs(route,f.panel,HALL_TABS,hallPrintPanel(f))}</div>
    <div class="spaced-panel">${card(filterForm(route,[FILTER_CLASS,FILTER_SECTION,FILTER_LIMIT,['q','البحث','search']],f)+'<div class="btns gap">'+btn('تحميل Excel','hall-report','excel','outline-green')+'</div>'+table([...HALL_HEADERS,'خيارات'],hallColumns(page.rows,true),{className:'table-dark'})+page.tools,'جدول بيانات الطلاب')}</div>`;
};
function toggleFields(element,visible) {
  element.hidden=!visible;
  element.disabled=!visible;
}
function updateHallFields(form) {
  const values=form.elements;
  for(const element of $$('[data-hall-mode]',form))toggleFields(element,element.dataset.hallMode===values.mode.value);
  for(const element of $$('[data-class-rooms]',form))toggleFields(element,values['class'+element.dataset.classRooms].checked);
  for(const element of $$('[data-hall-custom]',form))toggleFields(element,element.dataset.hallCustom===values.customType.value);
  toggleFields($('[data-number-range]',form),values.generation.value!=='random');
  toggleFields($('[data-number-step]',form),values.generation.value==='step');
  if(values.mode.value!=='custom')return;
  const container=$('[data-room-capacities]',form), count=values.customType.value==='count';
  const from=count?1:Number(values.customFrom.value), to=count?Number(values.customCount.value):Number(values.customTo.value);
  const rooms=from>0&&to>=from&&to-from<50?Array.from({length:to-from+1},(_,i)=>from+i):[];
  const previous=new Map($$('input',container).map(el=>[el.name,el.value]));
  container.innerHTML=rooms.map(room=>roomField('capacity'+room,'عدد الطلبة في القاعة '+room,previous.get('capacity'+room)??30,1000)).join('');
}
document.addEventListener('change',event=>{
  const input=event.target;
  const form=input.closest('form[data-form=hall]');
  if(form&&(/^(mode|generation|customType|customCount|customFrom|customTo)$/.test(input.name)||input.hasAttribute('data-hall-class')))updateHallFields(form);
});
function hallRange(from,to,limit=100) {
  const first=Number(from),last=Number(to);
  if(!Number.isInteger(first)||!Number.isInteger(last)||first<1||last>999||last<first||last-first>=limit)throw new Error('تحقق من نطاق القاعات المحدد.');
  return Array.from({length:last-first+1},(_,i)=>first+i);
}
function randomBelow(size) {
  const values=new Uint32Array(1), limit=2**32-(2**32%size);
  do {crypto.getRandomValues(values);} while(values[0]>=limit);
  return values[0]%size;
}
function randomized(list) {
  for(let i=list.length-1;i>0;i--){
    const j=randomBelow(i+1);
    [list[i],list[j]]=[list[j],list[i]];
  }
  return list;
}
function allocateExamNumbers(start,end,step,count,used,random,min,max) {
  const first=Number(start),last=Number(end);
  if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||first<min||last>max||last<first||!Number.isSafeInteger(step)||step<1)throw new Error('تحقق من حدود أرقام الجلوس والأرقام السرية والفاصل.');
  const size=Math.floor((last-first)/step)+1;
  const excluded=[...used].filter(n=>n>=first&&n<=last&&(n-first)%step===0).length;
  if(size-excluded<count)throw new Error('نطاق الأرقام المتاح لا يكفي لجميع الطلاب.');
  const result=[];
  if(random&&count+excluded<size/3) {
    while(result.length<count){
      const number=first+randomBelow(size)*step;
      if(used.has(number))continue;
      used.add(number);
      result.push(number);
    }
  } else {
    for(let i=0;i<size&&(random||result.length<count);i++){
      const number=first+i*step;
      if(!used.has(number))result.push(number);
    }
    if(random)randomized(result);
  }
  return result.slice(0,count);
}
function distributeHallRows(students,data) {
  const roomAssignments=new Map();
  const assign=(people,rooms,capacity=null)=>{
    const size=Math.ceil(people.length/rooms.length);
    if(capacity){
      if(capacity.reduce((n,max)=>n+max,0)<people.length)throw new Error('سعة القاعات المحددة لا تكفي لجميع الطلاب.');
      let index=0;
      rooms.forEach((room,i)=>{for(let n=0;n<capacity[i]&&index<people.length;n++)roomAssignments.set(people[index++].id,room);});
    } else {
      people.forEach((student,i)=>roomAssignments.set(student.id,data.order==='متتابع'?rooms[Math.floor(i/size)]:rooms[i%rooms.length]));
    }
  };
  if(data.mode==='gender'){
    if(students.some(s=>!['ذكر','أنثى'].includes(s.gender)))throw new Error('استكمل حقل الجنس في سجلات الطلبة المحددين قبل توزيعهم حسب الجنس.');
    const male=hallRange(data.maleFrom,data.maleTo), female=hallRange(data.femaleFrom,data.femaleTo);
    if(male.some(room=>female.includes(room)))throw new Error('اختر نطاقين مختلفين لقاعات الذكور والإناث.');
    assign(students.filter(s=>s.gender==='ذكر'),male);
    assign(students.filter(s=>s.gender==='أنثى'),female);
  }else if(data.mode==='class_based'){
    const usedRooms=new Set();
    for(const [i,cls] of examsClasses.entries())if(data['class'+i]){
      const rooms=hallRange(data['classFrom'+i],data['classTo'+i]);
      if(rooms.some(room=>usedRooms.has(room)))throw new Error('نطاق قاعات أحد الصفوف يتداخل مع صف آخر.');
      rooms.forEach(room=>usedRooms.add(room));
      assign(students.filter(s=>s.cls===cls),rooms);
    }
  }else if(data.mode==='custom'){
    const rooms=data.customType==='range'?hallRange(data.customFrom,data.customTo,50):hallRange(1,data.customCount,50);
    const capacities=rooms.map(room=>Number(data['capacity'+room]));
    if(capacities.some(n=>!Number.isInteger(n)||n<1||n>1000))throw new Error('أدخل عدد الطلبة المخصص لكل قاعة.');
    assign(students,rooms,capacities);
  }else{
    assign(students,data.mode==='range'?hallRange(data.hallFrom,data.hallTo):hallRange(1,data.rooms));
  }
  return roomAssignments;
}
forms.hall=async data=>{
  const stages=examsClasses.filter((_,i)=>data['class'+i]);
  if(!stages.length||!YEARS.includes(data.year)||!str(data.exam)||!str(data.head))throw new Error('اختر السنة والصفوف وأدخل اسم المشرف ورئيس اللجنة.');
  let count=0;
  await update(s=>{
    const students=onlyYear(s.students,data.year).filter(x=>!x.archive&&stages.includes(x.cls)&&(!data.remedial||studentResult(x,s).status==='دور ثان'));
    if(!students.length)throw new Error('لا توجد سجلات للصفوف المختارة.');
    students.sort((a,b)=>localeCompare(a.name,b.name)||localeCompare(a.reg,b.reg));
    if(data.distribution==='random')randomized(students);
    const rooms=distributeHallRows(students,data);
    const selected=new Set(students.map(x=>x.id));
    const allocated=Object.entries(s.hall).filter(([id,h])=>h.year===data.year&&!selected.has(id)).map(([,h])=>h);
    const usedSeats=new Set(allocated.map(h=>Number(h.seat))), usedSecrets=new Set(allocated.map(h=>Number(h.secret)));
    const any=data.generation==='random', step=data.generation==='step'?Number(data.step):1;
    const seats=allocateExamNumbers(any?100000:data.first,any?999999:data.seatEnd,step,students.length,usedSeats,any||data.seatOrder==='random',100000,999999);
    const secrets=allocateExamNumbers(any?1000:data.secretStart,any?9999:data.secretEnd,step,students.length,usedSecrets,any||data.secretOrder==='random',1000,9999);
    students.forEach((student,i)=>{
      s.hall[student.id]={year:data.year,seat:seats[i],secret:secrets[i],room:rooms.get(student.id),exam:str(data.exam),head:str(data.head)};
    });
    count=students.length;
  });
  filters[route]={...filters[route],year:data.year};render();flash('تم توليد أرقام الجلوس لـ '+count+' طالب.');
};
actions['hall-card']=id=>{
  const student=lookup('students',id), hall=school().hall[id];
  const title='بطاقة رقم الجلوس';
  showDocument(title,[],[],paperFrame(title,student.year,paperTable(['الطالب','الصف','الفصل','رقم الجلوس','القاعة'],[[student.name,student.cls,student.section,hall.seat,hall.room]]),{variant:'hall'}),'عمودي');
};
actions['hall-report']=kind=>{
  const f=filterData(route), rows=hallRows(f);
  if(kind==='excel')return downloadExcel('أرقام الجلوس',HALL_HEADERS,hallColumns(rows));
  if(kind==='stats'){
    const rooms=new Map();
    for(const student of rows){
      const room=school().hall[student.id].room,key=room+'|'+student.cls;
      rooms.set(key,(rooms.get(key)||0)+1);
    }
    return schoolListReport('إحصائية القاعات والصفوف',f.year,['القاعة','الصف','عدد الطلبة'],[{rows:[...rooms].map(([key,n])=>[...key.split('|'),n])}],{variant:'hall'});
  }
  detailedHallReport(kind,f.year,rows);
};
const certificateStages=['التاسع','الثالث ثانوي'];
function certificateRow(student) {
  const official=school().certificateResults[student.id];
  return official||{seat:school().hall[student.id]?.seat,status:'',total:null,percent:null};
}
pages['student_results']=()=>{
  const f=filterData(route), rows=filterStudents(f).filter(s=>certificateStages.includes(s.cls)), page=paginate(route,rows,f);
  const cols=['ر.م','رقم القيد','رقم الجلوس','اسم الطالب','الصف','الحالة','المجموع','المعدل العام','نتيجة الطالب','تفاصيل'];
  return header('الاستعلام عن النتائج للطلبة الشهائد','النتائج التي تُدخلها إدارة المدرسة',f.year)+card(filterForm(route,[FILTER_YEAR,['cls','الصف',certificateStages],['q','البحث','search'],FILTER_LIMIT],f))+
    `<div class="btns gap">${btn('استعلام برقم الجلوس والقيد','certificate-search')}${btn('طباعة الكل','certificates-report','all')}${btn('طباعة الناجحين','certificates-report','ناجح')}${btn('طباعة الدور الثاني','certificates-report','دور ثان')}${btn('طباعة الراسبين','certificates-report','راسب')}${btn('كشف الطلبة الأوائل','certificates-report','top')}</div>${table(cols,page.rows.map((s,i)=>{const r=certificateRow(s);return [i+1,s.reg,r.seat??'',s.name,s.cls,r.status||'—',r.total??'—',r.percent??'—',r.status?'مسجلة':'لم تُسجل',raw('<div class="row-tools">'+btn('إدخال نتيجة','certificate-edit',s.id,'tiny soft')+btn('عرض رصد الأعمال','student-result',s.id,'tiny soft')+'</div>')];}))}${page.tools}`;
};
actions['certificate-search']=()=>showDialog('الاستعلام برقم الجلوس والقيد',`<form class="stack" data-form="certificate-search">${field(FILTER_YEAR,filterData(route).year)}${field(['seat','رقم الجلوس (6 أرقام)','text',true],'',{pattern:'[0-9]{6}',inputmode:'numeric'})}${field(['reg','رقم القيد','text',true])}${submit('عرض النتيجة')}</form>`);
forms['certificate-search']=data=>{
  const student=activeStudents(data.year).find(s=>certificateStages.includes(s.cls)&&s.reg===digits(data.reg)&&String(certificateRow(s).seat)===digits(data.seat));
  if(!student||!certificateRow(student).status)throw new Error('لم أجد نتيجة شهادة مسجلة للبيانات المدخلة.');
  const r=certificateRow(student);
  showReport('نتيجة شهادة مسجلة',student.year,['رقم الجلوس','رقم القيد','الطالب','الصف','المجموع','المعدل','الحالة'],[[r.seat,student.reg,student.name,student.cls,r.total,r.percent,r.status]]);
};
actions['certificate-edit']=id=>{
  const student=lookup('students',id), r=certificateRow(student);
  showDialog('إدخال نتيجة شهادة',`<p>${esc(student.name)} · ${esc(student.cls)}</p><form class="stack" data-form="certificate" data-id="${esc(id)}">${field(['seat','رقم الجلوس (6 أرقام)','text',true],r.seat,{pattern:'[0-9]{6}',inputmode:'numeric'})}${field(['total','المجموع','number',true],r.total,{min:0,step:.1})}${field(['percent','المعدل العام (%)','number',true],r.percent,{min:0,max:100,step:.01})}${field(['status','الحالة',['ناجح','دور ثان','راسب'],true],r.status,{blank:'اختر الحالة'})}${field(['public','إظهار نتيجة الشهادة في بوابة النتائج','checkbox'],r.public)}${submit('حفظ النتيجة')}</form>`);
};
forms.certificate=async(data,form)=>{
  const student=lookup('students',form.dataset.id), seat=digits(data.seat), total=Number(data.total), percent=Number(data.percent);
  if(!certificateStages.includes(student.cls)||!/^\d{6}$/.test(seat)||!Number.isFinite(total)||total<0||!Number.isFinite(percent)||percent<0||percent>100||!['ناجح','دور ثان','راسب'].includes(data.status))throw new Error('راجع بيانات نتيجة الشهادة.');
  await update(s=>{
    if(s.students.some(row=>row.id!==student.id&&row.year===student.year&&row.cls===student.cls&&s.certificateResults[row.id]?.seat===seat))throw new Error('رقم الجلوس مسجل بالفعل في هذا الصف.');
    s.certificateResults[student.id]={seat,total,percent,status:data.status,public:Boolean(data.public)};
  });
  $('#modal').close();render();flash('حُفظت نتيجة الشهادة.');
};
actions['certificates-report']=kind=>{
  const f=filterData(route);
  let rows=filterStudents(f).filter(s=>certificateStages.includes(s.cls)).map(s=>({s,r:certificateRow(s)}));
  if(kind==='top')rows=rows.filter(x=>x.r.status==='ناجح').sort((a,b)=>b.r.percent-a.r.percent).slice(0,10);
  else if(kind!=='all')rows=rows.filter(x=>x.r.status===kind);
  showReport(kind==='all'?'كشف النتائج':kind==='top'?'كشف الطلبة الأوائل':'كشف النتائج · '+kind,f.year,['رقم القيد','رقم الجلوس','الاسم','الصف','الحالة','المجموع','المعدل'],rows.map(({s,r})=>[s.reg,r.seat||'—',s.name,s.cls,r.status||'—',r.total??'—',r.percent??'—']));
};

function questionRows(f) {return onlyYear(school().questions,f.year).filter(q=>(!f.cls||q.cls===f.cls)&&(!f.section||q.section===f.section)&&finds(q.subject,f.q));}
pages['exam-questions']=()=>{
  const f=filterData(route);
  return header('إنشاء أسئلة الامتحانات','',f.year)+card(filterForm(route,[FILTER_YEAR,FILTER_CLASS,FILTER_SECTION,['q','المادة','search']],f))+
    `<div class="btns gap">${btn('إضافة سؤال جديد','question-edit','','green')}${btn('طباعة الأسئلة بأسماء الطلبة','question-print','names')}${btn('طباعة الأسئلة بدون أسماء','question-print')}${btn('كشف استلام الأسئلة','question-print','receipt')}</div>${table(['الصف','الفصل','الفترة','المادة','نص السؤال','أضيفت في','الإجراءات'],questionRows(f).map(q=>[q.cls,q.section,q.period,q.subject,q.text,q.date,raw(btn('تعديل','question-edit',q.id,'tiny soft'))]))}`;
};
actions['question-edit']=id=>{
  const q=id?lookup('questions',id):{year:filterData(route).year};
  showDialog(id?'تعديل السؤال':'إضافة سؤال جديد',`<form data-form="question" data-id="${esc(id)}" class="stack">${formFields([FILTER_YEAR,['cls','الصف',CLASSES,true],['section','الفصل',SECTIONS],['period','الفترة / الفصل',['الفترة الأولى','الفترة الثانية','الفترة الثالثة','الفصل الأول','الفصل الثاني','الدور الثاني'],true],['subject','المادة','text',true],['text','نص السؤال','textarea',true]],q)}${submit('حفظ السؤال')}</form>`);
};
forms.question=async(data,form)=>{
  const id=form.dataset.id||uid(), entry={...formText(data),id,date:dayISO()};
  await update(s=>{
    const old=s.questions.find(q=>q.id===id);
    if(old)Object.assign(old,entry);
    else s.questions.push(entry);
  });
  $('#modal').close();render();flash('حُفظ السؤال.');
};
actions['question-print']=mode=>{
  const f=filterData(route), rows=questionRows(f);
  if(mode==='receipt')return showReport('كشف استلام الأسئلة',f.year,['الصف','الفصل','الفترة','المادة','التوقيع'],rows.map(q=>[q.cls,q.section,q.period,q.subject,'']));
  if(mode==='names'){
    const groups=new Map();
    for(const q of rows){
      const key=[q.cls,q.section,q.period,q.subject].join('|');
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(q);
    }
    const markup=[...groups.values()].flatMap(questions=>{
      const first=questions[0];
      return filterStudents({...f,cls:first.cls,section:first.section,q:''}).map(s=>reportMarkup('أسئلة امتحان '+first.subject,f.year,`<p>${esc(s.name)} · <bdi>${esc(s.reg)}</bdi> · ${esc(first.period)}</p><ol>${questions.map(q=>'<li class="message-text">'+esc(q.text)+'</li>').join('')}</ol>`,school().profile.name));
    }).join('');
    return showDocument('أسئلة الامتحان بأسماء الطلبة',[],[],markup||reportMarkup('أسئلة الامتحان',f.year,notice('لا توجد أسئلة مرتبطة بطلبة في الصفوف المحددة.'),school().profile.name));
  }
  showReport('أسئلة الامتحان',f.year,['الصف','الفترة','المادة','السؤال'],rows.map(q=>[q.cls,q.period,q.subject,q.text]));
};
const scheduleHeaders=['التاريخ','اليوم','الصف','المادة','من','إلى'];
const examOutput=rows=>rows.map(e=>[e.date,DAYS[new Date(e.date+'T12:00:00').getDay()],e.cls,e.subject,e.start,e.end]);
pages['exam-schedule']=()=>{
  const f=filterData(route), rows=school().exams[f.year]||[];
  return header('إنشاء جدول الامتحانات','',f.year)+card(`<form data-form="exam-schedule" class="stack">${field(FILTER_YEAR,f.year)}<h3>الصفوف المستهدفة</h3><div class="fields tight">${examsClasses.map((cls,i)=>field(['cls'+i,cls,'checkbox'],cls==='السابع')).join('')}</div><div class="fields">${field(['type','نوع الامتحان',['الفصل الأول','الفصل الثاني','الدور الثاني']],'الفصل الأول')}${field(['start','تاريخ بداية الامتحانات','date',true],dayISO())}${field(['from','من','time',true],'08:00')}${field(['to','إلى','time',true],'10:00')}${field(['holidays','أيام العطل الإضافية','text'],'',{placeholder:'2026-11-17, 2026-11-19'})}</div>${submit('توليد الجدول')}</form>`)+`<section class="gap stack"><div class="toolbar"><h3>جدول الامتحانات</h3>${btn('طباعة الجدول','exam-print')}</div>${table(scheduleHeaders,examOutput(rows))}</section>`;
};
forms['exam-schedule']=async data=>{
  const classes=examsClasses.filter((_,i)=>data['cls'+i]);
  if(!classes.length||data.from>=data.to)throw new Error('حدد الصفوف ووقت بداية ونهاية صالحين.');
  const holidays=new Set(str(data.holidays).split(/[،,; ]+/).filter(Boolean));
  if([...holidays].some(date=>!/^20\d\d-\d\d-\d\d$/.test(date)))throw new Error('أدخل العطل على شكل سنة-شهر-يوم.');
  await update(s=>{
    const days=s.days[data.year]||DAYS.slice(0,5);
    if(!days.length)throw new Error('حدد أيام دوام في إدارة الأيام الدراسية.');
    const rows=[];
    for(const cls of classes) {
      const subjects=gradePlan(routeForClass(cls),cls,'علمي').items;
      let date=data.start;
      for(const subject of subjects) {
        while(!days.includes(DAYS[new Date(date+'T12:00:00').getDay()])||holidays.has(date))date=shiftDate(date,1);
        rows.push({date,cls,subject:subject.label,start:data.from,end:data.to,type:data.type});
        date=shiftDate(date,1);
      }
    }
    s.exams[data.year]=rows.sort((a,b)=>a.date.localeCompare(b.date)||localeCompare(a.cls,b.cls));
  });
  filters[route]={...filters[route],year:data.year};render();flash('حُفظ جدول الامتحانات التجريبي.');
};
actions['exam-print']=()=>{const f=filterData(route);showReport('جدول الامتحانات',f.year,scheduleHeaders,examOutput(school().exams[f.year]||[]));};
pages['exam-observers']=()=>{
  const f=filterData(route), staff=onlyYear(school().staff,f.year);
  return header('توزيع الملاحظين على القاعات','',f.year)+card(`<form data-form="observers" class="stack">${field(FILTER_YEAR,f.year)}${field(['count','عدد الملاحظين في كل قاعة','number',true],1,{min:1,max:10})}<h3>استبعاد معلمين من الملاحظة</h3><div class="fields">${staff.map(s=>field(['exclude!'+s.id,s.name,'checkbox'])).join('')}</div>${submit('توليد جدول التوزيع')}</form>`)+
    `<div class="gap stack">${btn('طباعة التوزيع','observer-report')}${table(['التاريخ','الوقت','القاعة','الصف','الملاحظون'],school().observers[f.year]||[])}</div>`;
};
forms.observers=async data=>{
  const s=school(), exams=s.exams[data.year]||[], staff=onlyYear(s.staff,data.year).filter(x=>!data['exclude!'+x.id]);
  if(!exams.length)throw new Error('أنشئ جدول الامتحانات أولًا.');
  const n=Number(data.count), load=new Map(staff.map(x=>[x.id,0])), groups=new Map();
  for(const exam of exams) {
    const rooms=new Set(onlyYear(s.students,data.year).filter(x=>x.cls===exam.cls&&s.hall[x.id]).map(x=>s.hall[x.id].room));
    for(const room of rooms) {
      const key=[exam.date,exam.start,room].join('|');
      if(!groups.has(key))groups.set(key,{...exam,room,classes:new Set()});
      groups.get(key).classes.add(exam.cls);
    }
  }
  if(!groups.size)throw new Error('ولّد أرقام الجلوس والقاعات للصفوف المجدولة.');
  const busy=new Map();
  const rows=[...groups.values()].map(group=>{
    const time=group.date+'|'+group.start, occupied=busy.get(time)||new Set();
    const choices=staff.filter(x=>!occupied.has(x.id)).sort((a,b)=>load.get(a.id)-load.get(b.id)).slice(0,n);
    choices.forEach(x=>{occupied.add(x.id);load.set(x.id,load.get(x.id)+1);});
    busy.set(time,occupied);
    return [group.date,group.start,group.room,[...group.classes].join('، '),choices.map(x=>x.name).join('، ')+(choices.length<n?' · عجز '+(n-choices.length):'')];
  });
  await update(schoolData=>{schoolData.observers[data.year]=rows;});
  filters[route]={...filters[route],year:data.year};render();flash('حُفظ جدول توزيع الملاحظين.');
};
actions['observer-report']=()=>{const f=filterData(route);showReport('توزيع الملاحظين على القاعات',f.year,['التاريخ','الوقت','القاعة','الصف','الملاحظون'],school().observers[f.year]||[]);};

const classFields=[FILTER_YEAR,['cls','الصف الدراسي',CLASSES,true],['section','الشعبة',SECTIONS,true],['shift','الفترة',['صباحية','مسائية'],true],['boys','عدد الذكور','number',true],['girls','عدد الإناث','number',true]];
const subjectFields=[FILTER_YEAR,['name','اسم المادة','text',true],['cls','الصف',CLASSES,true],['lessons','عدد الحصص','number',true]];
const CLASS_COLS=['الصف','الشعبة','الفترة','الذكور','الإناث','المجموع','تاريخ الإضافة'];
const SUBJECT_COLS=['المادة','الصف','عدد الحصص','تاريخ الإضافة'];
const classRow=x=>[x.cls,x.section,x.shift,Number(x.boys),Number(x.girls),Number(x.boys)+Number(x.girls),x.date];
const subjectRow=x=>[x.name,x.cls,Number(x.lessons),x.date];
function setupPage(subject) {
  const f=filterData(route), type=subject?'subjects':'classes', rows=onlyYear(school()[type],f.year), columns=subject?SUBJECT_COLS:CLASS_COLS, row=subject?subjectRow:classRow;
  const schema=subject?subjectFields:classFields;
  const form=`<form data-form="setup" data-type="${type}" class="stack"><div class="fields">${formFields(schema,{year:f.year,shift:'صباحية',boys:'0',girls:'0',lessons:'1'})}</div>${submit(subject?'حفظ':'إضافة')}</form>`;
  return header(TITLES[route],subject?'إدارة المواد وعدد الحصص':'إدارة الصفوف الدراسية والفصول',f.year)+card(filterForm(route,[FILTER_YEAR],f))+`<div class="gap">${card(form)}</div><div class="btns gap">${btn('تصدير Excel','setup-export',type)}${!subject?btn('مزامنة الفصول من قائمة الطلاب','sync-classes'):''}</div>${table([...columns,'الإجراءات'],rows.map(x=>[...row(x),raw(btn('تعديل','setup-edit',type+'|'+x.id,'tiny soft'))]))}`;
}
pages['manage-classes']=()=>setupPage(false);
pages['manage-subjects']=()=>setupPage(true);
actions['setup-export']=type=>{
  const f=filterData(route), isClass=type==='classes';
  downloadExcel(TITLES[route],isClass?CLASS_COLS:SUBJECT_COLS,onlyYear(school()[type],f.year).map(isClass?classRow:subjectRow));
};
actions['setup-edit']=value=>{
  const [type,id]=value.split('|'), entry=lookup(type,id);
  showDialog('تعديل السجل',`<form data-form="setup" data-type="${esc(type)}" data-id="${esc(id)}" class="stack">${formFields(type==='classes'?classFields:subjectFields,entry)}${submit('حفظ')}</form>`);
};
forms.setup=async(data,form)=>{
  const type=form.dataset.type, id=form.dataset.id||uid(), next={...formText(data),id,date:dayISO()}, isClass=type==='classes';
  if(isClass&&[data.boys,data.girls].some(n=>!Number.isInteger(Number(n))||Number(n)<0))throw new Error('أدخل أعدادًا صحيحة.');
  if(!isClass&&(!Number.isInteger(Number(data.lessons))||Number(data.lessons)<1||Number(data.lessons)>40))throw new Error('أدخل عدد حصص بين 1 و40.');
  await update(s=>{
    const row=s[type].find(x=>x.id===id);
    if(row&&s.assignments.some(a=>a.subject===id)&&['year','cls'].some(k=>row[k]!==next[k]))throw new Error('المادة مرتبطة بإسناد في هذا الصف.');
    if(s[type].some(x=>x.id!==id&&x.year===next.year&&x.cls===next.cls&&(isClass?x.section===next.section&&x.shift===next.shift:normalized(x.name)===normalized(next.name))))throw new Error('السجل موجود بالفعل.');
    if(row)Object.assign(row,next);
    else s[type].push(next);
  });
  $('#modal').close();filters[route]={...filters[route],year:data.year};render();flash('حُفظ السجل.');
};
actions['sync-classes']=async()=>{
  const year=filterData(route).year;
  await update(s=>{
    const groups=new Map();
    for(const x of onlyYear(s.students,year).filter(x=>!x.archive&&x.section)){
      const key=x.cls+'|'+x.section;
      if(!groups.has(key))groups.set(key,{cls:x.cls,section:x.section,boys:0,girls:0});
      const group=groups.get(key);
      if(x.gender==='ذكر')group.boys++;
      if(x.gender==='أنثى')group.girls++;
    }
    for(const x of groups.values()){
      const row=s.classes.find(r=>r.year===year&&r.cls===x.cls&&r.section===x.section&&r.shift==='صباحية');
      if(row)Object.assign(row,x);
      else s.classes.push({...x,id:uid(),year,shift:'صباحية',date:dayISO()});
    }
  });
  render();flash('تمت مزامنة الفصول من السجلات.');
};
pages['import-teachers-names']=()=>{
  const f=filterData(route,{job:''}), staff=onlyYear(school().staff,f.year), jobs=[...new Set(staff.map(x=>x.job).filter(Boolean))];
  const rows=staff.filter(x=>school().teachers.includes(x.id));
  return header('استيراد أسماء المعلمين من الموارد البشرية','',f.year)+card(`<form data-form="teachers-import" class="fields">${field(FILTER_YEAR,f.year)}${field(['job','اختر الوظيفة',jobs],f.job,{blank:'الكل'})}${submit('استيراد')}</form>`)+`<div class="gap">${table(['#','اسم المعلم','الإسناد','تاريخ الإضافة'],rows.map((x,i)=>[i+1,x.name,school().assignments.some(a=>a.teacher===x.id)?'مسند':'غير مسند',x.start||'—']))}</div>`;
};
forms['teachers-import']=async data=>{
  await update(s=>{
    const ids=onlyYear(s.staff,data.year).filter(x=>!data.job||x.job===data.job).map(x=>x.id);
    s.teachers=[...new Set([...s.teachers,...ids])];
  });
  filters[route]={...filters[route],year:data.year,job:data.job};render();flash('تم استيراد المعلمين من سجلات الموظفين.');
};
function teacherName(id,s=school()) {return s.staff.find(x=>x.id===id)?.name||'—';}
function subjectName(id,s=school()) {return s.subjects.find(x=>x.id===id)?.name||'—';}
const assignmentHeaders=['المعلم','الصف','الشعبة','الفترة','المادة','عدد الحصص','تاريخ الإسناد'];
function assignmentRows(f) {return onlyYear(school().assignments,f.year).filter(a=>(!f.cls||a.cls===f.cls)&&(!f.section||a.section===f.section)&&finds(teacherName(a.teacher),f.q));}
const assignmentRow=a=>[teacherName(a.teacher),a.cls,a.section,a.shift,subjectName(a.subject),Number(a.lessons),a.date];
pages['assign-subjects']=()=>{
  const f=filterData(route), s=school(), staff=onlyYear(s.staff,f.year).filter(x=>s.teachers.includes(x.id));
  const subjects=onlyYear(s.subjects,f.year).map(x=>[x.id,x.cls+' · '+x.name]);
  return header('إسناد المواد للمعلمين','ربط المعلمين بالمواد والصفوف',f.year)+card(filterForm(route,[FILTER_YEAR,FILTER_CLASS,FILTER_SECTION,['q','بحث باسم المعلم','search']],f))+
    `<div class="gap">${card(`<form data-form="assignment" class="stack"><input type="hidden" name="year" value="${esc(f.year)}"><div class="fields">${field(['teacher','المعلم',staff.map(x=>[x.id,x.name]),true],'',{blank:'اختار'})}${field(['subject','المادة والصف',subjects,true],'',{blank:'اختار'})}${field(['section','الشعبة',SECTIONS,true],f.section||SECTIONS[0])}${field(['shift','الفترة',['صباحية','مسائية'],true],'صباحية')}${field(['lessons','عدد الحصص','number'],'',{min:1,max:40,placeholder:'عدد حصص المادة'})}</div>${submit('إسناد')}</form>`)}</div>
    <div class="btns gap">${btn('طباعة الإسنادات','assign-report')}${btn('تصدير Excel','assign-report','excel')}</div>${table(assignmentHeaders,assignmentRows(f).map(assignmentRow))}`;
};
forms.assignment=async data=>{
  await update(s=>{
    const subject=s.subjects.find(x=>x.id===data.subject&&x.year===data.year), teacher=s.staff.find(x=>x.id===data.teacher&&x.year===data.year&&s.teachers.includes(x.id));
    if(!subject||!teacher)throw new Error('اختر معلمًا ومادة من السنة الدراسية المحددة.');
    const lessons=Number(data.lessons||subject.lessons);
    if(!Number.isInteger(lessons)||lessons<1||lessons>40)throw new Error('عدد الحصص غير صالح.');
    const old=s.assignments.find(x=>x.year===data.year&&x.subject===subject.id&&x.section===data.section&&x.shift===data.shift);
    const row={...formText(data),id:old?.id||uid(),cls:subject.cls,lessons,date:dayISO()};
    if(old)Object.assign(old,row);else s.assignments.push(row);
  });
  render();flash('حُفظ الإسناد.');
};
actions['assign-report']=kind=>{
  const f=filterData(route), rows=assignmentRows(f).map(assignmentRow);
  if(kind==='excel')return downloadExcel('الإسنادات',assignmentHeaders,rows);
  showReport('كشف الإسنادات',f.year,assignmentHeaders,rows);
};

const slotKey=(day,i)=>day+'|'+i;
const scheduleKey=(year,cls,section,shift)=>[year,cls,section,shift].join('|');
const scheduleFilter=[FILTER_YEAR,FILTER_CLASS,FILTER_SECTION,['shift','الفترة',['صباحية','مسائية']]];
function scheduleTable(record,editor=false) {
  const schoolData=school(), work=schoolData.days[record.year]||DAYS.slice(0,5);
  const subjects=onlyYear(schoolData.subjects,record.year).filter(x=>x.cls===record.cls);
  const staff=onlyYear(schoolData.staff,record.year).filter(x=>schoolData.teachers.includes(x.id));
  const rows=work.map(day=>[day,...PERIODS.map((_,i)=>{
    const key=slotKey(day,i), row=record.slots[key];
    if(!editor)return row?subjectName(row.subject)+' · '+teacherName(row.teacher):'—';
    return raw(`<label class="field"><select name="subject!${esc(key)}" aria-label="${esc(day+' المادة '+PERIODS[i])}">${options(subjects.map(s=>[s.id,s.name]),row?.subject,'اختر المادة')}</select><select name="teacher!${esc(key)}" aria-label="${esc(day+' المعلم '+PERIODS[i])}">${options(staff.map(s=>[s.id,s.name]),row?.teacher,'اختر المعلم')}</select></label>`);
  })]);
  return {rows,headers:['اليوم / الحصة',...PERIODS]};
}
function emptySchedule(f,type='manual') {return {year:f.year,cls:f.cls,section:f.section,shift:f.shift,slots:{},type};}
pages['create-schedule-manual']=()=>{
  const f=filterData(route,{cls:'السابع',section:SECTIONS[0],shift:'صباحية'});
  const record=school().schedules[scheduleKey(f.year,f.cls,f.section,f.shift)]||emptySchedule(f), plan=scheduleTable(record,true);
  return header('إنشاء جدول يدوي','',f.year)+card(filterForm(route,scheduleFilter,f))+`<form data-form="manual-schedule" class="stack gap"><div class="btns">${submit('حفظ')}${link('عرض الجداول','view-schedules','soft')}</div>${table(plan.headers,plan.rows,{className:'grid-table'})}</form>`;
};
forms['manual-schedule']=async data=>{
  const f=filterData(route,{cls:'السابع',section:SECTIONS[0],shift:'صباحية'}), record=emptySchedule(f), key=scheduleKey(f.year,f.cls,f.section,f.shift);
  if(!record.cls||!record.section||!record.shift)throw new Error('اختر الصف والشعبة والفترة.');
  await update(s=>{
    for(const day of s.days[f.year]||DAYS.slice(0,5))for(let i=0;i<PERIODS.length;i++) {
      const slot=slotKey(day,i), subject=data['subject!'+slot], teacher=data['teacher!'+slot];
      if(!subject&&!teacher)continue;
      if(!subject||!teacher)throw new Error('اختر المعلم والمادة معًا للحصة '+PERIODS[i]+' يوم '+day+'.');
      if(!teacherAvailable(s,teacher,f.year,slot))throw new Error('المعلم غير متاح في الحصة '+PERIODS[i]+' يوم '+day+'.');
      if(Object.entries(s.schedules).some(([id,other])=>id!==key&&other.year===f.year&&other.shift===f.shift&&other.slots[slot]?.teacher===teacher))throw new Error('تعارض معلم في الحصة '+PERIODS[i]+' يوم '+day+'.');
      record.slots[slot]={subject,teacher};
    }
    s.schedules[key]=record;
  });
  render();flash('حُفظ الجدول اليدوي.');
};
let autoSummary='';
pages['create-schedule-new']=()=>{
  const f=filterData(route), s=school(), assignments=onlyYear(s.assignments,f.year);
  return header('إنشاء الجداول الدراسية','إنشاء جداول تلقائية للصفوف',f.year)+
    `<div class="grid3 gap">${[['الصفوف والفصول',onlyYear(s.classes,f.year).length],['المواد',onlyYear(s.subjects,f.year).length],['الإسنادات الحالية',assignments.length]].map(([label,value])=>`<div class="card metric"><h3>${label}</h3><strong>${value}</strong></div>`).join('')}</div>${card(`<form data-form="auto-schedule" class="stack">${field(FILTER_YEAR,f.year)}${field(['periods','عدد الحصص اليومية','number',true],8,{min:1,max:8})}<div class="btns">${submit('إنشاء الجداول تلقائياً')}${btn('تفضيلات وقيود المعلمين','schedule-constraints')}</div></form>`)}${autoSummary?notice(autoSummary,'warn'):''}<div class="gap">${link('عرض الجداول المنشأة','view-schedules','soft')}</div>`;
};
forms['auto-schedule']=async data=>{
  const periods=Number(data.periods), year=data.year;
  let omitted=0, total=0;
  await update(s=>{
    const days=s.days[year]||DAYS.slice(0,5), assignments=onlyYear(s.assignments,year).sort((a,b)=>b.lessons-a.lessons);
    if(!assignments.length)throw new Error('أضف إسنادات لهذا العام قبل توليد الجدول.');
    const busy=new Set();
    for(const [key,record] of Object.entries(s.schedules)) {
      if(record.year!==year)continue;
      if(record.type==='auto')delete s.schedules[key];
      else for(const [slot,row] of Object.entries(record.slots))busy.add(record.shift+'|'+slot+'|'+row.teacher);
    }
    for(const a of assignments){
      const key=scheduleKey(year,a.cls,a.section,a.shift);
      const schedule=s.schedules[key] ||= emptySchedule(a,'auto');
      if(schedule.type==='manual')continue;
      const daily=new Map(days.map(day=>[day,0]));
      for(let n=0;n<a.lessons;n++){
        const choices=[...days].sort((d1,d2)=>daily.get(d1)-daily.get(d2));
        let placed=false;
        for(const day of choices){
          const slot=Array.from({length:periods},(_,i)=>slotKey(day,i)).find(slot=>!schedule.slots[slot]&&!busy.has(a.shift+'|'+slot+'|'+a.teacher)&&teacherAvailable(s,a.teacher,year,slot));
          if(!slot)continue;
          schedule.slots[slot]={teacher:a.teacher,subject:a.subject};busy.add(a.shift+'|'+slot+'|'+a.teacher);daily.set(day,daily.get(day)+1);placed=true;total++;break;
        }
        if(!placed)omitted++;
      }
    }
  });
  autoSummary='تم إسناد '+total+' حصة'+(omitted?'، وتعذر إسناد '+omitted+' بسبب قيود التوقيت.':'.');
  filters[route]={...filters[route],year};render();flash('حُفظت الجداول التجريبية.');
};
function teacherAvailable(s,id,year,slot) {
  return !s.teacherAvailability[year+'|'+id]?.includes(slot);
}
actions['schedule-constraints']=(_value,button)=>{
  const year=button.closest('form').elements.year.value;
  const choices=onlyYear(school().staff,year).filter(x=>school().teachers.includes(x.id));
  if(!choices.length)throw new Error('استورد معلمين لهذه السنة أولًا.');
  showDialog('تفضيلات وقيود المعلمين',`<form data-form="schedule-constraints-open" data-year="${esc(year)}" class="stack">${field(['teacher','المعلم',choices.map(s=>[s.id,s.name]),true],'',{blank:'اختر المعلم'})}${submit('عرض أوقات التفرغ')}</form>`);
};
forms['schedule-constraints-open']=(data,form)=>{
  const year=form.dataset.year, teacher=lookup('staff',data.teacher);
  const blocked=school().teacherAvailability[year+'|'+teacher.id]||[];
  const days=school().days[year]||DAYS.slice(0,5);
  const rows=days.map(day=>[day,...PERIODS.map((period,i)=>raw(field(['block!'+slotKey(day,i),'غير متاح','checkbox'],blocked.includes(slotKey(day,i)),{'aria-label':day+' · '+period+' غير متاح'})))]);
  showDialog('أوقات التفرغ · '+teacher.name,`<form data-form="schedule-constraints-save" data-year="${esc(year)}" data-teacher="${esc(teacher.id)}" class="stack"><p>حدد الحصص التي لا يمكن إسنادها إلى المعلم.</p>${table(['اليوم / الحصة',...PERIODS],rows,{className:'grid-table'})}${submit('حفظ القيود')}</form>`);
};
forms['schedule-constraints-save']=async(data,form)=>{
  const {year,teacher}=form.dataset, blocked=Object.keys(data).filter(k=>k.startsWith('block!')).map(k=>k.slice(6));
  await update(s=>{
    if(!s.staff.some(x=>x.id===teacher&&x.year===year))throw new Error('المعلم غير مسجل في هذه السنة.');
    s.teacherAvailability[year+'|'+teacher]=blocked;
  });
  $('#modal').close();render();flash('حُفظت أوقات التفرغ.');
};
function availableSchedules(f) {
  return Object.entries(school().schedules).filter(([,r])=>r.year===f.year&&(!f.cls||r.cls===f.cls)&&(!f.section||r.section===f.section)&&(!f.shift||r.shift===f.shift));
}
pages['view-schedules']=()=>{
  const f=filterData(route,{shift:''}), schedules=availableSchedules(f);
  const tables=schedules.map(([key,r])=>{
    const plan=scheduleTable(r);
    return card(`<div class="toolbar"><h3>${esc([r.cls,r.section,r.shift].join(' · '))}</h3><div class="btns">${btn('طباعة جدول','schedule-report',key,'tiny soft')}${btn('تصدير Excel','schedule-export',key,'tiny soft')}</div></div>${table(plan.headers,plan.rows)}`);
  }).join('');
  return header('عرض الجداول الدراسية','الجداول المحفوظة',f.year)+card(filterForm(route,scheduleFilter,f))+`<div class="gap stack">${tables||notice('أنشئ جدولًا يدويًا أو تلقائيًا لعرضه هنا.')}</div>`;
};
actions['schedule-report']=key=>{
  const record=school().schedules[key],plan=scheduleTable(record);
  showReport('جدول '+record.cls+' · '+record.section,record.year,plan.headers,plan.rows);
};
actions['schedule-export']=key=>{
  const record=school().schedules[key],plan=scheduleTable(record);
  downloadExcel('جدول '+record.cls+' '+record.section,plan.headers,plan.rows);
};
pages['manage-days']=()=>{
  const f=filterData(route), days=school().days[f.year]||DAYS.slice(0,5);
  return header('إدارة الأيام الدراسية','تحديد أيام الدوام والعطلة الأسبوعية للمدرسة',f.year)+card(filterForm(route,[FILTER_YEAR],f))+
    `<form data-form="days" data-year="${esc(f.year)}" class="stack gap"><div class="btns">${btn('الافتراضي (الأحد - الخميس)','days-preset','5')}${btn('السبت إلى الخميس (6 أيام)','days-preset','6')}${submit('حفظ التغييرات للأيام الدراسية')}</div>${table(['#','اليوم','نوع اليوم','الحالة الحالية','تفعيل / تعطيل'],DAYS.map((day,i)=>[i+1,day,days.includes(day)?'دوام':'عطلة',days.includes(day)?'مفعّل':'معطّل',raw(field(['day'+i,'دوام','checkbox'],days.includes(day)))]))}</form>`;
};
actions['days-preset']=value=>{
  const form=$('form[data-form=days]');
  DAYS.forEach((_,i)=>{form.elements['day'+i].checked=i<5||i===6&&value==='6';});
};
forms.days=async(data,form)=>{
  const selected=DAYS.filter((_,i)=>data['day'+i]);
  if(!selected.length)throw new Error('اختر يوم دوام واحدًا على الأقل.');
  await update(s=>{s.days[form.dataset.year]=selected;});render();flash('حُفظت أيام الدوام.');
};
