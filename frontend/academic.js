const allowedClasses={
  add_kindergarten_grades:CLASSES.slice(0,2),add_grades:CLASSES.slice(2,7),add_activity_grades:CLASSES.slice(2), 
  'student-grades-sse':CLASSES.slice(7,10),remedial_grades:CLASSES.slice(5),'student-grades-ninth':['التاسع'],
  'student-grades-first-secondary':['الأول ثانوي'],'student-grades-second-secondary':['الثاني ثانوي'],
  'student-grades-third-secondary':['الثالث ثانوي']
};
const gradeDraft = new Map();
const gradeSelected=new Map();
const draftKey=(id,key)=>[activeSchoolId,id,key].join('!');
function gradeView(page=route) {
  const f=filterData(page,{cls:page==='remedial_grades'?'السادس':allowedClasses[page][0],limit:'10',stream:'علمي',subject:'',component:''});
  const classes=page==='remedial_grades'?remedialClasses(f.year):allowedClasses[page];
  if(!classes.includes(f.cls))f.cls=classes[0];
  if(!['الثاني ثانوي','الثالث ثانوي'].includes(f.cls))f.stream='';
  else if(!f.stream)f.stream='علمي';
  const source=page;
  const plan=gradePlan(source,f.cls,f.stream,f.year);
  const all=filterStudents(f);
  const items=f.subject?plan.items.filter(item=>item.key===f.subject):plan.items;
  const indexes=plan.components.map((_,i)=>i).filter(i=>f.component===''||Number(f.component)===i);
  return {f,source,plan,all:page==='remedial_grades'?all.filter(s=>studentResult(s).status==='دور ثان'):all,items:items.length?items:plan.items,indexes:indexes.length?indexes:plan.components.map((_,i)=>i),classes};
}
function gradeValue(student,source,item,i) {
  const key=gradeKey(source,item.key,i);
  return gradeDraft.get(draftKey(student.id,key))?.value??school().grades[student.id]?.[key]??'';
}
function gradeCell(student,source,item,i) {
  const value=gradeValue(student,source,item,i);
  const key=gradeKey(source,item.key,i);
  const attrs=` class="table-input" data-grade="1" data-id="${esc(student.id)}" data-key="${esc(key)}" aria-label="${esc(student.name+' · '+item.label+' · '+(i+1))}"`;
  if(item.choices)return `<select${attrs}>${options(item.choices,value,'—')}</select>`;
  return `<input${attrs} type="number" min="0" step="0.1" max="${item.max[i]}" value="${esc(value)}">`;
}
function gradeTable(view,rows) {
  const {items,indexes,plan,source}=view;
  const showSum=['add_grades','student-grades-ninth','student-grades-third-secondary'].includes(source)&&indexes.length>1;
  const periodSums=source==='add_grades'&&showSum;
  const selected=selectedGradeStudents(view);
  const bands=items.some(item=>!item.choices)?3:2;
  const titles=items.map(item=>`<th colspan="${indexes.length+Number(showSum)}">${esc(item.label)}</th>`).join('');
  const subt=items.map(()=>indexes.map(i=>`<th>${esc(plan.components[i])}</th>`).join('')+(showSum?'<th>المجموع</th>':'')).join('');
  const maxima=items.map(item=>indexes.map(i=>`<th class="grade-max">${item.choices?'—':item.max[i]}</th>`).join('')+(showSum?`<th class="grade-max">${sum(indexes.map(i=>item.max[i]))}</th>`:'')).join('');
  const subtotal=(s,subjects,periods)=>{
    const values=subjects.flatMap(item=>periods.map(i=>gradeValue(s,source,item,i)));
    return values.every(v=>v!=='')?Math.round(sum(values)*10)/10:'—';
  };
  const summaryHeaders=periodSums?[...indexes.map(i=>'مجموع الفترة '+(i+1)),'المجموع الكلي']:[];
  const offset=Math.max(0,view.all.indexOf(rows[0]));
  const body=rows.length?rows.map((s,n)=>`<tr><td><input type="checkbox" data-select-grade="${esc(s.id)}" aria-label="اختيار ${esc(s.name)}"${selected.has(s.id)?' checked':''}></td><td>${n+offset+1}</td><td><bdi>${esc(s.reg)}</bdi></td><td class="grade-id">${esc(s.name)}</td>${items.map(item=>indexes.map(i=>'<td>'+gradeCell(s,source,item,i)+'</td>').join('')+(showSum?'<td class="shade">'+subtotal(s,[item],indexes)+'</td>':'')).join('')}${periodSums?[...indexes.map(i=>subtotal(s,items,[i])),subtotal(s,items,indexes)].map(v=>'<td class="shade">'+v+'</td>').join(''):''}</tr>`).join(''):
    `<tr><td class="empty" colspan="${4+items.length*(indexes.length+Number(showSum))+summaryHeaders.length}">لا توجد سجلات مطابقة</td></tr>`;
  return `<div class="table-box sticky"><table class="grid-table grade-table" aria-label="كشف رصد الدرجات"><thead><tr><th rowspan="${bands}"><input type="checkbox" data-select-all-grades aria-label="اختيار جميع الطلبة في الصفحة"${rows.length&&rows.every(s=>selected.has(s.id))?' checked':''}></th><th rowspan="${bands}">#</th><th rowspan="${bands}">رقم القيد</th><th rowspan="${bands}">اسم الطالب</th>${titles}${summaryHeaders.map(label=>'<th rowspan="'+bands+'">'+label+'</th>').join('')}</tr><tr>${subt}</tr>${bands===3?'<tr>'+maxima+'</tr>':''}</thead><tbody>${body}</tbody></table></div>`;
}
function selectedGradeStudents(view) {
  const {year,cls,stream}=view.f;
  const key=[activeSchoolId,route,year,cls,stream].join('|');
  if(!gradeSelected.has(key))gradeSelected.set(key,new Set());
  return gradeSelected.get(key);
}
document.addEventListener('change',event=>{
  const el=event.target;
  if(!el.matches('[data-select-grade],[data-select-all-grades]'))return;
  const selected=selectedGradeStudents(gradeView());
  const checks=$$('[data-select-grade]',el.closest('table'));
  for(const check of el.hasAttribute('data-select-all-grades')?checks:[el]){
    check.checked=el.checked;
    if(el.checked)selected.add(check.dataset.selectGrade);
    else selected.delete(check.dataset.selectGrade);
  }
  $('[data-select-all-grades]',el.closest('table')).checked=checks.length>0&&checks.every(check=>check.checked);
});
function gradeReview(view) {
  if(view.source!=='add_grades')return '';
  const completeness=view.all.map(s=>view.plan.components.map((_,i)=>view.plan.items.every(item=>school().grades[s.id]?.[gradeKey(view.source,item.key,i)]!==undefined)));
  const counts=view.plan.components.map((_,i)=>completeness.filter(row=>row[i]).length);
  const total=completeness.filter(row=>row.every(Boolean)).length;
  const detail=(complete)=>`<div class="report-buttons">${counts.map((n,i)=>`<span class="year">الفترة ${i+1}: ${complete?n:view.all.length-n}</span>`).join('')}</div>`;
  return `<div class="grid2 grade-review">${card(detail(true),'الطلاب المكتمل رصد أعمالهم حسب الفترات')}${card(detail(false),'الطلاب غير المكتمل رصد أعمالهم حسب الفترات')}${card('<p class="result-summary">عدد الطلبة: '+total+'</p>','الطلاب المكتمل رصد درجاتهم بالكامل')}${card('<p class="result-summary">عدد الطلبة: '+(view.all.length-total)+'</p>','الطلاب الذين لم تكتمل درجاتهم بالكامل')}</div>`;
}
function gradePage() {
  const view=gradeView(), {f,source,plan,all,classes}=view, page=paginate(route,all,f);
  const search=[['cls','اختر الصف',classes],FILTER_SECTION,FILTER_YEAR,['limit','عدد الطلاب',['10','20','50','100']]];
  if(f.stream)search.splice(2,0,['stream','التخصص',['علمي','أدبي']]);
  if(route==='remedial_grades')search.push(['q','بحث باسم الطالب','search']);
  const viewFields=[['subject','المادة الدراسية',plan.items.map(item=>[item.key,item.label])],['component',source==='add_grades'?'الفترة / الفصل':'نوع الرصد',[['','جميع الفترات'],...plan.components.map((label,i)=>[String(i),label])]],['sort','طريقة الترتيب',['الفصل والاسم','اسم الطالب','رقم القيد']],['dir','الاتجاه',['تصاعدي','تنازلي']]];
  const title=route==='remedial_grades'?'إدخال درجات الدور الثاني':route==='add_kindergarten_grades'?'رصد تقييمات رياض الأطفال':route==='add_activity_grades'?'رصد تقديرات مواد النشاط':'إدخال درجات الطلاب';
  const reports=gradeReportChoices(source,plan);
  const draftCount=[...gradeDraft.values()].filter(entry=>entry.school===activeSchoolId&&entry.key.startsWith(source+'|')).length;
  const reportControls=`<div class="report-buttons">${reports.map(([id,label])=>btn(label,'grades-report',id,id.startsWith('period')||id==='final'?'outline-blue':'soft')).join('')}</div>`;
  const publishing=source===routeForClass(f.cls)?card(`<div class="btns">${btn('إعدادات عرض النتائج للطلبة','publish-settings','','outline-blue')}${supportsResultRules(source,plan)?btn(plan.rules?'قواعد الدرجات والنجاح':'إعداد قواعد النجاح','grading-settings'):''}</div><p class="small muted gap">${school().published[yearKey(f.year,f.cls,f.stream)]?'عرض النتائج مفعّل للصف المختار.':'عرض النتائج متوقف للصف المختار.'}</p>`,'التحكم في عرض النتائج للطلاب عبر الرابط'):'';
  const raster=`<div class="report-buttons">${btn('طباعة الكشف العادي','grades-report','marks','outline-dark')}${btn('تحميل الكشف العادي (Excel)','grades-export','','outline-green')}${btn('طباعة الكشف المفصل','grades-report','detailed','outline-blue')}</div>`;
  return header(title+' - الصف: '+f.cls,'',f.year)+`<div class="grade-panes">
    <div class="grid2">${card(filterForm(route,search,f),'الفلاتر')}${publishing}</div>${card(reportControls,'أدوات الطباعة والتقارير')}${card(raster,'كشف رصد الدرجات')}
    <div class="grid2">${card(filterForm(route,viewFields,f),source==='add_grades'?'التحكم في عرض أعمدة الفترات':'التحكم في عرض أعمدة الدرجات')}${card(`<div class="report-buttons">${btn('تصدير ملف الدرجات Excel','grades-export','','outline-green')}${btn('رفع الدرجات','grades-import','','outline-blue')}</div>`,'أدوات التصدير والاستيراد')}</div>
    ${gradeReview(view)}
    <form data-form="save-grades" data-source="${esc(source)}"><div class="toolbar gap"><span id="grade-draft" class="muted small">${draftCount?draftCount+' تغيير ينتظر الحفظ':''}</span>${submit('حفظ الرصد')}</div>${gradeTable(view,page.rows)}</form>${page.tools}</div>`;
}
for(const page of GRADE_ROUTES)if(page!=='vertical-grades')pages[page]=gradePage;
document.addEventListener('input',event=>{
  const input=event.target;
  if(!input.dataset.grade)return;
  gradeDraft.set(draftKey(input.dataset.id,input.dataset.key),{school:activeSchoolId,id:input.dataset.id,key:input.dataset.key,value:input.value});
  const target=$('#grade-draft');
  if(target)target.textContent='تغييرات تنتظر الحفظ';
});
function writeGrade(s,id,key,value) {
  const student=s.students.find(record=>record.id===id&&!record.archive);
  const [source,subject,iText]=key.split('|'), i=Number(iText);
  return setGradeMark(s,student,source,subject,i,value);
}
forms['save-grades']=async(_data,form)=>{
  const rows=[...gradeDraft.entries()].filter(([,entry])=>entry.school===activeSchoolId&&entry.key.startsWith(form.dataset.source+'|'));
  if(!rows.length)return flash('لا توجد تغييرات جديدة.');
  await update(s=>{for(const [,entry] of rows)writeGrade(s,entry.id,entry.key,entry.value);});
  for(const [key] of rows)gradeDraft.delete(key);
  render();flash('حُفظ الرصد.');
};
function gradeColumns(view) {
  return view.items.flatMap(item=>view.indexes.map(i=>({
    key:gradeKey(view.source,item.key,i),label:item.label+' / '+view.plan.components[i],
    previousLabel:item.key==='u'?'التربية وعلم النفس / '+view.plan.components[i]:null
  })));
}
function gradeRows(view) {
  const columns=gradeColumns(view);
  return {headers:['رقم القيد','اسم الطالب',...columns.map(c=>c.label)],rows:view.all.map(s=>[s.reg,s.name,...columns.map(c=>school().grades[s.id]?.[c.key]??'')])};
}
actions['grades-export']=()=>{
  const view=gradeView(), file=gradeRows(view);
  downloadExcel('كشف درجات '+view.f.cls+' '+view.f.year,[...file.headers,'السنة الدراسية'],file.rows.map(row=>[...row,view.f.year]));
};
actions['grades-import']=()=>{
  const view=gradeView();
  showDialog('رفع وتحديث الدرجات',`<p>صدّر الكشف، ثم عبّئ خلايا الدرجات وأعد رفعه إلى الصف والسنة نفسيهما. الخلية الفارغة تُبقي الدرجة الحالية.</p><form data-form="import-grades" class="stack">${field(['file','اختر ملف Excel','file',true],'',{accept:'.xlsx'})}${submit('استيراد الدرجات')}</form>`);
};
forms['import-grades']=async data=>{
  const view=gradeView(), columns=gradeColumns(view);
  const rows=await readExcel(data.file), headings=rows.shift()||[];
  const regCol=headings.findIndex(h=>normalized(h)===normalized('رقم القيد'));
  const yearCol=headings.findIndex(h=>normalized(h)===normalized('السنة الدراسية'));
  if(regCol>=0&&yearCol>=0&&rows.some(row=>str(row[regCol])&&transferYear(row[yearCol])!==view.f.year))
    throw new Error('اختر السنة الدراسية المكتوبة في الكشف قبل استيراد الدرجات.');
  const entries=columns.map(c=>[c.key,headings.findIndex(h=>normalized(h)===normalized(c.label)||c.previousLabel&&normalized(h)===normalized(c.previousLabel))]).filter(([,i])=>i>=0);
  if(regCol<0||!entries.length)throw new Error('استخدم الكشف المصدّر من صفحة الرصد الحالية.');
  const byReg=new Map(view.all.map(s=>[digits(s.reg),s.id]));
  let n=0;
  await update(s=>{
    for(const [i,row] of rows.entries()){
      const reg=digits(row[regCol]);
      if(!reg)continue;
      const id=byReg.get(reg);
      if(!id)throw new Error('الصف '+(i+2)+' لا يطابق طالبًا في الكشف المحدد.');
      for(const [key,col] of entries)if(str(row[col])!==''){writeGrade(s,id,key,str(row[col]));n++;}
    }
    if(!n)throw new Error('لم أجد درجات للاستيراد.');
  });
  $('#modal').close();render();flash('حُفظت '+n+' درجة.');
};
function studentResult(student,s=school(),source=routeForClass(student.cls),indices=null) {
  const plan=gradePlan(source,student.cls,student.stream,student.year);
  const key=yearKey(student.year,student.cls,student.stream);
  const marks=s.grades[student.id]||{}, retake=source==='remedial_grades';
  const mainSource=routeForClass(student.cls);
  const summary=retake&&plan.rules?
    gradeRetakeSummary(gradePlan(mainSource,student.cls,student.stream,student.year),mainSource,marks):
    gradeSummary(plan,source,marks,indices);
  const assessment=plan.rules?curriculumResult(summary,plan.rules,indices,retake):classifyResult(summary,s.gradingRules?.[key]);
  const status=indices||retake?assessment.status:student.outcome||assessment.status;
  return {...summary,...assessment,status,published:Boolean(s.published[key])};
}
actions['student-result']=id=>{
  const fromPublic=route==='parents'||route==='results';
  const s=fromPublic?publicSchool():school();
  const student=fromPublic?publicMatches.find(record=>record.id===id):lookup('students',id);
  if(!student)throw new Error('الطالب غير موجود.');
  const source=routeForClass(student.cls);
  const result=studentResult(student,s,source);
  if(fromPublic&&!result.published)throw new Error('النتيجة غير منشورة.');
  const plan=gradePlan(source,student.cls,student.stream,student.year);
  gradeCardReport({f:{year:student.year},source,plan,school:s},'صحيفة نتيجة الطالب',[{s:student,...result}],null,'final');
};
actions['publish-settings']=()=>{
  const {f,source}=gradeView();
  const key=yearKey(f.year,f.cls,f.stream);
  if(source!==routeForClass(f.cls))throw new Error('افتح كشف الدرجات الأساسي للصف لتغيير النشر.');
  showDialog('إعدادات عرض النتائج للطلبة',`<p>${esc(f.cls)} · ${esc(f.year)}</p><form data-form="publish" data-key="${esc(key)}" class="stack">${field(['publish','إتاحة النتيجة في صفحة الاستعلام','checkbox'],school().published[key])}${submit('حفظ الإعدادات')}</form>`);
};
forms.publish=async(data,form)=>{
  await update(s=>{s.published[form.dataset.key]=Boolean(data.publish);});
  $('#modal').close();render();flash('حُفظ إعداد النشر.');
};
function gradeReportChoices(source,plan) {
  const groups=plan.components.length===4?[['period:0,1','صحيفة الفصل الأول'],['period:2,3','صحيفة الفصل الثاني']]:
    plan.components.map((label,i)=>['period:'+i,'صحيفة '+label.replace('أعمال - ','').replace(/^أعمال فترة .* - /,'')]);
  if(source==='add_grades')return [
    ...['الأولى','الثانية','الثالثة'].flatMap((label,i)=>[['period:'+i,'صحيفة الفترة '+label],['weak:'+i,'كشف المواد الضعيفة - فترة '+(i+1)]]),
    ['final','صحيفة النتيجة النهائية'],['double','صحيفة النتيجة النهائية (بطاقة بوجهين)'],['periods','صحيفة الفترات'],
    ...[0,1,2].map(i=>['top:'+i,'عشرة أوائل فترة '+(i+1)]),['top','العشرة الأوائل النتيجة النهائية'],
    ['review','تقرير المراجعة'],['passed','كشف الناجحين النتيجة النهائية'],['remedial','كشف المرحّلين بمواد ضعيفة'],['rate','نسبة النجاح العامة الدور الأول']
  ];
  const items=[...groups,['final','صحيفة النتيجة النهائية'],['review','تقرير المراجعة']];
  if(source==='add_kindergarten_grades'||source==='add_activity_grades')return items;
  if(source==='remedial_grades')return [['review','كشف مراجعة درجات الدور الثاني'],['final','صحيفة درجات الدور الثاني']];
  return [...items,['periods','صحائف الفترات'],['double','صحيفة النتيجة النهائية (بطاقة بوجهين)'],['top','العشرة الأوائل'],['passed','كشف الناجحين'],['remedial','كشف الدور الثاني'],['weak','كشف المواد الضعيفة'],['needed','كشف احتياج النجاح'],['rate','نسبة النجاح العامة'],['subject-count','عدد طلبة الدور الثاني حسب المادة']];
}
forms['grade-report']=data=>actions['grades-report'](data.kind);
actions['grades-report']=kind=>{
  const view=gradeView();
  if(['marks','review','detailed'].includes(kind)) {
    const file=gradeRows(view);
    if(kind==='detailed'){
      const records=view.all.flatMap(s=>view.items.map(item=>[s.reg,s.name,item.label,...view.indexes.map(i=>school().grades[s.id]?.[gradeKey(view.source,item.key,i)]??'—')]));
      return schoolListReport('كشف رصد الدرجات المفصل',view.f.year,['رقم القيد','اسم الطالب','المادة',...view.indexes.map(i=>view.plan.components[i])],[{rows:records}]);
    }
    return schoolListReport(kind==='review'?'تقرير مراجعة الدرجات':'كشف رصد الدرجات',view.f.year,file.headers,[{rows:file.rows}],{orientation:'أفقي',fontSize:10,rowsPerPage:18});
  }
  const [type,period]=kind.split(':');
  const indices=period===undefined?null:period.split(',').map(Number);
  const selection=selectedGradeStudents(view);
  const hasSelection=view.all.some(s=>selection.has(s.id));
  const sourceRows=['period','final','periods','double'].includes(type)&&hasSelection?view.all.filter(s=>selection.has(s.id)):view.all;
  const summaries=sourceRows.map(s=>({s,...studentResult(s,school(),view.source,indices)}));
  const title=gradeReportChoices(view.source,view.plan).find(([key])=>key===kind)?.[1]||'صحيفة النتيجة';
  if(['top','passed','remedial'].includes(type)) {
    let rows=summaries;
    if(type==='top')rows=rows.filter(x=>x.percent!==null).sort((a,b)=>b.percent-a.percent||localeCompare(a.s.name,b.s.name)).slice(0,10);
    if(kind==='passed')rows=rows.filter(x=>['ناجح','منقول'].includes(x.status));
    if(kind==='remedial')rows=rows.filter(x=>x.status==='دور ثان');
    return schoolListReport(title,view.f.year,['رقم القيد','اسم الطالب','المجموع','النسبة','الحالة'],[{rows:rows.map(x=>[x.s.reg,x.s.name,x.complete?x.total:'—',x.percent??'—',x.status||'—'])}]);
  }
  if(type==='final'&&view.source==='remedial_grades'&&view.plan.rules){
    const columns=['رقم القيد','اسم الطالب',...view.plan.items.map(item=>item.label),'المجموع','النسبة','الحالة'];
    const rows=summaries.map(row=>[row.s.reg,row.s.name,...row.rows.map(item=>item[1]),row.complete?row.total:'—',row.percent??'—',row.status||'غير مكتمل']);
    return schoolListReport('نتائج الدور الثاني بعد احتساب أعمال السنة',view.f.year,columns,[{rows}],{orientation:'أفقي',fontSize:10,rowsPerPage:18});
  }
  if(['weak','needed','rate','subject-count'].includes(type))return outcomeReport(type,title,view.f.year,summaries);
  if(['period','final','periods','double'].includes(type))return gradeCardReport(view,title,summaries,indices,type);
  showReport(title,view.f.year,['رقم القيد','اسم الطالب',...view.plan.items.map(item=>item.label),'المجموع','النسبة'],summaries.map(x=>[x.s.reg,x.s.name,...x.rows.map(r=>r[1]),x.complete&&x.max?x.total:'—',x.percent??'—']));
};
function blindScreen(barcode) {
  const title=barcode?'رصد درجات الامتحان بالباركود':'رصد درجات الامتحان باستخدام الرقم السري';
  const f=filterData(route,{cls:'السادس'});
  if(!CLASSES.slice(7,10).includes(f.cls))f.cls='السادس';
  const plan=gradePlan('student-grades-sse',f.cls,'',f.year);
  const allowed=CLASSES.slice(7,10);
  return header(title,'',f.year)+card(filterForm(route,[FILTER_YEAR,['cls','الصف',allowed]],f))+
    card(`<form data-form="blind-search" data-mode="${barcode?'barcode':'secret'}" class="stack">${field(['subject','المادة',plan.items.map(i=>[i.key,i.label]),true])}${field(['period','الفصل الدراسي',[['1','الفصل الأول'],['3','الفصل الثاني']],true])}${field(['code',barcode?'أدخل رمز الباركود هنا':'الرقم السري','text',true],'',{inputmode:'numeric'})}${submit('بحث')}</form>`);
}
pages['record-exam-score']=()=>blindScreen(false);
pages['student-grades-barcode']=()=>blindScreen(true);
forms['blind-search']=(data,form)=>{
  const f=filterData(route,{cls:'السادس'});
  if(!CLASSES.slice(7,10).includes(f.cls))f.cls='السادس';
  const code=digits(data.code), found=activeStudents(f.year).find(s=>s.cls===f.cls&&str(school().hall[s.id]?.[form.dataset.mode==='barcode'?'seat':'secret'])===code);
  if(!found)throw new Error('لم يُعثر على رقم مطابق في توزيع القاعات.');
  const item=gradePlan('student-grades-sse',found.cls,found.stream,found.year).items.find(i=>i.key===data.subject);
  const index=Number(data.period), key=gradeKey('student-grades-sse',item.key,index);
  showDialog('رصد درجة الامتحان',`<form data-form="blind-save" data-id="${esc(found.id)}" data-key="${esc(key)}" class="stack"><p>${esc(item.label)} · رمز الورقة <bdi>${esc(code)}</bdi></p>${field(['mark','الدرجة','number',true],school().grades[found.id]?.[key],{min:0,max:item.max[index],step:.1})}${submit('حفظ الدرجة')}</form>`);
};
forms['blind-save']=async(data,form)=>{
  await update(s=>writeGrade(s,form.dataset.id,form.dataset.key,data.mark));
  $('#modal').close();flash('حُفظت درجة الامتحان.');
};

