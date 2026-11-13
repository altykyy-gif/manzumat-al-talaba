let transferInbox=null, transferReview=null;
let transferSettings=defaultTransferSettings();

function defaultTransferSettings() {
  return {kind:'students',year:YEAR,cls:'',section:'',stream:'',replace:false,matchUnassigned:false,convertScale:false};
}
function resetTransferPage() {
  transferInbox=null;
  transferReview=null;
  transferSettings=defaultTransferSettings();
}
function currentTransferScope() {
  const {kind,year,cls,section,stream,replace,matchUnassigned,convertScale}=transferSettings;
  return {kind,year,cls,section,stream:transferScopedStream(cls)?stream:'',replace,matchUnassigned,convertScale};
}
function transferAdmin() {
  if(session?.role!=='admin')throw new Error('سجّل دخول إدارة المدرسة أولًا.');
}
function stageTransferTable(packet) {
  transferAdmin();
  const data=transferTable(packet.table);
  const source=transferText(packet.source).slice(0,110);
  const requested=transferKinds.some(([key])=>key===packet.kind)?packet.kind:transferWorkbookKind(data.headers)||transferSettings.kind;
  const context=transferSourceScope({...transferWorkbookScope(data),...packet.context});
  const sameKind=requested===transferSettings.kind;
  const cls=context.cls||(sameKind?transferSettings.cls:'');
  const scopedClass=requested==='activities'&&!CLASSES.slice(2).includes(cls)?'':cls;
  transferSettings={...transferSettings,kind:requested,year:context.year||transferSettings.year,
    cls:scopedClass,section:context.section,stream:context.stream,
    replace:false,matchUnassigned:false,convertScale:false};
  transferInbox={table:data,source,mapping:transferSuggestedMapping(data.headers,transferFields(currentTransferScope()))};
  transferReview=null;
}
Object.defineProperty(window,'talabaDataTransfer',{
  value:Object.freeze({
    open(packet){
      transferAdmin();
      if(packet)stageTransferTable(packet);
      go('data-transfer');
      return {ready:true,school:school().profile.name};
    }
  })
});
function transferScopeForm() {
  const s=transferSettings, isStudents=s.kind==='students';
  const classes=s.kind==='activities'?CLASSES.slice(2):CLASSES;
  const note=isStudents?'إذا خلا الكشف من عمود الصف، اختر الصف الدراسي هنا. يمكنك حفظ الطلاب الذين لم يُذكر جنسهم في الكشف.':
    'اختر الصف الذي رُصدت له الدرجات. إذا كان الكشف يضم عدة فصول من الصف نفسه، اترك الفصل على «جميع الفصول».';
  return `<form id="transfer-scope" class="stack"><div class="fields">${field(['kind','نوع الكشف',transferKinds],s.kind)}
    ${field(FILTER_YEAR,s.year)}${field(['cls','الصف',classes],s.cls,{blank:isStudents?'من الكشف / جميع الصفوف':'اختر الصف الدراسي'})}
    ${field(['section','الفصل',SECTIONS],s.section,{blank:isStudents?'من الكشف / جميع الفصول':'جميع الفصول'})}
    ${transferScopedStream(s.cls)?field(['stream','التخصص',['علمي','أدبي']],s.stream,{blank:isStudents?'من الكشف / جميع التخصصات':'اختر التخصص'}):''}
    </div><p class="muted small">${esc(note)}</p><div class="btns">
    ${field(['replace',isStudents?'تحديث بيانات الطلبة الموجودين':'استبدال الدرجات الموجودة','checkbox'],s.replace)}
    ${!isStudents&&s.section?field(['matchUnassigned','مطابقة الطلبة الذين لم يُحدد فصلهم','checkbox'],s.matchUnassigned):''}
    ${s.kind==='grades'?field(['convertScale','حوّل الدرجة تناسبيًا عند كتابة الدرجة الكبرى في الكشف','checkbox'],s.convertScale):''}
    </div><div class="toolbar">
    <div class="btns">${btn('تنزيل قالب Excel','transfer-template','','soft')}${btn('تصدير من المنظومة','transfer-export','','outline-green')}</div></div></form>`;
}
function transferMappingForm() {
  const {headers,rows}=transferInbox.table, fields=transferFields(currentTransferScope());
  const columns=fields.map(row=>[row.key,row.label]);
  const grades=transferSettings.kind==='grades';
  const mapping=table(['العمود في الكشف','عينة','الحقل في المنظومة'],headers.map((label,i)=>{
    const header=grades&&transferGradeHeader(label), sample=rows.find(row=>row[i])?.[i]||'—';
    const selected=fields.find(field=>field.key===transferInbox.mapping[i]);
    return [label,sample,raw(header?.total?'<span class="muted small">مجموع للعرض</span>':
      `<select name="column!${i}" data-transfer-column aria-label="${esc('مطابقة العمود '+(i+1)+' · '+label)}">${options(columns,transferInbox.mapping[i],'تجاهل العمود')}</select>`+
      (selected?.item?.max&&!selected.item.choices?'<small class="muted">الدرجة الكبرى في المنظومة <bdi>'+selected.item.max[selected.index]+'</bdi></small>':''))];
  }),{className:'transfer-table'});
  const note=grades?'<p class="muted small">طابق أعمال السنة والامتحان كلًا مع خانته. عند اختلاف الدرجة الكبرى، راجع السنة الدراسية والعمود قبل اختيار التحويل.</p>':'';
  return card(`<div class="toolbar"><p class="muted small">${rows.length} سجل · ${headers.length} عمود${transferInbox.source?' · '+esc(transferInbox.source):''}</p>
    ${btn('مسح الجدول','transfer-clear','','tiny soft')}</div>
    <form data-form="transfer-preview" class="stack">${note}${mapping}<div class="btns">${submit('معاينة الاستيراد','outline-blue')}${btn('مطابقة تلقائية','transfer-auto','','soft')}</div></form>`,'مطابقة الأعمدة');
}
function transferReviewCard() {
  if(!transferReview)return '';
  const s=transferReview.summary;
  const stat=[['إضافة',s.added],['تحديث',s.updated],['درجات للحفظ',s.grades],['سجلات بلا تغيير',s.skipped],['درجات محفوظة سابقًا',s.existingMarks],['أخطاء',s.errors]];
  const counts='<div class="transfer-counts">'+stat.map(([label,n])=>`<span><strong>${n}</strong> ${label}</span>`).join('')+'</div>';
  const rows=s.errors?s.issues:s.examples;
  const preview=table(['صف الكشف','معرّف الطالب','الاسم','النتيجة'],rows.map(row=>[
    row.line,row.id,row.name,row.message+(row.detail?' · '+row.detail:'')
  ]),{className:'transfer-table'});
  const label=s.errors?s.errors+' سجل يحتاج مراجعة.':s.added+s.updated+s.grades?'راجع التغييرات ثم اضغط حفظ.':'لا توجد تغييرات للحفظ.';
  const errors=s.errorCounts?.length?`<ul>${s.errorCounts.map(([reason,n])=>`<li>${esc(reason)} <bdi>(${n})</bdi></li>`).join('')}</ul>`:'';
  const nationalNote=s.ignoredNational?`<p class="muted small gap">${s.ignoredNational} رقم وطني محجوب أو غير مكتمل. يستخدم الاستيراد رقم القيد لهذه الصفوف.</p>`:'';
  const genderNote=s.missingGender?`<p class="muted small gap">الجنس غير مذكور في ${s.missingGender} من السجلات التي ستُحفظ. يمكنك استكماله من قائمة الطلبة.</p>`:'';
  const conversionNote=s.converted?`<p class="muted small gap">${s.converted} درجة ستُحفظ بعد التحويل التناسبي. تعرض المعاينة الدرجة المحوّلة.</p>`:'';
  const sectionNote=s.unassigned?`<p class="muted small gap">تمت مطابقة ${s.unassigned} من الطلبة الذين لم يُحدد فصلهم باستخدام المعرّف والسنة والصف.</p>`:'';
  const partial=s.errors&&s.grades&&transferReview.scope.kind!=='students';
  const ready=partial?table(['صف الكشف','معرّف الطالب','الاسم','الدرجات الجاهزة'],s.examples.filter(row=>row.detail).map(row=>
    [row.line,row.id,row.name,row.detail]),{className:'transfer-table'}):'';
  return card(counts+notice(label,s.errors?'warn':'')+errors+nationalNote+genderNote+conversionNote+sectionNote+preview+
    (rows.length<(s.errors?s.errors:s.total)?'<p class="muted small gap">يعرض الجدول أول '+rows.length+' سجل.</p>':'')+
    (partial?'<div class="gap">'+ready+btn('حفظ '+s.grades+' درجة في السجلات السليمة','transfer-apply','valid','green')+'</div>':'')+
    (!s.errors&&s.added+s.updated+s.grades?`<div class="btns gap">${btn('حفظ الاستيراد','transfer-apply','','green')}</div>`:''),'معاينة قبل الحفظ');
}
pages['data-transfer']=()=>{
  transferAdmin();
  const extensionLink=document.body.dataset.publicDemo==='true'?'<a class="btn soft" href="./Talaba-Chrome-Extension.zip" download>تنزيل إضافة كروم</a>':'';
  return header('نقل البيانات من SRS','',transferSettings.year)+`<div class="stack">
    ${card(`<p class="muted">أرسل الجدول من إضافة كروم أو اختر ملف Excel أو CSV.</p>
    <form data-form="transfer-file" class="btns">${field(['file','ملف الكشف','file',true],'',{accept:'.xlsx,.csv,.tsv'})}${submit('فتح الكشف','outline-blue')}${extensionLink}</form>`,'مصدر الكشف')}
    ${card(transferScopeForm(),'بيانات المدرسة المستقبلة · '+school().profile.name)}
    ${transferInbox?transferMappingForm():''}${transferReviewCard()}
  </div>`;
};
function transferRefresh(control) {
  render();
  if(control)document.querySelector('#transfer-scope [name="'+CSS.escape(control)+'"]')?.focus({preventScroll:true});
}
document.addEventListener('change',event=>{
  const control=event.target;
  if(route!=='data-transfer')return;
  if(control.matches('[data-transfer-column]')){
    transferInbox.mapping[Number(control.name.split('!')[1])]=control.value;
    transferReview=null;
    transferRefresh();
    document.querySelector('[name="'+CSS.escape(control.name)+'"]')?.focus({preventScroll:true});
  }
  if(!control.closest('#transfer-scope'))return;
  const values=Object.fromEntries(new FormData(control.form));
  transferSettings={...transferSettings,...values,replace:Boolean(values.replace),
    matchUnassigned:Boolean(values.matchUnassigned),convertScale:Boolean(values.convertScale)};
  if(transferSettings.kind==='activities'&&!CLASSES.slice(2).includes(transferSettings.cls))transferSettings.cls='';
  if(transferInbox&&['kind','cls','stream'].includes(control.name))
    transferInbox.mapping=transferSuggestedMapping(transferInbox.table.headers,transferFields(currentTransferScope()));
  if(transferInbox&&control.name==='year'){
    const keys=new Set(transferFields(currentTransferScope()).map(field=>field.key));
    transferInbox.mapping=transferInbox.mapping.map(key=>keys.has(key)?key:'');
  }
  transferReview=null;
  transferRefresh(control.name);
});
forms['transfer-file']=async(data,form)=>{
  transferAdmin();
  const file=data.file, startSchool=activeSchoolId, startRole=session.role;
  const extension=file?.name.toLowerCase().split('.').at(-1);
  let tableData;
  if(extension==='xlsx'){
    const [headers,...rows]=await readExcel(file);
    tableData={headers,rows};
  }else if(['csv','tsv'].includes(extension)&&file.size>0&&file.size<=7_500_000){
    const bytes=new Uint8Array(await file.arrayBuffer());
    let text;
    if(bytes[0]===255&&bytes[1]===254)text=new TextDecoder('utf-16le').decode(bytes);
    else if(bytes[0]===254&&bytes[1]===255)text=new TextDecoder('utf-16be').decode(bytes);
    else try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
    catch{text=new TextDecoder('windows-1256').decode(bytes);}
    tableData=transferDelimited(text,extension);
  }else throw new Error('اختر ملف XLSX أو CSV أو TSV صالحًا.');
  if(!form.isConnected||route!=='data-transfer'||activeSchoolId!==startSchool||session?.role!==startRole)return;
  stageTransferTable({table:tableData,source:file.name});
  render();
};
actions['transfer-clear']=()=>{
  transferInbox=null;transferReview=null;render();
};
actions['transfer-auto']=()=>{
  if(!transferInbox)return;
  transferInbox.mapping=transferSuggestedMapping(transferInbox.table.headers,transferFields(currentTransferScope()));
  transferReview=null;render();
};
function localTransferPlan(root,id,tableData,scope) {
  const pending=new Set(root.transfers.filter(row=>row.from===id&&row.status==='pending').map(row=>row.student));
  return prepareDataTransfer(root.schools[id],tableData,scope,pending);
}
forms['transfer-preview']=async(_data,form)=>{
  transferAdmin();
  const inbox=transferInbox;
  if(!inbox)return;
  const tableData=inbox.table, scope={...currentTransferScope(),mapping:[...inbox.mapping]}, schoolId=activeSchoolId;
  const review=sharedMode?await sharedAPI('/api/data-transfer',{action:'preview',school:schoolId,table:tableData,scope}):
    localTransferPlan(await dbState(),schoolId,tableData,scope);
  if(!form.isConnected||inbox!==transferInbox||schoolId!==activeSchoolId||session?.role!=='admin')return;
  transferReview={...review,table:tableData,scope,schoolId};
  render();
};
actions['transfer-apply']=async mode=>{
  transferAdmin();
  const review=transferReview;
  if(!review||review.schoolId!==activeSchoolId)throw new Error('أعد معاينة الكشف قبل الحفظ.');
  const validOnly=mode==='valid';
  let result;
  try{
    if(sharedMode)result=await sharedAPI('/api/data-transfer',{action:'apply',school:review.schoolId,table:review.table,scope:review.scope,revision:review.revision,validOnly});
    else await updateLocalSchool(review.schoolId,(s,root)=>{
      const current=localTransferPlan(root,review.schoolId,review.table,review.scope);
      if(JSON.stringify(current.changes)!==JSON.stringify(review.changes)||JSON.stringify(current.summary)!==JSON.stringify(review.summary))
        throw new Error('تغيّرت بيانات المدرسة منذ المعاينة. أعد المعاينة قبل الحفظ.');
      applyDataTransfer(s,current,uid,validOnly);
      result=current;
    });
  }catch(error){
    if(transferReview===review){transferReview=null;render();}
    throw error;
  }
  const {added,updated,grades,errors}=result.summary;
  if(transferReview===review){transferReview=null;if(!errors)transferInbox=null;render();}
  flash('تم الحفظ · '+added+' طالب جديد · '+updated+' سجل محدث · '+grades+' درجة'+(errors?' · '+errors+' سجل ينتظر المراجعة.':'.'));
};
actions['transfer-template']=()=>{
  transferAdmin();
  const scope=currentTransferScope();
  transferScope(scope);
  downloadExcel('قالب '+transferKinds.find(([key])=>key===scope.kind)[1],transferFields(scope).map(field=>field.label),[]);
};
actions['transfer-export']=async()=>{
  transferAdmin();
  const schoolId=activeSchoolId, scope=currentTransferScope();
  const data=sharedMode?await sharedAPI('/api/data-transfer',{action:'export',school:schoolId,scope}):
    exportDataTransfer((await dbState()).schools[schoolId],scope);
  if(route!=='data-transfer'||schoolId!==activeSchoolId||session?.role!=='admin')return;
  if(!data.rows.length)throw new Error('لا توجد سجلات ضمن الاختيارات.');
  downloadExcel('كشف '+transferKinds.find(([key])=>key===scope.kind)[1]+' '+scope.year,data.headers,data.rows);
};
