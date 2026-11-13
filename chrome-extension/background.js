import {readTransferTables} from './extractor.js';
import {collectTransferPages} from './pagination.js';

const scanKey='pageScan';
let activeScan=null;

async function scanPage(job,options,waiting=false) {
  if(job.cancelled)throw new Error('أوقفت التقاط الصفحات.');
  const tab=await chrome.tabs.get(job.tabId).catch(()=>null);
  if(!tab)throw new Error('أُغلق تبويب الكشف أثناء الالتقاط.');
  const address=tab.pendingUrl||tab.url;
  const url=address?new URL(address):null;
  if(url&&(url.origin!==job.origin||url.pathname!==job.path))
    throw new Error('غادر التبويب صفحة الكشف.');
  if(!url||tab.status==='loading')return null;
  try {
    const [injection]=await chrome.scripting.executeScript({
      target:{tabId:job.tabId},func:readTransferTables,args:[{...job.selection,paginate:true,...options}]
    });
    return injection?.result||null;
  }catch{
    if(waiting)return null;
    throw new Error('تعذّر الوصول إلى جدول الكشف في التبويب.');
  }
}

async function turnPage(job,current,direction,expected) {
  const result=await scanPage(job,{
    turn:direction,from:current.page.number,scope:current.scope,firstRow:JSON.stringify(current.table.rows[0])
  });
  if(!result?.navigating)throw new Error(result?.error||'تعذّر الضغط على رابط الصفحة التالية.');
  const limit=Date.now()+20_000;
  const originalRows=JSON.stringify(current.table.rows);
  while(Date.now()<limit){
    await new Promise(resolve=>setTimeout(resolve,300));
    // The document can unload between reading the tab status and injecting the reader.
    const page=await scanPage(job,undefined,true);
    if(!page?.table||!page.page.number||page.page.number===current.page.number)continue;
    if(page.page.number!==expected)throw new Error('انتقل الموقع إلى صفحة غير متوقعة.');
    if(JSON.stringify(page.table.rows)===originalRows)continue;
    return page;
  }
  throw new Error('لم يحمّل الموقع الصفحة '+expected+' خلال الوقت المتاح.');
}

function startScan(request) {
  if(activeScan)throw new Error('التقاط الصفحات جارٍ بالفعل.');
  const {tabId,sourceUrl,selection,kind}=request;
  if(!Number.isInteger(tabId)||!Number.isInteger(selection?.index)||
     !['students','grades','activities'].includes(kind))throw new Error('اختر جدول الكشف أولًا.');
  const {origin,pathname,protocol,hostname}=new URL(sourceUrl);
  if(!['https:','http:'].includes(protocol))throw new Error('افتح الكشف في تبويب موقعه أولًا.');
  const job={tabId,origin,path:pathname,selection:{index:selection.index,tableId:selection.tableId},cancelled:false};
  activeScan=job;
  runScan(job,sourceUrl,selection,kind,hostname).catch(()=>{});
  return {started:true};
}

async function runScan(job,sourceUrl,selection,kind,hostname) {
  let status={state:'running',pages:0,rows:0,total:null};
  const report=async info=>{
    status={...status,message:'',...info};
    await chrome.storage.session.set({[scanKey]:status});
  };
  try {
    await report({});
    const tab=await chrome.tabs.get(job.tabId);
    if(tab.url!==sourceUrl)throw new Error('تغيّرت الصفحة. أعد قراءة الجداول.');
    const first=await scanPage(job);
    if(first?.error)throw new Error(first.error);
    if(!first?.table||first.meta.label!==selection.label||first.meta.width!==selection.width)
      throw new Error('تغيّر الجدول. أعد قراءة الجداول.');
    job.selection.tableId=first.meta.tableId;
    const {table,pages}=await collectTransferPages(first,(...args)=>turnPage(job,...args),report);
    if(job.cancelled)throw new Error('أوقفت التقاط الصفحات.');
    const pending={id:crypto.randomUUID(),source:hostname,kind,table,pages};
    await chrome.storage.session.set({pending,[scanKey]:{state:'complete',pages,rows:table.rows.length,total:first.meta.total}});
  }catch(error){
    await report({state:job.cancelled?'cancelled':'error',message:error.message});
  }finally{activeScan=null;}
}

chrome.runtime.onMessage.addListener((request,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||sender.url?.split(/[?#]/,1)[0]!==chrome.runtime.getURL('popup.html'))return;
  if(request?.type==='talaba-start-pages'){
    try{reply(startScan(request));}catch(error){reply({error:error.message});}
  }
  if(request?.type==='talaba-stop-pages'){
    if(activeScan)activeScan.cancelled=true;
    reply({stopped:Boolean(activeScan)});
  }
  if(request?.type==='talaba-page-status')reply({running:Boolean(activeScan)});
});
