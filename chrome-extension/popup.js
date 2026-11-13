import {deliverTransferTable,readTransferTables} from './extractor.js';

const publicDestination='https://altykyy-gif.github.io/manzumat-al-talaba/';
const kindNames={students:'بيانات الطلبة',grades:'الدرجات',activities:'تقديرات النشاط'};
const $=id=>document.getElementById(id);
let packet=null, tableList=[], sourceUrl='', active=null, destination=publicDestination, busy=false, pageScan=null;
const scanRunning=()=>pageScan?.state==='running';
const selectedTable=()=>tableList.find(item=>item.index===Number($('table').value));

function asDestination(value) {
  let url;
  try{url=new URL(value);}catch{throw new Error('أدخل رابطًا كاملًا للمنظومة.');}
  if(url.username||url.password||!['http:','https:','file:'].includes(url.protocol))throw new Error('اختر رابطًا صالحًا للمنظومة.');
  if(/(^|\.)(nec\.gov\.ly|edu-libya\.com)$/i.test(url.hostname))throw new Error('أدخل رابط منظومة الطلبة الخاصة بك.');
  if(url.protocol==='http:'&&!/^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|[\w-]+\.local)$/i.test(url.hostname))
    throw new Error('استخدم HTTPS للرابط الخارجي، أو عنوانًا داخل الشبكة المحلية.');
  url.search='';
  url.hash='';
  return url.href;
}
function isDestination(value) {
  try {
    const url=asDestination(value).replace(/\/$/,'').replace(/\/index\.html$/,'');
    return [destination,publicDestination].some(candidate=>url===candidate.replace(/\/$/,'').replace(/\/index\.html$/,''));
  }catch{return false;}
}
function message(value,error=false) {
  $('status').textContent=value;
  $('status').dataset.error=String(error);
  $('status').hidden=!value;
}
function sync() {
  const connected=isDestination(active?.url);
  const scanning=scanRunning();
  const selected=selectedTable();
  $('source-panel').hidden=connected;
  $('destination-panel').hidden=!connected;
  $('packet').hidden=!packet;
  $('capture-all').hidden=!selected?.paginated;
  $('page-scan').hidden=!scanning;
  if(scanning)$('page-scan-info').textContent=pageScan.message||
    pageScan.pages+' صفحة · '+pageScan.rows+(pageScan.total===null?'':' من '+pageScan.total)+' سجل. أبقِ تبويب الكشف مفتوحًا.';
  $('send').disabled=busy||scanning||!packet;
  for(const id of ['scan','capture','capture-all','table','kind','open-transfer','excel','open','clear'])$(id).disabled=busy||scanning;
  $('open').hidden=connected;
  $('excel').parentElement.style.gridTemplateColumns=connected?'1fr':'';
  if(packet)$('packet-info').textContent=kindNames[packet.kind]+' · '+packet.table.rows.length+' سجل'+
    (packet.pages?' · '+packet.pages+' صفحة':'')+' · '+packet.source;
}
function showScanState(status) {
  pageScan=status||null;
  if(pageScan?.state==='error'||pageScan?.state==='cancelled')message(pageScan.message,pageScan.state==='error');
  else if(pageScan?.state==='complete')message('تم التقاط الكشف الكامل. يمكنك تنزيله أو إرساله إلى المنظومة.');
  sync();
}
async function currentTab() {
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!Number.isInteger(tab?.id)||!tab.url)throw new Error('افتح تبويب الكشف أو المنظومة أولًا.');
  return tab;
}
async function runOnTab(func,args) {
  const world=func===deliverTransferTable?'MAIN':'ISOLATED';
  let result;
  try{[result]=await chrome.scripting.executeScript({target:{tabId:active.id},func,args:[args],world});}
  catch{throw new Error('تعذّر الوصول إلى التبويب. افتح الصفحة العادية واضغط أيقونة الإضافة فيها. للملفات المحلية فعّل السماح بالوصول إلى عناوين الملفات.');}
  if(result?.result?.error)throw new Error(result.result.error);
  if(!result?.result)throw new Error('تعذّرت قراءة الصفحة الحالية.');
  return result.result;
}
function action(id,fn) {
  $(id).addEventListener('click',async()=>{
    if(busy||scanRunning())return;
    busy=true;message('');sync();
    try{await fn();}
    catch(error){message(error.message||'تعذّر إكمال العملية.',true);}
    finally{busy=false;sync();}
  });
}
async function sendTable(tablePacket) {
  active=await currentTab();
  if(!isDestination(active.url))throw new Error('افتح رابط المنظومة المحدد ثم اضغط أيقونة الإضافة من تبويبها.');
  const result=await runOnTab(deliverTransferTable,tablePacket);
  if(!result.ready)throw new Error('المنظومة غير جاهزة لاستقبال الكشف.');
  if(tablePacket){
    const stored=(await chrome.storage.session.get('pending')).pending;
    if(stored?.id===tablePacket.id)await chrome.storage.session.remove(['pending','pageScan']);
    packet=null;
  }
  message(tablePacket?'وصل الكشف إلى «'+result.school+'». راجع الأعمدة والصف ثم احفظه من داخل المنظومة.':'فُتحت صفحة نقل البيانات.');
}
function prepareExcelRows({headers,rows,kind}) {
  if(kind==='students')return [headers,...rows];
  const numeric=headers.map(header=>/درجة|درجات|أعمال|امتحان|الفترة|المجموع|غياب|\bmark\b|\bscore\b/.test(header)&&!/رقم|معرف|\bid\b/i.test(header));
  return [headers,...rows.map(row=>row.map((value,i)=>{
    if(!numeric[i])return value;
    const digits=value.replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)%16)).replace(/[٫,]/g,'.');
    return /^\d+(?:\.\d+)?$/.test(digits)?Number(digits):value;
  }))];
}

