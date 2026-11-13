import { createServer } from 'node:http';
import { createServer as createSecureServer } from 'node:https';
import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, mkdirSync, chmodSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { YEAR, YEARS, CLASSES, SECTIONS, SCHOOL_TYPES, REGIONS, routeForClass, gradePlan } from './data.js';
import { dayISO, emptySchool, gradeKey, makeDemo, migrateState, yearKey } from './model.mjs';
import { PAGE_ACCESS, SHARED_DELEGATED, cleanWorkflowText, transferDraft, transferDecision, messageDraft, staffRequestDraft, staffRequestDecision, photoRequestDraft, photoRequestDecision, canteenSale, gradeRouteAccepts, setGradeMark } from './policy.mjs';
import {applyTeacherAction,askHomework,homeworkAttachment,normalizeTeacherSettings,parentHomework,parentLessonAttendance,teacherGradeLock,teacherWorkspace,updateTeacherAccount} from './teacher-portal.mjs';

const demo = process.argv.includes('--demo');
const port = Number(process.env.AHMAD_PORT || 8080);
const host = process.env.AHMAD_HOST || '127.0.0.1';
const tlsCert = process.env.AHMAD_TLS_CERT;
const tlsKey = process.env.AHMAD_TLS_KEY;
const secure = Boolean(tlsCert && tlsKey);
if(Boolean(tlsCert)!==Boolean(tlsKey))throw new Error('حدد الشهادة ومفتاحها معًا.');
if(!demo&&!secure&&!['127.0.0.1','::1','localhost'].includes(host))throw new Error('يتطلب تشغيل السجلات خارج الجهاز شهادة HTTPS ومفتاحها.');
if(process.platform!=='win32')process.umask(0o077);
const databasePath = resolve(process.env.AHMAD_DB || (demo?'data/ahmad-demo.sqlite':'data/ahmad.sqlite'));
mkdirSync(dirname(databasePath),{recursive:true,mode:0o700});
const db = new DatabaseSync(databasePath);
if(process.platform!=='win32')chmodSync(databasePath,0o600);
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS school_state (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, role TEXT NOT NULL, school TEXT NOT NULL, person TEXT NOT NULL, expires INTEGER NOT NULL)');
const mode = demo?'demo':'school';
const savedMode = db.prepare('SELECT value FROM settings WHERE key=?').get('mode')?.value;
if(savedMode&&savedMode!==mode)throw new Error('ملف القاعدة مخصص لوضع تشغيل مختلف.');
db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').run('mode',mode);
db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').run('teacher-card-key',randomBytes(32).toString('hex'));
const teacherCardKey=Buffer.from(db.prepare('SELECT value FROM settings WHERE key=?').get('teacher-card-key').value,'hex');
if(!db.prepare('SELECT id FROM school_state WHERE id=1').get()) {
  if(!demo&&!process.env.AHMAD_SETUP_KEY)throw new Error('عيّن AHMAD_SETUP_KEY لإنشاء حساب المدرسة الأول.');
  const initial = demo?makeDemo():{version:2,schools:{},transfers:[],messages:[]};
  db.prepare('INSERT INTO school_state (id,revision,data) VALUES (1,0,?)').run(JSON.stringify(initial));
}
const html = readFileSync(new URL('./shared.html',import.meta.url));
const now = () => Date.now();
const newId = () => randomBytes(12).toString('hex');
const digest = value => createHash('sha256').update(value).digest('hex');
const norm = value => String(value??'').trim().toLowerCase();
const toDigits = value => String(value??'').trim().replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)%16));
const cookieName = secure?'__Host-ahmad':'ahmad';
const roles = new Set(['admin','subuser']);
const authKey = process.env.AHMAD_SETUP_KEY || '';
const requestLimit = 20_000_000;
const limits = new Map();
const allState = db.prepare('SELECT revision,data FROM school_state WHERE id=1');
const saveState = db.prepare('UPDATE school_state SET revision=?, data=? WHERE id=1');

