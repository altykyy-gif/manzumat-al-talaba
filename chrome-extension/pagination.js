const MAX_ROWS=5000;
const MAX_PAGES=MAX_ROWS;
const MAX_TEXT=2_500_000;

export function transferPageConflict(first,page) {
  if(first.scope!==page.scope)return 'تغيّرت اختيارات الكشف أثناء الالتقاط. أعد التقاط الكشف بعد تثبيت الفلاتر.';
  if(JSON.stringify(first.table.headers)!==JSON.stringify(page.table.headers))return 'تغيّرت أعمدة الكشف بين الصفحات. أعد عرض الكشف ثم التقطه.';
  if(first.meta.total!==null&&page.meta.total!==null&&first.meta.total!==page.meta.total)
    return 'تغيّر عدد السجلات أثناء الالتقاط. أعد عرض الكشف ثم التقطه.';
  return '';
}

export async function collectTransferPages(first,turn,report) {
  const {meta:{total},table:{headers}}=first;
  if(total>MAX_ROWS)throw new Error('يتجاوز الكشف 5000 سجل. صفِّ الكشف إلى مجموعات أصغر.');
  if(!first.page.number)throw new Error('لم تتعرّف الإضافة على رقم الصفحة الحالية أسفل الكشف.');
  const verify=page=>{
    const conflict=transferPageConflict(first,page);
    if(conflict)throw new Error(conflict);
    if(!page.page.number)throw new Error('تعذّر تحديد رقم صفحة الكشف بعد الانتقال.');
  };
  let current=first;
  while(current.page.number>1){
    const {number,first:hasFirst,previous}=current.page;
    if(!hasFirst&&!previous)throw new Error('افتح الصفحة الأولى من الكشف ثم أعد الالتقاط.');
    await report({message:'الانتقال إلى الصفحة الأولى…'});
    current=await turn(current,hasFirst?'first':'previous',hasFirst?1:number-1);
    verify(current);
  }

  const rows=[], seenPages=new Set(), seenStudents=new Set();
  let size=headers.join('').length;
  for(let number=1;number<=MAX_PAGES;number++){
    const batch=current.table.rows;
    const identities=current.registrations||[];
    const key=current.pageKey??JSON.stringify(batch);
    if(seenPages.has(key))throw new Error('عرض الموقع الصفحة نفسها مرة أخرى. توقّف الالتقاط لتفادي تكرار السجلات.');
    seenPages.add(key);
    for(const id of new Set(identities.filter(Boolean))){
      if(seenStudents.has(id))throw new Error('تكرر رقم قيد في صفحتين من الكشف. أعد عرضه ثم التقطه.');
      seenStudents.add(id);
    }
    size+=batch.reduce((sum,row)=>sum+row.join('').length,0);
    rows.push(...batch);
    if(rows.length>MAX_ROWS||size>MAX_TEXT)throw new Error('الكشف كبير. صفِّ الكشف إلى مجموعات أصغر.');
    if(total!==null&&rows.length>total)throw new Error('عدد الصفوف الملتقطة أكبر من عدد السجلات المعروض في الكشف.');
    await report({pages:number,rows:rows.length,total});
    if(!current.page.next){
      if(total!==null&&rows.length!==total)
        throw new Error('التقطت الإضافة '+rows.length+' من '+total+' سجلًا وتعذّر الوصول إلى الصفحة التالية.');
      return {table:{headers,rows},pages:number};
    }
    if(total!==null&&rows.length===total)throw new Error('يظهر رابط لصفحة أخرى بعد بلوغ عدد السجلات المعلن.');
    current=await turn(current,'next',number+1);
    verify(current);
  }
  throw new Error('تجاوز الكشف الحد الأقصى لعدد الصفحات. صفِّ الكشف إلى مجموعات أصغر.');
}
