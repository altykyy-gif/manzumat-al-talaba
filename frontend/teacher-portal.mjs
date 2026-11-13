import {ATTENDANCE,CLASSES,DAYS,PERIODS,SECTIONS,YEAR,YEARS,gradePlan,routeForClass} from './data.js';
import {dayISO,gradeKey} from './model.mjs';
import {cleanWorkflowText,setGradeMark} from './policy.mjs';

export const TEACHER_OPTIONS={
  attendance:'صفحة تسجيل الحضور والغياب',
  schedule:'صفحة جدول الحصص الأسبوعي',
  homework:'صفحة الواجبات والملاحظات المدرسية (شامل)',
  addHomework:'إضافة واجب مدرسي',
  listHomework:'عرض الواجبات المدرسية',
  notes:'إرسال ملاحظة لولي الأمر',
  inquiries:'الرد على استفسارات الواجبات'
};
export const TEACHER_PERIODS=[['p1','الفترة الأولى'],['p2','الفترة الثانية'],['p3','الفترة الثالثة'],['s1','الفصل الدراسي الأول'],['s2','الفصل الدراسي الثاني']];
export const TEACHER_ATTENDANCE=[...ATTENDANCE];
export const TEACHER_NOTE_TYPES=[['تشجيع وتميز','تشجيع وتميز وتفوق'],['ملاحظة سلوكية','ملاحظة سلوكية داخل الفصل'],['إشعار تقصير في الواجبات','إشعار تقصير في حل الواجبات'],['طلب استدعاء ولي أمر','طلب مقابلة ولي الأمر']];
export const TEACHER_ATTACHMENT_LIMIT=5_000_000;
const teacherNormalize=value=>String(value??'').trim().replace(/[أإآ]/g,'ا').replace(/[\u064b-\u065fـ]/g,'').replace(/[^\p{L}\p{N}]/gu,'');
function teacherSubject(assignment,stream) {
  const source=routeForClass(assignment.cls), main=gradePlan(source,assignment.cls,stream,assignment.year);
  const subject=teacherNormalize(assignment.label);
  const aliases={
    a:['العربية','اللغة العربية','النحو والقراءة والنصوص','اللغة العربية (النحو والقراءة والنصوص)'],
    w:['الكتابة','التعبير والإملاء والخط'],g:['الاجتماعيات','المواد الاجتماعية'],
    u:['علم النفس','التربية وعلم النفس'],p:['الفيزياء (الحرارية والميكانيكا)','الفيزياء (الكهرباء والميكانيكا)']
  };
  const item=main.items.find(x=>[x.label,...(aliases[x.key]||[])].some(name=>teacherNormalize(name)===subject));
  if(item)return {source,plan:main,item};
  const activity=gradePlan('add_activity_grades',assignment.cls,stream,assignment.year);
  const activityItem=activity.items.find(x=>x.choices&&teacherNormalize(x.label)===subject);
  return activityItem?{source:'add_activity_grades',plan:activity,item:activityItem}:null;
}
export function teacherFlags(s) {
  return Object.fromEntries(Object.keys(TEACHER_OPTIONS).map(key=>[key,s.teacherSettings?.[key]!==false]));
}
export function teacherPeriodKey(components,index) {
  return components.length===4?(index<2?'s1':'s2'):'p'+(index+1);
}
function teacherMarkLocked(s,group,item,components,index) {
  const settings=s.teacherSettings||{};
  return Boolean(settings.lockAll||settings.locks?.some(lock=>lock.year===group.year&&(!lock.cls||lock.cls===group.cls)&&(!lock.section||lock.section===group.section)&&(!lock.subject||lock.subject===item.key)&&(!lock.period||lock.period===teacherPeriodKey(components,index))));
}
export function normalizeTeacherSettings(settings) {
  const flags=Object.fromEntries(Object.keys(TEACHER_OPTIONS).map(key=>[key,settings[key]!==false]));
  return {...flags,lockAll:Boolean(settings.lockAll)};
}
export function teacherGradeLock(s,data,id) {
  const lock={id,year:data.year,cls:data.cls||'',section:data.section||'',subject:data.subject||'',period:data.period||''};
  if(!YEARS.includes(lock.year)||lock.cls&&!CLASSES.includes(lock.cls)||lock.section&&!SECTIONS.includes(lock.section)||
    lock.subject&&!/^[a-z0-9]{1,8}$/.test(lock.subject)||lock.period&&!TEACHER_PERIODS.some(([key])=>key===lock.period))throw new Error('تحقق من نطاق قفل الدرجات.');
  const locks=s.teacherSettings.locks ||= [];
  const exists=locks.find(row=>['year','cls','section','subject','period'].every(key=>row[key]===lock[key]));
  if(!exists)locks.push(lock);
}
export function updateTeacherAccount(s,id,name,national) {
  const staff=s.staff.find(row=>row.id===id);
  const value=String(national??'').trim();
  if(!staff||!/^\d{12}$/.test(value))throw new Error('أدخل الرقم الوطني المكوّن من 12 رقمًا.');
  if(s.staff.some(row=>row.id!==id&&row.year===staff.year&&row.national===value))throw new Error('الرقم الوطني مسجّل لموظف آخر في السنة نفسها.');
  staff.name=cleanWorkflowText(name,150,true);
  staff.national=value;
  return staff;
}
export function teacherGroups(s,staff) {
  const subjects=new Map(s.subjects.filter(item=>item.year===staff.year).map(item=>[item.id,item]));
  return s.assignments.filter(a=>a.year===staff.year&&a.teacher===staff.id&&subjects.has(a.subject)).map(a=>{
    const subject=subjects.get(a.subject);
    return {id:a.id,year:a.year,cls:a.cls,section:a.section,shift:a.shift,lessons:a.lessons,label:subject.name,stream:a.stream||subject.stream||'',date:a.date,subject:a.subject};
  }).sort((a,b)=>CLASSES.indexOf(a.cls)-CLASSES.indexOf(b.cls)||a.section.localeCompare(b.section,'ar',{numeric:true})||a.label.localeCompare(b.label,'ar'));
}
function teacherRoster(s,group) {
  return s.students.filter(x=>!x.archive&&x.year===group.year&&x.cls===group.cls&&x.section===group.section&&(!group.stream||x.stream===group.stream))
    .sort((a,b)=>a.name.localeCompare(b.name,'ar',{numeric:true})||a.reg.localeCompare(b.reg,'ar',{numeric:true}));
}
function gradeFieldsFor(s,group,stream) {
  const plan=teacherSubject(group,stream);
  if(!plan)return [];
  const {source,item,plan:{components,rules}}=plan;
  const exams=rules?.finalIndexes||(components.length===4?[1,3]:[]);
  const indexes=components.map((_,i)=>i).filter(i=>!exams.includes(i));
  return indexes.map(index=>({index,label:components[index],key:gradeKey(source,item.key,index),max:item.choices?null:item.max[index],choices:item.choices||[],locked:teacherMarkLocked(s,group,item,components,index)}));
}
const teacherAttendanceKey=(group,date,lesson)=>[group.id,date,lesson].join('|');
function teacherSchedule(s,staff,groups) {
  const cells=new Map();
  const subjects=new Map(s.subjects.map(item=>[item.id,item.name]));
  const days=s.days[staff.year]||DAYS.slice(0,5);
  const slots=[];
  for(const record of Object.values(s.schedules)){
    if(record.year!==staff.year)continue;
    for(const [slot,item] of Object.entries(record.slots||{})){
      if(item.teacher!==staff.id)continue;
      const [day,period]=slot.split('|'), index=Number(period);
      if(!days.includes(day)||!Number.isInteger(index)||index<0||index>=PERIODS.length)continue;
      const group=groups.find(a=>a.subject===item.subject&&a.cls===record.cls&&a.section===record.section&&a.shift===record.shift);
      const subject=subjects.get(item.subject)||'';
      const value=[subject,record.cls,record.section,record.shift].filter(Boolean).join(' · ');
      (cells.get(slot)||cells.set(slot,[]).get(slot)).push(value);
      slots.push({id:[group?.id||'',day,index+1,record.shift].join('|'),assignment:group?.id||'',day,lesson:index+1,subject,cls:record.cls,section:record.section,shift:record.shift});
    }
  }
  const hasEighth=slots.some(slot=>slot.lesson===8);
  const width=hasEighth?8:7;
  return {rows:days.map(day=>[day,...PERIODS.slice(0,width).map((_,i)=>cells.get(day+'|'+i)?.join(' / ')||'-')]),slots,periods:PERIODS.slice(0,width)};
}
function teacherDate(value) {
  return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value?value:dayISO();
}
function teacherDay(value) {return DAYS[new Date(value+'T12:00:00Z').getUTCDay()];}
function teacherSchoolDay(s,year,date) {return (s.days[year]||DAYS.slice(0,5)).includes(teacherDay(date));}
function teacherHomeworkMeta(row) {
  const {attachment,...record}=row;
  return attachment?{...record,attachmentName:attachment.name}:record;
}
export function teacherWorkspace(s,staff,filters={}) {
  const flags=teacherFlags(s), groups=teacherGroups(s,staff);
  const group=groups.find(item=>item.id===filters.assignment)||groups[0];
  const date=teacherDate(filters.date);
  const day=teacherDay(date), today=dayISO(), todayName=teacherDay(today);
  const lesson=Number.isInteger(Number(filters.lesson))&&Number(filters.lesson)>=1&&Number(filters.lesson)<=8?Number(filters.lesson):1;
  const mode=filters.attendanceMode==='daily'?'daily':'lesson';
  const attendance=group?(mode==='daily'?s.attendance[group.year+'|'+date]:s.teacherAttendance[teacherAttendanceKey(group,date,lesson)])||{}:{};
  const roster=group?teacherRoster(s,group):[];
  const students=roster.map(person=>{
    const fields=gradeFieldsFor(s,group,person.stream);
    return {id:person.id,name:person.name,reg:person.reg,fields,marks:fields.map(field=>s.grades[person.id]?.[field.key]??''),
      attendance:flags.attendance?(mode==='daily'?attendance[person.id]?.[0]:attendance[person.id])||'':''};
  });
  const ownHomework=s.homework.filter(row=>row.teacher===staff.id&&row.year===staff.year);
  const ownIds=new Set(ownHomework.map(row=>row.id));
  const week=flags.schedule||flags.attendance?teacherSchedule(s,staff,groups):{rows:[],slots:[],periods:PERIODS.slice(0,7)};
  return {
    staff:{id:staff.id,name:staff.name,year:staff.year,job:staff.job||''},
    school:{name:s.profile.name,photo:s.profile.photo||''},flags,groups,assignment:group?.id||'',date,day,today,todayName,schoolDay:teacherSchoolDay(s,staff.year,date),lesson,attendanceMode:mode,students,
    gradeFields:group?gradeFieldsFor(s,group,group.stream||roster[0]?.stream||''):[],
    rows:groups.map(a=>[staff.name,a.cls,a.section,a.shift,a.label,a.lessons,a.date]),
    schedule:flags.schedule?week.rows:[],periods:week.periods,
    todaySlots:flags.schedule?week.slots.filter(row=>row.day===todayName):[],weekCount:flags.schedule?week.slots.length:0,
    dateSlots:flags.attendance?week.slots.filter(row=>row.day===day&&row.assignment):[],
    homeworkCount:ownHomework.length,
    homework:flags.homework&&flags.listHomework?ownHomework.slice(-80).reverse().map(teacherHomeworkMeta):[],
    inquiries:flags.homework&&flags.inquiries?s.homeworkInquiries.filter(row=>ownIds.has(row.homework)).slice(-80).reverse().map(row=>({...row,title:ownHomework.find(x=>x.id===row.homework)?.title})):[],
    notes:flags.homework&&flags.notes?s.notes.filter(row=>row.teacher===staff.id).slice(-30).reverse().map(row=>({id:row.id,date:row.date,text:row.text,category:row.category||'',student:s.students.find(x=>x.id===row.student)?.name||'—'})):[]
  };
}
function teacherGroupRequired(s,staff,id) {
  const group=teacherGroups(s,staff).find(item=>item.id===id);
  if(!group)throw new Error('المادة أو الفصل خارج إسنادات هذا المعلم.');
  return group;
}
function teacherActionAllowed(s,key,homework=false) {
  const flags=teacherFlags(s);
  if(!flags[key]||homework&&!flags.homework)throw new Error('هذه الوظيفة مغلقة من إدارة المدرسة.');
}
function teacherMarks(s,staff,data) {
  const group=teacherGroupRequired(s,staff,data.assignment);
  const students=new Map(teacherRoster(s,group).map(row=>[row.id,row]));
  const records=Array.isArray(data.marks)?data.marks:[];
  if(!records.length||records.length>students.size)throw new Error('أدخل درجة لطالب في هذا الفصل.');
  const used=new Set();
  let count=0;
  for(const mark of records){
    const student=students.get(mark?.student), index=Number(data.index);
    if(!student||used.has(student.id)||typeof mark.value!=='string'&&typeof mark.value!=='number')throw new Error('إحدى الدرجات خارج كشف الفصل.');
    used.add(student.id);
    const resolved=teacherSubject(group,student.stream);
    const field=gradeFieldsFor(s,group,student.stream).find(x=>x.index===index);
    if(!field||field.locked)throw new Error('رصد هذه الفترة مغلق أو غير متاح.');
    const current=s.grades[student.id]?.[field.key]??'';
    if(Object.hasOwn(mark,'before')&&String(mark.before)!==String(current)&&String(mark.value)!==String(current))throw new Error('تغيّرت الدرجة من جلسة أخرى. حدّث الكشف ثم أعد المحاولة.');
    setGradeMark(s,student,resolved.source,resolved.item.key,index,mark.value);
    count++;
  }
  return count;
}
function saveTeacherAttendance(s,staff,data) {
  teacherActionAllowed(s,'attendance');
  const group=teacherGroupRequired(s,staff,data.assignment);
  const students=new Set(teacherRoster(s,group).map(row=>row.id));
  const date=teacherDate(data.date), lesson=Number(data.lesson);
  if(date!==data.date||!Number.isInteger(lesson)||lesson<1||lesson>8||!Array.isArray(data.marks)||data.marks.length>students.size)throw new Error('تحقق من تاريخ الحصة وكشف الطلاب.');
  if(!teacherSchoolDay(s,group.year,date))throw new Error('هذا اليوم عطلة مدرسية والرصد مغلق.');
  const key=data.attendanceMode==='daily'?group.year+'|'+date:teacherAttendanceKey(group,date,lesson);
  const collection=data.attendanceMode==='daily'?s.attendance:s.teacherAttendance;
  const record=collection[key] ||= {};
  const used=new Set();
  for(const entry of data.marks){
    if(!students.has(entry?.student)||used.has(entry.student)||entry.value!==''&&!TEACHER_ATTENDANCE.includes(entry.value))throw new Error('حالة حضور خارج كشف الفصل.');
    used.add(entry.student);
    if(data.attendanceMode==='daily'){
      if(entry.value)(record[entry.student] ||= {})[0]=entry.value;
      else if(record[entry.student]){
        delete record[entry.student][0];
        if(!Object.values(record[entry.student]).some(Boolean))delete record[entry.student];
      }
    }else if(entry.value)record[entry.student]=entry.value;
    else delete record[entry.student];
  }
  if(!Object.keys(record).length)delete collection[key];
  return used.size;
}
export function applyTeacherAction(s,staff,action,data,id) {
  if(action==='grades')return teacherMarks(s,staff,data);
  if(action==='attendance')return saveTeacherAttendance(s,staff,data);
  if(action==='homework'){
    teacherActionAllowed(s,'addHomework',true);
    const group=teacherGroupRequired(s,staff,data.assignment);
    const due=String(data.due||'');
    if(!due||teacherDate(due)!==due)throw new Error('اختر تاريخ تسليم صالحًا.');
    const title=cleanWorkflowText(data.title,140,true), text=cleanWorkflowText(data.text,2400,true);
    const {year,cls,section,stream,label}=group;
    s.homework.push({id,teacher:staff.id,teacherName:staff.name,assignment:group.id,year,cls,section,stream,subject:label,title,text,due,date:dayISO(),attachment:teacherAttachment(data.attachment)});
    return 1;
  }
  if(action==='note'){
    teacherActionAllowed(s,'notes',true);
    const group=teacherGroupRequired(s,staff,data.assignment);
    if(!teacherRoster(s,group).some(row=>row.id===data.student))throw new Error('الطالب خارج الفصل المسند لهذا المعلم.');
    const category=String(data.category||'');
    if(category&&!TEACHER_NOTE_TYPES.some(([key])=>key===category))throw new Error('اختر نوع الملاحظة.');
    s.notes.push({id,teacher:staff.id,student:data.student,date:dayISO(),category,subject:group.label,teacherName:staff.name,text:cleanWorkflowText(data.text,1500,true)});
    return 1;
  }
  if(action==='answer'){
    teacherActionAllowed(s,'inquiries',true);
    const row=s.homeworkInquiries.find(item=>item.id===data.id);
    if(!row||!s.homework.some(hw=>hw.id===row.homework&&hw.teacher===staff.id&&hw.year===staff.year))throw new Error('الاستفسار خارج واجبات هذا المعلم.');
    row.answer=cleanWorkflowText(data.answer,1800,true);
    row.answered=dayISO();
    return 1;
  }
  throw new Error('العملية غير متاحة في بوابة المعلمين.');
}
function homeworkForStudent(row,student) {
  return row.year===student.year&&row.cls===student.cls&&row.section===student.section&&(!row.stream||row.stream===student.stream);
}
export function parentLessonAttendance(s,students) {
  const assignments=new Map(s.assignments.map(row=>[row.id,row]));
  const subjects=new Map(s.subjects.map(row=>[row.id,row.name]));
  const results=Object.fromEntries(students.map(student=>[student.id,[]]));
  const entries=Object.entries(s.teacherAttendance).map(([key,marks])=>{
    const [assignment,date,lesson]=key.split('|');
    return {assignment,date,lesson:Number(lesson),marks};
  }).sort((a,b)=>b.date.localeCompare(a.date)||a.lesson-b.lesson);
  for(const {assignment,date,lesson,marks} of entries){
    const group=assignments.get(assignment);
    if(!group)continue;
    for(const student of students){
      const rows=results[student.id], status=marks[student.id];
      if(status&&rows.length<8&&homeworkForStudent(group,student)){
        rows.push({date,lesson,subject:subjects.get(group.subject)||'—',status});
      }
    }
  }
  return results;
}
function teacherAttachment(attachment) {
  if(!attachment)return null;
  const {name,data}=attachment;
  const message='المرفق يجب أن يكون صورة أو ملف PDF بحجم مناسب.';
  if(typeof data!=='string'||data.length>Math.ceil(TEACHER_ATTACHMENT_LIMIT/3)*4+35)throw new Error(message);
  const match=data.match(/^data:(application\/pdf|image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match||match[2].length%4)throw new Error(message);
  const [ ,type,encoded]=match;
  const bytes=encoded.length/4*3-(encoded.endsWith('==')?2:encoded.endsWith('=')?1:0);
  const header=atob(encoded.slice(0,16));
  const valid=type==='application/pdf'?header.startsWith('%PDF-'):
    type==='image/png'?header.startsWith('\x89PNG\r\n\x1a\n'):
    type==='image/jpeg'?header.startsWith('\xff\xd8\xff'):
    header.startsWith('RIFF')&&header.slice(8,12)==='WEBP';
  if(!valid||bytes>TEACHER_ATTACHMENT_LIMIT)throw new Error(message);
  const cleanName=cleanWorkflowText(name,180,true).replace(/[\x00-\x1f\x7f/\\]/g,'_');
  return {name:cleanName,data};
}
export function homeworkAttachment(s,id,students,staff) {
  const row=s?.homework.find(item=>item.id===id);
  const flags=s&&teacherFlags(s);
  const allowed=row&&(staff?flags.homework&&flags.listHomework&&row.teacher===staff.id&&row.year===staff.year:students.some(student=>homeworkForStudent(row,student)));
  if(!allowed||!row.attachment)throw new Error('المرفق غير متاح لهذه الجلسة.');
  return row.attachment;
}
export function parentHomework(s,students) {
  const ids=new Set(students.map(s=>s.id));
  return {
    homework:s.homework.filter(row=>students.some(s=>homeworkForStudent(row,s))).slice(-80).map(({teacher,assignment,...row})=>teacherHomeworkMeta(row)),
    homeworkInquiries:s.homeworkInquiries.filter(row=>ids.has(row.student)).slice(-60)
  };
}
export function askHomework(s,student,homeworkId,text,id) {
  const homework=s.homework.find(row=>row.id===homeworkId&&homeworkForStudent(row,student));
  if(!homework||!teacherFlags(s).homework||!teacherFlags(s).inquiries)throw new Error('الاستفسار غير متاح لهذا الواجب.');
  s.homeworkInquiries.push({id,homework:homeworkId,student:student.id,studentName:student.name,text:cleanWorkflowText(text,1000,true),date:dayISO(),answer:''});
}
