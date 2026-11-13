const LOGO_EXTENSIONS=['.png','.jpg','.jpeg','.jfif','.webp','.gif','.bmp','.svg','.avif'];
const LOGO_ACCEPT=[...LOGO_EXTENSIONS,'image/png','image/jpeg','image/webp','image/gif','image/bmp','image/svg+xml','image/avif'].join(',');
const LOGO_FORMATS='PNG، JPG، WebP، GIF، BMP، SVG، AVIF';
const LOGO_INPUT_LIMIT=20_000_000;
const LOGO_OUTPUT_LIMIT=1_500_000;
const LOGO_MAX_SIDE=1600;

function readDataURL(file) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(new Error('تعذر قراءة الملف.'));
    reader.readAsDataURL(file);
  });
}
function logoSource(bytes) {
  const isText=(start,text)=>Array.from(text).every((letter,i)=>bytes[start+i]===letter.charCodeAt(0));
  if(bytes[0]===137&&isText(1,'PNG')&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)return 'image/png';
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
  if(isText(0,'RIFF')&&isText(8,'WEBP'))return 'image/webp';
  if(isText(0,'GIF87a')||isText(0,'GIF89a'))return 'image/gif';
  if(isText(0,'BM'))return 'image/bmp';
  if(isText(4,'ftyp')){
    for(let i=8;i+4<=Math.min(bytes.length,128);i+=4)if(isText(i,'avif')||isText(i,'avis'))return 'image/avif';
  }
  return '';
}
function vectorLogo(bytes) {
  const xml=new TextDecoder().decode(bytes);
  if(!/^\s*</.test(xml)||/<!DOCTYPE/i.test(xml))return null;
  const parsed=new DOMParser().parseFromString(xml,'image/svg+xml'), root=parsed.documentElement;
  if(root.localName!=='svg'||root.namespaceURI!=='http://www.w3.org/2000/svg'||parsed.querySelector('parsererror'))return null;
  const box=root.getAttribute('viewBox')?.trim().split(/[ ,]+/).map(Number);
  if(box?.length===4&&box.every(Number.isFinite)&&box[2]>0&&box[3]>0){
    const width=root.getAttribute('width'), height=root.getAttribute('height');
    if(!width||!height||width.endsWith('%')||height.endsWith('%')){
      const ratio=LOGO_MAX_SIDE/Math.max(box[2],box[3]);
      root.setAttribute('width',String(Math.max(1,Math.round(box[2]*ratio))));
      root.setAttribute('height',String(Math.max(1,Math.round(box[3]*ratio))));
    }
  }
  return new Blob([new XMLSerializer().serializeToString(root)],{type:'image/svg+xml'});
}
function logoImage(url) {
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('تعذر فتح الصورة. تحقق من سلامة الملف ودعم صيغته في المتصفح.'));
    img.src=url;
  });
}
const imageBlob=(canvas,type,quality)=>new Promise(resolve=>canvas.toBlob(resolve,type,quality));
async function logoFile(file) {
  if(!file?.name&&!file?.size)return '';
  if(!file.size)throw new Error('ملف الصورة فارغ.');
  if(file.size>LOGO_INPUT_LIMIT)throw new Error('اختر صورة لا تتجاوز 20 ميغابايت.');
  const bytes=new Uint8Array(await file.arrayBuffer()), type=logoSource(bytes);
  const source=type?new Blob([bytes],{type}):vectorLogo(bytes);
  if(!source)throw new Error('اختر ملف صورة صالحًا بإحدى الصيغ التالية: '+LOGO_FORMATS+'.');
  const url=URL.createObjectURL(source);
  try{
    const img=await logoImage(url), width=img.naturalWidth, height=img.naturalHeight;
    if(!width||!height)throw new Error('أبعاد الصورة غير صالحة.');
    if(['image/png','image/jpeg','image/webp'].includes(type)&&source.size<=LOGO_OUTPUT_LIMIT&&Math.max(width,height)<=LOGO_MAX_SIDE)return readDataURL(source);
    const canvas=document.createElement('canvas'), ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('تعذر تجهيز الصورة في هذا المتصفح.');
    for(const side of [LOGO_MAX_SIDE,1200,900,640]){
      const scale=Math.min(1,side/Math.max(width,height));
      canvas.width=Math.max(1,Math.round(width*scale));
      canvas.height=Math.max(1,Math.round(height*scale));
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const preferred=await imageBlob(canvas,type==='image/jpeg'?'image/jpeg':'image/png',.94);
      if(preferred?.size&&preferred.size<=LOGO_OUTPUT_LIMIT)return readDataURL(preferred);
      const compressed=await imageBlob(canvas,'image/webp',.94);
      if(compressed?.size&&compressed.size<=LOGO_OUTPUT_LIMIT)return readDataURL(compressed);
    }
    throw new Error('تعذر تجهيز الشعار بالحجم المناسب.');
  }finally{
    URL.revokeObjectURL(url);
  }
}
function imageMarkup(value,label,classes='') {
  if(typeof value!=='string'||!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))return '';
  return `<img${classes?' class="'+esc(classes)+'"':''} src="${esc(value)}" alt="${esc(label)}">`;
}
