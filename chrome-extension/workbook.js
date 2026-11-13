const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const utf8 = new TextEncoder();
const decoder = new TextDecoder();
const CRC_TABLE = Uint32Array.from({length:256}, (_, n) => {
  let crc = n;
  for (let i=0;i<8;i++) crc = (crc>>>1) ^ ((crc&1)?0xedb88320:0);
  return crc>>>0;
});

function xml(value) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'')
    .replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc>>>8) ^ CRC_TABLE[(crc^byte)&255];
  return (crc^0xffffffff)>>>0;
}
function zipStored(entries) {
  const local = [], central = [];
  let offset = 0, directoryLength = 0;
  for (const [name, text] of entries) {
    const nameBytes = utf8.encode(name), contents = utf8.encode(text), crc = crc32(contents);
    const localHeader = new Uint8Array(30+nameBytes.length), directory = new Uint8Array(46+nameBytes.length);
    const lh = new DataView(localHeader.buffer), cd = new DataView(directory.buffer);
    lh.setUint32(0,0x04034b50,true);
    lh.setUint16(4,20,true);
    lh.setUint32(14,crc,true);
    lh.setUint32(18,contents.length,true);
    lh.setUint32(22,contents.length,true);
    lh.setUint16(26,nameBytes.length,true);
    localHeader.set(nameBytes,30);
    cd.setUint32(0,0x02014b50,true);
    cd.setUint16(4,20,true);
    cd.setUint16(6,20,true);
    cd.setUint32(16,crc,true);
    cd.setUint32(20,contents.length,true);
    cd.setUint32(24,contents.length,true);
    cd.setUint16(28,nameBytes.length,true);
    cd.setUint32(42,offset,true);
    directory.set(nameBytes,46);
    local.push(localHeader,contents);
    central.push(directory);
    offset += localHeader.length + contents.length;
    directoryLength += directory.length;
  }
  const end = new Uint8Array(22), endView = new DataView(end.buffer);
  endView.setUint32(0,0x06054b50,true);
  endView.setUint16(8,entries.length,true);
  endView.setUint16(10,entries.length,true);
  endView.setUint32(12,directoryLength,true);
  endView.setUint32(16,offset,true);
  return new Blob([...local,...central,end], {type:XLSX_TYPE});
}
function columnName(index) {
  let name = '';
  for (let number = index+1; number; number = Math.floor((number-1)/26)) name = String.fromCharCode(65+(number-1)%26)+name;
  return name;
}
function excelFile(rows) {
  const main = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const pack = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const content = 'application/vnd.openxmlformats-officedocument.spreadsheetml.';
  const table = rows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((value,j)=>{
    const ref = columnName(j)+(i+1);
    if (typeof value==='number' && Number.isFinite(value)) return '<c r="'+ref+'"><v>'+value+'</v></c>';
    return '<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xml(value)+'</t></is></c>';
  }).join('')+'</row>').join('');
  return zipStored([
    ['[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="'+content+'sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="'+content+'worksheet+xml"/></Types>'],
    ['_rels/.rels','<Relationships xmlns="'+pack+'"><Relationship Id="rId1" Type="'+rel+'/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml','<workbook xmlns="'+main+'" xmlns:r="'+rel+'"><sheets><sheet name="الكشف" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels','<Relationships xmlns="'+pack+'"><Relationship Id="rId1" Type="'+rel+'/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/worksheets/sheet1.xml','<worksheet xmlns="'+main+'"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews><sheetData>'+table+'</sheetData></worksheet>']
  ]);
}

