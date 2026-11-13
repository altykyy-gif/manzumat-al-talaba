const sharedMode = document.body.dataset.mode==='shared';
let sharedDemo=false, sharedRevision=-1, sharedSchools=[], sharedPayload={}, sharedStats=null;
let publicProof=null;
async function sharedAPI(path,data) {
  let response;
  try {
    response=await fetch(path,{method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
  } catch {throw new Error('تعذر الاتصال بالخادم. تحقق من الاتصال ثم أعد المحاولة.');}
  let result;
  try{result=await response.json();}catch{throw new Error('تعذر قراءة رد الخادم.');}
  if(!response.ok) {
    const error=new Error(result.error||'تعذر تنفيذ الطلب.');
    error.status=response.status;
    throw error;
  }
  return result;
}
const sharedPage=()=>route;
function setShared(payload) {
  if(!payload.school) {
    sharedRevision=-1; sharedSchools=[]; sharedPayload={}; sharedStats=null;
    activeSchoolId='sample'; session=null;
    state={version:2,schools:{sample:emptySchool({...demoProfile,name:'منظومة الطلبة'})},transfers:[],messages:[]};
    return;
  }
  if(payload.school===activeSchoolId&&payload.revision<sharedRevision)return;
  sharedPayload=payload;sharedRevision=payload.revision;sharedSchools=payload.directory||[];sharedStats=payload.stats;
  activeSchoolId=payload.school;
  session={role:payload.role,userId:payload.userId,permissions:payload.permissions||[]};
  const directory=Object.fromEntries(sharedSchools.map(s=>[s.id,{profile:{name:s.name,region:s.region}}]));
  const data=Object.assign(emptySchool(payload.data.profile),payload.data);
  state={version:2,schools:{...directory,[payload.school]:data},transfers:payload.transfers||[],messages:payload.messages||[]};
}
async function refreshShared() {
  const page=location.hash.slice(1)||'home';
  try {
    const payload=await sharedAPI('/api/state?page='+encodeURIComponent(page));
    if((location.hash.slice(1)||'home')===page)setShared(payload);
  } catch(error) {
    if(error.status===401){setShared({});return;}
    throw error;
  }
}
async function startShared() {
  try {
    const info=await sharedAPI('/api/info');
    sharedDemo=info.demo;
    setShared({});
    await refreshShared();
    if(location.hash==='#teachers')await refreshTeacher();
    render();
  } catch(error) {
    setShared({});
    render();
    flash(error.message,'error');
  }
}
async function loginShared(username,password) {
  await sharedAPI('/api/login',{username,password});
  setShared(await sharedAPI('/api/state?page=dashboard'));
  registered='';
  go('dashboard');
}
async function logoutShared() {
  await sharedAPI('/api/logout',{});
  publicProof=null;publicData=null;publicMatches=[];publicPage='';resetTeacher();
  staffPortalRecord=null;staffPortalProof=null;canteenSession='';canteenProof='';canteenItems=[];
  gradeDraft.clear();
  setShared({});
}
async function updateShared(mutation) {
  const page=sharedPage(), before=school(), working=structuredClone(state);
  if(!session)throw new Error('سجّل دخول الإدارة أولًا.');
  mutation(working.schools[activeSchoolId],working);
  const changes={};
  for(const [key,value] of Object.entries(working.schools[activeSchoolId])) {
    if(JSON.stringify(before[key])!==JSON.stringify(value))changes[key]=value;
  }
  if(!Object.keys(changes).length)return;
  try {
    const result=await sharedAPI('/api/update',{page,school:activeSchoolId,revision:sharedRevision,changes});
    if(page===sharedPage())setShared(result);
  } catch(error) {
    if(error.status===409&&page===sharedPage()){
      await refreshShared();
      $('#modal').close();
      render();
    }
    throw error;
  }
}
async function runWorkflow(name,data,local) {
  if(!sharedMode)return update(local);
  const page=sharedPage();
  const result=await sharedAPI('/api/workflow',{name,page,school:activeSchoolId,data});
  if(page===sharedPage()&&result.state)setShared(result.state);
  return result;
}
async function updateLocalSchool(id,mutation) {
  state=await dbState(root=>{
    if(!Object.hasOwn(root.schools,id))throw new Error('المدرسة غير متاحة.');
    mutation(root.schools[id],root);
  });
  announceLocalChange();
}
actions['refresh-shared']=async()=>{await refreshShared();render();flash('تم تحديث البيانات من الخادم.');};
function schoolDirectory() {
  return sharedMode?sharedSchools:Object.entries(state.schools).map(([id,s])=>({id,name:s.profile.name,region:s.profile.region}));
}
function schoolLabel(id) {return schoolDirectory().find(s=>s.id===id)?.name||'مدرسة';}
function otherSchools() {
  return schoolDirectory().filter(s=>s.id!==activeSchoolId).map(s=>[s.id,s.name+(s.region?' · '+s.region:'')]);
}
function sharedSchoolInput() {
  return field(['school','رمز المدرسة','text',true],new URLSearchParams(location.search).get('school')||sharedPayload.schoolCode||(sharedDemo?'DEMO':''),{maxlength:40,autocomplete:'off'});
}
function portalURL(page) {
  return sharedMode&&sharedPayload.schoolCode?location.origin+'/?school='+encodeURIComponent(sharedPayload.schoolCode)+'#'+page:location.href.split('#')[0]+'#'+page;
}
function portalButton(label,page,style='soft') {
  return '<a class="btn '+style+'" href="'+esc(portalURL(page))+'">'+esc(label)+'</a>';
}
function demoAccess(label,action,value='') {
  return !sharedMode||sharedDemo?btn(label,action,value,'block soft'):'';
}
