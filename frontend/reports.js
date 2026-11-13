const supportsResultRules=source=>['add_grades','student-grades-sse','student-grades-first-secondary','student-grades-second-secondary'].includes(source);
actions['grading-settings']=()=>{
  const {f,source}=gradeView();
  if(!supportsResultRules(source))throw new Error('هذه الشاشة تعرض الرصد دون احتساب نتيجة نهائية.');
  const key=yearKey(f.year,f.cls,f.stream), rule=school().gradingRules[key]||{overall:50,subject:50,remedial:2};
  showDialog('إعداد قواعد النجاح',`<p>${esc(f.cls)} · <bdi>${esc(f.year)}</bdi></p><p class="muted small">تُستخدم القيم التي تعتمدها المدرسة لهذا الصف في التقارير. السجل الناقص لا يدخل في احتساب الحالة.</p><form data-form="grading-rules" data-key="${esc(key)}" class="stack">
    ${field(['enabled','تفعيل الاحتساب الآلي للحالة','checkbox'],rule.enabled)}${field(['overall','الحد الأدنى للمعدل العام (%)','number',true],rule.overall,{min:0,max:100,step:.1})}${field(['subject','الحد الأدنى لكل مادة (%)','number',true],rule.subject,{min:0,max:100,step:.1})}${field(['remedial','أقصى عدد مواد للدور الثاني','number',true],rule.remedial,{min:0,max:20})}${submit('حفظ القواعد')}</form>`);
};
forms['grading-rules']=async(data,form)=>{
  const rule={enabled:Boolean(data.enabled),overall:Number(data.overall),subject:Number(data.subject),remedial:Number(data.remedial)};
  if([rule.overall,rule.subject].some(n=>!Number.isFinite(n)||n<0||n>100)||!Number.isInteger(rule.remedial)||rule.remedial<0||rule.remedial>20)throw new Error('تحقق من حدود الاحتساب.');
  await update(s=>{s.gradingRules[form.dataset.key]=rule;});
  $('#modal').close();render();flash('حُفظت قواعد الاحتساب.');
};
function outcomeReport(kind,title,year,summaries) {
  if(kind==='rate'){
    const counted=summaries.filter(x=>x.complete&&x.status);
    const rows=['ناجح','دور ثان','راسب'].map(status=>{
      const n=counted.filter(x=>x.status===status).length;
      return [status,n,counted.length?(100*n/counted.length).toFixed(2)+'%':'—'];
    });
    rows.push(['غير محتسب',summaries.length-counted.length,'—']);
    return showReport(title,year,['الحالة','العدد','النسبة'],rows);
  }
  if(kind==='subject-count'){
    const counts=new Map();
    for(const row of summaries.filter(x=>x.status==='دور ثان'))for(const item of row.weak)counts.set(item.label,(counts.get(item.label)||0)+1);
    return showReport(title,year,['المادة','عدد الطلبة'],[...counts]);
  }
  const rows=summaries.filter(x=>kind!=='needed'||x.status==='دور ثان').flatMap(x=>x.weak.map(w=>[x.s.reg,x.s.name,w.label,w.mark,w.max,...(kind==='needed'?[w.need]:[])]));
  showReport(title,year,['رقم القيد','اسم الطالب','المادة','الدرجة','الدرجة الكبرى',...(kind==='needed'?['الاحتياج']:[])],rows);
}
function gradePaperPeriods(view,indices) {
  const primary=view.source==='add_grades';
  const labels=primary?['الفترة الأولى (30%)','الفترة الثانية (30%)','الفترة الثالثة (40%)']:view.plan.components;
  if(indices)return [{label:primary?labels[indices[0]].split(' (')[0]:indices.length===1?labels[indices[0]]:indices[0]===0?'الفصل الأول':'الفصل الثاني',indices}];
  const groups=primary||labels.length!==4?labels.map((label,i)=>({label,indices:[i]})):[{label:'الفصل الأول',indices:[0,1]},{label:'الفصل الثاني',indices:[2,3]}];
  return [...groups,{label:'النتيجة النهائية (100%)',indices:null}];
}
function gradePaperMarks(view,student,groups) {
  const marks=(view.school||school()).grades[student.id]||{};
  const scores=groups.map(group=>gradeSummary(view.plan,view.source,marks,group.indices));
  const header=`<tr><th rowspan="2" scope="col">المادة</th>${groups.map(group=>`<th colspan="2" scope="colgroup">${esc(group.label)}</th>`).join('')}</tr><tr>${groups.map(()=>'<th scope="col">الدرجة الكبرى</th><th scope="col">درجة التلميذ</th>').join('')}</tr>`;
  const rows=view.plan.items.map((item,i)=>[item.label,...scores.flatMap(score=>[score.rows[i][2],score.rows[i][1]])]);
  const numeric=view.plan.items.some(item=>!item.choices);
  if(numeric)rows.push(['المجموع الكلي',...scores.flatMap(score=>[sum(score.rows.map(row=>typeof row[2]==='number'?row[2]:0))||'—',score.complete?score.total:'—'])]);
  return `<table class="school-paper-table grade-marks" aria-label="درجات التلميذ"><colgroup><col>${'<col>'.repeat(groups.length*2)}</colgroup><thead>${header}</thead><tbody>${rows.map(row=>'<tr>'+row.map(value=>'<td>'+esc(value)+'</td>').join('')+'</tr>').join('')}</tbody></table>`;
}
function gradePaperActivity(view,student,groups) {
  const activity=gradePlan('add_activity_grades',student.cls,student.stream);
  const grades=(view.school||school()).grades[student.id]||{};
  const periodGroups=groups.filter(group=>group.indices);
  const rows=activity.items.filter(item=>item.choices).map(item=>[item.label,...periodGroups.map(group=>{
    const i=activity.components.length===2&&view.plan.components.length===4?Math.floor(group.indices[0]/2):group.indices[0];
    return grades[gradeKey('add_activity_grades',item.key,i)]??'—';
  })]);
  return paperTable(['مواد النشاط',...periodGroups.map(group=>'أداء التلميذ خلال '+group.label.split(' (')[0])],rows);
}
function gradePaperSide(view,summary,groups,period) {
  const s=summary.s, columns=[['اسم التلميذ',s.name],['رقم القيد',s.reg],['الصف',s.cls],['الفصل',s.section],...(s.stream?[['التخصص',s.stream]]:[])];
  const details=`<div class="paper-student">${studentAvatar(s,true)}<dl>${columns.map(([label,value])=>'<dt>'+label+'</dt><dd>'+esc(value||'—')+'</dd>').join('')}</dl></div>`;
  const data=(view.school||school()).grades[s.id]||{};
  const activityGroups=groups.filter(group=>group.indices);
  const counts=key=>activityGroups.map(group=>{
    const i=view.plan.components.length===4?Math.floor(group.indices[0]/2):group.indices[0];
    return data[gradeKey('add_activity_grades',key,i)]??'—';
  });
  const summaryTable=period?paperTable(['ملاحظات على أداء التلميذ خلال '+activityGroups[0].label],[['']]):paperTable(['النتيجة النهائية'],[[summary.status||'—'],[summary.percent===null?'—':summary.percent+'%']]);
  return summaryTable+details+paperTable(['الغياب',...activityGroups.map(group=>group.label.split(' (')[0])],[['مشروع (أيام)',...counts('ex')],['غير مشروع (أيام)',...counts('un')]]);
}
function gradeCardReport(view,title,summaries,indices,type) {
  const groups=gradePaperPeriods(view,indices);
  const year=view.f.year;
  const heading=type==='period'?'بطاقة تقدير درجات '+groups[0].label+' للعام الدراسي '+year+' م':
    type==='final'?'بطاقة تقدير الدرجات للعام الدراسي '+year+' م':title+' للعام الدراسي '+year+' م';
  const settings={cellPadding:view.plan.items.length>10?4:7};
  const profile=(view.school||school()).profile;
  const markup=summaries.map(summary=>{
    const marks=gradePaperMarks(view,summary.s,groups);
    const activity=['add_grades','student-grades-sse','student-grades-first-secondary','student-grades-second-secondary'].includes(view.source)?gradePaperActivity(view,summary.s,groups):'';
    const side=gradePaperSide(view,summary,groups,indices!==null);
    const sign=paperTable(['التوقيعات',...(indices?[groups[0].label]:[])],[['معلم الفصل',...(indices?['']:[])],['مدير المدرسة',...(indices?['']:[])],['ولي أمر التلميذ',...(indices?['']:[])]]);
    const body=type==='double'?`<div class="grade-paper-grid"><div class="grade-paper-main">${activity}${sign}</div><div class="grade-paper-side">${side}</div></div>`:
      `<div class="grade-paper-grid"><div class="grade-paper-main">${marks}${activity}${sign}</div><div class="grade-paper-side">${side}</div></div>`;
    const page=paperFrame(heading,year,body,{variant:'grades',profile,settings,signatures:false});
    return type==='double'?page+paperFrame('بيان الدرجات · الوجه الخلفي',year,marks,{variant:'grades',profile,settings,meta:esc(summary.s.name)+' · '+esc(summary.s.reg),signatures:false}):page;
  }).join('')||paperFrame(heading,year,notice('لا توجد سجلات مطابقة.'),{variant:'grades',profile});
  showDocument(title,[],[],markup,'عمودي');
}
function studentReportMenu(){return `<div class="grid2">${[
  ['طباعة بطاقات تعريف التلاميذ','id-cards'],['طباعة إفادة حسن السيرة','conduct'],['طباعة تعريف مدرسي','enrollment'],
  ['طباعة تعهد لتلميذ','pledge'],['طباعة بطاقة بيانات الطلبة','profiles']
].map(([label,id])=>btn(label,'student-doc',id,'outline-blue')).join('')}${btn('إفادة استمرارية الدراسة','continuity-request','','outline-blue')}${btn('كشف استمرارية الدراسة','continuity-roster','','outline-blue')}${btn('طباعة إحصائية الطلبة','student-stats','','outline-blue')}${btn('طباعة كشف الأجانب فقط','student-print','foreign','outline-blue')}${link('طباعة كشف استلام الكتب','books-receipt','soft')}</div>`;}
actions['student-report-menu']=()=>showDialog('أدوات الطباعة والتقارير',studentReportMenu());
const STUDENT_DOCS={
  'id-cards':['بطاقة تعريف تلميذ',''],
  'conduct':['إفادة حسن السيرة والسلوك','تشهد إدارة المدرسة بحسن سيرة وسلوك الطالب المذكور وفقًا لسجلاتها.'],
  'enrollment':['تعريف مدرسي','تشهد إدارة المدرسة بأن الطالب المذكور مقيد لديها في السنة الدراسية الموضحة.'],
  'pledge':['تعهد تلميذ','أتعهد بالالتزام بنظام المدرسة واحترام مواعيد الدوام والمحافظة على الممتلكات. توقيع الطالب: __________ توقيع ولي الأمر: __________'],
  'profiles':['بطاقة بيانات طالب','']
};
actions['student-doc']=value=>{
  const [kind,id]=value.split('|'), template=STUDENT_DOCS[kind];
  if(!template)throw new Error('نموذج الطباعة غير متاح.');
  const rows=id?[lookup('students',id)]:studentRowsFor(route), [title,statement]=template;
  const keys=kind==='profiles'?STUDENT_EXPORT:STUDENT_EXPORT.filter(([key])=>['name','reg','cls','section','stream'].includes(key));
  const sections=rows.map(student=>{
    const body=`<div class="doc-id">${studentAvatar(student,true)}${table(['البيان','القيمة'],keys.map(([key,label])=>[label,student[key]||'—']))}</div>${statement?'<p class="gap">'+esc(statement)+'</p>':''}`;
    return paperFrame(title,student.year,body,{variant:'roster'});
  });
  showDocument(title,[],[],sections.join('')||paperFrame(title,filterData(route).year,notice('لا توجد سجلات مطابقة.')),'عمودي');
};
actions['continuity-request']=id=>{
  const rows=id?[lookup('students',id)].filter(student=>!student.archive):studentRowsFor('all-student');
  if(!rows.length)throw new Error('لا توجد سجلات نشطة ضمن الاختيارات.');
  const options=rows.map(student=>[student.id,[student.name,student.reg,student.cls,student.section].filter(Boolean).join(' · ')]);
  showDialog('إفادة استمرارية الدراسة',`<form class="stack" data-form="continuity-print"><div class="fields tight">
    ${field(['student','الطالب',options,true],rows.length===1?rows[0].id:'',{blank:'اختر الطالب'})}
    ${field(['date','تاريخ الإفادة','date',true],dayISO())}
    ${field(['recipient','الجهة الموجّه إليها','text'],'',{maxlength:160})}
    ${field(['reference','رقم الإشارة','text'],'',{maxlength:50})}</div>${submit('معاينة الإفادة')}</form>`);
};
forms['continuity-print']=data=>{
  const student=lookup('students',data.student);
  if(student.archive)throw new Error('الطالب في أرشيف المنتقلين.');
  const details=[['اسم الطالب',student.name],['رقم القيد',student.reg],['الصف',student.cls],['الفصل',student.section||'—'],['السنة الدراسية',student.year]];
  if(student.stream)details.splice(4,0,['التخصص',student.stream]);
  continuityDocument('إفادة استمرارية الدراسة',student.year,details,
    'تفيد إدارة المدرسة بأن الطالب الواردة بياناته أدناه مقيد بسجلاتها للعام الدراسي الموضح حتى تاريخ إصدار هذه الإفادة.',data);
};
function continuityDocument(title,year,details,statement,data) {
  const date=String(data.date||'');
  const time=Date.parse(date+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==date)
    throw new Error('أدخل تاريخ الإفادة.');
  const recipient=cleanWorkflowText(data.recipient,160), reference=cleanWorkflowText(data.reference,50);
  const meta=`<span>تاريخ الإفادة <bdi>${esc(date)}</bdi></span>${reference?'<span>رقم الإشارة <bdi>'+esc(reference)+'</bdi></span>':''}`;
  const body=`<div class="paper-continuity-body">${recipient?'<p><strong>إلى</strong> '+esc(recipient)+'</p>':''}
    <p>${esc(statement)}</p>
    ${paperTable(['البيان','البيانات'],details,title)}
    <p>أُعطيت له هذه الإفادة بناءً على طلبه.</p></div>`;
  showDocument(title,[],[],paperFrame(title,year,body,{variant:'roster',meta}),'عمودي');
}
actions['continuity-roster']=()=>{
  const year=filterData('all-student').year, title='كشف استمرارية الدراسة';
  const rows=studentRowsFor('all-student').map((student,index)=>[index+1,student.reg,student.name,student.cls,student.section||'—',student.stream||'—']);
  schoolListReport(title,year,['ر.م','رقم القيد','اسم الطالب','الصف','الفصل','التخصص'],[{rows,meta:'<span>عدد الطلبة <bdi>'+rows.length+'</bdi></span>'}],
    {orientation:'أفقي',rowsPerPage:24});
};
const HALL_REPORTS=[
  ['room','طباعة كشف مناداة حسب القاعات'],['secret','كشف الأرقام السرية حسب الصفوف'],
  ['secret-room','كشف الأرقام السرية حسب القاعات'],['secret-room-class','كشف الأرقام السرية حسب القاعات والصف'],
  ['room-class','طباعة كشف مناداة حسب القاعات والصف'],['class','طباعة كشف مناداة حسب الصف'],
  ['room-parallel','طباعة كشف مناداة متوازي حسب القاعات'],['secret-parallel','كشف الأرقام السرية متوازي حسب القاعات'],
  ['secret-seats','طباعة كشف الجلوس برقم السري'],['shading','طباعة نموذج تضليل - للشهائد'],
  ['answer','كشف تسليم أوراق الإجابة'],['mirror','مرايا رصد الدرجات للصفوف النقل'],
  ['marks-secret','كشف رصد درجات برقم سري'],['cards','طباعة بطاقات أرقام الجلوس'],
  ['stats','إحصائية القاعات والصفوف']
];
forms['hall-report']=data=>actions['hall-report'](data.kind);
function detailedHallReport(kind,year,rows) {
  const title=HALL_REPORTS.find(([key])=>key===kind)?.[1]||'كشف أرقام الجلوس';
  const records=rows.map(student=>({student,hall:school().hall[student.id]}));
  if(kind==='cards'){
    const cards=records.map(({student,hall})=>paperTable(['اسم الطالب','الصف','رقم الجلوس','القاعة'],[[student.name,student.cls,hall.seat,hall.room]]));
    const body=cards.length?Array.from({length:Math.ceil(cards.length/8)},(_,i)=>paperFrame('بطاقات أرقام الجلوس',year,'<div class="paper-seat-cards">'+cards.slice(i*8,i*8+8).join('')+'</div>',{variant:'hall'})).join(''):paperFrame(title,year,notice('لا توجد أرقام جلوس في الكشف.'),{variant:'hall'});
    return showDocument(title,[],[],body,'عمودي');
  }
  if(kind==='shading'){
    const candidates=records.filter(({student})=>['التاسع','الثالث ثانوي'].includes(student.cls));
    const columns=['الخانة',...Array.from({length:10},(_,n)=>n)];
    const markup=candidates.map(({hall})=>{
      const digits=String(hall.seat).split('');
      const values=digits.map((digit,i)=>[i+1,...Array.from({length:10},(_,n)=>Number(digit)===n?'●':'○')]);
      return paperFrame('نموذج تظليل رقم الجلوس',year,paperTable(columns,values),{variant:'hall',meta:'<span>رقم الجلوس: <bdi>'+esc(hall.seat)+'</bdi></span>'});
    }).join('')||paperFrame(title,year,notice('لا توجد أرقام جلوس لطلبة الشهادات في الكشف.'),{variant:'hall'});
    return showDocument(title,[],[],markup,'عمودي');
  }
  const order=kind==='class'||kind==='secret'?['cls']:kind.includes('class')?['room','cls']:['room'];
  records.sort((a,b)=>{
    for(const key of order){
      const diff=key==='cls'?localeCompare(a.student.cls,b.student.cls):a.hall.room-b.hall.room;
      if(diff)return diff;
    }
    return a.hall.seat-b.hall.seat;
  });
  let headers=['القاعة','الصف','رقم الجلوس','اسم الطالب','الفصل'];
  let values=(student,hall)=>[hall.room,student.cls,hall.seat,student.name,student.section];
  if(kind.startsWith('secret')||kind==='answer'){
    headers=['القاعة','الصف','رقم الجلوس','الرقم السري',...(kind==='answer'?['توقيع الاستلام']:[])];
    values=(student,hall)=>[hall.room,student.cls,hall.seat,hall.secret,...(kind==='answer'?['']:[])];
  }
  if(kind==='marks-secret'){
    headers=['القاعة','الصف','الرقم السري','الدرجة','ملاحظات'];
    values=(student,hall)=>[hall.room,student.cls,hall.secret,'',''];
  }
  if(kind==='mirror'){
    headers=['الصف','رقم القيد','اسم الطالب','رقم الجلوس','الرقم السري','المادة','الدرجة'];
    values=(student,hall)=>[student.cls,student.reg,student.name,hall.seat,hall.secret,'',''];
  }
  const groupMap=new Map();
  for(const {student,hall} of records){
    const key=order.map(item=>item==='cls'?student.cls:hall.room).join('|');
    if(!groupMap.has(key))groupMap.set(key,{rows:[],meta:`${order.includes('room')?'<span>القاعة: <bdi>'+esc(hall.room)+'</bdi></span>':''}${order.includes('cls')?'<span>الصف: '+esc(student.cls)+'</span>':''}<span>المشرف: ${esc(hall.exam)}</span><span>رئيس اللجنة: ${esc(hall.head)}</span>`});
    groupMap.get(key).rows.push(values(student,hall));
  }
  schoolListReport(title,year,headers,[...groupMap.values()],{variant:'hall',twoColumns:kind.endsWith('-parallel')});
}