const ATTENDANCE_PERIODS=['الفترة الأولى','الفترة الثانية','الفترة الثالثة'];
const attendanceStates=staff=>staff?[...ATTENDANCE,'عطلة']:ATTENDANCE;
function attendanceRows(staff,f) {
  if(!staff)return filterStudents(f);
  const records=school().staffAttendance[f.year+'|'+f.date]||{};
  return onlyYear(school().staff,f.year).filter(s=>(!f.shift||s.shift===f.shift)&&(!f.status||records[s.id]?.[0]===f.status)&&finds([s.name,s.job,s.phone].join(' '),f.q)).sort((a,b)=>localeCompare(a.name,b.name));
}
function attendancePage(staff) {
  const f=filterData(route,{date:dayISO(),shift:'',panel:'filters'}), page=paginate(route,attendanceRows(staff,f),f), collection=staff?'staffAttendance':'attendance';
  const rows=school()[collection][f.year+'|'+f.date]||{}, periods=staff?['الحالة']:ATTENDANCE_PERIODS;
  const states=attendanceStates(staff);
  const headings=staff?['#','الاسم','الوظيفة','الفترة','الحالة','ملاحظة']:['#','رقم القيد','اسم الطالب','الصف','الفصل',...periods.map((name,i)=>raw(`${name}<br><select class="table-input header-select" aria-label="رصد الكل · ${name}" data-all-period="${i}">${options([['none','إلغاء'],...states],'','رصد الكل')}</select>`))];
  const fields=staff?[FILTER_YEAR,['status','الحالة',states],['shift','الفترة',['صباحية','مسائية']],['q','بحث بالاسم أو الوظيفة أو الهاتف','search'],FILTER_LIMIT]:
    [FILTER_YEAR,['cls','الصف',CLASSES],FILTER_SECTION];
  const marks=page.rows.map((s,n)=>[n+1,...(staff?[s.name,s.job,s.shift]:[s.reg,s.name,s.cls,s.section]),...periods.map((period,i)=>raw(`<select class="table-input" name="mark!${esc(s.id)}!${i}" data-period="${i}" aria-label="${esc(period+' · '+s.name)}">${options(states,rows[s.id]?.[i],'—')}</select>`)),...(staff?[raw(`<input class="table-input" name="note!${esc(s.id)}" value="${esc(rows[s.id]?.note)}" aria-label="ملاحظة">`)]:[])]);
  const sections=[['filters','الفلاتر'],...(!staff?[['clear','تفريغ سجلات الحضور']]:[]),['reports','أدوات الطباعة والتقارير']];
  const filtersForm=filterForm(route,fields,f);
  const panel=f.panel==='reports'?attendanceReportControls(staff):f.panel==='clear'?`<p>السجلات المعروضة بتاريخ <bdi>${esc(f.date)}</bdi>${f.cls?' للصف '+esc(f.cls):''}${f.section?' · '+esc(f.section):''}</p>${btn('تفريغ السجلات المحددة','attendance-clear','','red')}`:filtersForm;
  const search=staff?'':`<form data-form="filter" data-page="attendance" class="btns" role="search">${field(['q','بحث','search'],f.q,{placeholder:'ابحث برقم القيد أو الاسم…'})}${submit('بحث','outline-blue')}${f.q?btn('مسح البحث','attendance-search-clear'):''}</form>`;
  const tools=`<div class="toolbar attendance-toolbar"><div class="btns">${search}${staff?'':btn('التسجيل السريع','attendance-quick','','outline-blue')}</div><form class="btns" data-form="filter" data-page="${route}">${btn('اليوم السابق','attendance-date','-1','soft')}${field(['date','التاريخ','date',true],f.date)}${btn('اليوم التالي','attendance-date','1','soft')}${submit('عرض اليوم','outline-blue')}</form></div>`;
  return header(staff?'حضور وغياب الموظفين':'الحضور والغياب',staff?'':'تسجيل يومي','')+tabs(route,f.panel,sections,panel)+
    `<div class="spaced-panel">${card(`${tools}<form data-form="attendance" data-mode="${collection}" data-day="${esc(f.year+'|'+f.date)}" class="stack">${staff?field(['all0','رصد الكل',states],'',{blank:'اختر الحالة','data-all-period':'0'}):''}${table(headings,marks,{className:'grid-table table-dark attendance-table'})}<div class="btns">${submit('حفظ الحضور')}</div></form>${page.tools}`,staff?'سجل حضور الموظفين':(f.cls?'الصف '+f.cls:'سجل حضور الطلاب'))}</div>`;
}
pages.attendance=()=>attendancePage(false);
pages['staff-attendance']=()=>attendancePage(true);
document.addEventListener('change',event=>{
  const all=event.target.dataset.allPeriod;
  if(all!==undefined&&event.target.value)for(const field of $$('select[data-period="'+all+'"]',event.target.form))field.value=event.target.value==='none'?'':event.target.value;
});
actions['attendance-date']=value=>{
  const f=filterData(route,{date:dayISO()});
  filters[route]={...filters[route],date:shiftDate(f.date,Number(value)),page:1};render();
};
forms.attendance=async(data,form)=>{
  const collection=form.dataset.mode, day=form.dataset.day;
  if(!/^20\d\d-20\d\d\|\d{4}-\d\d-\d\d$/.test(day))throw new Error('اختر تاريخًا صالحًا.');
  const staff=collection==='staffAttendance';
  await update(s=>{
    const records=s[collection][day] ||= {};
    for(const [key,value] of Object.entries(data)){
      const [kind,id,i]=key.split('!');
      if(kind==='mark'){
        const person=(staff?s.staff:s.students).find(row=>row.id===id&&row.year===day.split('|')[0]&&!row.archive);
        if(!person)continue;
        if(!Array.from({length:staff?1:3},(_,n)=>String(n)).includes(i)||value&&!attendanceStates(staff).includes(value))throw new Error('حالة الحضور غير صالحة.');
        if(value)(records[id] ||= {})[i]=value;
        else if(records[id])delete records[id][i];
      } else if(kind==='note'&&records[id])records[id].note=str(value);
    }
    for(const [id,record] of Object.entries(records))if(!Object.values(record).some(Boolean))delete records[id];
    if(!Object.keys(records).length)delete s[collection][day];
  });
  $('#modal').close();render();flash('حُفظت سجلات الحضور.');
};
actions['attendance-search-clear']=()=>{filters[route]={...filters[route],q:'',page:1};render();};
actions['attendance-quick']=()=>{
  const f=filterData('attendance',{date:dayISO()}), people=attendanceRows(false,f);
  if(!people.length)throw new Error('لا توجد سجلات في الصف المحدد.');
  showDialog('التسجيل السريع',`<form class="stack" data-form="attendance-quick">${field(['student','اختر الطالب',people.map(s=>[s.id,s.reg+' · '+s.name]),true],'',{blank:'اختر الطالب'})}${field(['period','الفترة',ATTENDANCE_PERIODS.map((name,i)=>[String(i),name]),true],'0')}${field(['status','الحالة',ATTENDANCE,true],'حاضر')}${submit('حفظ الحضور')}</form>`);
};
forms['attendance-quick']=data=>{
  const f=filterData('attendance',{date:dayISO()});
  return forms.attendance({['mark!'+data.student+'!'+data.period]:data.status},{dataset:{mode:'attendance',day:f.year+'|'+f.date}});
};
actions['attendance-clear']=()=>showDialog('تفريغ سجلات الحضور',`<p>سيُمسح رصد اليوم للطلاب المطابقين للفلاتر الظاهرة.</p><form data-form="attendance-clear">${submit('تأكيد التفريغ','red')}</form>`);
forms['attendance-clear']=async()=>{
  const f=filterData('attendance',{date:dayISO()}), day=f.year+'|'+f.date;
  const ids=attendanceRows(false,f).map(student=>student.id);
  await update(s=>{
    const records=s.attendance[day];
    if(!records)return;
    for(const id of ids)delete records[id];
    if(!Object.keys(records).length)delete s.attendance[day];
  });
  $('#modal').close();render();flash('فُرّغت سجلات اليوم للطلاب المحددين.');
};
const attendanceReportRanges=[['يومي','اليومي'],['أسبوعي','الأسبوعي'],['شهري','الشهري']];
function attendanceReportControls(staff) {
  const f=filterData(route,{date:dayISO()});
  return `<form data-form="attendance-report" class="stack"><div class="fields tight">${field(['date','تاريخ التقرير','date',true],f.date)}${staff?'':field(['period','الفترة',[['','جميع الفترات'],...ATTENDANCE_PERIODS.map((name,i)=>[String(i),name])]],'')}</div><div class="report-buttons">${[false,true].flatMap(absent=>attendanceReportRanges.map(([range,label])=>`<button type="submit" name="scope" value="${range}|${Number(absent)}" class="btn ${absent?'danger':'outline-blue'}">${icon('print')} ${absent?'كشف الغياب':'كشف الحضور والغياب'} ${label}</button>`)).join('')}</div></form>`;
}
actions['attendance-reports']=()=>showDialog('أدوات الطباعة والتقارير',attendanceReportControls(route==='staff-attendance'));
forms['attendance-report']=(data,_form,event)=>{
  const [range,absent]=str(event.submitter?.value).split('|');
  const staff=route==='staff-attendance', f=filterData(route,{date:dayISO()}), records=school()[staff?'staffAttendance':'attendance'];
  const periods=staff?[0]:['0','1','2'].includes(data.period)?[Number(data.period)]:[0,1,2];
  const periodNames=staff?['الحالة']:periods.map(i=>ATTENDANCE_PERIODS[i]);
  const people=attendanceRows(staff,{...f,status:''});
  const report=buildAttendanceReport(people,records,{staff,year:f.year,date:data.date||f.date,range,periods,periodNames,absentOnly:absent==='1',status:f.status});
  const title='كشف '+(absent==='1'?'الغياب':'الحضور والغياب')+' '+attendanceReportRanges.find(([key])=>key===range)[1]+' '+(staff?'للموظفين':'للطلبة');
  const scope=[report.label,staff?f.shift:[f.cls,f.section,f.stream].filter(Boolean).join(' · '),
    !staff?(periods.length===1?periodNames[0]:'جميع الفترات'):'',f.status].filter(Boolean);
  const meta=scope.map(label=>'<span><bdi>'+esc(label)+'</bdi></span>').join('')+
    (report.legend?'<span class="attendance-legend">'+esc(report.legend)+(periods.length>1?' · ترتيب الرموز حسب الفترات':'')+'</span>':'');
  const settings={orientation:'أفقي',variant:report.calendar?'attendance-calendar':'attendance-daily',
    rowsPerPage:report.calendar&&periods.length>1?17:24,fontSize:report.calendar?10:12,align:'وسط',shade:'light'};
  const headings=report.displayHeaders.map((label,i)=>report.calendar&&i>=5+report.dates.length?
    raw('<span class="attendance-total">'+esc(label)+'</span>'):label);
  const {markup,orientation}=paperPages(title,f.year,headings,[{rows:report.displayRows,meta}],settings);
  showDocument(title,report.headers,report.rows,markup,orientation,null,{fixed:true});
};

