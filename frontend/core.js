'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const str = value => String(value ?? '').trim();
const digits = value => str(value).replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)%16));
const uid = () => [...crypto.getRandomValues(new Uint8Array(12))].map(n=>n.toString(16).padStart(2,'0')).join('');
const shiftDate = (date,n) => {const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return dayISO(d);};
const raw = value => ({html:value});
const display = value => value&&typeof value==='object'&&Object.hasOwn(value,'html')?value.html:esc(value);
const sum = values => values.reduce((a,b)=>a+Number(b||0),0);
const localeCompare = (a,b) => str(a).localeCompare(str(b),'ar',{numeric:true});
const money = value => (Number(value||0)/1000).toFixed(3);
const normalized = value => digits(value).toLowerCase().replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/[\u064b-\u065fـ]/g,'');
const finds = (value,query) => normalized(value).includes(normalized(query));
const content = $('#app');
const forms = {}, actions = {}, pages = {}, filters = {};
let state, session, route='home', activeSchoolId='sample', preview, timer, database, temporary=false;
const localChanges=typeof BroadcastChannel==='function'?new BroadcastChannel('ahmad-school-changes'):null;
const announceLocalChange=()=>localChanges?.postMessage('updated');
if(localChanges)localChanges.onmessage=async()=>{
  if(sharedMode||!database||!state)return;
  try{state=await dbState();}catch{}
};

