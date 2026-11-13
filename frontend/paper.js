const PAPER_FONTS = {
  'Simplified Arabic':'"Simplified Arabic", Arial, sans-serif',
  Calibri:'Calibri, Arial, sans-serif',
  Cairo:'Cairo, Arial, sans-serif',
  Tajawal:'Tajawal, Arial, sans-serif',
  Arial:'Arial, sans-serif',
  'Times New Roman':'"Times New Roman", serif',
  الافتراضي:'Cairo, Arial, sans-serif',
  واضح:'Arial, sans-serif',
  تقليدي:'"Times New Roman", serif'
};
const PAPER_SHADE = {none:'#fff',light:'#f5f5f5',medium:'#e9ecef',dark:'#ced4da'};
const bounded = (value,min,max,fallback) => {
  const number=Number(value);
  return value!==''&&Number.isFinite(number)?Math.max(min,Math.min(max,Math.floor(number))):fallback;
};
function paperHeading(title,profile) {
  const authority=profile.printLogoHidden?'':imageMarkup(profile.printLogo,'شعار الجهة التعليمية');
  const schoolLogo=profile.photoHidden?'':imageMarkup(profile.photo,'شعار المدرسة');
  return `<header class="school-paper-head"><div class="paper-logo">${authority}</div><div class="paper-center"><div class="paper-gov">دولة ليبيا<br>وزارة التربية والتعليم<br>${esc(profile.name)}</div><h2>${esc(title)}</h2></div><div class="paper-logo">${schoolLogo}</div></header>`;
}
function paperFrame(title,year,body,{variant='roster',profile=school().profile,settings={},meta='',signatures=true,page=0,pages=0}={}) {
  const style=[
    '--paper-font:'+ (PAPER_FONTS[settings.font]||PAPER_FONTS.Cairo),
    '--paper-size:'+ bounded(settings.fontSize,10,24,variant==='grades'?13:14)+'px',
    '--paper-rule:'+ bounded(settings.borderWidth,1,6,1)+'px '+(['solid','dashed','dotted','double'].includes(settings.borderStyle)?settings.borderStyle:'solid')+' #000',
    '--paper-align:'+({يمين:'right',وسط:'center',يسار:'left'}[settings.align]||'center'),
    '--paper-weight:'+(settings.bold?700:400),
    '--paper-shade:'+(PAPER_SHADE[settings.shade]||PAPER_SHADE.none),
    '--paper-pad:'+bounded(settings.cellPadding,1,8,variant==='grades'?8:6)+'px'
  ].join(';');
  const stamp=sharedMode&&!sharedDemo?'منظومة الطلبة':'منظومة الطلبة · كشف تجريبي';
  const sign=signatures?`<div class="paper-signatures"><div><strong>اعتماد مشرف شؤون الطلبة</strong><br>الاسم: ____________________<br>التوقيع: ____________________</div><div><strong>اعتماد إدارة المدرسة</strong><br>مدير المدرسة: ${esc(profile.principal||'____________________')}<br>التوقيع: ____________________</div></div>`:'';
  return `<article class="school-paper paper-${variant}${settings.borderType==='box'?' paper-box':''}" style="${esc(style)}" dir="rtl"><div class="school-paper-content">${paperHeading(title,profile)}${meta?'<div class="paper-meta">'+meta+'</div>':''}${body}${sign}</div><footer class="school-paper-foot"><div class="paper-footer-line"><span>${esc(stamp)}</span><span>السنة الدراسية <bdi>${esc(year)}</bdi></span><span>تاريخ الطباعة: <bdi>${esc(dayISO())}</bdi></span>${pages>1?`<bdi>${page} / ${pages}</bdi>`:''}</div></footer></article>`;
}
function paperTable(headers,rows,name='الكشف') {
  return table(headers,rows,{name,className:'school-paper-table'});
}
function paperPages(title,year,headers,groups,settings={}) {
  const orientation=settings.orientation||'عمودي';
  const fontSize=bounded(settings.fontSize,10,24,14);
  const count=bounded(settings.rowsPerPage,5,100,28);
  const tall=orientation==='أفقي'?650:900;
  const cellPadding=Math.max(1,Math.min(6,Math.floor((tall/(count+1)-fontSize*1.2-1)/2)));
  const fit=Math.max(5,Math.floor(tall/(fontSize*1.2+cellPadding*2+Math.max(1,Number(settings.borderWidth)||1)))-1);
  const rowsPerPage=Math.min(count,fit)*(settings.twoColumns?2:1);
  const paper=(rows,meta,page,pages)=>{
    const mid=Math.ceil(rows.length/2);
    const body=settings.twoColumns&&rows.length>1
      ? '<div class="paper-columns">'+paperTable(headers,rows.slice(0,mid),title)+paperTable(headers,rows.slice(mid),title)+'</div>'
      : paperTable(headers,rows,title);
    return paperFrame(title,year,body,{variant:settings.variant||'roster',meta,settings:{...settings,cellPadding},page,pages});
  };
  const measure=document.createElement('div');
  measure.className='paper-measure';
  measure.dataset.orientation=orientation==='أفقي'?'landscape':'portrait';
  measure.setAttribute('aria-hidden','true');
  document.body.append(measure);
  const maxHeight=(orientation==='أفقي'?210:297)*96/25.4-2;
  function fitRows(rows,meta) {
    let low=1, high=rows.length;
    while(high>low) {
      const count=Math.ceil((low+high)/2);
      measure.innerHTML=paper(rows.slice(0,count),meta,1,2);
      if(measure.firstElementChild.getBoundingClientRect().height<=maxHeight)low=count;
      else high=count-1;
    }
    return rows.slice(0,low);
  }
  const chunks=[];
  try {
    for(const group of groups.length?groups:[{rows:[],meta:''}]) {
      if(!group.rows.length)chunks.push(group);
      for(let from=0;from<group.rows.length;){
        const rows=fitRows(group.rows.slice(from,from+rowsPerPage),group.meta);
        chunks.push({rows,meta:group.meta});
        from+=rows.length;
      }
    }
  } finally {
    measure.remove();
  }
  const markup=chunks.map((chunk,i)=>paper(chunk.rows,chunk.meta,i+1,chunks.length)).join('');
  return {markup,orientation,rows:groups.flatMap(group=>group.rows)};
}
function schoolListReport(title,year,headers,groups,settings={}) {
  const {markup,orientation,rows}=paperPages(title,year,headers,groups,settings);
  showDocument(title,headers,rows,markup,orientation,direction=>paperPages(title,year,headers,groups,{...settings,orientation:direction}).markup);
}
