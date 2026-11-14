import {CLASSES,YEAR,remedialClasses,routeForClass,gradePlan} from './data.js';
import {gradeKey} from './model.mjs';

export const PAGE_ACCESS = {
  'add-student': {read:['students'],write:['students']},
  'all-student': {read:['students'],write:['students']},
  'transferred-students': {read:['students'],write:['students']},
  'inter-school-transfers': {read:['students']},
  'books-receipt': {read:['students','books','bookTemplates'],write:['books','bookTemplates']},
  'attendance': {read:['students','attendance'],write:['attendance']},
  'student-promotion': {read:['students','grades','gradingRules'],write:['students']},
  'students-cases': {read:['students']},
  'students-hall': {read:['students','hall','grades','gradingRules'],write:['hall']},
  'exam-questions': {read:['questions','students'],write:['questions']},
  'exam-schedule': {read:['exams','days'],write:['exams']},
  'exam-observers': {read:['exams','hall','students','staff','observers'],write:['observers']},
  'manage-classes': {read:['classes','students','assignments'],write:['classes']},
  'manage-subjects': {read:['subjects','assignments'],write:['subjects']},
  'import-teachers-names': {read:['staff','teachers','assignments'],write:['teachers']},
  'assign-subjects': {read:['staff','subjects','teachers','assignments'],write:['assignments']},
  'create-schedule-new': {read:['classes','staff','teachers','subjects','assignments','days','schedules','teacherAvailability'],write:['schedules','teacherAvailability']},
  'create-schedule-manual': {read:['staff','teachers','subjects','days','schedules','teacherAvailability'],write:['schedules']},
  'view-schedules': {read:['staff','subjects','days','schedules']},
  'payments': {read:['students','fees','discounts','receipts','income','expenses','installments','feeItems','carriedBalances'],write:['fees','discounts','receipts','income','expenses','installments','feeItems','carriedBalances']},
  'finance-report': {read:['students','fees','discounts','receipts','income','expenses','feeItems','carriedBalances']},
  'student_results': {read:['students','grades','published','hall','gradingRules','certificateResults'],write:['certificateResults']},
  'add-staff': {read:['staff'],write:['staff']},
  'all-staff': {read:['staff'],write:['staff']},
  'staff-attendance': {read:['staff','staffAttendance'],write:['staffAttendance']},
  'review-staff-requests': {read:['staff','staffRequests']},
  'staff-payments': {read:['staff','payroll'],write:['payroll']},
  'parent-portal': {read:['students','notes','guardianCodes'],write:['notes']},
  'approve-photos': {read:['students','photoRequests']},
  'manage-teacher-accounts': {read:['staff','teachers','teacherCodes','teacherSettings']},
  'manage-canteen': {read:['students','items','wallet','walletLimits'],write:['items','wallet','walletLimits']},
  'chat': {read:['chat'],write:['chat']},
  'school-messages': {},
  'manage-days': {read:['days'],write:['days']},
  'user-profile': {read:['profile'],write:['profile']},
  'sub-users': {}
};
const gradingPages = [
  'add_kindergarten_grades','add_grades','add_activity_grades','student-grades-sse','remedial_grades',
  'record-exam-score','student-grades-ninth','student-grades-first-secondary','student-grades-second-secondary',
  'student-grades-third-secondary','student-grades-barcode','vertical-grades'
];
for (const page of gradingPages) PAGE_ACCESS[page] = {
  read:['students','grades','published','hall','gradingRules'],write:['grades','published','gradingRules']
};
PAGE_ACCESS['vertical-grades']={read:['students','grades'],write:['grades']};
export const SHARED_DELEGATED = new Set([
  'all-student','add-student','transferred-students','books-receipt','attendance','student-promotion','students-cases',
  'students-hall','exam-questions','exam-schedule','exam-observers','manage-classes','manage-subjects',
  'import-teachers-names','assign-subjects','create-schedule-new','create-schedule-manual','view-schedules',
  'chat','manage-days',...gradingPages
]);
export const STAFF_EDITABLE = [['name','الاسم الكامل'],['phone','رقم الهاتف'],['address','محل الإقامة'],['qualification','المؤهل العلمي'],['university','الجامعة المتخرج منها']];
export const TRANSFER_FIELDS = ['year','reg','national','name','mother','phone','nation','birth','gender','cls','section','stream'];
export const REVIEW_LABELS = {pending:'قيد المراجعة',accepted:'مقبول',rejected:'مرفوض',cancelled:'ملغى'};
export function cleanWorkflowText(value,maximum,required=false) {
  if(typeof value!=='string')value='';
  const clean=value.trim();
  if(clean.length>maximum||required&&!clean)throw new Error(required?'أكمل الحقول المطلوبة وتحقق من طولها.':'النص أطول من الحد المسموح.');
  return clean;
}
export function gradeRouteAccepts(source,cls,year=YEAR) {
  if(source==='add_activity_grades')return CLASSES.indexOf(cls)>=2;
  if(source==='remedial_grades')return remedialClasses(year).includes(cls);
  return routeForClass(cls)===source;
}
export function validatedGrade(value,item,index) {
  const text=String(value??'').trim().replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)%16)).replace(/٫/g,'.');
  if(!text)return null;
  if(item.choices){
    if(item.choices.includes(text))return text;
    throw new Error('التقدير غير صالح.');
  }
  const mark=Number(text), max=item.max[index];
  if(!/^\d+(?:\.\d+)?$/.test(text)||!Number.isFinite(mark)||mark<0||mark>max)throw new Error(item.label+' · أدخل درجة بين 0 و'+max+'.');
  return Math.round(mark*10)/10;
}
export function setGradeMark(s,student,source,subject,index,value) {
  if(!student||student.archive||!gradeRouteAccepts(source,student.cls,student.year))throw new Error('السجل خارج كشف الدرجات المحدد.');
  const plan=gradePlan(source,student.cls,student.stream,student.year);
  const item=plan.items.find(row=>row.key===subject);
  if(!item||!Number.isInteger(index)||index<0||index>=plan.components.length)throw new Error('تعذر مطابقة المادة والفترة.');
  const mark=validatedGrade(value,item,index), key=gradeKey(source,subject,index);
  const record=s.grades[student.id] ||= {};
  if(mark===null)delete record[key];
  else record[key]=mark;
  return mark;
}
export function workflowTimestamp() {
  return new Date().toISOString();
}
export function transferDraft(root,from,to,studentId,year,note,id) {
  if(from===to||!Object.hasOwn(root.schools,to))throw new Error('اختر مدرسة مستقبلة مختلفة.');
  const student=root.schools[from].students.find(s=>s.id===studentId&&s.year===year&&!s.archive);
  if(!student)throw new Error('الطالب غير متاح للنقل.');
  if(root.transfers.some(t=>t.from===from&&t.student===studentId&&t.status==='pending'))throw new Error('يوجد طلب نقل قيد المراجعة لهذا الطالب.');
  const request={id,from,to,student:studentId,year,reg:student.reg,name:student.name,cls:student.cls,stream:student.stream||'',note:cleanWorkflowText(note,1200),status:'pending',date:workflowTimestamp()};
  root.transfers.push(request);
  return request;
}
export function transferDecision(root,schoolId,requestId,decision,section,reply,newId,sections) {
  const transfer=root.transfers.find(t=>t.id===requestId);
  if(!transfer||transfer.status!=='pending')throw new Error('الطلب غير متاح أو سبق البتّ فيه.');
  if(decision==='cancelled'?transfer.from!==schoolId:transfer.to!==schoolId||!['accepted','rejected'].includes(decision))throw new Error('الطلب غير متاح لهذه المدرسة.');
  const note=cleanWorkflowText(reply,1200,decision==='rejected');
  if(decision==='accepted') {
    if(!sections.includes(section))throw new Error('اختر فصل الطالب في المدرسة المستقبلة.');
    const origin=root.schools[transfer.from], destination=root.schools[transfer.to];
    const student=origin.students.find(s=>s.id===transfer.student&&s.year===transfer.year&&!s.archive);
    if(!student)throw new Error('السجل غير متاح في المدرسة المرسلة.');
    if(student.reg!==transfer.reg||student.cls!==transfer.cls||student.name!==transfer.name||(student.stream||'')!==(transfer.stream||''))throw new Error('تغيّر قيد الطالب أو صفه بعد إرسال الطلب. يلزم إرسال طلب جديد.');
    const idText=value=>String(value??'').trim().toLowerCase();
    if(destination.students.some(s=>s.year===student.year&&(idText(s.reg)===idText(student.reg)||student.national&&idText(s.national)===idText(student.national))))throw new Error('رقم القيد أو الرقم الوطني موجود في المدرسة المستقبلة.');
    const copy=Object.fromEntries(TRANSFER_FIELDS.map(key=>[key,student[key]??'']));
    destination.students.push({...copy,id:newId,section,created:Date.now(),transferIn:transfer.id});
    if(origin.grades[student.id])destination.grades[newId]=structuredClone(origin.grades[student.id]);
    student.archive={to:destination.profile.name,date:workflowTimestamp().slice(0,10),note:[destination.profile.name,transfer.note].filter(Boolean).join(' · '),interTransfer:transfer.id};
    transfer.destinationStudent=newId;
  }
  Object.assign(transfer,{status:decision,reply:note,reviewed:workflowTimestamp()});
  return transfer;
}
export function messageDraft(root,from,to,title,body,replyTo,id) {
  if(from===to||!Object.hasOwn(root.schools,to))throw new Error('اختر مدرسة مستقبلة مختلفة.');
  if(replyTo&&!root.messages.some(m=>m.id===replyTo&&m.from===to&&m.to===from))throw new Error('تعذر العثور على الرسالة الأصلية.');
  const message={id,from,to,title:cleanWorkflowText(title,160,true),body:cleanWorkflowText(body,6000,true),replyTo:replyTo||'',date:workflowTimestamp(),read:''};
  root.messages.push(message);
  return message;
}
export function staffRequestDraft(s,staffId,proposed,note,id) {
  const staff=s.staff.find(x=>x.id===staffId);
  if(!staff)throw new Error('لم يُعثر على سجل الموظف.');
  if(s.staffRequests.some(x=>x.staff===staffId&&x.status==='pending'))throw new Error('يوجد طلب سابق قيد المراجعة.');
  const changes={};
  for(const [key] of STAFF_EDITABLE) {
    if(!Object.hasOwn(proposed,key))continue;
    const after=cleanWorkflowText(proposed[key],key==='phone'?18:150,key==='name');
    const before=String(staff[key]??'');
    if(key==='phone'&&after&&!/^09[0-9]{8}$/.test(after))throw new Error('رقم الهاتف يبدأ بـ09 ويتكون من 10 أرقام.');
    if(before!==after)changes[key]={before,after};
  }
  if(!Object.keys(changes).length)throw new Error('عدّل حقلًا واحدًا على الأقل.');
  const request={id,staff:staffId,year:staff.year,status:'pending',date:workflowTimestamp(),note:cleanWorkflowText(note,1200),changes};
  s.staffRequests.push(request);
  return request;
}
export function staffRequestDecision(s,id,decision,reply) {
  const request=s.staffRequests.find(x=>x.id===id&&x.status==='pending');
  if(!request||!['accepted','rejected'].includes(decision))throw new Error('الطلب غير متاح أو سبق البتّ فيه.');
  const note=cleanWorkflowText(reply,1200,decision==='rejected');
  if(decision==='accepted') {
    const staff=s.staff.find(x=>x.id===request.staff);
    if(!staff||Object.entries(request.changes).some(([key,item])=>String(staff[key]??'')!==item.before))throw new Error('تغيّر سجل الموظف بعد تقديم الطلب. راجع البيانات قبل اعتماد تعديل جديد.');
    for(const [key,change] of Object.entries(request.changes))staff[key]=change.after;
  }
  Object.assign(request,{status:decision,reply:note,reviewed:workflowTimestamp()});
  return request;
}
export function photoRequestDraft(s,studentId,image,note,id) {
  const student=s.students.find(x=>x.id===studentId&&!x.archive);
  if(!student)throw new Error('سجل الطالب غير متاح.');
  if(s.photoRequests.some(x=>x.student===studentId&&x.status==='pending'))throw new Error('توجد صورة سابقة قيد المراجعة لهذا الطالب.');
  if(!image)throw new Error('اختر صورة الطالب.');
  const request={id,student:studentId,year:student.year,image,status:'pending',date:workflowTimestamp(),note:cleanWorkflowText(note,500)};
  s.photoRequests.push(request);
  return request;
}
export function photoRequestDecision(s,id,decision,reply) {
  const request=s.photoRequests.find(x=>x.id===id&&x.status==='pending');
  if(!request||!['accepted','rejected'].includes(decision))throw new Error('الطلب غير متاح أو سبق البتّ فيه.');
  const note=cleanWorkflowText(reply,500,decision==='rejected');
  if(decision==='accepted') {
    const student=s.students.find(x=>x.id===request.student&&!x.archive);
    if(!student)throw new Error('سجل الطالب غير متاح للاعتماد.');
    student.photo=request.image;
    student.photoApproved=workflowTimestamp();
  }
  Object.assign(request,{status:decision,reply:note,reviewed:workflowTimestamp()});
  if(decision==='rejected')delete request.image;
  return request;
}
export function canteenSale(s,reg,itemId,quantity,year,date,id) {
  if(!Number.isInteger(quantity)||quantity<1||quantity>50)throw new Error('أدخل كمية صالحة.');
  const student=s.students.find(x=>x.year===year&&x.reg===reg&&!x.archive), item=s.items.find(x=>x.id===itemId);
  if(!student)throw new Error('رقم القيد غير موجود.');
  const rows=s.wallet.filter(r=>r.student===student.id);
  const balance=rows.reduce((total,row)=>total+row.amount,0);
  const prior=s.wallet.find(row=>row.id===id);
  if(prior) {
    if(prior.student!==student.id||prior.item!==itemId||prior.quantity!==quantity)throw new Error('سبق استخدام معرّف هذه العملية.');
    return {total:-prior.amount,balance};
  }
  if(!item||item.stock<quantity)throw new Error('الكمية غير متاحة.');
  const spent=rows.filter(r=>r.amount<0&&r.date===date).reduce((total,row)=>total-row.amount,0);
  const limit=s.walletLimits?.[student.id]||0, cost=item.price*quantity;
  if(balance<cost||limit&&spent+cost>limit)throw new Error('الرصيد أو سقف الصرف غير كاف.');
  item.stock-=quantity;
  s.wallet.push({id,student:student.id,item:itemId,quantity,date,label:item.name+' × '+quantity,amount:-cost});
  return {total:cost,balance:balance-cost};
}
const roundGrade=value=>Math.round(value*10)/10;
const sumGrades=values=>roundGrade(values.reduce((total,value)=>total+Number(value),0));
const hasGradeValue=value=>value!==undefined&&value!==null&&value!=='';
const numericMarkInRange=(value,max)=>hasGradeValue(value)&&Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=max;
function gradeDeficit(item,mark,final) {
  return Math.max(0,roundGrade((item.minTotal??0)-mark),roundGrade((item.minFinal??0)-final));
}
function summarizeGradeSubjects(subjects) {
  const complete=subjects.length>0&&subjects.every(item=>item.complete);
  const numeric=subjects.filter(item=>item.complete&&typeof item.mark==='number');
  const total=sumGrades(numeric.map(item=>item.mark)), max=sumGrades(numeric.map(item=>item.max));
  return {
    subjects,rows:subjects.map(({label,mark,max})=>[label,mark,max]),available:subjects.some(item=>item.recorded),
    complete,total,max,percent:complete&&max?Math.round(total/max*10000)/100:null
  };
}
export function gradeSummary(plan,source,marks,indices=null) {
  const indexes=indices??plan.components.map((_,i)=>i);
  const subjects=plan.items.map(item=>{
    const values=indexes.map(i=>marks[gradeKey(source,item.key,i)]);
    const {key,label}=item, recorded=values.some(hasGradeValue);
    if(item.choices){
      const complete=values.every(value=>item.choices.includes(value));
      return {key,label,recorded,complete,mark:values.map(value=>value??'—').join(' / '),max:'—'};
    }
    const complete=values.every((value,i)=>numericMarkInRange(value,item.max[indexes[i]]));
    const max=sumGrades(indexes.map(i=>item.max[i])), mark=complete?sumGrades(values):'—';
    const final=complete&&!indices?sumGrades((plan.rules?.finalIndexes||[]).map(i=>values[i])):0;
    const need=complete&&!indices?gradeDeficit(item,mark,final):0;
    return {key,label,recorded,complete,mark,max,need};
  });
  return summarizeGradeSubjects(subjects);
}
export function gradeRetakeSummary(plan,source,marks) {
  const first=gradeSummary(plan,source,marks);
  const exams=plan.rules.finalIndexes||[plan.components.length-1];
  const works=plan.components.map((_,i)=>i).filter(i=>!exams.includes(i));
  const subjects=plan.items.map((item,i)=>{
    const earlier=first.subjects[i];
    if(earlier.complete&&!earlier.need)return earlier;
    const exam=marks[gradeKey('remedial_grades',item.key,0)];
    const work=works.map(index=>marks[gradeKey(source,item.key,index)]);
    const complete=numericMarkInRange(exam,item.secondRoundMax)&&work.every((value,j)=>numericMarkInRange(value,item.max[works[j]]));
    const mark=complete?sumGrades([...work,exam]):'—';
    return {key:item.key,label:item.label,recorded:earlier.recorded||hasGradeValue(exam),complete,mark,
      max:item.totalMax,need:complete?gradeDeficit(item,mark,exam):0};
  });
  return summarizeGradeSubjects(subjects);
}
export function curriculumResult(result,rules,indices=null,retake=false) {
  if(!result.complete||result.percent===null)return {status:'',weak:[]};
  if(indices){
    const weak=rules.minTotal===.40?result.subjects.flatMap(item=>{
      const need=roundGrade(item.max*rules.minTotal-item.mark);
      return need>0?[{...item,need}]:[];
    }):[];
    return {status:'',weak};
  }
  if(rules.autoPromote)return {status:'منقول',weak:[]};
  const weak=result.subjects.filter(item=>item.need>0);
  const status=!weak.length?'ناجح':retake||weak.length>(rules.maxSecondRoundSubjects??Infinity)?'راسب':'دور ثان';
  return {status,weak};
}
export function periodResult(result,plan,source,marks,indices,legacyRule) {
  if(!result.complete||result.percent===null)return {status:'',weak:[]};
  if(!plan.rules&&legacyRule?.enabled)return classifyResult(result,legacyRule);
  if(plan.rules?.autoPromote)return {status:'ناجح',weak:[]};
  const rate=plan.rules?.minTotal??(source==='add_grades'?.40:.50);
  const exams=indices.filter(index=>plan.rules?.finalIndexes?.includes(index));
  const weak=result.subjects.flatMap((subject,i)=>{
    const item=plan.items[i];
    const examNeed=exams.length?sumGrades(exams.map(index=>item.max[index]))*plan.rules.minFinal-
      sumGrades(exams.map(index=>marks[gradeKey(source,item.key,index)])):0;
    const need=Math.max(0,roundGrade(subject.max*rate-subject.mark),roundGrade(examNeed));
    return need?[{...subject,need}]:[];
  });
  return {status:weak.length?'راسب':'ناجح',weak};
}

export function gradeRating(percent) {
  if(typeof percent!=='number'||!Number.isFinite(percent)||percent<0||percent>100)return '';
  return percent>=85?'ممتاز':percent>=75?'جيد جداً':percent>=65?'جيد':percent>=50?'مقبول':'ضعيف';
}
export function classifyResult(result,rule) {
  if(!rule?.enabled||!result.complete||result.percent===null)return {status:'',weak:[]};
  const weak=result.rows.filter(([,mark,max])=>typeof mark==='number'&&max>0&&mark*100<Number(rule.subject)*max)
    .map(([label,mark,max])=>({label,mark,max,need:Math.ceil((Number(rule.subject)*max/100-mark)*10-1e-8)/10}));
  const hasAverage=result.total*100>=Number(rule.overall)*result.max;
  const status=hasAverage&&!weak.length?'ناجح':weak.length&&weak.length<=Number(rule.remedial)?'دور ثان':'راسب';
  return {status,weak};
}