class HttpError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
const fail = (status,message) => {throw new HttpError(status,message);};
function current() {
  const entry=allState.get();
  return {revision:entry.revision,root:migrateState(JSON.parse(entry.data),demo)};
}
function writeState(mutator,expected=null) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const {root,revision}=current();
    if(expected!==null&&expected!==revision)fail(409,'تغيّرت البيانات من جهاز آخر. حدّثت النسخة المعروضة. راجع التغييرات وأعد المحاولة.');
    const value=mutator(root);
    saveState.run(revision+1,JSON.stringify(root));
    db.exec('COMMIT');
    return {root,revision:revision+1,value};
  } catch(error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
function requireObject(value) {
  if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'البيانات المرسلة غير صالحة.');
  return value;
}
async function body(req) {
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'صيغة الطلب غير مدعومة.');
  const chunks=[];
  let length=0;
  for await(const chunk of req) {
    length+=chunk.length;
    if(length>requestLimit)fail(413,'حجم البيانات أكبر من الحد المسموح.');
    chunks.push(chunk);
  }
  let parsed;
  try {parsed=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail(400,'تعذر قراءة الطلب.');}
  return requireObject(parsed);
}
function sameOrigin(req) {
  const origin=req.headers.origin;
  if(!origin||origin!==(secure?'https://':'http://')+req.headers.host||req.headers['sec-fetch-site']==='cross-site')fail(403,'الطلب خارج عنوان المنظومة.');
}
function validYear(value) {return YEARS.includes(value);}
function throttle(req,group,maximum=30) {
  const minute=Math.floor(now()/60000);
  if(limits.size>3000)for(const [key,value] of limits)if(value.minute!==minute)limits.delete(key);
  const id=group+'|'+req.socket.remoteAddress;
  const item=limits.get(id);
  const count=item?.minute===minute?item.count+1:1;
  limits.set(id,{minute,count});
  if(count>maximum)fail(429,'محاولات كثيرة. جرّب بعد دقيقة.');
}
function setSession(res,role,school,person='',req=null) {
  if(req)revoke(req);
  const token=randomBytes(32).toString('hex');
  const ttl=roles.has(role)?43200:7200;
  db.prepare('DELETE FROM sessions WHERE expires<=?').run(now());
  db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?)').run(digest(token),role,school,person,now()+ttl*1000);
  res.setHeader('Set-Cookie',cookieName+'='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+ttl+(secure?'; Secure':''));
}
function tokenOf(req) {
  const value=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.split('=')[1];
  return /^[a-f0-9]{64}$/.test(value||'')?digest(value):null;
}
function revoke(req) {
  const token=tokenOf(req);
  if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(token);
}
function sessionOf(req,root) {
  const token=tokenOf(req);
  if(!token)return null;
  const session=db.prepare('SELECT role, school, person FROM sessions WHERE token=? AND expires>?').get(token,now());
  if(!session||!Object.hasOwn(root.schools,session.school))return null;
  const s=root.schools[session.school];
  if(session.role==='subuser'&&!s.users.some(u=>u.id===session.person&&u.active))return null;
  return session;
}
function adminSession(req,root) {
  const session=sessionOf(req,root);
  if(!session||!roles.has(session.role))fail(401,'سجّل دخول الإدارة أولًا.');
  return session;
}
function permissionsOf(root,session) {
  if(session.role==='admin')return [];
  return root.schools[session.school].users.find(u=>u.id===session.person)?.permissions?.filter(page=>SHARED_DELEGATED.has(page))||[];
}
function pageAllowed(root,session,page) {
  return session.role==='admin'||permissionsOf(root,session).includes(page);
}
function passwordRecord(password) {
  if(typeof password!=='string'||password.length<8||password.length>160)fail(400,'كلمة المرور يجب أن تتكون من 8 إلى 160 حرفًا.');
  const salt=newId();
  return {salt,digest:pbkdf2Sync(password,salt,150000,32,'sha256').toString('hex')};
}
function matchesPassword(password,account) {
  if(typeof password!=='string'||password.length>160||!account?.salt||!(/^[a-f0-9]{64}$/.test(account.digest)))return false;
  return timingSafeEqual(Buffer.from(account.digest,'hex'),pbkdf2Sync(password,account.salt,150000,32,'sha256'));
}
function sameCode(input,record) {
  if(typeof input!=='string'||!/^[0-9]{4,8}$/.test(input)||!record?.codeHash)return false;
  return timingSafeEqual(Buffer.from(record.codeHash,'hex'),pbkdf2Sync(input,record.codeSalt,90000,32,'sha256'));
}
function codeRecord(value) {
  if(!/^[0-9]{4,8}$/.test(value))fail(400,'أدخل رمزًا من 4 إلى 8 أرقام.');
  const codeSalt=newId();
  return {codeSalt,codeHash:pbkdf2Sync(value,codeSalt,90000,32,'sha256').toString('hex')};
}
function teacherCodeRecord(value,school,person) {
  const record=codeRecord(value), nonce=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',teacherCardKey,nonce);
  cipher.setAAD(Buffer.from(school+'|'+person));
  const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return {...record,card:[nonce,cipher.getAuthTag(),encrypted].map(part=>part.toString('base64')).join('.')};
}
function teacherCardCode(record,school,person) {
  if(demo&&school==='sample'&&record?.pin)return record.pin;
  if(!record?.card)return '';
  try{
    const [nonce,tag,encrypted]=record.card.split('.').map(part=>Buffer.from(part,'base64'));
    const decipher=createDecipheriv('aes-256-gcm',teacherCardKey,nonce);
    decipher.setAAD(Buffer.from(school+'|'+person));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted),decipher.final()]).toString('utf8');
  }catch{return '';}
}
function imageData(value,required=false) {
  if(!value&&!required)return '';
  if(typeof value!=='string'||value.length>2_000_050)fail(400,'الصورة أكبر من الحد المسموح.');
  const match=value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match)fail(400,'اختر صورة PNG أو JPEG أو WebP.');
  const bytes=Buffer.from(match[2],'base64');
  const valid=match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):
    match[1]==='jpeg'?bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255:
      bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  if(!valid)fail(400,'تعذر التحقق من صيغة الصورة.');
  return value;
}
function profileFields(data) {
  const fields={};
  for(const key of ['name','principal','exam','entry','phone','type','region','email'])fields[key]=cleanWorkflowText(data[key],key==='email'?254:150,true);
  if(!/^09[0-9]{8}$/.test(fields.phone)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)||!SCHOOL_TYPES.includes(fields.type)||!REGIONS.includes(fields.region))fail(400,'راجع الهاتف والبريد ونوع المدرسة والبلدية.');
  return fields;
}
function availableUsername(root,value,except='') {
  const name=cleanWorkflowText(value,55,true);
  if(name.length<3||/[\u0000-\u001f]/.test(name))fail(400,'أدخل اسم مستخدم صالحًا.');
  if(Object.values(root.schools).some(s=>norm(s.profile.username)===norm(name)||s.users.some(u=>u.id!==except&&norm(u.username)===norm(name))))fail(409,'اسم المستخدم مستخدم بالفعل.');
  return name;
}
function publicProfile(profile,full=false) {
  const fields=full?['name','principal','exam','entry','phone','type','region','email','photo','code']:['name','principal','exam','photo','code'];
  fields.push('printLogo','printLogoHidden','photoHidden');
  return Object.fromEntries(fields.map(key=>[key,profile[key]]).filter(([,value])=>value!==undefined));
}
function snapshot(root,revision,session,page) {
  const school=root.schools[session.school], admin=session.role==='admin', permitted=pageAllowed(root,session,page);
  const data={profile:publicProfile(school.profile,admin&&page==='user-profile')};
  const fields=permitted&&Object.hasOwn(PAGE_ACCESS,page)?PAGE_ACCESS[page].read||[]:[];
  for(const field of fields) {
    if(field==='profile'||field==='teacherCodes'||field==='guardianCodes')continue;
    if(Object.hasOwn(school,field))data[field]=school[field];
  }
  if(permitted&&page==='sub-users'&&admin)data.users=school.users.map(({id,username,name,active,permissions})=>({id,username,name,active,permissions}));
  if(permitted&&page==='manage-teacher-accounts'&&admin)data.teacherCodes=Object.fromEntries(Object.entries(school.teacherCodes).map(([id,r])=>[id,{active:r.active,last:r.last,configured:Boolean(r.codeHash||r.pin),pin:teacherCardCode(r,session.school,id)}]));
  if(permitted&&page==='parent-portal')data.guardianCodes=Object.fromEntries(Object.keys(school.guardianCodes).map(id=>[id,true]));
  const active=school.students.filter(s=>s.year===YEAR&&!s.archive);
  const stats=page==='dashboard'?{
    count:active.length,stages:CLASSES.map(cls=>{
      const rows=active.filter(s=>s.cls===cls);
      return {cls,count:rows.length,boys:rows.filter(s=>s.gender==='ذكر').length,girls:rows.filter(s=>s.gender==='أنثى').length};
    }).filter(row=>row.count),
    recent:admin?[...active].sort((a,b)=>b.created-a.created).slice(0,8).map(({id,name,reg,cls,photo,national,birth})=>({id,name,reg,cls,photo,national,birth})):[]
  }:null;
  if(!admin) {
    if(data.students)data.students=data.students.map(({photo,...row})=>row);
    if(data.staff)data.staff=data.staff.map(({id,name,year,job,shift,status,created})=>({id,name,year,job,shift,status,created}));
  }
  const directory=['inter-school-transfers','school-messages','all-student'].includes(page)&&permitted?Object.entries(root.schools).map(([id,s])=>({id,name:s.profile.name,region:s.profile.region})):[];
  const transfers=page==='inter-school-transfers'&&permitted?root.transfers.filter(t=>t.from===session.school||t.to===session.school):[];
  const messages=page==='school-messages'&&permitted?root.messages.filter(m=>m.from===session.school||m.to===session.school):[];
  return {school:session.school,schoolCode:school.profile.code,role:session.role,userId:session.person,revision,data,directory,transfers,messages,stats,permissions:permissionsOf(root,session)};
}
const keyedObject=(value)=>value&&typeof value==='object'&&!Array.isArray(value);
const safeRecordId=value=>typeof value==='string'&&value.length<=128&&!['__proto__','constructor','prototype'].includes(value)&&value.trim();
function validateGradeChange(grades,s) {
  const students=new Map(s.students.map(row=>[row.id,row]));
  const validSources=new Set(['add_kindergarten_grades','add_grades','add_activity_grades','student-grades-sse','remedial_grades','student-grades-ninth','student-grades-first-secondary','student-grades-second-secondary','student-grades-third-secondary']);
  for(const [id,marks] of Object.entries(grades)) {
    const student=students.get(id);
    if(!student||!keyedObject(marks))fail(400,'درجات مرتبطة بسجل غير موجود.');
    for(const [key,value] of Object.entries(marks)) {
      const [source,subject,index,...rest]=key.split('|'), i=Number(index);
      if(!validSources.has(source)||!gradeRouteAccepts(source,student.cls)||!/^[0-3]$/.test(index)||rest.length)fail(400,'خانة الرصد غير صالحة.');
      const plan=gradePlan(source,student.cls,student.stream);
      const item=plan.items.find(x=>x.key===subject);
      if(!item||i>=plan.components.length||(item.choices?!item.choices.includes(value):typeof value!=='number'||!Number.isFinite(value)||value<0||value>item.max[i]))fail(400,'توجد درجة خارج المدى المحدد.');
    }
  }
}
function verticalMark(req,data) {
  const entry=writeState(root=>{
    const session=adminSession(req,root);
    if(session.school!==data.school||!pageAllowed(root,session,'vertical-grades'))fail(403,'لا توجد صلاحية للرصد العمودي.');
    const s=root.schools[session.school], student=s.students.find(row=>row.id===data.student);
    if(!student||student.archive||CLASSES.indexOf(student.cls)<2||data.source!==routeForClass(student.cls)||typeof data.value!=='string'||data.value.length>20)fail(400,'الدرجة خارج جدول الرصد العمودي.');
    const current=s.grades[student.id]?.[gradeKey(data.source,data.subject,data.index)]??'';
    if(data.before!==undefined&&String(data.before)!==String(current)&&String(data.value)!==String(current))fail(409,'تغيّرت الدرجة من جهاز آخر. راجع القيمة ثم أعد المحاولة.');
    return setGradeMark(s,student,data.source,data.subject,data.index,data.value);
  });
  return {mark:entry.value,revision:entry.revision};
}
function validateHall(records,school) {
  const students=new Map(school.students.map(row=>[row.id,row]));
  const seats=new Set(), secrets=new Set();
  for(const [id,row] of Object.entries(records)) {
    const student=students.get(id);
    if(!student||!keyedObject(row)||row.year!==student.year||
      !Number.isSafeInteger(row.seat)||row.seat<100000||row.seat>999999||
      !Number.isSafeInteger(row.secret)||row.secret<1000||row.secret>9999||
      !Number.isSafeInteger(row.room)||row.room<1||row.room>999||
      typeof row.exam!=='string'||row.exam.length>150||typeof row.head!=='string'||row.head.length>150)fail(400,'يوجد سجل قاعة أو رقم جلوس غير صالح.');
    const seat=row.year+'|'+row.seat, secret=row.year+'|'+row.secret;
    if(seats.has(seat)||secrets.has(secret))fail(409,'يوجد رقم جلوس أو رقم سري مكرر في السنة.');
    seats.add(seat);secrets.add(secret);
  }
}
function validateAttendance(records,school,staff) {
  const persons=new Map((staff?school.staff:school.students).map(row=>[row.id,row]));
  const states=['','حاضر','غائب','متأخر','مستأذن',...(staff?['عطلة']:[])];
  for(const [key,day] of Object.entries(records)){
    const [year,date,extra]=key.split('|');
    if(extra!==undefined||!validYear(year)||!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!keyedObject(day))fail(400,'تاريخ سجل الحضور غير صالح.');
    for(const [id,record] of Object.entries(day)){
      if(persons.get(id)?.year!==year||!keyedObject(record))fail(400,'الحضور مرتبط بسجل غير موجود.');
      for(const [period,status] of Object.entries(record)){
        if(staff&&period==='note'&&typeof status==='string'&&status.length<=1500)continue;
        if(!(staff?period==='0':/^[0-2]$/.test(period))||!states.includes(status))fail(400,'توجد حالة حضور غير صالحة.');
      }
    }
  }
}
function validCollection(value,prior,key,s) {
  const arrayKeys=new Set(['students','staff','classes','subjects','assignments','teachers','questions','receipts','expenses','income','notes','chat','items','wallet','feeItems']);
  if(Array.isArray(value)!==arrayKeys.has(key)||!value||typeof value!=='object')fail(400,'بنية البيانات غير صالحة.');
  if(key==='students'||key==='staff') {
    const ids=new Set(), reg=new Set(), national=new Set();
    for(const row of value) {
      requireObject(row);
      if(!safeRecordId(row.id)||ids.has(row.id)||!YEARS.includes(row.year)||typeof row.name!=='string'||!row.name.trim()||row.name.length>180)fail(400,'يوجد سجل غير صالح أو مكرر.');
      ids.add(row.id);
      if(key==='students'){
        if(typeof row.reg!=='string'||!row.reg.trim()||row.reg.length>45||!CLASSES.includes(row.cls)||!['ذكر','أنثى'].includes(row.gender)||row.section&&!SECTIONS.includes(row.section)||reg.has(row.year+'|'+norm(row.reg)))fail(400,'يوجد رقم قيد مكرر أو بيانات صف غير صالحة.');
        reg.add(row.year+'|'+norm(row.reg));
      }
      if(row.national){
        if(typeof row.national!=='string'||!/^[0-9]{12}$/.test(row.national)||national.has(row.year+'|'+row.national))fail(400,'يوجد رقم وطني غير صالح أو مكرر.');
        national.add(row.year+'|'+row.national);
      }
    }
  }
  if(key==='grades')validateGradeChange(value,s);
  if(key==='hall')validateHall(value,s);
  if(key==='attendance'||key==='staffAttendance')validateAttendance(value,s,key==='staffAttendance');
  if(key==='teacherAvailability')for(const [id,slots] of Object.entries(value)) {
    const [year,teacher,...rest]=id.split('|');
    if(!validYear(year)||rest.length||!s.staff.some(row=>row.year===year&&row.id===teacher)||!Array.isArray(slots)||slots.length>56||slots.some(slot=>typeof slot!=='string'||!/^.{1,15}\|[0-7]$/.test(slot)))fail(400,'قيود التفرغ غير صالحة.');
  }
  if(key==='bookTemplates')for(const [id,items] of Object.entries(value)) {
    const [year,cls,stream,...rest]=id.split('|');
    if(!validYear(year)||!CLASSES.includes(cls)||!['','علمي','أدبي'].includes(stream)||rest.length||!Array.isArray(items)||items.length<1||items.length>40||new Set(items.map(item=>item?.key)).size!==items.length||items.some(item=>!keyedObject(item)||!safeRecordId(item.key)||typeof item.label!=='string'||!item.label.trim()||item.label.length>100||typeof item.group!=='string'||item.group.length>100))fail(400,'أعمدة كشف الكتب غير صالحة.');
  }
  if(key==='gradingRules')for(const [id,rule] of Object.entries(value)) {
    const [year,cls,stream,...rest]=id.split('|');
    if(!YEARS.includes(year)||!CLASSES.includes(cls)||!['','علمي','أدبي'].includes(stream)||rest.length||!keyedObject(rule)||typeof rule.enabled!=='boolean'||[rule.overall,rule.subject].some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>100)||!Number.isInteger(rule.remedial)||rule.remedial<0||rule.remedial>20)fail(400,'قواعد الاحتساب غير صالحة.');
  }
  if(key==='certificateResults')for(const [id,result] of Object.entries(value)) {
    const student=s.students.find(row=>row.id===id&&['التاسع','الثالث ثانوي'].includes(row.cls));
    if(!student||!keyedObject(result)||!/^\d{6}$/.test(result.seat)||!['ناجح','دور ثان','راسب'].includes(result.status)||typeof result.total!=='number'||!Number.isFinite(result.total)||result.total<0||typeof result.percent!=='number'||!Number.isFinite(result.percent)||result.percent<0||result.percent>100||typeof result.public!=='boolean')fail(400,'نتيجة الشهادة غير صالحة.');
    if(s.students.some(row=>row.id!==id&&row.year===student.year&&row.cls===student.cls&&value[row.id]?.seat===result.seat))fail(409,'يوجد رقم جلوس مكرر.');
  }
  if(key==='fees'||key==='discounts'||key==='walletLimits')for(const amount of Object.values(value))if(!Number.isSafeInteger(amount)||amount<0)fail(400,'توجد قيمة مالية غير صالحة.');
  if(key==='feeItems')for(const row of value)if(!keyedObject(row)||!safeRecordId(row.id)||typeof row.name!=='string'||!row.name.trim()||!YEARS.includes(row.year)||row.cls&&!CLASSES.includes(row.cls)||!Number.isSafeInteger(row.amount)||row.amount<1)fail(400,'يوجد بند رسوم غير صالح.');
  if(key==='carriedBalances')for(const balances of Object.values(value))if(!keyedObject(balances)||Object.values(balances).some(amount=>!Number.isSafeInteger(amount)||amount<0))fail(400,'توجد قيمة ترحيل غير صالحة.');
  if(key==='items')for(const row of value)if(!keyedObject(row)||!safeRecordId(row.id)||typeof row.name!=='string'||!Number.isSafeInteger(row.price)||row.price<1||!Number.isSafeInteger(row.stock)||row.stock<0)fail(400,'يوجد صنف ببيانات غير صالحة.');
  if(key==='receipts'||key==='wallet'||key==='income'||key==='expenses')for(const row of value)if(!keyedObject(row)||!safeRecordId(row.id)||!Number.isSafeInteger(row.amount)||!row.amount||row.amount<0&&key!=='wallet')fail(400,'توجد حركة مالية غير صالحة.');
  if(prior!==undefined&&Array.isArray(prior)!==Array.isArray(value))fail(400,'بنية البيانات غير صالحة.');
}
function stateUpdate(req,data) {
  const page=data.page, changes=requireObject(data.changes);
  if(!Object.hasOwn(PAGE_ACCESS,page)||!Number.isSafeInteger(data.revision))fail(400,'الصفحة أو المراجعة غير صالحة.');
  const entry=writeState(root=>{
    const session=adminSession(req,root);
    if(data.school!==session.school)fail(409,'تغيّر حساب المدرسة في هذا المتصفح. حدّث الصفحة وأعد المحاولة.');
    if(!pageAllowed(root,session,page))fail(403,'لا توجد صلاحية لهذه الصفحة.');
    const s=root.schools[session.school];
    const allowed=PAGE_ACCESS[page].write||[];
    for(const [key,value] of Object.entries(changes)) {
      if(!allowed.includes(key))fail(403,'هذه العملية خارج صلاحية الصفحة.');
      if(key==='profile') {
        const photo=Object.hasOwn(value,'photo')?imageData(value.photo):s.profile.photo;
        const printLogo=Object.hasOwn(value,'printLogo')?imageData(value.printLogo):s.profile.printLogo;
        const printLogoHidden=Object.hasOwn(value,'printLogoHidden')?Boolean(value.printLogoHidden):s.profile.printLogoHidden;
        const photoHidden=Object.hasOwn(value,'photoHidden')?Boolean(value.photoHidden):s.profile.photoHidden;
        s.profile={...s.profile,...profileFields(value),photo,printLogo,printLogoHidden,photoHidden};
        continue;
      }
      validCollection(value,s[key],key,s);
      if(key==='grades'&&(session.role==='subuser'||page==='vertical-grades')) {
        const source=['record-exam-score','student-grades-barcode'].includes(page)?'student-grades-sse':page;
        for(const id of new Set([...Object.keys(s.grades),...Object.keys(value)])) {
          const before=s.grades[id]||{}, next=value[id]||{};
          const student=page==='vertical-grades'?s.students.find(row=>row.id===id&&!row.archive):null;
          const allowed=page==='vertical-grades'?student&&CLASSES.indexOf(student.cls)>=2&&routeForClass(student.cls):source;
          for(const mark of new Set([...Object.keys(before),...Object.keys(next)])) {
            if(before[mark]!==next[mark]&&(!allowed||!mark.startsWith(allowed+'|')))fail(403,'الدرجة خارج صلاحية الرصد لهذه الصفحة.');
          }
        }
      }
      if(key==='students') {
        const previous=new Map(s.students.map(row=>[row.id,row]));
        for(const transfer of root.transfers.filter(t=>t.from===session.school&&['pending','accepted'].includes(t.status))) {
          const row=value.find(x=>x.id===transfer.student);
          if(!row||transfer.status==='accepted'&&row.archive?.interTransfer!==transfer.id||transfer.status==='pending'&&row.archive)fail(409,'يوجد طلب نقل مرتبط بسجل الطالب.');
        }
        for(const row of value) {
          const old=previous.get(row.id);
          if(old&&(old.cls!==row.cls||(old.stream||'')!==(row.stream||''))&&Object.keys(s.grades[row.id]||{}).length)fail(409,'السجل مرتبط بدرجات محفوظة في صفه الحالي.');
          if(old?.photo){row.photo=old.photo;row.photoApproved=old.photoApproved;}
          else {delete row.photo;delete row.photoApproved;}
        }
        for(const id of previous.keys())if(!value.some(row=>row.id===id)) {
          if(s.receipts.some(row=>row.student===id)||s.notes.some(row=>row.student===id)||s.wallet.some(row=>row.student===id))fail(409,'للسجل معاملات مرتبطة. استخدم الأرشيف.');
          delete s.grades[id];delete s.hall[id];delete s.books[id];delete s.discounts[id];delete s.guardianCodes[id];delete s.certificateResults[id];delete s.walletLimits?.[id];delete s.carriedBalances[id];
          s.photoRequests=s.photoRequests.filter(row=>row.student!==id);
          for(const entries of Object.values(s.attendance))delete entries[id];
        }
      }
      s[key]=value;
    }
    return session;
  },data.revision);
  return snapshot(entry.root,entry.revision,entry.value,page);
}
function portalSchool(root,code) {
  const key=norm(code);
  const entry=Object.entries(root.schools).find(([,s])=>norm(s.profile.code)===key&&key);
  if(!entry)fail(404,'تعذر التحقق من بيانات الدخول.');
  return entry;
}
function publicYear(value) {
  return value===undefined||value===''?YEAR:validYear(value)?value:fail(400,'اختر سنة دراسية صالحة.');
}
function portalStudent(row) {
  const {id,year,reg,name,cls,section,stream,photo}=row;
  return {id,year,reg,name,cls,section,stream,photo};
}
function publicLookup(data,root) {
  const [id,s]=portalSchool(root,data.school);
  const q=toDigits(data.query);
  const proof=toDigits(data.pin);
  const year=publicYear(data.year);
  if(!q||q.length>30)fail(404,'لم يتم العثور على الطالب.');
  const parent=data.kind==='parents';
  if(!['parents','results'].includes(data.kind))fail(400,'نوع الاستعلام غير صالح.');
  const keyMatch=row=>[row.reg,row.national,...(parent?[row.phone]:[])].some(v=>v&&String(v)===q);
  const rows=s.students.filter(row=>row.year===year&&!row.archive&&keyMatch(row));
  const authorized=rows.filter(row=>sameCode(proof,s.guardianCodes[row.id])||(demo&&id==='sample'&&q&&['900001','0900000001'].includes(q)&&['sample-1','sample-2'].includes(row.id)&&!s.guardianCodes[row.id]));
  if(!authorized.length)fail(404,'لم يتم العثور على الطالب أو تعذر التحقق من رمز الوصول.');
  const students=authorized.map(portalStudent);
  const result={
    id,profile:{name:s.profile.name},
    students,grades:{},published:{},attendance:{},notes:[],photoRequests:[],gradingRules:{},certificateResults:{}
  };
  for(const row of authorized) {
    const key=yearKey(row.year,row.cls,row.stream||'');
    if(s.published[key]){
      result.published[key]=true;
      result.grades[row.id]=s.grades[row.id]||{};
      if(s.gradingRules[key])result.gradingRules[key]=s.gradingRules[key];
    }
    if(s.certificateResults[row.id]?.public)result.certificateResults[row.id]=s.certificateResults[row.id];
  }
  if(parent) {
    Object.assign(result,parentHomework(s,students));
    result.lessonAttendance=parentLessonAttendance(s,students);
    const ids=new Set(students.map(row=>row.id));
    result.notes=s.notes.filter(n=>ids.has(n.student)).slice(-100);
    result.photoRequests=s.photoRequests.filter(n=>ids.has(n.student)).slice(-50).map(({image,...row})=>row);
    for(const [key,records] of Object.entries(s.attendance).sort(([a],[b])=>b.localeCompare(a)).slice(0,60)) {
      result.attendance[key]=Object.fromEntries(Object.entries(records).filter(([student])=>ids.has(student)));
    }
  }
  return result;
}
function staffAuth(root,data,kind) {
  const [id,s]=portalSchool(root,data.school);
  const national=toDigits(data.national), pin=toDigits(data.pin);
  const staff=s.staff.find(x=>x.year===YEAR&&x.national&&x.national===national);
  const code=staff&&s.teacherCodes[staff.id];
  const sampleCode=demo&&id==='sample'&&code?.pin===pin;
  if(!staff||!code?.active||!(sameCode(pin,code)||sampleCode))fail(404,'تعذر التحقق من بيانات الدخول.');
  const record={id:staff.id,name:staff.name,year:staff.year};
  if(kind==='staff') {
    for(const key of ['phone','address','qualification','university'])record[key]=staff[key]||'';
    return {id,staff:record,requests:s.staffRequests.filter(r=>r.staff===staff.id).slice(-30)};
  }
  const rows=s.assignments.filter(a=>a.year===staff.year&&a.teacher===staff.id);
  return {id,staff:record,rows:rows.map(a=>[staff.name,a.cls,a.section,a.shift,s.subjects.find(x=>x.id===a.subject)?.name||'—',a.lessons,a.date])};
}
function teacherSessionRecord(req,root) {
  const token=teacherCookieToken(req);
  const record=/^[a-f0-9]{64}$/.test(token||'')?db.prepare("SELECT school,person FROM sessions WHERE token=? AND role='teacher' AND expires>?").get(digest(token),now()):null;
  const s=record&&root.schools[record.school], staff=s?.staff.find(row=>row.id===record.person&&row.year===YEAR);
  if(!staff||!s.teacherCodes[staff.id]?.active)fail(401,'انتهت جلسة المعلم. سجّل الدخول مرة أخرى.');
  return {s,staff};
}
const teacherCookieName=secure?'__Host-ahmad-teacher':'ahmad-teacher';
function teacherCookieToken(req) {
  return String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(teacherCookieName+'='))?.slice(teacherCookieName.length+1);
}
function revokeTeacherCookie(req) {
  const token=teacherCookieToken(req);
  if(/^[a-f0-9]{64}$/.test(token||''))db.prepare("DELETE FROM sessions WHERE token=? AND role='teacher'").run(digest(token));
}
function teacherCookie(res,token,maxAge) {
  res.setHeader('Set-Cookie',teacherCookieName+'='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+maxAge+(secure?'; Secure':''));
}
function validPin(value) {return toDigits(value);}
const workflows = {
  'transfer-send':['inter-school-transfers',(root,s,session,d)=>transferDraft(root,session.school,d.to,d.student,d.year,d.note,newId())],
  'transfer-review':['inter-school-transfers',(root,s,session,d)=>transferDecision(root,session.school,d.id,d.decision,d.section,d.reply,newId(),SECTIONS)],
  'message-send':['school-messages',(root,s,session,d)=>messageDraft(root,session.school,d.to,d.title,d.body,d.replyTo,newId())],
  'message-read':['school-messages',(root,s,session,d)=>{
    const message=root.messages.find(m=>m.id===d.id&&m.to===session.school);
    if(!message)fail(404,'الرسالة غير متاحة.');
    message.read ||= new Date().toISOString();
  }],
  'staff-review':['review-staff-requests',(root,s,session,d)=>staffRequestDecision(s,d.id,d.decision,d.reply)],
  'photo-review':['approve-photos',(root,s,session,d)=>photoRequestDecision(s,d.id,d.decision,d.reply)],
  'guardian-code':['parent-portal',(root,s,session,d)=>{
    if(!s.students.some(x=>x.id===d.id&&!x.archive))fail(404,'سجل الطالب غير متاح.');
    if(d.disable)delete s.guardianCodes[d.id];
    else s.guardianCodes[d.id]=codeRecord(validPin(d.pin));
  }],
  'teacher-code':['manage-teacher-accounts',(root,s,session,d)=>{
    if(d.name!==undefined||d.national!==undefined)updateTeacherAccount(s,d.id,d.name,toDigits(d.national));
    if(!s.staff.some(x=>x.id===d.id&&x.national))fail(404,'سجل الموظف غير متاح.');
    const old=s.teacherCodes[d.id]||{};
    if(d.pin)s.teacherCodes[d.id]={...teacherCodeRecord(validPin(d.pin),session.school,d.id),active:Boolean(d.active),last:old.last};
    else if(old.codeHash||demo&&old.pin)s.teacherCodes[d.id]={...old,active:Boolean(d.active)};
    else fail(400,'أدخل رمز الوصول أولًا.');
    if(d.pin||!d.active||d.national!==undefined)db.prepare("DELETE FROM sessions WHERE role='teacher' AND school=? AND person=?").run(session.school,d.id);
  }],
  'teacher-settings':['manage-teacher-accounts',(root,s,session,d)=>{
    s.teacherSettings={...s.teacherSettings,...normalizeTeacherSettings(d)};
  }],
  'teacher-lock':['manage-teacher-accounts',(root,s,session,d)=>{
    if(d.remove)s.teacherSettings.locks=(s.teacherSettings.locks||[]).filter(lock=>lock.id!==d.remove);
    else teacherGradeLock(s,d,newId());
  }],
  'canteen-code':['manage-canteen',(root,s,session,d)=>{
    s.canteenCode=codeRecord(validPin(d.pin));
    db.prepare("DELETE FROM sessions WHERE role='canteen' AND school=?").run(session.school);
  }],
  'subuser-save':['sub-users',(root,s,session,d)=>{
    const old=d.id?s.users.find(u=>u.id===d.id):null;
    if(d.id&&!old)fail(404,'الحساب غير موجود.');
    const id=old?.id||newId();
    const record={id,username:availableUsername(root,d.username,id),name:cleanWorkflowText(d.name,150,true),active:Boolean(d.active),
      permissions:[...new Set(Array.isArray(d.permissions)?d.permissions.filter(page=>SHARED_DELEGATED.has(page)):[])]};
    if(d.password)Object.assign(record,passwordRecord(d.password));
    if(old){
      Object.assign(old,record);
      if(d.password||!old.active)db.prepare("DELETE FROM sessions WHERE role='subuser' AND school=? AND person=?").run(session.school,id);
    } else {
      if(!record.digest)fail(400,'أدخل كلمة المرور.');
      s.users.push(record);
    }
  }]
};
function workflow(req,request) {
  const config=Object.hasOwn(workflows,request.name)?workflows[request.name]:null;
  if(!config)fail(404,'العملية غير متاحة.');
  const [page,action]=config, data=requireObject(request.data);
  const entry=writeState(root=>{
    const session=adminSession(req,root);
    if(request.school!==session.school)fail(409,'تغيّر حساب المدرسة في هذا المتصفح. حدّث الصفحة وأعد المحاولة.');
    if(session.role!=='admin')fail(403,'تحتاج هذه العملية صلاحية مدير المدرسة.');
    action(root,root.schools[session.school],session,data);
    return session;
  });
  const renderedPage=typeof request.page==='string'&&request.page.length<80?request.page:page;
  return {state:snapshot(entry.root,entry.revision,entry.value,renderedPage)};
}
function send(res,status,value,type='application/json; charset=utf-8') {
  res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Permissions-Policy':'geolocation=(), microphone=(), camera=()'});
  res.end(type.startsWith('application/json')?JSON.stringify(value):value);
}
async function handle(req,res) {
  try {
    const url=new URL(req.url,'http://internal.invalid');
    if(req.method==='GET'&&url.pathname==='/')return send(res,200,html,'text/html; charset=utf-8');
    if(req.method==='GET'&&url.pathname==='/api/info')return send(res,200,{demo,registration:demo||Boolean(authKey)});
    if(req.method==='GET'&&url.pathname==='/api/state'){
      const {root,revision}=current(), session=adminSession(req,root);
      return send(res,200,snapshot(root,revision,session,url.searchParams.get('page')||'dashboard'));
    }
    if(req.method!=='POST'||!url.pathname.startsWith('/api/'))fail(404,'الصفحة غير متاحة.');
    sameOrigin(req);
    const d=await body(req);
    if(url.pathname==='/api/login'){
      throttle(req,'login',30);
      const {root}=current();
      const username=norm(d.username);
      for(const [id,s] of Object.entries(root.schools)){
        const sample=demo&&['sample','sample2'].includes(id)&&d.password==='عرض-2026';
        if(norm(s.profile.username)===username&&(sample||matchesPassword(d.password,s.profile))){
          setSession(res,'admin',id,'',req);
          return send(res,200,{ok:true});
        }
        const user=s.users.find(u=>u.active&&norm(u.username)===username);
        if(user&&matchesPassword(d.password,user)){
          setSession(res,'subuser',id,user.id,req);
          return send(res,200,{ok:true});
        }
      }
      fail(401,'اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
    if(url.pathname==='/api/logout'){
      revoke(req);
      res.setHeader('Set-Cookie',cookieName+'=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'+(secure?'; Secure':''));
      return send(res,200,{ok:true});
    }
    if(url.pathname==='/api/register'){
      throttle(req,'register',15);
      if(!demo&&(!authKey||typeof d.setup!=='string'||!timingSafeEqual(Buffer.from(digest(d.setup)),Buffer.from(digest(authKey)))))fail(403,'رمز إنشاء المدرسة غير صحيح.');
      const id=newId(), profile=profileFields(d);
      const entry=writeState(root=>{
        const username=availableUsername(root,d.username), photo=imageData(d.photo);
        let code;
        do{code='SCH-'+randomBytes(4).toString('hex').toUpperCase();}
        while(Object.values(root.schools).some(s=>s.profile.code===code));
        root.schools[id]=emptySchool({...profile,username,photo,code,...passwordRecord(d.password)});
        return code;
      });
      return send(res,201,{code:entry.value});
    }
    if(url.pathname==='/api/update')return send(res,200,stateUpdate(req,d));
    if(url.pathname==='/api/vertical-mark')return send(res,200,verticalMark(req,d));
    if(url.pathname==='/api/workflow')return send(res,200,workflow(req,d));
    if(url.pathname==='/api/lookup'){
      throttle(req,'lookup',40);
      return send(res,200,publicLookup(d,current().root));
    }
    if(url.pathname==='/api/photo'){
      throttle(req,'photo',20);
      const entry=writeState(root=>{
        const proof=publicLookup({...requireObject(d.proof),kind:'parents'},root);
        if(!proof.students.some(row=>row.id===d.id))fail(403,'الطالب غير متاح لهذه الجلسة.');
        photoRequestDraft(root.schools[proof.id],d.id,imageData(d.image,true),d.note,newId());
        return publicLookup({...d.proof,kind:'parents'},root);
      });
      return send(res,201,entry.value);
    }
    if(url.pathname==='/api/homework-question'){
      throttle(req,'homework-question',24);
      const entry=writeState(root=>{
        const proof=publicLookup({...requireObject(d.proof),kind:'parents'},root);
        const student=proof.students.find(row=>row.id===d.student);
        if(!student)fail(403,'الطالب خارج هذه الجلسة.');
        askHomework(root.schools[proof.id],student,d.homework,d.text,newId());
        return publicLookup({...d.proof,kind:'parents'},root);
      });
      return send(res,201,entry.value);
    }
    if(url.pathname==='/api/homework-attachment'){
      throttle(req,'homework-attachment',45);
      const {root}=current();
      if(d.proof){
        const proof=publicLookup({...requireObject(d.proof),kind:'parents'},root);
        return send(res,200,homeworkAttachment(root.schools[proof.id],d.id,proof.students));
      }
      const {s,staff}=teacherSessionRecord(req,root);
      return send(res,200,homeworkAttachment(s,d.id,[],staff));
    }
    if(url.pathname==='/api/staff'||url.pathname==='/api/teacher'){
      throttle(req,'staff-auth',35);
      const kind=url.pathname==='/api/staff'?'staff':'teacher';
      if(kind==='staff')return send(res,200,staffAuth(current().root,d,kind));
      const entry=writeState(root=>{
        const result=staffAuth(root,d,kind);
        const s=root.schools[result.id];
        s.teacherCodes[result.staff.id].last=new Date().toISOString();
        const staff=s.staff.find(row=>row.id===result.staff.id);
        return {school:result.id,staff:staff.id,workspace:teacherWorkspace(s,staff)};
      });
      const token=randomBytes(32).toString('hex');
      revokeTeacherCookie(req);
      db.prepare("DELETE FROM sessions WHERE role='teacher' AND expires<=?").run(now());
      db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?)').run(digest(token),'teacher',entry.value.school,entry.value.staff,now()+7200000);
      teacherCookie(res,token,7200);
      return send(res,200,entry.value.workspace);
    }
    if(url.pathname==='/api/teacher-state'){
      const {s,staff}=teacherSessionRecord(req,current().root);
      return send(res,200,teacherWorkspace(s,staff,d));
    }
    if(url.pathname==='/api/teacher-action'){
      const {value}=writeState(root=>{
        const {s,staff}=teacherSessionRecord(req,root);
        const details=requireObject(d.details);
        const count=applyTeacherAction(s,staff,d.action,details,newId());
        return {count,workspace:teacherWorkspace(s,staff,requireObject(d.filters))};
      });
      return send(res,200,value);
    }
    if(url.pathname==='/api/teacher-logout'){
      revokeTeacherCookie(req);
      teacherCookie(res,'',0);
      return send(res,200,{ok:true});
    }
    if(url.pathname==='/api/staff-request'){
      throttle(req,'staff-request',20);
      const entry=writeState(root=>{
        const staff=staffAuth(root,requireObject(d.proof),'staff');
        staffRequestDraft(root.schools[staff.id],staff.staff.id,requireObject(d.proposed),d.note,newId());
        return staffAuth(root,d.proof,'staff');
      });
      return send(res,201,entry.value);
    }
    if(url.pathname==='/api/canteen-login'){
      throttle(req,'canteen-login',30);
      const {root}=current(), [id,s]=portalSchool(root,d.school);
      if(!sameCode(validPin(d.pin),s.canteenCode)&&!(demo&&id==='sample'&&!s.canteenCode&&d.pin===s.canteenPin))fail(401,'كود الدخول غير صحيح.');
      const token=randomBytes(32).toString('hex');
      db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?)').run(digest(token),'canteen',id,'',now()+7200000);
      return send(res,200,{token,items:s.items.filter(i=>i.stock>0)});
    }
    if(url.pathname==='/api/canteen-sale'||url.pathname==='/api/canteen-logout'){
      throttle(req,'canteen-sale',120);
      if(typeof d.token!=='string'||!/^[a-f0-9]{64}$/.test(d.token))fail(401,'افتح نقطة البيع أولًا.');
      const token=digest(d.token), check=db.prepare("SELECT school FROM sessions WHERE token=? AND role='canteen' AND expires>?");
      if(url.pathname.endsWith('logout')){db.prepare("DELETE FROM sessions WHERE token=? AND role='canteen'").run(token);return send(res,200,{ok:true});}
      const entry=writeState(root=>{
        const account=check.get(token,now());
        if(!account||!Object.hasOwn(root.schools,account.school))fail(401,'انتهت جلسة المقصف.');
        const s=root.schools[account.school];
        if(typeof d.requestId!=='string'||!/^[a-f0-9]{24}$/.test(d.requestId))fail(400,'معرّف عملية البيع غير صالح.');
        const key=digest(token+'|'+d.requestId);
        const reg=toDigits(d.reg), quantity=Number(d.quantity);
        const sale=canteenSale(s,reg,d.item,quantity,YEAR,dayISO(),key);
        return {...sale,items:s.items.filter(i=>i.stock>0)};
      });
      return send(res,200,entry.value);
    }
    fail(404,'العملية غير متاحة.');
  } catch(error) {
    const status=error.status||(error.code?.startsWith('ERR_SQLITE')?500:400);
    if(status===500)console.error(error.code||error.name);
    if(!res.headersSent)send(res,status,{error:status===500?'تعذر حفظ البيانات.':error.message});
    else res.end();
  }
}
const server=secure?createSecureServer({cert:readFileSync(tlsCert),key:readFileSync(tlsKey)},handle):createServer(handle);
server.requestTimeout=25_000;
server.headersTimeout=15_000;
server.listen(port,host,()=>console.log('منظومة الطلبة تعمل على '+(secure?'https':'http')+'://'+(host==='0.0.0.0'?'127.0.0.1':host)+':'+port+'/'));
