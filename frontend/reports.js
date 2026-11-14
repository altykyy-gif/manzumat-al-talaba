const supportsResultRules=(source,plan)=>plan.rules||['add_grades','student-grades-sse','student-grades-first-secondary','student-grades-second-secondary'].includes(source);
actions['grading-settings']=()=>{
  const {f,source,plan}=gradeView();
  if(!supportsResultRules(source,plan))throw new Error('اختر كشفًا يتضمن قواعد النجاح.');
  const heading=`<p>${esc(f.cls)}${f.stream?' · '+esc(f.stream):''} · <bdi>${esc(f.year)}</bdi></p>`;
  if(plan.rules){
    const {rules}=plan, sample=plan.items[0];
    const finalLabel=plan.certificate?'امتحان نهاية العام':'مجموع امتحاني الفصلين';
    const guidance=rules.autoPromote?'النتيجة الدراسية منقول بعد اكتمال التقييم. تعتمد الإدارة حالات الإعادة والاستثناء.':
      `يشترط ${rules.minTotal*100}% من الدرجة الكبرى لكل مادة${sample.minFinal===null?'':' و'+rules.minFinal*100+'% من '+finalLabel}.`;
    const threshold=[...(sample.minFinal!==null?['أدنى '+finalLabel]:[]),...(sample.minTotal!==null?['أدنى المجموع']:[])];
    const rows=plan.items.map(item=>[item.label,item.weeklyPeriods,...item.max,item.totalMax,
      ...(item.minFinal!==null?[item.minFinal]:[]),...(item.minTotal!==null?[item.minTotal]:[]),
      ...(rules.autoPromote?[]:[item.secondRoundMax])]);
    const columns=['المادة','الحصص أسبوعيًا',...plan.components,'الدرجة الكبرى',...threshold,...(rules.autoPromote?[]:['امتحان الدور الثاني'])];
    const details=plan.items.flatMap(item=>{
      const work=item.workBreakdown;
      if(f.cls==='السادس'&&item.key==='s'&&work)return [`علوم السادس في كل فصل: الأنشطة ${work.activities}، التطبيقات ${work.quizzes}، وامتحان منتصف الفصل ${work.midterm}. مجموع الأعمال ${item.max[0]}.`];
      return item.parts?[`توزيع درجة ${item.label}: ${item.parts.map(part=>part.label+' '+part.max).join('، ')}.`]:[];
    });
    const parts=details.map(note=>'<p class="muted small">'+esc(note)+'</p>').join('');
    const retake=rules.maxSecondRoundSubjects?`<p class="muted small">الدور الثاني للراسبين في ثلاث مواد على الأكثر وفق الدرجات.</p>`:'';
    return showDialog('قواعد الدرجات والنجاح',`<div class="stack">${heading}<p>${esc(guidance)}</p>${table(columns,rows,{name:'حدود الدرجات والنجاح'})}${parts}${retake}<p class="muted small">يحسب التقرير نتيجة الدرجات المكتملة. تعتمد المدرسة المواظبة والأعذار وحالات الاستثناء.</p></div>`,'report');
  }
  const key=yearKey(f.year,f.cls,f.stream), rule=school().gradingRules[key]||{overall:50,subject:50,remedial:2};
  showDialog('إعداد قواعد النجاح',heading+`<p class="muted small">تُستخدم القيم التي تعتمدها المدرسة لهذا الصف في التقارير. السجل الناقص لا يدخل في احتساب الحالة.</p><form data-form="grading-rules" data-key="${esc(key)}" class="stack">
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
    const rows=[...(counted.some(x=>x.status==='منقول')?['منقول']:[]),'ناجح','دور ثان','راسب'].map(status=>{
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
const isPassingGrade=status=>['ناجح','منقول'].includes(status);
const eligibleForGradeRanking=row=>isPassingGrade(row.status)&&row.complete&&Number.isFinite(row.percent);
function gradeTopReport(title,filters,summaries) {
  const percentage=row=>row.max>0?100*row.total/row.max:row.percent;
  const ranked=summaries.filter(eligibleForGradeRanking).sort((a,b)=>
    percentage(b)-percentage(a)||localeCompare(a.s.name,b.s.name)||localeCompare(a.s.reg,b.s.reg)).slice(0,10);
  const rows=ranked.map((row,i)=>[i+1,row.s.name,row.percent+'%',gradeRating(percentage(row))]);
  const meta=[filters.cls,filters.section,filters.stream].filter(Boolean).map(value=>'<span>'+esc(value)+'</span>').join('');
  schoolListReport(title,filters.year,['الترتيب','الاسم','النسبة','التقدير'],[{rows,meta}],
    {orientation:'عمودي',font:'Cairo',variant:'rank',fontSize:15,rowsPerPage:10});
}

function gradePaperTable(label,head,rows,columnCount,variant='grade-marks') {
  return `<table class="school-paper-table ${variant}" aria-label="${esc(label)}"><colgroup><col>${'<col>'.repeat(columnCount-1)}</colgroup><thead>${head}</thead>
    <tbody>${rows.map(row=>'<tr>'+row.map(value=>'<td>'+esc(value)+'</td>').join('')+'</tr>').join('')}</tbody></table>`;
}
function gradePaperScores(view,marks,groups) {
  return groups.map(group=>gradeSummary(view.plan,view.source,marks,group.indices));
}
const paperGrade=value=>value==='—'?'':value??'';
const gradePaperLabel=(view,group)=>{
  if(view.source!=='add_grades')return group.label;
  return group.label+' ('+([30,30,40][group.indices[0]])+'%)';
};
function gradePaperMarks(view,marks,groups,{yearTotal=false}={}) {
  const sections=[...groups];
  if(yearTotal)sections.push({label:'النتيجة النهائية (100%)',indices:null});
  const scores=gradePaperScores(view,marks,sections);
  const head=`<tr><th rowspan="2" scope="col">المادة</th>${sections.map(group=>`<th colspan="2" scope="colgroup">${esc(group.indices?gradePaperLabel(view,group):group.label)}</th>`).join('')}</tr>
    <tr>${sections.map(()=>'<th scope="col">الدرجة الكبرى</th><th scope="col">درجة التلميذ</th>').join('')}</tr>`;
  const rows=view.plan.items.map((item,i)=>[item.label,...scores.flatMap(score=>[paperGrade(score.rows[i][2]),paperGrade(score.rows[i][1])])]);
  if(view.plan.items.some(item=>!item.choices))rows.push(['المجموع الكلي',...scores.flatMap(score=>[
    sum(score.subjects.map(subject=>Number(subject.max)||0)),score.complete?score.total:''
  ])]);
  return gradePaperTable('درجات التلميذ',head,rows,1+sections.length*2);
}
function semesterPaperMarks(view,marks,groups,mode) {
  const period=mode==='period';
  const official=mode==='double';
  const first=gradeSummary(view.plan,view.source,marks,[0]);
  const second=gradeSummary(view.plan,view.source,marks,[1]);
  const third=gradeSummary(view.plan,view.source,marks,[2]);
  const fourth=gradeSummary(view.plan,view.source,marks,[3]);
  const annual=gradeSummary(view.plan,view.source,marks);
  const perSemester=gradePaperScores(view,marks,period?groups:gradeReportPeriods(view.source,view.plan));
  const parts=[first,second,third,fourth];
  const maxTotal=score=>sum(score.subjects.map(subject=>subject.max));
  const markTotal=score=>score.complete?score.total:'';
  const subjectValues=(score,i)=>[score.subjects[i].max,paperGrade(score.subjects[i].mark)];
  const pair=score=>[maxTotal(score),markTotal(score)];
  const headCell=(label,span=1)=>`<th${span>1?' colspan="'+span+'" scope="colgroup"':''}>${esc(label)}</th>`;
  const numberCell=(value,span='')=>`<td${span}><bdi class="grade-paper-number">${esc(value)}</bdi></td>`;
  const multilineHead=(labels,leading='المادة')=>`<tr><th rowspan="2" scope="col">${leading}</th>${
    labels.map(([label,width])=>headCell(label,width)).join('')}</tr>`;
  if(period){
    const [work,exam]=groups[0].indices.map(index=>parts[index]);
    const label=groups[0].label, scores=[work,exam,perSemester[0]];
    const head=multilineHead([['أعمال السنة · '+label,2],['امتحان نهاية '+label,2],['مجموع درجات '+label,2]])+
      '<tr>'+scores.map(()=>'<th>الدرجة الكبرى</th><th>درجة التلميذ</th>').join('')+'</tr>';
    const rows=view.plan.items.map((item,i)=>[item.label,...scores.flatMap(score=>subjectValues(score,i))]);
    rows.push(['المجموع الكلي',...scores.flatMap(pair)]);
    return gradePaperTable('درجات التلميذ في '+label,head,rows,7);
  }
  const minimum=(item,i)=>{
    if(item.minTotal!=null)return item.minTotal;
    const rule=(view.school||school()).gradingRules?.[yearKey(view.f.year,view.f.cls,view.f.stream||'')];
    return rule?.enabled?Math.round(annual.subjects[i].max*rule.subject/10)/10:'';
  };
  if(official){
    const head=`<tr><th rowspan="3" scope="col">المواد الدراسية المقررة</th><th rowspan="3" scope="col">عدد الحصص</th>
      <th colspan="4" scope="colgroup">الفصل الدراسي الأول</th><th colspan="4" scope="colgroup">الفصل الدراسي الثاني</th>
      <th colspan="3" scope="colgroup">النهائيات</th></tr><tr>${
      ['أعمال','امتحان','أعمال','امتحان'].map(label=>headCell(label,2)).join('')}<th rowspan="2">الكبرى</th><th rowspan="2">الصغرى</th><th rowspan="2">مجموع الفصلين</th></tr>
      <tr>${parts.map(()=>'<th>الكبرى</th><th>الدرجة</th>').join('')}</tr>`;
    const rows=view.plan.items.map((item,i)=>[item.label,item.weeklyPeriods??'',...parts.flatMap(score=>subjectValues(score,i)),
      annual.subjects[i].max,minimum(item,i),paperGrade(annual.subjects[i].mark)]);
    rows.push(['المجموع الكلي','',...parts.flatMap(pair),maxTotal(annual),'',markTotal(annual)]);
    return gradePaperTable('بيان الدرجات النهائي',head,rows,13);
  }
  const head=`<tr><th rowspan="2" scope="col">المادة</th><th rowspan="2" scope="col">التفاصيل</th>
    <th colspan="2" scope="colgroup">الدرجة الكبرى</th><th colspan="2" scope="colgroup">درجة التلميذ</th>
    <th colspan="2" scope="colgroup">النهائيات</th><th rowspan="2" scope="col">مجموع الفصلين</th></tr>
    <tr><th>الفصل الأول</th><th>الفصل الثاني</th><th>الفصل الأول</th><th>الفصل الثاني</th><th>الكبرى</th><th>الصغرى</th></tr>`;
  const body=view.plan.items.map((item,i)=>{
    const rows=[[0,2,'أعمال السنة'],[1,3,'الامتحان']].map(([a,b,label],index)=>`<tr>${
      index?'':'<td rowspan="2">'+esc(item.label)+'</td>'}<td>${label}</td>${
      [parts[a].subjects[i].max,parts[b].subjects[i].max,paperGrade(parts[a].subjects[i].mark),paperGrade(parts[b].subjects[i].mark)].map(value=>numberCell(value)).join('')}${
      index?'':[annual.subjects[i].max,minimum(item,i),paperGrade(annual.subjects[i].mark)].map(value=>numberCell(value,' rowspan="2"')).join('')}</tr>`);
    return rows.join('');
  }).join('');
  const totals=[maxTotal(perSemester[0]),maxTotal(perSemester[1]),markTotal(perSemester[0]),markTotal(perSemester[1]),maxTotal(annual),'',markTotal(annual)];
  return `<table class="school-paper-table grade-marks grade-annual-marks" aria-label="بيان الدرجات النهائي"><thead>${head}</thead>
    <tbody>${body}<tr><td colspan="2">المجموع الكلي</td>${totals.map(value=>numberCell(value)).join('')}</tr></tbody></table>`;
}
function gradeActivityGroups(view,groups) {
  if(view.source==='add_kindergarten_grades'||view.source==='add_activity_grades')return [];
  const count=gradePlan('add_activity_grades',view.f.cls,view.f.stream,view.f.year).components.length;
  return groups.map(group=>({...group,activityIndex:view.plan.components.length===4?Math.floor(group.indices[0]/2):group.indices[0]}))
    .filter(group=>group.activityIndex<count);
}
function gradePaperActivity(view,student,activityGroups,marks) {
  const activity=gradePlan('add_activity_grades',student.cls,student.stream,student.year);
  const rows=activity.items.filter(item=>item.choices).map(item=>[item.label,...activityGroups.map(group=>
    paperGrade(marks[gradeKey('add_activity_grades',item.key,group.activityIndex)]))]);
  return paperTable(['مواد النشاط',...activityGroups.map(group=>'أداء التلميذ خلال '+group.label)],rows);
}
function gradePaperFields(summary) {
  const student=summary.s;
  const fields=[['اسم التلميذ',student.name],['رقم القيد',student.reg],['الصف',student.cls],['الفصل',student.section],
    ...(student.stream?[['التخصص',student.stream]]:[])];
  return `<div class="paper-student">${studentAvatar(student,true)}<dl>${fields.map(([label,value])=>
    '<dt>'+esc(label)+'</dt><dd>'+esc(value||'')+'</dd>').join('')}</dl></div>`;
}
function gradePaperStatus(summary,period=false) {
  const ratio=summary.max>0?100*summary.total/summary.max:summary.percent;
  return paperTable([period?'نتيجة الفترة':'النتيجة النهائية للتلميذ',''],[
    ['الحالة',summary.status||''],['النسبة',summary.percent===null?'':summary.percent+'%'],
    ['التقدير',summary.percent===null?'':gradeRating(ratio)]
  ]);
}
function gradePaperSignatures(groups,certificate=false) {
  const roles=certificate?['إعداد ومراجعة الدرجات','مدير المدرسة','ولي أمر التلميذ']:['معلم الفصل','مدير المدرسة','ولي أمر التلميذ'];
  return paperTable(['التوقيعات',...groups.map(group=>group.label)],
    roles.map(role=>[role,...groups.map(()=> '')]));
}
function gradeCardReport(view,title,summaries,indices,type) {
  const schoolData=view.school||school(), {year}=view.f;
  const gradeScope={...view.f,cls:view.f.cls||summaries[0]?.s.cls,stream:view.f.stream||summaries[0]?.s.stream};
  view={...view,f:gradeScope,school:schoolData};
  const allGroups=gradeReportPeriods(view.source,view.plan);
  const groups=indices?allGroups.filter(group=>group.indices.every(index=>indices.includes(index))):allGroups;
  const activityGroups=gradeActivityGroups(view,groups);
  const semester=view.plan.components.length===4;
  const heading=type==='period'?'بطاقة تقدير درجات · '+groups[0].label+' · '+year:
    type==='final'?'بطاقة تقدير درجات · '+(view.f.cls?.includes('ثانوي')?'مرحلة التعليم الثانوي':'مرحلة التعليم الأساسي')+' · '+year:title+' · '+year;
  const portrait=(caption,body,student,official=false)=>paperFrame(caption,year,body,{
    variant:official?'grades-official':'grades',profile:schoolData.profile,settings:{
      font:official?'Simplified Arabic':'Cairo',cellPadding:official||view.plan.items.length>10||semester?3:6
    },signatures:false,authorityLine:official&&view.plan.certificate?'المركز الوطني للامتحانات':'',
    meta:student?'الصف '+esc(student.cls)+(student.stream?' · '+esc(student.stream):''):''
  });
  const layout=(main,side)=>`<div class="grade-paper-grid"><div class="grade-paper-main">${main}</div><div class="grade-paper-side">${side}</div></div>`;
  const markup=summaries.map(summary=>{
    const student=summary.s, marks=schoolData.grades[student.id]||{};
    const marksTable=semester?semesterPaperMarks(view,marks,groups,type):gradePaperMarks(view,marks,groups,{yearTotal:!indices});
    const activity=activityGroups.length?gradePaperActivity(view,student,activityGroups,marks):'';
    const absences=activityGroups.length?paperTable(['الغياب',...activityGroups.map(group=>group.label)],
      [['ex','غياب مشروع (أيام)'],['un','غياب غير مشروع (أيام)']].map(([key,label])=>
        [label,...activityGroups.map(group=>paperGrade(marks[gradeKey('add_activity_grades',key,group.activityIndex)]))])):'';
    const sign=gradePaperSignatures(activityGroups.length?activityGroups:groups,view.plan.certificate);
    const note=`<div class="grade-paper-note"><strong>ملاحظات على أداء التلميذ${type==='period'?' خلال '+esc(groups[0].label):''}</strong>
      <span></span><span></span><span></span></div>`;
    const important=activity?'<p class="grade-paper-caption"><strong>ملاحظات هامة</strong><br>تقديرات مواد النشاط: مقبول، جيد، جيد جداً، ممتاز.</p>':'';
    const side=gradePaperFields(summary)+gradePaperStatus(summary,type==='period')+absences;
    if(type==='double'){
      const behavior=paperTable(['السلوك',...activityGroups.map(group=>group.label)],
        ['السلوك والانضباط','المواظبة'].map(label=>[label,...activityGroups.map(()=> '')]));
      const front=portrait('صحيفة النتيجة النهائية · '+year,marksTable+activity,student,true);
      const back=portrait('بيانات التلميذ واعتماد النتيجة · '+year,layout(note+behavior+sign+important,side),student,true);
      return front+back;
    }
    return portrait(heading,layout(marksTable+activity+sign,side+note+important),student);
  }).join('')||portrait(heading,notice('لا توجد سجلات مطابقة.'));
  showDocument(title,[],[],markup,'عمودي',null,{fixed:true});
}

function gradeReviewReport(view) {
  const {source,plan,f,all}=view;
  const groups=gradeReportPeriods(source,plan), semester=plan.components.length===4;
  const subheads=semester?['أعمال','امتحان','المجموع']:['الدرجة'];
  const headings='<tr><th rowspan="'+(semester?2:1)+'">الفصل / الفترة</th>'+
    [...plan.items.map(item=>item.label),'مجموع الدرجات'].map(label=>`<th colspan="${subheads.length}">${esc(label)}</th>`).join('')+'</tr>'+
    (semester?'<tr>'+Array.from({length:plan.items.length+1},()=>subheads.map(label=>'<th>'+label+'</th>').join('')).join('')+'</tr>':'');
  const grid=(student,title)=>{
    const marks=student?(view.school||school()).grades[student.id]||{}:{};
    const displayed=(score,i)=>student?(i===plan.items.length?(score.complete?score.total:''):paperGrade(score.subjects[i].mark)):
      (i===plan.items.length?sum(score.subjects.map(item=>Number(item.max)||0)):paperGrade(score.subjects[i].max));
    const rows=groups.map(({label,indices})=>{
      const scores=gradePaperScores(view,marks,[...indices.map(i=>({indices:[i]})),...(semester?[{indices}]:[])]);
      return [label,...Array.from({length:plan.items.length+1},(_,i)=>scores.map(score=>displayed(score,i))).flat()];
    });
    if(student&&!gradeSummary(plan,source,marks).complete)title+=' · الرصد غير مكتمل';
    return '<section class="grade-review-block"><h3>'+esc(title)+'</h3>'+
      gradePaperTable(title,headings,rows,1+(plan.items.length+1)*subheads.length,'grade-review-grid')+'</section>';
  };
  const title='تقرير المراجعة', perPage=5, pages=Math.max(1,Math.ceil(all.length/perPage));
  const maxima=grid(null,'الدرجات الكبرى');
  const meta=[f.cls,f.stream,f.section].filter(Boolean).map(part=>'<span>'+esc(part)+'</span>').join('');
  const markup=Array.from({length:pages},(_,page)=>{
    const body=all.slice(page*perPage,(page+1)*perPage).map((student,i)=>
      grid(student,(page*perPage+i+1)+' · '+student.name+' · رقم القيد '+student.reg+(student.section?' · '+student.section:''))).join('');
    return paperFrame(title,f.year,maxima+(body||notice('لا توجد سجلات مطابقة.')),{
      variant:'grade-review',settings:{font:'Calibri',fontSize:10,cellPadding:1},meta,signatures:false,page:page+1,pages
    });
  }).join('');
  const file=gradeRows(view);
  showDocument(title,file.headers,file.rows,markup,'أفقي',null,{paperSize:'A3',margin:2,fixed:true});
}
function studentReportMenu(){return `<div class="grid2">${[
  ['طباعة بطاقات تعريف التلاميذ','id-cards'],['طباعة إفادة حسن السيرة','conduct'],['طباعة تعريف مدرسي','enrollment'],
  ['طباعة تعهد لتلميذ','pledge'],['طباعة بطاقة بيانات الطلبة','profiles']
].map(([label,id])=>btn(label,'student-doc',id,'outline-blue')).join('')}${btn('إفادة استمرارية الدراسة','continuity-request','','outline-blue')}${btn('كشف استمرارية الدراسة','continuity-roster','','outline-blue')}${btn('طباعة إحصائية الطلبة','student-stats','','outline-blue')}${btn('طباعة كشف الأجانب فقط','student-print','foreign','outline-blue')}${session?.role==='admin'?btn('طباعة كشف طلبة الفئات الخاصة','student-print','special','outline-blue'):''}${link('طباعة كشف استلام الكتب','books-receipt','soft')}</div>`;}
actions['student-report-menu']=()=>showDialog('أدوات الطباعة والتقارير',studentReportMenu());
const STUDENT_DOCS={
  'id-cards':['بطاقة تعريف تلميذ',''],
  'conduct':['إفادة حسن السيرة والسلوك','تشهد إدارة المدرسة بحسن سيرة وسلوك الطالب المذكور وفقًا لسجلاتها.'],
  'enrollment':['تعريف مدرسي','تشهد إدارة المدرسة بأن الطالب المذكور مقيد لديها في السنة الدراسية الموضحة.'],
  'pledge':['تعهد تلميذ','أتعهد بالالتزام بنظام المدرسة واحترام مواعيد الدوام والمحافظة على الممتلكات. توقيع الطالب: __________ توقيع ولي الأمر: __________'],
  'profiles':['بطاقة بيانات طالب','']
};
actions['student-paper-menu']=id=>{
  const student=lookup('students',id);
  showDialog('تقارير · '+student.name,`<div class="report-buttons">${Object.entries(STUDENT_DOCS).map(([kind,[label]])=>
    btn(label,'student-doc',kind+'|'+id,'outline-blue')).join('')}${btn('استدعاء ولي أمر تلميذ','student-guardian-letter',id,'outline-blue')}</div>`);
};
actions['student-guardian-letter']=id=>{
  const student=lookup('students',id);
  showDialog('استدعاء ولي أمر تلميذ',`<form class="stack" data-form="student-guardian-letter" data-id="${esc(id)}">
    <p>${esc(student.name)}</p><div class="fields tight">
    ${field(['date','تاريخ الموعد','date'])}${field(['time','وقت الموعد','time'])}
    ${field(['reason','موضوع اللقاء','text'],'',{maxlength:160})}</div>${submit('معاينة الاستدعاء')}</form>`);
};
forms['student-guardian-letter']=(data,form)=>{
  const student=lookup('students',form.dataset.id), title='استدعاء ولي أمر تلميذ';
  if(data.date)attendanceReportDates(data.date,'يومي');
  const appointment=[data.date,data.time].filter(Boolean).join(' · ')||'....................................';
  const details=[['اسم التلميذ',student.name],['رقم القيد',student.reg],['الصف',student.cls],['الفصل',student.section],
    ['الموعد',appointment],['موضوع اللقاء',str(data.reason).slice(0,160)||'....................................']];
  const body='<div class="paper-continuity-body"><p>السيد المحترم ولي أمر التلميذ</p><p>نرجو حضوركم إلى إدارة المدرسة في الموعد الموضح أدناه.</p>'+
    paperTable(['البيان','التفاصيل'],details,title)+'</div>';
  showDocument(title,[],[],paperFrame(title,student.year,body),'عمودي',null,{fixed:true});
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