pages['student-promotion']=()=>{
  const f=filterData(route,{year:YEARS[1],newYear:YEAR,limit:'100'});
  const rows=filterStudents(f);
  const cols=['ر.م','رقم القيد','اسم الطالب','اسم الأم بالكامل','النتيجة','المستوى الدراسي الجديد','تحديد الفصل الدراسي','التخصص','اختيار'];
  const body=rows.map((s,i)=>{
    const cls=CLASSES[Math.min(CLASSES.length-1,CLASSES.indexOf(s.cls)+1)];
    return [i+1,s.reg,s.name,s.mother,raw(field(['result!'+s.id,'النتيجة',['ناجح','راسب','دور ثان']],s.outcome,{blank:'اختار'})),raw(field(['class!'+s.id,'المستوى الدراسي',CLASSES],cls)),raw(field(['section!'+s.id,'الفصل الدراسي',SECTIONS],s.section)),raw(field(['stream!'+s.id,'التخصص',['علمي','أدبي']],s.stream,{blank:'—'})),raw(field(['use!'+s.id,'ترحيل','checkbox']))];
  });
  return header('ترحيل الطلبة للسنة الدراسية القادمة','',f.year)+card(filterForm(route,[['year','العام الدراسي السابق',YEARS],FILTER_CLASS,['newYear','السنة الدراسية الجديدة',YEARS],['q','البحث','search']],f))+
    `<form data-form="promotion" data-from="${esc(f.year)}" data-to="${esc(f.newYear)}" class="stack gap">${table(cols,body)}${submit('ترحيل الطلبة')}</form>`;
};
forms.promotion=async(data,form)=>{
  const from=form.dataset.from,to=form.dataset.to, ids=Object.keys(data).filter(key=>key.startsWith('use!')).map(key=>key.slice(4));
  if(Number(to.slice(0,4))<=Number(from.slice(0,4)))throw new Error('السنة الجديدة يجب أن تأتي بعد السنة السابقة.');
  if(!ids.length)throw new Error('اختر الطلبة المراد ترحيلهم.');
  await update(s=>{
    for(const id of ids) {
      const student=s.students.find(x=>x.id===id&&x.year===from&&!x.archive);
      const outcome=data['result!'+id], cls=data['class!'+id], section=data['section!'+id];
      if(!student||!outcome||!cls)throw new Error('حدد النتيجة والمستوى لكل طالب مختار.');
      student.outcome=outcome;
      const newStudent={...student,id:uid(),year:to,cls,section,stream:data['stream!'+id],outcome:'',created:Date.now()};
      if(['الثاني ثانوي','الثالث ثانوي'].includes(cls)&&!newStudent.stream)throw new Error('يحتاج الترحيل لهذا المستوى تحديد التخصص في سجل الطالب الجديد.');
      validateStudent(newStudent,s);
      s.students.push(newStudent);
    }
  });
  render();flash('تم ترحيل '+ids.length+' طالب.');
};
pages['students-cases']=()=>{
  const f=filterData(route,{year:YEARS[1]}), rows=filterStudents(f), current=activeStudents();
  const results=rows.map((s,i)=>[i+1,s.reg,s.national,s.name,s.mother,s.gender,s.birth,s.cls,s.section,s.outcome||'—',current.some(x=>x.reg===s.reg)?'مسجل':'غير مسجل']);
  const page=paginate(route,results,f);
  return header('حالات الطلبة المسجلون وغير المسجلين','',f.year)+card(filterForm(route,[FILTER_YEAR,FILTER_CLASS,FILTER_SECTION,FILTER_LIMIT],f))+
    `<div class="btns gap">${btn('طباعة كشف الطلبة المنتقلين','cases-report','archive')}${btn('طباعة كشف الطلبة المستجدين','cases-report','new')}</div>${table(['#','رقم القيد','الرقم الوطني','اسم الطالب','اسم الأم','الجنس','تاريخ الميلاد','الصف','الفصل','الحالة','حالة التسجيل في '+YEAR],page.rows)}${page.tools}`;
};
actions['cases-report']=kind=>{
  const f=filterData(route,{year:YEARS[1]});
  const current=onlyYear(school().students,YEAR), previous=new Set(onlyYear(school().students,f.year).map(s=>normalized(s.reg)));
  const selected=filterStudents({...f,year:YEAR},current.filter(s=>kind==='archive'?s.archive:!s.archive&&!previous.has(normalized(s.reg))));
  showReport(kind==='archive'?'كشف الطلبة المنتقلين':'كشف الطلبة المستجدين',YEAR,['رقم القيد','اسم الطالب','الصف','الفصل','الملاحظة'],selected.map(s=>[s.reg,s.name,s.cls,s.section,s.archive?.note||'']));
};
function bookView() {
  const f=filterData('books-receipt',{cls:'السابع'}), cls=f.cls||'السابع';
  const key=yearKey(f.year,cls,f.stream);
  const defaults=gradePlan(routeForClass(cls),cls,f.stream,f.year).items.map(item=>({key:item.key,label:item.label,group:''}));
  return {f,cls,key,items:school().bookTemplates[key]||defaults,rows:filterStudents({...f,cls})};
}
pages['books-receipt']=()=>{
  const {f,items,rows}=bookView();
  const headers=['ت','اسم الطالب','حالة الطالب',...items.map(x=>[x.group,x.label].filter(Boolean).join(' / ')),'ملاحظات'];
  const body=rows.map((s,i)=>{
    const record=school().books[s.id]||{};
    return [i+1,s.name,record.status||'مسجل',...items.map(item=>raw(`<input type="checkbox" name="book!${esc(s.id)}!${esc(item.key)}" aria-label="${esc(s.name+' '+item.label)}"${record[item.key]?' checked':''}>`)),raw(`<input class="table-input" name="note!${esc(s.id)}" value="${esc(record.note)}" aria-label="ملاحظات">`)];
  });
  return header('إدارة كشف استلام الكتب المدرسية','',f.year)+card(filterForm(route,[FILTER_YEAR,FILTER_CLASS,FILTER_SECTION,['stream','التخصص',['علمي','أدبي']]],f))+
    `<form data-form="books" data-ids="${esc(rows.map(s=>s.id).join('|'))}" data-items="${esc(items.map(x=>x.key).join('|'))}" class="stack gap"><div class="btns">${submit('حفظ التعديلات')}${btn('تعديل أعمدة الكتب','book-columns')}${btn('معاينة الطباعة','books-report')}</div>${table(headers,body,{className:'grid-table'})}</form>`;
};
forms.books=async(data,form)=>{
  const ids=form.dataset.ids.split('|').filter(Boolean), items=form.dataset.items.split('|');
  await update(s=>{
    for(const id of ids) {
      const book=s.books[id] ||= {};
      for(const item of items)book[item]=Boolean(data['book!'+id+'!'+item]);
      book.note=str(data['note!'+id]);
    }
  });render();flash('حُفظ كشف الكتب.');
};
actions['books-report']=()=>{
  const {f,items,rows}=bookView();
  schoolListReport('كشف استلام الكتب المدرسية',f.year,['ت','اسم الطالب','حالة الطالب',...items.map(x=>[x.group,x.label].filter(Boolean).join(' / ')),'ملاحظات'],[{rows:rows.map((s,i)=>[i+1,s.name,school().books[s.id]?.status||'مسجل',...items.map(x=>school().books[s.id]?.[x.key]?'✓':''),school().books[s.id]?.note||''])}],{orientation:items.length>7?'أفقي':'عمودي',fontSize:12});
};
actions['book-columns']=()=>{
  const {items,key}=bookView();
  const rows=items.map((item,i)=>[
    raw(field(['name!'+item.key,'اسم المادة','text',true],item.label,{maxlength:100})),
    raw(field(['group!'+item.key,'المجموعة','text'],item.group,{maxlength:100})),
    raw(field(['order!'+item.key,'الترتيب','number',true],i+1,{min:1,max:50})),
    raw(field(['remove!'+item.key,'حذف من الكشف','checkbox']))
  ]);
  showDialog('تعديل أعمدة الكتب',`<form data-form="book-columns" data-key="${esc(key)}" class="stack">${table(['اسم المادة','المجموعة','الترتيب','حذف من الكشف'],rows)}<div class="fields">${field(['newName','إضافة مادة','text'],'',{maxlength:100})}${field(['newGroup','مجموعة المادة الجديدة','text'],'',{maxlength:100})}</div><div class="btns">${submit('حفظ الأعمدة')}<button type="submit" name="reset" class="btn soft">استعادة الافتراضي</button></div></form>`);
};
forms['book-columns']=async(data,form,event)=>{
  const {items,key}=bookView();
  if(form.dataset.key!==key)throw new Error('تغيّر الصف المحدد.');
  if(event.submitter?.name==='reset')await update(s=>{delete s.bookTemplates[key];});
  else{
    const next=items.filter(item=>!data['remove!'+item.key]).map(item=>({key:item.key,label:str(data['name!'+item.key]),group:str(data['group!'+item.key]),order:Number(data['order!'+item.key])})).sort((a,b)=>a.order-b.order).map(({order,...item})=>item);
    if(str(data.newName))next.push({key:'book-'+uid(),label:str(data.newName),group:str(data.newGroup)});
    if(!next.length||next.length>40||next.some(item=>!item.label))throw new Error('احتفظ باسم لمادة واحدة على الأقل وبحد أقصى 40 مادة.');
    await update(s=>{s.bookTemplates[key]=next;});
  }
  $('#modal').close();render();flash('حُفظت أعمدة كشف الكتب.');
};
