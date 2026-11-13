// Runs in the extension's isolated world on the tab the user opened.
export function readTransferTables(request={}) {
  const rootSelector='table,[role="table"],[role="grid"]';
  const text=value=>String(value??'').replace(/[\u200e\u200f\u061c\u202a-\u202e]/g,'').replace(/\s+/g,' ').trim();
  const visible=el=>el.getClientRects().length>0&&getComputedStyle(el).visibility==='visible';
  const isSrs=/(^|\.)nec\.gov\.ly$/i.test(location.hostname)&&/^\/srs(?:\/|$)/i.test(location.pathname);
  const officialGrade=isSrs&&/\/SRSYPRData[^/]*\.aspx$/i.test(location.pathname);
  if(isSrs&&/\/UserLogin\.aspx$/i.test(location.pathname))return {tables:[]};
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
      if(editor.tagName==='SELECT')return editor.value?text(editor.selectedOptions[0]?.textContent):'';
      return text(editor.value);
    }
    if(cell.querySelector('input[type="password"]'))return '';
    return text(cell.innerText);
  };
  const rowCells=(root,row)=>[...row.children].filter(el=>el.matches('th,td,[role="cell"],[role="gridcell"],[role="columnheader"],[role="rowheader"]')&&
    el.closest(rootSelector)===root&&visible(el));
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
    if(!visible(root)||root.querySelector('input[type="password"]'))continue;
    const elements=(root.tagName==='TABLE'?[...root.rows]:[...root.querySelectorAll('[role="row"]')])
      .filter(row=>row.closest(rootSelector)===root&&!row.closest('tfoot')&&visible(row));
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
    }
    const layout=row=>row.map(cell=>({value:cellValue(cell),cols:span(cell,'colspan','aria-colspan'),rows:span(cell,'rowspan','aria-rowspan')}));
    const headingRows=cells.slice(0,headerCount)
      .filter(row=>row.length!==1||span(row[0],'colspan','aria-colspan')===1).map(layout);
    const labels=headingRows.flatMap(row=>row.map(cell=>cell.value)).join(' ');
    const firstData=cells.slice(headerCount).find(row=>row.length>1)||[];
    const fallbackWidth=Math.max(2,firstData.reduce((n,cell)=>n+span(cell,'colspan','aria-colspan'),0));
    const width=Math.max(fallbackWidth,...headingRows.map(row=>row.reduce((n,cell)=>n+cell.cols,0)));
    const activity=/تقدير(?:ات)?|النشاط|غياب (?:غير )?مشروع/.test(labels);
    const grades=officialGrade||/درجة|درجات|أعمال|امتحان|المجموع|الفصل الأول|الفصل الثاني|\bmark\b|\bscore\b/.test(labels);
    const kind=isSrs&&/\/Register\.aspx$/i.test(location.pathname)?'students':activity?'activities':grades?'grades':'students';
    const caption=text(root.querySelector(':scope > caption')?.innerText||root.getAttribute('aria-label')).slice(0,70);
    const hint=text(headingRows[0]?.map(cell=>cell.value).filter(Boolean).slice(0,5).join(' · ')).slice(0,110);
    const rowCount=cells.slice(headerCount).filter(row=>row.length>1||row[0]&&span(row[0],'colspan','aria-colspan')===1).length;
    if(!rowCount||width>96)continue;
    const meta={index,width,rows:rowCount,kind,label:caption||hint||'جدول '+(index+1),score:(headerClues.test(labels)?8:0)+(headerCount?2:0)};
    if(request.index===index){
      if(rowCount>5000)return {error:'الجدول يتجاوز 5000 سجل. اختر فصلًا أصغر من الصفحة.'};
      try {
        const headerGrid=matrix(headingRows), dataGrid=matrix(cells.slice(headerCount).map(layout));
        const headerWidth=Math.max(width,...headerGrid.map(row=>row.length),...dataGrid.map(row=>row.length));
        const headerNames=Array.from({length:headerWidth},(_,i)=>{
          const values=headerGrid.map(row=>row[i]).filter(value=>value&&!/^[\d٠-٩۰-۹.,٫\s]+$/.test(value));
          return [...new Set(values)].join(' / ')||'العمود '+(i+1);
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
        return {meta,table:{headers:headerNames,rows}};
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