action('scan',async()=>{
  active=await currentTab();
  if(!/^(?:https?|file):/i.test(active.url))throw new Error('افتح صفحة الكشف في المتصفح.');
  $('table-options').hidden=true;
  tableList=(await runOnTab(readTransferTables,{})).tables;
  if(!tableList.length)throw new Error('لم يظهر جدول بيانات في هذه الصفحة. افتح كشف الطلبة أو الدرجات أولًا.');
  sourceUrl=active.url;
  $('table').replaceChildren(...tableList.map(item=>new Option(item.label+' · '+
    (item.paginated&&item.total!==null?item.rows+' من '+item.total:item.rows)+' سجل',String(item.index))));
  $('kind').value=tableList[0].kind;
  $('table-options').hidden=false;
});
$('table').addEventListener('change',()=>{
  const table=selectedTable();
  if(table)$('kind').value=table.kind;
  sync();
});
action('capture',async()=>{
  active=await currentTab();
  if(active.url!==sourceUrl)throw new Error('تغيّرت الصفحة. أعد قراءة الجداول.');
  const before=selectedTable(), index=before?.index;
  const {table,meta}=await runOnTab(readTransferTables,{index});
  if(!before||before.label!==meta.label||before.width!==meta.width)throw new Error('تغيّر الجدول. أعد قراءته قبل الالتقاط.');
  const source=new URL(active.url).hostname||'ملف محلي';
  packet={id:crypto.randomUUID(),source,kind:$('kind').value,table};
  await chrome.storage.session.set({pending:packet,pageScan:null});
  message('الجدول جاهز للتنزيل أو الإرسال.');
});
action('capture-all',async()=>{
  active=await currentTab();
  if(active.url!==sourceUrl)throw new Error('تغيّرت الصفحة. أعد قراءة الجداول.');
  const selection=selectedTable();
  if(!selection?.paginated)throw new Error('اختر كشفًا يعرض أرقام الصفحات أسفل الجدول.');
  const result=await chrome.runtime.sendMessage({type:'talaba-start-pages',tabId:active.id,sourceUrl,selection,kind:$('kind').value});
  if(!result?.started)throw new Error(result?.error||'تعذّر بدء التقاط الصفحات.');
  showScanState((await chrome.storage.session.get('pageScan')).pageScan);
});
$('stop-scan').addEventListener('click',async()=>{
  try{
    const result=await chrome.runtime.sendMessage({type:'talaba-stop-pages'});
    if(!result?.stopped)showScanState({state:'cancelled',message:'توقّف التقاط الصفحات.'});
  }catch{showScanState({state:'error',message:'تعذّر الاتصال بالإضافة. أعد فتحها.'});}
});
action('excel',async()=>{
  if(!packet)throw new Error('التقط جدولًا أولًا.');
  const rows=prepareExcelRows({...packet.table,kind:packet.kind});
  const url=URL.createObjectURL(excelFile(rows)), anchor=document.createElement('a');
  anchor.href=url;
  anchor.download='كشف '+kindNames[packet.kind]+'.xlsx';
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
  message('بدأ تنزيل ملف Excel.');
});
action('open',async()=>chrome.tabs.create({url:destination}));
action('open-transfer',async()=>sendTable(null));
action('send',async()=>{
  if(!packet)throw new Error('التقط جدولًا أولًا.');
  await sendTable(packet);
});
action('clear',async()=>{
  await chrome.storage.session.remove(['pending','pageScan']);
  packet=null;message('مُسح الكشف من الإضافة.');
});
$('destination-form').addEventListener('submit',async event=>{
  event.preventDefault();
  try{
    const value=asDestination($('destination-url').value.trim());
    await chrome.storage.local.set({destination:value});
    destination=value;
    $('destination-url').value=value;
    message('حُفظ رابط المنظومة.');sync();
  }catch(error){message(error.message,true);}
});
async function startPopup() {
  const [local,tab]=await Promise.all([chrome.storage.local.get('destination'),currentTab().catch(()=>null)]);
  destination=local.destination||publicDestination;
  $('destination-url').value=destination;
  active=tab;
  let memory=await chrome.storage.session.get(['pending','pageScan']);
  let status=memory.pageScan;
  if(status?.state==='running'){
    const result=await chrome.runtime.sendMessage({type:'talaba-page-status'});
    if(!result?.running){
      memory=await chrome.storage.session.get(['pending','pageScan']);
      status=memory.pageScan;
      if(status?.state==='running')status={state:'error',message:'توقّف الالتقاط. أعد قراءة الجداول وحاول مجددًا.'};
    }
  }
  packet=memory.pending||null;
  showScanState(status);
}
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=='session')return;
  if(changes.pending)packet=changes.pending.newValue||null;
  if(changes.pageScan)showScanState(changes.pageScan.newValue);
  else if(changes.pending)sync();
});
startPopup().catch(error=>message(error.message,true));
