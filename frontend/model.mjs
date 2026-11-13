import {YEAR,SECTIONS,SCHOOL_TYPES,routeForClass,gradePlan} from './data.js';

const tripoliDate = new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Tripoli',year:'numeric',month:'2-digit',day:'2-digit'});
export const dayISO = date => date
  ? [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')
  : tripoliDate.format();
export const yearKey = (year,cls,stream='') => [year,cls,stream].join('|');
export function gradeKey(gradeRoute,subject,i) { return gradeRoute+'|'+subject+'|'+i; }

export function emptySchool(profile) {
  return {
    profile, students:[], staff:[], classes:[], subjects:[], assignments:[], teachers:[],
    grades:{}, published:{}, attendance:{}, staffAttendance:{}, hall:{}, books:{},
    questions:[], exams:{}, schedules:{}, days:{}, fees:{}, discounts:{}, receipts:[],
    expenses:[], income:[], notes:[], chat:[], users:[], items:[], wallet:[],
    payroll:{}, teacherCodes:{}, canteenPin:'1234', guardianCodes:{}, staffRequests:[],
    photoRequests:[], gradingRules:{}, certificateResults:{}, bookTemplates:{},
    feeItems:[], carriedBalances:{}, teacherAvailability:{}, observers:{},
    teacherSettings:{locks:[]},teacherAttendance:{},homework:[],homeworkInquiries:[]
  };
}
export const demoProfile = {name:'المدرسة التجريبية',principal:'المدير التجريبي',exam:'المشرف التجريبي',entry:'مدخل البيانات التجريبي',phone:'0900000000',email:'demo@example.invalid',type:SCHOOL_TYPES[3],region:'سلوق',username:'demo'};
export function makeDemo() {
  const sample = emptySchool({...demoProfile,code:'DEMO'});
  const stages = ['الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','الأول ثانوي','الثاني ثانوي','الثالث ثانوي','الأول - رياض اطفال'];
  sample.students = stages.flatMap((cls,i)=>[0,1,2].map(j=>{
    const n=i*3+j+1;
    return {id:'sample-'+n,year:YEAR,cls,section:SECTIONS[j===2?1:0],stream:i===9||i===10?(j===2?'أدبي':'علمي'):'',reg:String(900000+n),national:String(n).padStart(12,'0'),name:'الطالب التجريبي '+String(n).padStart(2,'0'),mother:'اسم الأم التجريبي '+n,phone:'0900000'+String(2*i+(j<2?1:2)).padStart(3,'0'),gender:j%2?'أنثى':'ذكر',nation:'ليبيا',birth:'',outcome:i===4&&j===1?'دور ثان':'',created:n};
  }));
  sample.staff = ['اللغة العربية','الرياضيات','العلوم'].map((subject,i)=>({id:'staff-'+i,name:'المعلم التجريبي '+(i+1),national:String(100+i).padStart(12,'0'),job:'معلم',shift:'صباحية',status:'يعمل',year:YEAR,qualification:subject,created:i}));
  sample.teacherCodes['staff-0']={pin:'2468',active:true};
  sample.teachers = sample.staff.map(staff=>staff.id);
  sample.classes = stages.flatMap(cls=>SECTIONS.slice(0,2).map((section,i)=>({id:'cls-'+cls+'-'+i,year:YEAR,cls,section,shift:'صباحية',boys:i===0?1:1,girls:i===0?1:0,date:dayISO()})));
  sample.subjects = ['الثاني','السابع'].flatMap(cls=>['اللغة العربية','الرياضيات','العلوم'].map((label,i)=>({id:'sub-'+cls+'-'+i,year:YEAR,name:label,cls,lessons:i===0?5:4,date:dayISO()})));
  sample.assignments = sample.subjects.map((subject,i)=>({id:'assign-'+i,year:YEAR,cls:subject.cls,section:SECTIONS[0],shift:'صباحية',subject:subject.id,teacher:sample.staff[i%3].id,lessons:subject.lessons,date:dayISO()}));
  sample.schedules[yearKey(YEAR,'الثاني',SECTIONS[0])+'|صباحية']={year:YEAR,cls:'الثاني',section:SECTIONS[0],shift:'صباحية',type:'auto',slots:{'الأحد|0':{subject:'sub-الثاني-0',teacher:'staff-0'},'الاثنين|2':{subject:'sub-الثاني-0',teacher:'staff-0'}}};
  for(const student of sample.students) {
    const gradeRoute=routeForClass(student.cls), plan=gradePlan(gradeRoute,student.cls,student.stream,student.year);
    sample.grades[student.id]={};
    for(const item of plan.items) plan.components.forEach((_,i)=>{
      sample.grades[student.id][gradeKey(gradeRoute,item.key,i)]=item.choices?item.choices[(i+1)%item.choices.length]:Math.round(item.max[i]*(.72+(Number(student.reg)%5)/20)*10)/10;
    });
  }
  sample.published[yearKey(YEAR,'الثاني')]=true;
  sample.published[yearKey(YEAR,'السابع')]=true;
  sample.fees[yearKey(YEAR,'الثاني')]=500_000;
  sample.receipts.push({id:'demo-receipt',student:'sample-1',year:YEAR,amount:150_000,date:dayISO(),method:'نقدي',note:'دفعة تجريبية',number:1});
  sample.items.push({id:'demo-item',name:'وجبة تجريبية',price:2500,stock:20});
  return migrateState({version:2,schools:{sample}});
}
export function migrateState(root, demo = true) {
  if(demo)root.schools.sample2 ||= emptySchool({
    ...demoProfile,name:'المدرسة التجريبية الثانية',region:'بنغازي',username:'demo2',code:'DEMO2'
  });
  if(demo&&root.schools.sample)root.schools.sample.profile.code ||= 'DEMO';
  root.transfers ||= [];
  root.messages ||= [];
  for(const s of Object.values(root.schools)) {
    s.guardianCodes ||= {};
    s.staffRequests ||= [];
    s.photoRequests ||= [];
    s.gradingRules ||= {};
    s.certificateResults ||= {};
    s.observers ||= {};
    s.bookTemplates ||= {};
    s.feeItems ||= [];
    s.carriedBalances ||= {};
    s.teacherAvailability ||= {};
    s.teacherSettings ||= {locks:[]};
    s.teacherAttendance ||= {};
    s.homework ||= [];
    s.homeworkInquiries ||= [];
  }
  if(root.version<2) {
    const sample=root.schools.sample;
    const staff=sample?.staff.find(x=>x.id==='staff-0');
    if(staff&&!staff.national)staff.national='000000000100';
    if(staff&&!sample.teacherCodes[staff.id])sample.teacherCodes[staff.id]={pin:'2468',active:true};
  }
  root.version=2;
  return root;
}
