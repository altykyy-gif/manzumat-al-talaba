const VERTICAL_SORT=[['section_name','الفصل + اسم الطالب (أبجدي)'],['name','اسم الطالب (أبجدي)'],['roll','رقم القيد'],['gender','حسب الجنس (ذكور / إناث)'],['alpha_arabic','الترتيب الأبجدي']];
const verticalPending=new Map();
let verticalSaveQueue=Promise.resolve();
function verticalTypes(source,plan) {
  if(plan.components.length===4)return [
    ['w1',plan.components[0],[0]],['e1',plan.components[1],[1]],['we1',plan.components[0]+' + '+plan.components[1],[0,1]],
    ['w2',plan.components[2],[2]],['e2',plan.components[3],[3]],['we2',plan.components[2]+' + '+plan.components[3],[2,3]]
  ];
  return plan.components.map((label,i)=>['p'+(i+1),source==='student-grades-third-secondary'?label.replace(' -','-'):label,[i]]);
}
function verticalSubjectLabel(source,subject) {
  if(source==='student-grades-ninth'&&subject.key==='i')return 'التربية الاسلامية';
  if(source==='student-grades-ninth'&&subject.key==='e')return 'اللغة الانجليزية';
  if(subject.key==='b')return 'الاحياء';
  return subject.label;
}
function verticalView() {
  const page='vertical-grades';
  const f=filterData(page,{cls:'الأول',stream:'علمي',subject:'',type:'',limit:'10',sort:'section_name'});
  const source=routeForClass(f.cls), stream=['الثاني ثانوي','الثالث ثانوي'].includes(f.cls)?f.stream||'علمي':'';
  const plan=gradePlan(source,f.cls,stream,f.year), types=verticalTypes(source,plan);
  const type=types.find(([key])=>key===f.type)||types[0], item=plan.items.find(x=>x.key===f.subject);
  const rows=item?activeStudents(f.year).filter(x=>x.cls===f.cls&&(!stream||x.stream===stream)&&finds(x.name,f.q)):[];
  const compare=(a,b)=>{
    if(f.sort==='roll')return localeCompare(a.reg,b.reg);
    if(f.sort==='gender')return Number(a.gender==='أنثى')-Number(b.gender==='أنثى')||localeCompare(a.name,b.name);
    if(f.sort==='name'||f.sort==='alpha_arabic')return localeCompare(a.name,b.name);
    return localeCompare(a.section,b.section)||localeCompare(a.name,b.name);
  };
  rows.sort((a,b)=>(f.dir==='تنازلي'?-1:1)*compare(a,b));
  return {f,source,stream,plan,types,type,item,rows};
}
function verticalFilters(view) {
  const {f,stream,source,plan,types,type}=view;
  return `<form class="vertical-filters" data-form="vertical-filter">
    ${field(FILTER_YEAR,f.year)}${field(['cls','الصف',CLASSES.slice(2)],f.cls)}
    ${stream?field(['stream','التخصص',['علمي','أدبي']],stream):''}
    ${field(['subject','المادة',plan.items.map(item=>[item.key,verticalSubjectLabel(source,item)])],f.subject,{blank:'اختار ماده'})}
    ${field(['type','نوع الرصد',types.map(([id,label])=>[id,label])],type[0])}
    ${field(['limit','عدد الطلاب:',['10','50','100','200']],f.limit)}
    ${field(['sort','طريقة الترتيب',VERTICAL_SORT],f.sort)}
    ${field(['dir','الاتجاه',['تصاعدي','تنازلي']],f.dir)}
    <button class="sr-only" type="submit">عرض</button>
  </form>`;
}
function verticalCell(s,view,index) {
  const {source,item,plan}=view, key=gradeKey(source,item.key,index);
  const saved=school().grades[s.id]?.[key]??'', pending=verticalPending.get(draftKey(s.id,key));
  const value=pending?.value??saved;
  return raw(`<input type="text" class="table-input vertical-mark" inputmode="decimal" autocomplete="off" maxlength="10"
    aria-label="${esc(s.name+' · '+plan.components[index])}" data-vertical-mark data-student="${esc(s.id)}"
    data-key="${esc(key)}" data-max="${item.max[index]}" data-saved="${esc(saved)}" value="${esc(value)}">`);
}
function verticalTable(view,paging) {
  const {f,item,type,rows,plan}=view;
  const search=`<form data-form="vertical-search" role="search" class="vertical-search">${field(['q','بحث باسم الطالب:','search'],f.q,{placeholder:'اكتب الاسم الأول أو جزء من الاسم...'})}</form>`;
  if(!item)return notice('اختر مادة لعرض جدول الرصد.');
  const indexes=type[2];
  const headers=['#','رقم القيد','اسم الطالب',...indexes.map(i=>raw(esc(plan.components[i])+'<small>الدرجة الكبرى: '+item.max[i]+'</small>'))];
  const body=paging.rows.map((s,n)=>[paging.offset+n+1,s.reg,s.name,...indexes.map(i=>verticalCell(s,view,i))]);
  const count=Math.max(1,Math.ceil(rows.length/Number(f.limit))), page=Math.min(count,Math.max(1,Number(f.page)||1));
  const start=Math.max(1,Math.min(page-3,count-6)), end=Math.min(count,start+6);
  const controls=Array.from({length:end-start+1},(_,i)=>i+start).map(n=>`<button type="button" class="btn tiny ${n===page?'':'outline-blue'}" data-action="page" data-value="vertical-grades|${n}"${n===page?' aria-current="page"':''}>${n}</button>`).join('');
  return `${search}${table(headers,body,{className:'table-dark vertical-table',name:'جدول الرصد العمودي'})}
    <div class="toolbar vertical-bottom"><div class="btns">${controls}</div><span class="small muted" id="vertical-status" role="status"></span></div>`;
}
pages['vertical-grades']=()=>{
  const view=verticalView(), paging=paginate(route,view.rows,view.f);
  const panel=`<section class="card vertical-register"><div class="card-header toolbar"><h3>${icon('table')} جدول الرصد</h3><small>السجلات: ${view.rows.length}</small></div><div class="pad">${verticalTable(view,paging)}</div></section>`;
  return header('الرصد العمودي للدرجات','','')+`<section class="card vertical-filter-card"><div class="card-header"><h3>${icon('filter')} الفلاتر</h3></div><div class="pad">${verticalFilters(view)}</div></section>`+panel;
};
forms['vertical-filter']=(data,form)=>{
  const previous=verticalView().f;
  const reset=data.cls!==previous.cls||data.stream&&data.stream!==previous.stream;
  filters['vertical-grades']={...previous,...data,page:1,...(reset?{subject:'',type:'',q:''}:{})};
  render();
  const active=form.dataset.control;
  if(active)$(`.vertical-filters [name="${CSS.escape(active)}"]`)?.focus({preventScroll:true});
};
forms['vertical-search']=data=>{
  filters['vertical-grades']={...filters['vertical-grades'],q:data.q,page:1};
  render();
  const search=$('.vertical-search input');
  search?.focus({preventScroll:true});
  if(search)search.setSelectionRange(search.value.length,search.value.length);
};
let verticalSearchTimer;
document.addEventListener('input',event=>{
  if(!event.target.matches('.vertical-search input'))return;
  const input=event.target;
  clearTimeout(verticalSearchTimer);
  verticalSearchTimer=setTimeout(()=>{if(route==='vertical-grades'&&input.isConnected)forms['vertical-search']({q:input.value});},260);
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.matches('.vertical-filters select')){
    el.form.dataset.control=el.name;
    el.form.requestSubmit();
  }
  if(el.matches('[data-vertical-mark]'))queueVerticalSave(el);
});
document.addEventListener('keydown',event=>{
  const el=event.target;
  if(!el.matches('[data-vertical-mark]')||!['Enter','ArrowDown','ArrowUp'].includes(event.key))return;
  event.preventDefault();
  const row=el.closest('tr'), column=el.closest('td').cellIndex;
  const next=event.key==='ArrowUp'?row.previousElementSibling:row.nextElementSibling;
  queueVerticalSave(el);
  const target=next?.cells[column]?.querySelector('input');
  if(target){target.focus();target.select();}
  else if(event.key==='Enter')el.blur();
});
function queueVerticalSave(el) {
  const {student,key,saved}=el.dataset, schoolId=activeSchoolId, entryKey=draftKey(student,key);
  const prior=verticalPending.get(entryKey);
  const value=el.value;
  if(prior?.value===value||!prior&&value===saved)return;
  const [source,subject,indexText]=key.split('|'), index=Number(indexText);
  const snapshot=school().students.find(row=>row.id===student);
  const item=snapshot&&gradePlan(source,snapshot.cls,snapshot.stream,snapshot.year).items.find(row=>row.key===subject);
  if(!item)return;
  try{validatedGrade(value,item,index);}
  catch(error){el.setAttribute('aria-invalid','true');el.dataset.saveState='error';flash(error.message,'error');return;}
  el.removeAttribute('aria-invalid');
  el.dataset.saveState='saving';
  const entry={value};
  verticalPending.set(entryKey,entry);
  verticalSaveQueue=verticalSaveQueue.then(async()=>{
    if(verticalPending.get(entryKey)!==entry)return;
    if(!session||activeSchoolId!==schoolId){verticalPending.delete(entryKey);return;}
    const before=school().grades[student]?.[key]??'';
    let mark;
    if(sharedMode){
      const reply=await sharedAPI('/api/vertical-mark',{school:schoolId,student,source,subject,index,value,before});
      mark=reply.mark;
      if(activeSchoolId===schoolId&&route==='vertical-grades'&&reply.revision>=sharedRevision){
        sharedRevision=reply.revision;
        const record=school().grades[student] ||= {};
        if(mark===null)delete record[key];else record[key]=mark;
      }
    }else{
      await dbState(root=>{
        const s=root.schools[schoolId];
        const current=s.grades[student]?.[key]??'';
        if(String(current)!==String(before)&&String(current)!==String(value))throw new Error('تغيّرت الدرجة من تبويب آخر. حدّث الصفحة ثم أعد المحاولة.');
        mark=setGradeMark(s,s.students.find(row=>row.id===student),source,subject,index,value);
      }).then(next=>{state=next;});
      announceLocalChange();
    }
    if(verticalPending.get(entryKey)!==entry)return;
    verticalPending.delete(entryKey);
    if(route!=='vertical-grades'||activeSchoolId!==schoolId)return;
    const field=$$('[data-vertical-mark]').find(x=>x.dataset.student===student&&x.dataset.key===key);
    if(field){
      field.dataset.saved=String(mark??'');
      if(field.value===value||document.activeElement!==field)field.value=String(mark??'');
      field.dataset.saveState='saved';
    }
    if($('#vertical-status'))$('#vertical-status').textContent='حُفظت الدرجة';
  }).catch(async error=>{
    if(verticalPending.get(entryKey)!==entry)return;
    verticalPending.delete(entryKey);
    if(route==='vertical-grades'&&activeSchoolId===schoolId){
      if(sharedMode&&error.status===409){await refreshShared().catch(()=>{});render();}
      const field=$$('[data-vertical-mark]').find(x=>x.dataset.student===student&&x.dataset.key===key);
      if(field)field.dataset.saveState='error';
      flash(error.message||'تعذر حفظ الدرجة.','error');
    }
  });
}