function xmlDocument(data) {
  if (/<!DOCTYPE|<!ENTITY/i.test(data)) throw new Error('يحتوي الملف على بنية غير مدعومة.');
  const doc = new DOMParser().parseFromString(data,'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('ملف Excel غير صالح.');
  return doc;
}
async function readExcel(file) {
  if (!file || file.size<22 || file.size>12_000_000) throw new Error('اختر ملف Excel بصيغة XLSX وحجم أقل من 12 ميغابايت.');
  const bytes = new Uint8Array(await file.arrayBuffer()), view = new DataView(bytes.buffer);
  let end = bytes.length-22;
  const min = Math.max(0,end-65535);
  while (end>=min && view.getUint32(end,true)!==0x06054b50) end--;
  if (end<min) throw new Error('تعذر فتح الملف. استخدم امتداد XLSX.');
  const count = view.getUint16(end+10,true);
  const entries = new Map();
  let cursor = view.getUint32(end+16,true);
  for (let i=0;i<count;i++) {
    if (cursor+46>bytes.length || view.getUint32(cursor,true)!==0x02014b50) throw new Error('دليل ملف Excel غير صالح.');
    const length = view.getUint16(cursor+28,true), extra = view.getUint16(cursor+30,true), comment = view.getUint16(cursor+32,true);
    const name = decoder.decode(bytes.subarray(cursor+46,cursor+46+length));
    entries.set(name,{
      method:view.getUint16(cursor+10,true), compressed:view.getUint32(cursor+20,true),
      expanded:view.getUint32(cursor+24,true), offset:view.getUint32(cursor+42,true)
    });
    cursor += 46+length+extra+comment;
  }
  async function part(name) {
    const entry = entries.get(name);
    if (!entry) return null;
    const {offset,method,compressed,expanded} = entry;
    if (expanded>28_000_000 || offset+30>bytes.length || view.getUint32(offset,true)!==0x04034b50) throw new Error('جزء غير صالح في ملف Excel.');
    const start = offset+30+view.getUint16(offset+26,true)+view.getUint16(offset+28,true);
    if (start+compressed>bytes.length) throw new Error('ملف Excel ناقص.');
    const data = bytes.subarray(start,start+compressed);
    if (method===0) return xmlDocument(decoder.decode(data));
    if (method!==8 || !globalThis.DecompressionStream) throw new Error('صيغة الضغط تحتاج إصدارًا أحدث من المتصفح.');
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const reader = stream.getReader();
    let text = '', read = 0;
    const partDecoder = new TextDecoder();
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      read += result.value.length;
      if (read>28_000_000) {
        await reader.cancel();
        throw new Error('حجم بيانات الورقة أكبر من الحد المسموح.');
      }
      text += partDecoder.decode(result.value,{stream:true});
    }
    return xmlDocument(text+partDecoder.decode());
  }
  const workbook = await part('xl/workbook.xml');
  const rels = await part('xl/_rels/workbook.xml.rels');
  const firstSheet = workbook?.getElementsByTagNameNS('*','sheet')[0];
  const relId = firstSheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
  const relation = rels && [...rels.getElementsByTagNameNS('*','Relationship')].find(e=>e.getAttribute('Id')===relId);
  const target = relation?.getAttribute('Target');
  const sheetPath = target ? target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'') : 'xl/worksheets/sheet1.xml';
  const sheet = await part(sheetPath);
  if (!sheet) throw new Error('لم أجد ورقة عمل قابلة للقراءة.');
  const sharedDoc = await part('xl/sharedStrings.xml');
  const allText = element => [...element.getElementsByTagNameNS('*','t')].map(e=>e.textContent).join('');
  const shared = sharedDoc?[...sharedDoc.getElementsByTagNameNS('*','si')].map(allText):[];
  const rows = [...sheet.getElementsByTagNameNS('*','row')];
  if (rows.length>5001) throw new Error('يدعم الاستيراد 5000 صف في العملية الواحدة.');
  return rows.map(row=>{
    const values = [];
    for (const cell of row.getElementsByTagNameNS('*','c')) {
      const letters = cell.getAttribute('r')?.match(/^[A-Z]+/)?.[0];
      const col = letters?[...letters].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1:values.length;
      if (col>511) continue;
      const type = cell.getAttribute('t'), value = cell.getElementsByTagNameNS('*','v')[0]?.textContent ?? '';
      values[col] = type==='inlineStr'?allText(cell):type==='s'?(shared[Number(value)]??''):value;
    }
    return values;
  });
}
