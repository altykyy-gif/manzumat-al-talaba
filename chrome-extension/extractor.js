// Reads the visible table in the isolated world. Page turns use the site's main world.
export function readTransferTables(request={}) {
  const rootSelector='table,[role="table"],[role="grid"]';
  const text=value=>String(value??'').replace(/[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g,'').replace(/\s+/g,' ').trim();
  const visible=el=>el.getClientRects().length>0&&getComputedStyle(el).visibility==='visible';
  const isSrs=/(^|\.)(nec\.gov\.ly|edu-libya\.com)$/i.test(location.hostname)&&/^\/srs(?:\/|$)/i.test(location.pathname);
  const officialGrade=isSrs&&/\/SRSYPRData[^/]*\.aspx$/i.test(location.pathname);
  if(isSrs&&/\/UserLogin\.aspx$/i.test(location.pathname))return {tables:[]};
  const navigationState='data-talaba-page-request';
  const navigation=request.navigation&&document.documentElement.getAttribute(navigationState);
  if(navigation===request.navigation+':pending')return {updating:true};
  if(navigation===request.navigation+':failed')return {navigationError:true,error:'أبلغ الموقع عن تعذّر تحميل صفحة الكشف.'};
  const headerClues=/(?:رقم (?:القيد|التسجيل|الطالب)|(?:الرقم|رقم) الوطني|اسم (?:الطالب|التلميذ)|الجنسية|تاريخ الميلاد|أعمال|درج(?:ة|ات)|الصف|student|national|registration)/i;
  const headingCell=cell=>cell.tagName==='TH'||cell.getAttribute('role')==='columnheader';
  const span=(cell,attr,aria)=>{
    const n=Number(cell.getAttribute(attr)||cell.getAttribute(aria)||1);
    return Number.isInteger(n)?Math.min(96,Math.max(1,n)):1;
  };
  const cellValue=cell=>{
    if(cell.querySelector(rootSelector))return '';
    const editors=[...cell.querySelectorAll('input,select,textarea')].filter(el=>visible(el)&&
      (el.tagName!=='INPUT'||['text','number','tel'].includes(el.type)));
    if(editors.length===1){
      const editor=editors[0];
      const masked=getComputedStyle(editor).webkitTextSecurity;
      if(masked&&masked!=='none')return '';
      if(editor.tagName==='SELECT')return editor.value?text(editor.selectedOptions[0]?.textContent):'';
      return text(editor.value);
    }
    if(cell.querySelector('input[type="password"]'))return '';
    return text(cell.innerText);
  };
  const rowCells=(root,row)=>[...row.children].filter(el=>el.matches('th,td,[role="cell"],[role="gridcell"],[role="columnheader"],[role="rowheader"]')&&
    el.closest(rootSelector)===root&&visible(el));
  const digits=value=>text(value).replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)%16));
  const key=value=>digits(value).replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
  const pageNumber=value=>/^\d{1,5}$/.test(digits(value))?Number(digits(value))||null:null;
  const pageControl='a[href],button,input[type="submit"],input[type="button"],[role="link"],[role="button"]';
  const currentPage='[aria-current="page"],[aria-current="true"],.current,.active,.selected';
  const webFormsPage=control=>{
    const script=(control.getAttribute('href')||'')+' '+(control.getAttribute('onclick')||'');
    if(!/\b(?:__doPostBack|WebForm_DoPostBackWithOptions)\s*\(/i.test(script))return '';
    return script.match(/['"]Page\$(\d{1,5}|First|Prev(?:ious)?|Next|Last)['"]/i)?.[1]||'';
  };
  function pagination(root,elements) {
    const adjacent=root.nextElementSibling;
    const footer=elements.at(-1), footerCells=footer?rowCells(root,footer):[];
    const containers=[root.tFoot,footerCells.length===1&&span(footerCells[0],'colspan','aria-colspan')>1&&footer,
      adjacent?.matches('.pagination,.pager,[data-pagination]')&&adjacent,
      ...elements.filter(row=>row.matches('.pagination,.pager,[data-pagination]')||
        rowCells(root,row).some(cell=>cell.matches('.pagination,.pager,[data-pagination]')))];
    // GridView can use a pager template or a nested table, in either the top or bottom row.
    for(const control of root.querySelectorAll('a[href*="Page$"],[onclick*="Page$"]')){
      if(!webFormsPage(control))continue;
      const row=elements.find(element=>element.contains(control));
      if(row)containers.push(row);
    }
    const pagerRows=new Set();
    let selected=null;
    for(const container of new Set(containers.filter(Boolean))){
      const controls=[];
      for(const control of container.querySelectorAll(pageControl)){
        if(!visible(control)||container.contains(control.closest('[disabled],[aria-disabled="true"],.disabled'))||
           container.contains(control.closest(currentPage)))continue;
        if(control.hasAttribute('download')||control.target&&control.target!=='_self'||control.formTarget&&control.formTarget!=='_self')continue;
        const href=control.getAttribute('href')||'', command=webFormsPage(control);
        if(/^javascript:/i.test(href)&&!command)continue;
        if(href&&!href.startsWith('#')&&!/^javascript:/i.test(href)){
          let url;
          try{url=new URL(href,location.href);}catch{continue;}
          if(url.origin!==location.origin||url.pathname!==location.pathname||url.username||url.password)continue;
        }
        const label=text(control.innerText||control.textContent||control.value);
        const hints=[label,control.title,control.getAttribute('aria-label'),control.rel].map(text);
        const number=pageNumber(label)||pageNumber(command);
        const direction=/^first$/i.test(command)||hints.some(hint=>/^(?:first|(?:الصفحة )?(?:الأولى|الاولى))$/i.test(hint))?'first':
          /^prev(?:ious)?$/i.test(command)||hints.some(hint=>/^(?:prev(?:ious)?|السابق(?:ة)?|الصفحة السابقة)$/i.test(hint))?'previous':
          /^next$/i.test(command)||hints.some(hint=>/^(?:next|التالي(?:ة)?|الصفحة التالية)$/i.test(hint))?'next':'';
        if(number||direction)controls.push({control,number,direction,command});
      }
      if(!controls.length)continue;
      const marked=[...container.querySelectorAll(currentPage)].filter(visible).map(el=>pageNumber(el.innerText||el.textContent)).filter(Boolean);
      const staticNumbers=[...container.querySelectorAll('span,strong,b,td')]
        .filter(el=>visible(el)&&!el.closest(pageControl)&&!el.querySelector(pageControl))
        .map(el=>pageNumber(el.innerText||el.textContent)).filter(Boolean);
      const candidates=new Set(marked.length?marked:staticNumbers);
      const number=candidates.size===1?[...candidates][0]:null;
      // Accept numeric controls only with a page marker, a GridView command, or a labelled pager.
      if(!number&&!container.matches('.pagination,.pager,[data-pagination]')&&
         !controls.some(({command})=>command))continue;
      const forPage=n=>controls.find(item=>item.number===n)?.control;
      const forDirection=direction=>controls.find(item=>item.direction===direction)?.control;
      if(elements.includes(container))pagerRows.add(container);
      const candidate={number,first:number===1?null:forPage(1)||forDirection('first'),
        previous:number===1?null:(number&&forPage(number-1))||forDirection('previous'),
        next:(number&&forPage(number+1))||forDirection('next')};
      if(!selected||!selected.number&&number)selected=candidate;
      else if(selected.number===number)for(const direction of ['first','previous','next'])selected[direction] ||= candidate[direction];
    }
    return selected?{...selected,rows:pagerRows}:null;
  }
  function clickPage(control) {
    const token=request.navigation;
    const documentRoot=document.documentElement;
    let manager;
    try{manager=globalThis.Sys?.WebForms?.PageRequestManager?.getInstance();}catch{}
    if(manager?.get_isInAsyncPostBack?.())return {updating:true};
    // A synchronous postback may unload this document. Return before clicking, and
    // subscribe before the click so even a fast UpdatePanel response is observed.
    if(token)documentRoot.setAttribute(navigationState,token+':pending');
    setTimeout(()=>{
      if(!control.isConnected)return;
      let timer, started=false, finished=false;
      const state=value=>{if(token)documentRoot.setAttribute(navigationState,token+':'+value);};
      const begin=()=>{started=true;state('pending');};
      const finish=failed=>{
        if(finished)return;
        finished=true;
        clearTimeout(timer);
        manager?.remove_beginRequest?.(begin);
        manager?.remove_endRequest?.(end);
        state(failed?'failed':'complete');
      };
      const end=(_sender,args)=>finish(Boolean(args?.get_error?.()));
      manager?.add_beginRequest?.(begin);
      manager?.add_endRequest?.(end);
      timer=setTimeout(()=>finish(true),20_000);
      try{
        control.click();
        if(!started&&!manager?.get_isInAsyncPostBack?.())finish(false);
        else if(!finished)state('pending');
      }catch{finish(true);}
    },35);
    return {navigating:true};
  }
  function recordTotal(root) {
    const findTotal=content=>[...digits(content).matchAll(/عدد\s+السجلات\s*[:：]?\s*(\d+(?:[,٬]\d{3})*)/g)]
      .map(match=>Number(match[1].replace(/[,٬]/g,''))).filter(Number.isSafeInteger);
    let container=root.parentElement;
    for(let level=0;container&&level<5;level++,container=container.parentElement){
      const totals=new Set(findTotal((container.innerText||'').slice(0,16000)));
      for(const label of container.querySelectorAll('label,span,td,th')){
        if(root.contains(label)||label.children.length||!visible(label)||!/^عددالسجلات$/.test(key(label.innerText)))continue;
        const siblings=[label.nextElementSibling,label.previousElementSibling].filter(Boolean);
        const neighbor=siblings.map(el=>digits(el.innerText)).find(value=>/^\d+(?:[,٬]\d{3})*$/.test(value));
        if(neighbor)totals.add(Number(neighbor.replace(/[,٬]/g,'')));
      }
      if(totals.size)return totals.size===1?[...totals][0]:null;
    }
    return null;
  }
  function reportFilters(root) {
    return [...(root.closest('form')||document).querySelectorAll('select')].filter(el=>!root.contains(el)&&visible(el));
  }
  function reportContext(filters) {
    const context={};
    for(const select of filters){
      const value=digits((select.selectedOptions?.[0]||select.options?.[select.selectedIndex])?.textContent);
      if(!value||!select.value)continue;
      const labels=[select.getAttribute('aria-label'),select.title,...[...select.labels||[]].map(el=>el.innerText),
        ...[select.closest('td')?.nextElementSibling,select.closest('td')?.previousElementSibling].map(el=>el?.innerText)].map(key);
      const name=key(select.name||select.id);
      if(/20\d\d\s*[-–/]\s*20\d\d/.test(value))context.year??=value.match(/20\d\d\s*[-–/]\s*20\d\d/)[0];
      if(labels.some(label=>/^(?:المستوىالدراسي|المستويالدراسي|الصف(?:الدراسي)?|المرحلهالدراسيه)$/.test(label))||/ddl(?:level|class|grade)|classlevel|studylevel/.test(name)||/^الصف\s/.test(value))context.cls??=value;
      if(labels.some(label=>/^(?:الشعبه|الفصل|رقمالفصل)$/.test(label))||/ddl(?:section|division)|classsection/.test(name))context.section??=value;
      if(/^(?:علمي|أدبي|ادبي)$/.test(value))context.stream??=value;
    }
    return context;
  }
  const matrix=(rows)=>{
    const grid=[];
    for(let i=0;i<rows.length;i++){
      const line=grid[i] ||= [];
      let column=0;
      for(const {value,cols,rows:down} of rows[i]){
        while(line[column]!==undefined)column++;
        if(column+cols>96)throw new Error('يتجاوز الجدول 96 عمودًا.');
        for(let r=i;r<Math.min(rows.length,i+down);r++){
          const target=grid[r] ||= [];
          for(let c=column;c<column+cols;c++)target[c]=value;
        }
        column+=cols;
      }
    }
    return grid;
  };
  const candidates=[];
  for(const [index,root] of [...document.querySelectorAll(rootSelector)].entries()){
    if(request.tableId&&root.id!==request.tableId||!request.tableId&&Number.isInteger(request.index)&&request.index!==index)continue;
    if(!visible(root)||root.querySelector('input[type="password"]'))continue;
    const srsGradeGrid=isSrs&&/GridViewYPRDataList/i.test(root.id);
    const allRows=(root.tagName==='TABLE'?[...root.rows]:[...root.querySelectorAll('[role="row"]')])
      .filter(row=>row.closest(rootSelector)===root&&visible(row));
    const pager=pagination(root,allRows);
    const elements=allRows.filter(row=>row.parentElement!==root.tFoot&&!pager?.rows.has(row));
    if(elements.length<2)continue;
    const cells=elements.map(row=>rowCells(root,row));
    if(!cells.some(row=>row.length>1))continue;
    const explicit=elements.filter(row=>row.parentElement===root.tHead).length;
    let headerCount=explicit;
    if(!headerCount){
      for(const row of cells.slice(0,6)){
        if(row.length<2||row.filter(headingCell).length<2)break;
        headerCount++;
      }
      if(!headerCount&&cells[0].some(cell=>headerClues.test(cell.innerText)))headerCount=1;
      if(headerCount&&(officialGrade||srsGradeGrid)){
        const headerTerms=/^(?:(?:درجة|درجات|مجموع) )?(?:أعمال(?: السنة)?|امتحان|اختبار|الفصل|الفترة|النهاية (?:الكبرى|العظمى)|الدرجة (?:الكبرى|العظمى)|المجموع)(?:$| )/;
        for(const row of cells.slice(headerCount,4)){
          if(!row.length||row.some(cell=>cell.querySelector('input,textarea,select'))||!row.some(cell=>headerTerms.test(text(cell.innerText))))break;
          headerCount++;
        }
      }
    }
    const layout=row=>row.map(cell=>({value:cellValue(cell),cols:span(cell,'colspan','aria-colspan'),rows:span(cell,'rowspan','aria-rowspan')}));
    const headingRows=cells.slice(0,headerCount)
      .filter(row=>row.length!==1||span(row[0],'colspan','aria-colspan')===1).map(layout);
    const labels=headingRows.flatMap(row=>row.map(cell=>cell.value)).join(' ');
    const firstData=cells.slice(headerCount).find(row=>row.length>1)||[];
    const fallbackWidth=Math.max(2,firstData.reduce((n,cell)=>n+span(cell,'colspan','aria-colspan'),0));
    const width=Math.max(fallbackWidth,...headingRows.map(row=>row.reduce((n,cell)=>n+cell.cols,0)));
    const activity=/تقدير(?:ات)?|النشاط|غياب (?:غير )?مشروع/.test(labels)&&!/أعمال|امتحان|درجة|درجات/.test(labels);
    const grades=officialGrade||/درجة|درجات|أعمال|امتحان|المجموع|الفصل الأول|الفصل الثاني|\bmark\b|\bscore\b/.test(labels);
    const kind=isSrs&&/\/Register\.aspx$/i.test(location.pathname)?'students':activity?'activities':grades||srsGradeGrid?'grades':'students';
    const caption=text(root.querySelector(':scope > caption')?.innerText||root.getAttribute('aria-label')).slice(0,70);
    const hint=text(headingRows[0]?.map(cell=>cell.value).filter(Boolean).slice(0,5).join(' · ')).slice(0,110);
    const rowCount=cells.slice(headerCount).filter(row=>row.length>1||row[0]&&span(row[0],'colspan','aria-colspan')===1).length;
    if(!rowCount||width>96)continue;
    const total=isSrs||pager?recordTotal(root):null;
    const identityHeader=/رقم\s+(?:القيد|التسجيل)|الرقم\s+الوطني/i.test(labels);
    const studentHeader=/اسم\s+(?:الطالب|التلميذ)|الاسم\s+الكامل/i.test(labels);
    const meta={index,tableId:root.id,width,rows:rowCount,kind,label:caption||hint||'جدول '+(index+1),
      score:(srsGradeGrid?20:0)+(identityHeader?8:0)+(studentHeader?6:0)+(headerClues.test(labels)?4:0)+(headerCount?2:0),total,paginated:Boolean(pager||total>rowCount)};
    const selected=request.tableId?root.id===request.tableId:request.index===index;
    if(selected){
      if(rowCount>5000)return {error:'الجدول يتجاوز 5000 سجل. اختر فصلًا أصغر من الصفحة.'};
      try {
        const headerGrid=matrix(headingRows), dataGrid=matrix(cells.slice(headerCount).map(layout));
        const headerWidth=Math.max(width,...headerGrid.map(row=>row.length),...dataGrid.map(row=>row.length));
        const headerNames=Array.from({length:headerWidth},(_,i)=>{
          const values=headerGrid.map(row=>row[i]).filter(value=>value&&!/^[\d٠-٩۰-۹.,٫\s]+$/.test(value));
          const labels=[...new Set(values)].join(' / ');
          const last=headerGrid.at(-1)?.[i];
          const explicitMax=grades&&headerGrid.length>=3&&last&&/^\d+(?:[.,٫]\d+)?$/.test(digits(last))&&
            /أعمال|امتحان|(?:مجموع |درجة )?(?:الفصل|الفترة)|اختبار/.test(labels);
          return (labels+(explicitMax?' / '+digits(last):''))||'العمود '+(i+1);
        });
        let size=headerNames.join('').length;
        const rows=[];
        for(const [i,line] of dataGrid.entries()){
          if(cells[i+headerCount].length===1&&span(cells[i+headerCount][0],'colspan','aria-colspan')>1)continue;
          if(line.every(value=>!value))continue;
          const row=Array.from(headerNames,(_,column)=>line[column]||'');
          if(row.some(value=>value.length>4096))return {error:'إحدى خلايا الجدول طويلة جدًا.'};
          size+=row.join('').length;
          if(size>2_500_000)return {error:'الكشف كبير. صفّه في الصفحة ثم أعد القراءة.'};
          rows.push(row);
        }
        if(!rows.length)return {error:'الجدول لا يحتوي على بيانات ظاهرة.'};
        const page={number:pager?.number??null,first:Boolean(pager?.first),previous:Boolean(pager?.previous),next:Boolean(pager?.next)};
        const filters=reportFilters(root), context=reportContext(filters);
        if(!request.paginate&&!request.turn)return {meta,table:{headers:headerNames,rows},context};
        const scope=JSON.stringify(filters.map(el=>[el.name||el.id,el.value]));
        if(request.turn){
          if(request.from!==page.number||request.scope!==scope||request.firstRow!==JSON.stringify(rows[0]))
            return {error:'تغيّر الكشف قبل الانتقال إلى الصفحة التالية.'};
          const control=['first','previous','next'].includes(request.turn)&&pager?.[request.turn];
          if(!control)return {error:'لم يظهر رابط الانتقال المطلوب أسفل الكشف.'};
          return clickPage(control);
        }
        return {meta,table:{headers:headerNames,rows},page,scope,context};
      }catch(error){return {error:error.message};}
    }
    candidates.push(meta);
  }
  if(Number.isInteger(request.index))return {error:'تغيّر الجدول. أعد قراءته من الصفحة.'};
  return {tables:candidates.sort((a,b)=>b.score-a.score||b.rows-a.rows).slice(0,40)};
}

export function deliverTransferTable(packet) {
  try{
    if(document.querySelector('meta[name="talaba-data-transfer"]')?.content!=='1'||typeof window.talabaDataTransfer?.open!=='function')
      return {error:'افتح نسخة منظومة الطلبة المحدّثة في هذا التبويب.'};
    return window.talabaDataTransfer.open(packet);
  }catch(error){return {error:error.message};}
}