function requestDatabase() {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('ahmad-school-demo',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('data');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('أغلق التبويبات الأخرى لفتح بيانات التجربة.'));
  });
}
function dbState(mutation) {
  if(!database) {
    const copy=structuredClone(state||makeDemo());
    mutation?.(copy);
    return Promise.resolve(copy);
  }
  return new Promise((resolve,reject)=>{
    const transaction=database.transaction('data',mutation?'readwrite':'readonly');
    const store=transaction.objectStore('data'), request=store.get('school');
    let next, error;
    request.onsuccess=()=>{
      try {
        next=request.result?migrateState(request.result):makeDemo();
        if(mutation) {
          mutation(next);
          store.put(next,'school');
        }
      } catch(e) {
        error=e;
        transaction.abort();
      }
    };
    transaction.oncomplete=()=>resolve(next);
    transaction.onabort=()=>reject(error||transaction.error||new Error('تعذر حفظ التغييرات محليًا.'));
  });
}
const school = () => state.schools[activeSchoolId]||state.schools.sample;
async function update(mutate) {
  if(sharedMode)return updateShared(mutate);
  const id=activeSchoolId;
  state=await dbState(root=>mutate(root.schools[id],root));
  announceLocalChange();
}
function storeSession() {
  try { sessionStorage.setItem('ahmad-session',JSON.stringify({session,activeSchoolId})); } catch {}
}
function loadSession() {
  try {
    const prior=JSON.parse(sessionStorage.getItem('ahmad-session')||'{}');
    if(state.schools[prior.activeSchoolId]) {
      activeSchoolId=prior.activeSchoolId;
      session=prior.session;
    }
  } catch {}
}
function onlyYear(rows,year) { return rows.filter(row=>row.year===year); }
function activeStudents(year=YEAR) { return onlyYear(school().students,year).filter(s=>!s.archive); }
function lookup(collection,id) {
  const found=school()[collection].find(record=>record.id===id);
  if(!found) throw new Error('تعذر العثور على السجل.');
  return found;
}
function btn(label,action,value='',style='soft',type='button') {
  return `<button type="${type}" class="btn ${style}"${action?' data-action="'+esc(action)+'" data-value="'+esc(value)+'"':''}>${esc(label)}</button>`;
}
function link(label,path,style='') {
  return `<a ${style?'class="btn '+style+'"':''} href="#${esc(path)}"${route===path?' aria-current="page"':''}>${esc(label)}</a>`;
}
function options(items,value,blank) {
  return (blank!==undefined?`<option value="">${esc(blank)}</option>`:'')+items.map(item=>{
    const [key,label]=Array.isArray(item)?item:[item,item];
    return `<option value="${esc(key)}"${String(key)===String(value??'')?' selected':''}>${esc(label)}</option>`;
  }).join('');
}
function field([name,label,type='text',required=false],value='',attrs={}) {
  const {blank,...other}=attrs;
  const attr = Object.entries(other).map(([k,v])=>` ${k}="${esc(v)}"`).join('');
  if(type==='checkbox') return `<label class="check"><input type="checkbox" name="${esc(name)}"${value?' checked':''}${attr}>${esc(label)}</label>`;
  const base = ` name="${esc(name)}"${required?' required':''}${attr}`;
  let input;
  if(Array.isArray(type)) input=`<select${base}>${options(type,value,blank)}</select>`;
  else if(type==='textarea') input=`<textarea${base}>${esc(value)}</textarea>`;
  else input=`<input type="${esc(type)}"${base}${type==='file'?'':' value="'+esc(value)+'"'}>`;
  return `<label class="field"><span>${esc(label)}${required?'<span class="required"> *</span>':''}</span>${input}</label>`;
}
function formFields(defs,data={}) {
  return defs.map(def=>{
    const [key,,type,required]=def;
    let value=data[key]??'';
    if(key==='year'&&!value)value=YEAR;
    if(key==='nation'&&!value)value='ليبيا';
    const attrs = Array.isArray(type)&&key!=='year'?{blank:required?'اختار':'—'}:{};
    if(['reg','national','phone','financial'].includes(key))attrs.inputmode='numeric';
    if(type==='number')attrs.min=0;
    return field(def,value,attrs);
  }).join('');
}
function submit(label,style='green') { return btn(label,'','',style,'submit'); }
function card(body,title='') {
  return `<section class="card">${title?'<div class="card-header"><h3>'+esc(title)+'</h3></div>':''}<div class="pad">${body}</div></section>`;
}
function table(headers,rows,opts={}) {
  const {name='الكشف',sticky=false,className=''}=opts;
  const head='<tr>'+headers.map(h=>'<th scope="col">'+display(h)+'</th>').join('')+'</tr>';
  const body=rows.length?rows.map(row=>'<tr>'+row.map(value=>'<td>'+display(value)+'</td>').join('')+'</tr>').join(''):`<tr><td class="empty" colspan="${headers.length}">لا توجد سجلات مطابقة</td></tr>`;
  return `<div class="table-box ${sticky?'sticky':''}"><table class="${className}" aria-label="${esc(name)}"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}
function notice(text,style='') {return `<div class="notice ${style}">${esc(text)}</div>`;}
function flash(text,style='ok') {
  const target=($('#modal').open&&$('#modal-status'))||$('#flash');
  target.className='notice '+style;
  target.textContent=text;
  target.hidden=false;
  clearTimeout(timer);
  timer=setTimeout(()=>{target.hidden=true;},5000);
}
function header(title,caption='',year=YEAR) {
  const symbol=SCREEN_ICONS[route];
  return `<header class="page-heading"><div class="heading-main"><h1 tabindex="-1">${symbol?icon(symbol):''}${esc(title)}${caption?'<small>'+esc(caption)+'</small>':''}</h1></div>${year?'<span class="year">السنة الدراسية <bdi>'+esc(year)+'</bdi></span>':''}</header>`;
}
function wordmark() {return '<div class="wordmark"><span class="emblem" aria-hidden="true">▤</span><div><strong>منظومة الطلبة</strong><small>شؤون الطلبة والامتحانات</small></div></div>';}
function returnHome() {return '<p class="sample-footer center">'+link('الصفحة الرئيسية','home')+' · '+link('بيانات التجربة','privacy')+'</p>';}
function showDialog(title,body,className='') {
  const dialog=$('#modal');
  if(dialog.open)dialog.close();
  dialog.className=className;
  dialog.innerHTML=`<header class="modal-title"><h2 id="modal-heading">${esc(title)}</h2>${btn('إغلاق','close','','tiny soft')}</header><div class="modal-body"><div id="modal-status" role="status" aria-live="polite" hidden></div>${body}</div>`;
  dialog.setAttribute('aria-labelledby','modal-heading');
  dialog.showModal();
}
function resultError(message='لم يتم العثور على الطالب') {
  const dialog=$('#modal');
  if(dialog.open)dialog.close();
  dialog.className='lookup-error';
  dialog.innerHTML=`<span class="error-mark" aria-hidden="true">×</span><h2 id="modal-heading">${esc(message)}</h2>${btn('حسناً','close','','')}`;
  dialog.setAttribute('aria-labelledby','modal-heading');
  dialog.showModal();
}
function downloadBlob(blob,filename) {
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download=filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function downloadExcel(title,headers,rows) {downloadBlob(excelFile([headers,...rows]),title+'.xlsx');}
function reportMarkup(title,year,body,schoolName,settings={}) {
  const classes=['document',settings.shading?'print-shaded':'',settings.twoColumns?'print-two':''].filter(Boolean).join(' ');
  const fontSize=Number(settings.fontSize)||13;
  const font=settings.font==='واضح'?'Arial, sans-serif':settings.font==='تقليدي'?'Georgia, serif':'inherit';
  return `<article class="${classes}" style="--report-font-size:${fontSize}px;--report-font:${font};--report-align:${settings.align==='وسط'?'center':'start'};--report-weight:${settings.bold?700:400}" dir="rtl"><header class="document-head"><strong>${esc(schoolName)}</strong><p>منظومة الطلبة · ${sharedMode&&!sharedDemo?'كشف إداري':'كشف تجريبي'}</p><h2>${esc(title)}</h2><p>السنة الدراسية <bdi>${esc(year)}</bdi> · <bdi>${esc(dayISO())}</bdi></p></header>${body}<div class="signatures"><span>إعداد الكشف</span><span>المراجعة</span><span>اعتماد الإدارة</span></div></article>`;
}
function showReport(title,year,headers,rows,extra='',schoolName=school().profile.name,settings={}) {
  const size=Number(settings.rowsPerPage)||rows.length||1;
  const chunks=Array.from({length:Math.max(1,Math.ceil(rows.length/size))},(_,i)=>{
    const body=rows.slice(i*size,(i+1)*size);
    if(!settings.twoColumns)return table(headers,body,{name:title});
    const mid=Math.ceil(body.length/2);
    return '<div class="print-columns">'+table(headers,body.slice(0,mid),{name:title})+table(headers,body.slice(mid),{name:title})+'</div>';
  });
  const markup=chunks.map((chunk,i)=>reportMarkup(title,year,(i===0?extra:'')+chunk,schoolName,settings)).join('');
  showDocument(title,headers,rows,markup,settings.orientation);
}
function showDocument(title,headers,rows,markup,orientation,reflow=null,{margin,fixed=false,paperSize='A4'}={}) {
  const direction=orientation||(headers.length>9?'أفقي':'عمودي');
  const framed=markup.includes('class="school-paper');
  preview={title,headers,rows,markup,margin:margin??(framed?0:12),reflow,direction,paperSize:paperSize==='A3'?'A3':'A4'};
  const selector=fixed||framed&&!reflow?'':field(['orientation','الاتجاه',['عمودي','أفقي']],direction);
  const sheet=preview.paperSize==='A3'?'<span class="key" dir="ltr">A3</span>':'';
  showDialog('معاينة الطباعة',`<div class="btns paper-toolbar">${btn('طباعة','print','','green')}${headers.length?btn('تنزيل Excel','export-report'):''}${selector}${sheet}</div><div class="paper-preview" data-orientation="${direction==='أفقي'?'landscape':'portrait'}">${markup}</div>`,'report');
  $('#modal').scrollTop=0;
}
actions.print=()=>{
  if(!preview)return;
  const direction=preview.direction==='أفقي'?'landscape':'portrait';
  $('#print-size').textContent=`@page { size:${preview.paperSize} ${direction}; margin:${preview.margin}mm }`;
  const output=$('#print-area');
  output.dataset.orientation=direction;
  output.innerHTML=preview.markup;
  window.print();
};
document.addEventListener('change',event=>{
  if(!event.target.matches('#modal select[name=orientation]')||!preview)return;
  const paper=$('.paper-preview');
  preview.direction=event.target.value;
  paper.dataset.orientation=preview.direction==='أفقي'?'landscape':'portrait';
  if(preview.reflow){
    preview.markup=preview.reflow(preview.direction);
    paper.innerHTML=preview.markup;
  }
});
actions['export-report']=()=>{
  if(!preview)return;
  downloadExcel(preview.title,preview.headers,preview.rows);
};
actions.close=()=>$('#modal').close();
$('#modal').addEventListener('close',()=>{
  if($('#modal').open)return;
  preview=null;
  $('#modal').innerHTML='';
  $('#print-area').replaceChildren();
});

function filterData(page,defaults={}) {return {year:YEAR,cls:'',section:'',q:'',limit:'20',sort:'الفصل والاسم',dir:'تصاعدي',page:1,...defaults,...filters[page]};}
function filterForm(page,defs,f) {
  return `<form data-form="filter" data-page="${esc(page)}" class="fields tight">${defs.map(([name,label,type])=>field([name,label,type],f[name],Array.isArray(type)&&['cls','section','stream','status','shift','subject','job'].includes(name)?{blank:'الكل'}:{})).join('')}<div class="field"><span>تطبيق الاختيارات</span>${submit('عرض','')}</div></form>`;
}
const FILTER_YEAR=['year','السنة الدراسية',YEARS], FILTER_CLASS=['cls','اختر الصف',CLASSES], FILTER_SECTION=['section','الفصل',SECTIONS], FILTER_LIMIT=['limit','عدد الصفوف',['10','20','25','50','100','200']];
function filterStudents(f,rows=activeStudents(f.year)) {
  const result=rows.filter(s=>(!f.cls||s.cls===f.cls)&&(!f.section||s.section===f.section)&&(!f.stream||s.stream===f.stream)&&finds([s.reg,s.national,s.name,s.mother,s.phone].join(' '),f.q));
  return result.sort((a,b)=>{
    const cmp=f.sort==='رقم القيد'?localeCompare(a.reg,b.reg):f.sort==='اسم الطالب'?localeCompare(a.name,b.name):
      f.sort==='الصف'?CLASSES.indexOf(a.cls)-CLASSES.indexOf(b.cls)||localeCompare(a.name,b.name):
      f.sort==='الافتراضي'?b.created-a.created:localeCompare(a.section,b.section)||localeCompare(a.name,b.name);
    return (f.dir==='تنازلي'?-1:1)*cmp;
  });
}
function paginate(page,rows,f) {
  const limit=Number(f.limit)||20, max=Math.max(1,Math.ceil(rows.length/limit)), n=Math.max(1,Math.min(max,Number(f.page)||1));
  const offset=(n-1)*limit;
  return {rows:rows.slice(offset,n*limit),offset,tools:`<div class="pager"><span class="muted small">${rows.length} سجل · الصفحة ${n} من ${max}</span><div class="btns">${n>1?btn('السابق','page',page+'|'+(n-1),'tiny soft'):''}${n<max?btn('التالي','page',page+'|'+(n+1),'tiny soft'):''}</div></div>`};
}
forms.filter=(data,form)=>{
  const page=form.dataset.page;
  filters[page]={...filters[page],...data,page:1};
  render();
};
actions.page=value=>{
  const [page,n]=value.split('|');
  filters[page]={...filters[page],page:Number(n)};
  render();
};

const ICONS={
  dashboard:0xf3fd,add:0xf234,people:0xf0c0,cap:0xf19d,check:0xf4fc,up:0xf062,door:0xf52b,
  calendar:0xf073,coins:0xf51e,chart:0xf201,group:0xe533,children:0xe4e1,teacher:0xf51c,
  canteen:0xf788,chat:0xf086,users:0xf509,week:0xf784,profile:0xf4fe,power:0xf011,
  date:0xf133,clock:0xf017,sun:0xf185,user:0xf007,excel:0xf1c3,edit:0xf044,remove:0xf1f8,
  list:0xf0ca,print:0xf02f,transfer:0xf362,book:0xf02d,archive:0xf187,search:0xf002,certificate:0xf5a2,
  stream:0xf550,filter:0xf0b0,table:0xf0ce,key:0xf084,eye:0xf06e,eyeOff:0xf070,enter:0xf2f6,shield:0xf3ed,id:0xf2c2,lock:0xf023
};
const SCREEN_ICONS={'all-student':'people','add-student':'add','transferred-students':'archive','inter-school-transfers':'transfer','students-hall':'door',attendance:'check','vertical-grades':'stream'};
const MENU_ICONS=['dashboard','add','people','cap','check','up','door','calendar','coins','chart','group','children','teacher','canteen','chat','users','week','profile'];
function icon(key) {return `<i class="site-icon" aria-hidden="true">&#${ICONS[key]||ICONS.list};</i>`;}
function tabs(page,key,items,body) {
  return `<section class="card panel-card"><div class="panel-tabs" aria-label="خيارات الصفحة">${items.map(([id,label])=>`<button type="button" class="panel-tab${id===key?' active':''}" aria-pressed="${id===key}" data-action="panel" data-value="${esc(page+'|'+id)}">${esc(label)}</button>`).join('')}</div><div class="pad panel-body">${body}</div></section>`;
}
actions.panel=value=>{
  const [page,panel]=value.split('|');
  filters[page]={...filters[page],panel};
  render();
  $(`.panel-tab[data-value="${CSS.escape(value)}"]`)?.focus({preventScroll:true});
};

function adminNav() {
  const links=MENU.map(([title,,items],index)=>{
    const label=icon(MENU_ICONS[index])+esc(title);
    if(typeof items==='string')return canAccess(items)?`<a href="#${items}"${route===items?' aria-current="page"':''}>${label}</a>`:'';
    const allowed=items.filter(([id])=>canAccess(id));
    return allowed.length?`<details><summary>${label}</summary><div class="dropdown">${allowed.map(([id,text])=>`<a href="#${id}"${route===id?' aria-current="page"':''}>${icon(SCREEN_ICONS[id]||MENU_ICONS[index])}${esc(text)}</a>`).join('')}</div></details>`:'';
  });
  return `<nav class="admin-nav" aria-label="قوائم الإدارة"><div class="nav-frame">${btn('☰ القائمة','mobile','','mobile-nav outline-light')}<div class="admin-links"><div class="nav-row">${links.slice(0,10).join('')}</div><div class="nav-row">${links.slice(10).join('')}</div></div><div class="btns nav-session">${sharedMode?btn('تحديث','refresh-shared','','tiny outline-light'):''}<button type="button" class="btn outline-light logout" data-action="logout">${icon('power')}خروج</button></div></div></nav>`;
}
actions.mobile=(_value,button)=>{
  const open=$('.admin-links').classList.toggle('open');
  button.setAttribute('aria-expanded',String(open));
};
actions.logout=async()=>{
  if(sharedMode)await logoutShared();
  else {publicMatches=[];publicProof=null;publicPage='';resetTeacher();staffPortalRecord=null;staffPortalProof=null;canteenSession='';gradeDraft.clear();}
  session=null;
  gradeSelected.clear();
  if(!sharedMode)storeSession();
  go('home');
};
function go(page) {
  if(location.hash==='#'+page)render();
  else location.hash=page;
}
const HOME_ANCHORS=['about','features','pages','how','contact'];
function render() {
  if(!state)return;
  const hash=location.hash.slice(1)||'home';
  const next=HOME_ANCHORS.includes(hash)?'home':hash;
  const changed=route!==next;
  route=next;
  document.body.dataset.route=route;
  document.body.classList.toggle('admin-view',!PUBLIC.includes(route));
  if(!PUBLIC.includes(route)&&!session) {
    go('login');
    return;
  }
  if(!canAccess(route)) {
    content.innerHTML=adminNav()+`<main class="container gap">${notice('هذه الصفحة غير مفعّلة لهذا المستخدم.','warn')}${link('لوحة التحكم','dashboard','soft')}</main>`;
    return;
  }
  const page=Object.hasOwn(pages,route)?pages[route]:(()=>referencePage(route));
  const title=TITLES[route]||({home:'منظومة الطلبة',login:'تسجيل الدخول',register:'إنشاء حساب جديد',parents:'بوابة أولياء الأمور',results:'الاستعلام عن النتيجة','staff-portal':'الاستعلام عن موظف'})[route]||'منظومة الطلبة';
  document.title=title+(sharedMode&&!sharedDemo?' · منظومة الطلبة':' · عرض تجريبي');
  try {
    content.innerHTML=PUBLIC.includes(route)?page():adminNav()+`<main class="container admin-content" id="main">${page()}</main><footer class="admin-footer">منظومة الطلبة · ${sharedMode?'قاعدة بيانات مشتركة':'بيانات تجريبية محلية'} · ${link('خريطة الشاشات','reference')}</footer>`;
  } catch(error) {
    content.innerHTML=adminNav()+`<main class="container gap">${notice('تعذر عرض الصفحة. '+error.message,'error')}</main>`;
    console.error(error);
  }
  if(changed && !HOME_ANCHORS.includes(hash)) {
    window.scrollTo(0,0);
    $('h1',content)?.focus({preventScroll:true});
  }
  if(HOME_ANCHORS.includes(hash))requestAnimationFrame(()=>document.getElementById(hash)?.scrollIntoView());
}
window.addEventListener('hashchange',async()=>{
  $('#modal').close();
  const next=location.hash.slice(1)||'home';
  if(next!==route) {
    if(['parents','results'].includes(route)){publicMatches=[];publicProof=null;publicData=null;publicPage='';}
    if(route==='staff-portal'){staffPortalRecord=null;staffPortalProof=null;}
    if(route==='teachers')resetTeacher();
    if(route==='canteen'){canteenSession='';canteenProof='';canteenItems=[];}
  }
  if(sharedMode&&session) {
    try {await refreshShared();}
    catch(error){flash(error.message,'error');}
  }
  if(sharedMode&&next==='teachers'){
    try{await refreshTeacher();}catch(error){flash(error.message,'error');}
  }
  render();
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');
  if(!event.target.closest('.admin-links details'))$$('.admin-links details[open]').forEach(item=>{item.open=false;});
  else if(event.target.closest('summary')) {
    const active=event.target.closest('details');
    $$('.admin-links details[open]').filter(item=>item!==active).forEach(item=>{item.open=false;});
  }
  if(!button)return;
  const action=actions[button.dataset.action];
  if(!action)return;
  button.disabled=true;
  try { await action(button.dataset.value,button); }
  catch(error) {flash(error.message||'تعذر تنفيذ العملية.','error');}
  finally {button.disabled=false;}
});
document.addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.target, handler=forms[form.dataset.form];
  if(!handler)return;
  const controls=[...form.querySelectorAll('button[type=submit]')];
  const data=Object.fromEntries(new FormData(form));
  controls.forEach(button=>{button.disabled=true;});
  try { await handler(data,form,event); }
  catch(error) {flash(error.message||'تعذر حفظ البيانات.','error');}
  finally {controls.forEach(button=>{button.disabled=false;});}
});
async function start() {
  if(sharedMode)return startShared();
  try {database=await requestDatabase();state=await dbState();}
  catch {database=null;temporary=true;state=makeDemo();}
  loadSession();
  render();
  if(temporary)flash('تخزين المتصفح غير متاح. التعديلات مؤقتة في هذا التبويب.','warn');
}
