const statusTag=status=>`<span class="review-status ${esc(status)}">${esc(REVIEW_LABELS[status]||status)}</span>`;
const shortDate=value=>str(value).slice(0,10);
function studentAvatar(student,large=false) {
  if(student.photo&&/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(student.photo))return `<img class="${large?'avatar':'avatar mini'}" src="${esc(student.photo)}" alt="صورة الطالب المعتمدة">`;
  return large?'':'<span class="photo-placeholder" aria-label="صورة افتراضية">♟</span>';
}
function textBlock(text) {return '<div class="message-text">'+esc(text)+'</div>';}
function segment(label,key,value,active) {
  return btn(label,key,value,'soft '+(active?'active':''));
}
const transferStatuses=Object.entries(REVIEW_LABELS);
pages['inter-school-transfers']=()=>{
  const f=filterData(route,{status:''});
  const rows=state.transfers.filter(t=>t.year===f.year&&(!f.status||t.status===f.status)).slice().reverse();
  const incoming=rows.filter(t=>t.to===activeSchoolId), outgoing=rows.filter(t=>t.from===activeSchoolId);
  const base=['#','التاريخ','الطالب','رقم القيد','الصف'];
  const values=(t,i,received)=>[i+1,shortDate(t.date),t.name,t.reg,t.cls,schoolLabel(received?t.from:t.to),t.note,raw(statusTag(t.status)),t.reply,raw(t.status==='pending'?btn(received?'مراجعة الطلب':'إلغاء الطلب','transfer-review',t.id,'tiny soft'):'—')];
  return header('النقل عبر المدارس','',f.year)+card(filterForm(route,[FILTER_YEAR,['status','حالة الطلب',transferStatuses]],f))+
    `<div class="btns gap">${btn('إرسال طلب نقل','transfer-new','','green')}${btn('طباعة كشف الطلبات','transfer-report')}</div><div class="stack">${card(table([...base,'من المدرسة','الملاحظة','الحالة','ملاحظات الرد','إجراءات'],incoming.map((t,i)=>values(t,i,true))),'طلبات النقل الواردة')}${card(table([...base,'إلى المدرسة','الملاحظة','الحالة','ملاحظات الرد','إجراءات'],outgoing.map((t,i)=>values(t,i,false))),'طلبات النقل الصادرة')}</div>`;
};
actions['transfer-new']=()=>{
  const {year}=filterData(route);
  const schools=otherSchools(), students=activeStudents(year).sort((a,b)=>localeCompare(a.name,b.name));
  if(!schools.length)throw new Error('تحتاج إلى مدرسة أخرى مسجّلة في المنظومة.');
  if(!students.length)throw new Error('لا توجد سجلات قابلة للنقل في السنة المختارة.');
  showDialog('إرسال طلب نقل',`<form data-form="transfer-new" data-year="${esc(year)}" class="stack">${field(['student','الطالب',students.map(s=>[s.id,s.name+' · '+s.reg+' · '+s.cls]),true],'',{blank:'اختر الطالب'})}${field(['to','المدرسة المستقبلة',schools,true],'',{blank:'اختر المدرسة'})}${field(['note','ملاحظة النقل','textarea'],'',{maxlength:1200})}${submit('إرسال طلب النقل')}</form>`);
};
forms['transfer-new']=async(data,form)=>{
  const info={...formText(data),year:form.dataset.year};
  await runWorkflow('transfer-send',info,(s,root)=>transferDraft(root,activeSchoolId,info.to,info.student,info.year,info.note,uid()));
  $('#modal').close();render();flash('أُرسل طلب النقل إلى المدرسة المستقبلة.');
};
actions['transfer-review']=id=>{
  const request=state.transfers.find(t=>t.id===id&&t.status==='pending');
  if(!request)throw new Error('الطلب غير متاح.');
  const incoming=request.to===activeSchoolId;
  const decision=incoming?field(['decision','القرار',[['accepted','قبول الطلب'],['rejected','رفض الطلب']]],'accepted'):`<input type="hidden" name="decision" value="cancelled">`;
  showDialog(incoming?'مراجعة طلب النقل':'إلغاء طلب النقل',`<p>${esc(request.name)} · <bdi>${esc(request.reg)}</bdi> · ${esc(request.cls)}</p>${textBlock(request.note)}<form data-form="transfer-review" data-id="${esc(id)}" class="stack gap">${decision}${incoming?field(['section','الفصل في المدرسة المستقبلة',SECTIONS],SECTIONS[0]):''}${field(['reply','ملاحظات الرد','textarea'],'',{maxlength:1200})}${submit(incoming?'حفظ القرار':'إلغاء الطلب',incoming?'green':'danger')}</form>`);
};
forms['transfer-review']=async(data,form)=>{
  const info={...formText(data),id:form.dataset.id};
  await runWorkflow('transfer-review',info,(s,root)=>transferDecision(root,activeSchoolId,info.id,info.decision,info.section,info.reply,uid(),SECTIONS));
  $('#modal').close();render();
  flash(info.decision==='accepted'?'قُبل الطلب وأضيف سجل الطالب إلى المدرسة المستقبلة.':'حُفظ القرار في سجل طلبات النقل.');
};
actions['transfer-report']=()=>{
  const f=filterData(route);
  const rows=state.transfers.filter(t=>t.year===f.year&&(!f.status||t.status===f.status)&&(t.to===activeSchoolId||t.from===activeSchoolId));
  showReport('كشف النقل بين المدارس',f.year,['التاريخ','رقم القيد','اسم الطالب','الصف','من المدرسة','إلى المدرسة','الحالة','الرد'],rows.map(t=>[shortDate(t.date),t.reg,t.name,t.cls,schoolLabel(t.from),schoolLabel(t.to),REVIEW_LABELS[t.status],t.reply||'']));
};

let messageFolder='inbox';
pages['school-messages']=()=>{
  const received=messageFolder==='inbox';
  const rows=state.messages.filter(m=>(received?m.to:m.from)===activeSchoolId).slice().reverse();
  const unread=state.messages.filter(m=>m.to===activeSchoolId&&!m.read).length;
  return header('مراسلات المدارس','التواصل بين المدارس','')+
    `<div class="toolbar gap"><div class="tabs">${segment('الوارد'+(unread?' ('+unread+')':''),'message-folder','inbox',received)}${segment('المرسل','message-folder','sent',!received)}</div>${btn('رسالة جديدة','message-compose','','green')}</div>${card(table(['التاريخ',received?'من المدرسة':'إلى المدرسة','الموضوع','الحالة','إجراءات'],rows.map(m=>[shortDate(m.date),schoolLabel(received?m.from:m.to),m.title,m.read?'مقروءة':received?'جديدة':'مرسلة',raw(btn('فتح الرسالة','message-open',m.id,'tiny soft'))])))}`;
};
actions['message-folder']=value=>{messageFolder=value;render();};
actions['message-compose']=id=>{
  const reply=id?state.messages.find(m=>m.id===id&&m.to===activeSchoolId):null;
  const schools=otherSchools();
  if(!schools.length)throw new Error('تحتاج إلى مدرسة أخرى مسجّلة في المنظومة.');
  showDialog(reply?'الرد على الرسالة':'رسالة جديدة',`<form data-form="message-send" data-id="${esc(reply?.id)}" class="stack">${field(['to','المدرسة المستقبلة',reply?schools.filter(([key])=>key===reply.from):schools,true],reply?.from,{blank:'اختر المدرسة'})}${field(['title','الموضوع','text',true],reply?'رد: '+reply.title.slice(0,150):'',{maxlength:160})}${field(['body','نص الرسالة','textarea',true],'',{maxlength:6000})}${submit('إرسال الرسالة')}</form>`);
};
forms['message-send']=async(data,form)=>{
  const info={...formText(data),replyTo:form.dataset.id};
  await runWorkflow('message-send',info,(s,root)=>messageDraft(root,activeSchoolId,info.to,info.title,info.body,info.replyTo,uid()));
  messageFolder='sent';$('#modal').close();render();flash('أُرسلت الرسالة داخل المنظومة.');
};
actions['message-open']=async id=>{
  const message=state.messages.find(m=>m.id===id&&(m.from===activeSchoolId||m.to===activeSchoolId));
  if(!message)throw new Error('الرسالة غير متاحة.');
  const inbound=message.to===activeSchoolId;
  if(inbound&&!message.read) {
    await runWorkflow('message-read',{id},(s,root)=>{const row=root.messages.find(m=>m.id===id&&m.to===activeSchoolId);if(row)row.read ||= workflowTimestamp();});
    render();
  }
  showDialog(message.title,`<p class="muted">${esc(schoolLabel(message.from))} ← ${esc(schoolLabel(message.to))} · <bdi>${esc(shortDate(message.date))}</bdi></p>${textBlock(message.body)}${inbound?'<div class="gap">'+btn('رد','message-compose',id)+'</div>':''}`);
};

let staffPortalRecord=null, staffPortalProof=null;
function localStaffProof(data) {
  const id=activeSchoolId, s=state.schools[id], n=digits(data.national), pin=digits(data.pin);
  const staff=onlyYear(s.staff,YEAR).find(x=>x.national&&x.national===n), code=staff&&s.teacherCodes[staff.id];
  if(!staff||!code?.active||code.pin!==pin)throw new Error('تعذر التحقق من بيانات الدخول.');
  return {id,staff,requests:s.staffRequests.filter(x=>x.staff===staff.id)};
}
pages['staff-portal']=()=>{
  const record=staffPortalRecord;
  if(!record)return `<main class="public-screen mid"><section class="card auth-card guardian">${wordmark()}<h1 class="auth-title">الاستعلام عن موظف</h1><form data-form="staff-portal" class="stack">${sharedMode?sharedSchoolInput():''}${field(['national','الرقم الوطني للموظف','text',true],'',{inputmode:'numeric'})}${field(['pin','رمز الوصول','password',true],'',{inputmode:'numeric'})}${submit('عرض البيانات','block')}</form>${!sharedMode||sharedDemo?'<p class="small muted gap">الموظف التجريبي <bdi>000000000100</bdi> · الرمز <bdi>2468</bdi></p>':''}${returnHome()}</section></main>`;
  const {staff,requests}=record;
  return `<main class="container gap">${header('الاستعلام عن موظف',staff.name,staff.year)}
    ${card(`<form data-form="staff-request" class="stack"><div class="fields">${STAFF_EDITABLE.map(([key,label])=>field([key,label,'text',key==='name'],staff[key],{maxlength:key==='phone'?18:150})).join('')}</div>${field(['note','ملاحظة للإدارة','textarea'],'',{maxlength:1200})}${submit('إرسال طلب تعديل البيانات')}</form>`,'بيانات الموظف')}
    <section class="gap">${card(table(['التاريخ','الحقول المطلوبة','الحالة','رد الإدارة'],[...requests].reverse().map(r=>[shortDate(r.date),STAFF_EDITABLE.filter(([key])=>r.changes[key]).map(([,label])=>label).join('، '),raw(statusTag(r.status)),r.reply||''])),'طلبات التعديل')}</section><div class="btns">${btn('خروج','staff-portal-logout')}${link('الصفحة الرئيسية','home','soft')}</div></main>`;
};
forms['staff-portal']=async data=>{
  staffPortalProof={school:str(data.school),national:digits(data.national),pin:digits(data.pin)};
  try{staffPortalRecord=sharedMode?await sharedAPI('/api/staff',staffPortalProof):localStaffProof(staffPortalProof);}
  catch(error){staffPortalProof=null;throw error;}
  render();
};
actions['staff-portal-logout']=()=>{staffPortalRecord=null;staffPortalProof=null;render();};
forms['staff-request']=async data=>{
  const record=staffPortalRecord;
  if(!record||!staffPortalProof)throw new Error('أعد التحقق من بيانات الموظف.');
  const proposed=Object.fromEntries(STAFF_EDITABLE.map(([key])=>[key,key==='phone'?digits(data[key]):str(data[key])]));
  if(sharedMode)staffPortalRecord=await sharedAPI('/api/staff-request',{proof:staffPortalProof,proposed,note:str(data.note)});
  else {
    await updateLocalSchool(record.id,s=>staffRequestDraft(s,record.staff.id,proposed,str(data.note),uid()));
    staffPortalRecord=localStaffProof(staffPortalProof);
  }
  render();flash('أُرسل الطلب إلى إدارة المدرسة.');
};
pages['review-staff-requests']=()=>{
  const f=filterData(route,{status:''}), schoolData=school();
  const records=schoolData.staffRequests.filter(r=>r.year===f.year);
  const statuses=['pending','accepted','rejected'];
  const rows=records.filter(r=>!f.status||r.status===f.status).slice().reverse().flatMap(r=>{
    const staff=schoolData.staff.find(s=>s.id===r.staff);
    if(!staff||!finds([staff.name,staff.national,staff.financial,staff.education].join(' '),f.q))return [];
    return [[shortDate(r.date),staff.name,STAFF_EDITABLE.filter(([key])=>r.changes[key]).map(([,label])=>label).join('، '),raw(statusTag(r.status)),r.reply||'',raw(btn('عرض الطلب','staff-review',r.id,'tiny soft'))]];
  });
  return header('مراجعة طلبات تعديل بيانات الموظفين والمعلمين','',f.year)+
    `<div class="grid4 gap">${[['كل الطلبات',records.length],...statuses.map(status=>[REVIEW_LABELS[status],records.filter(r=>r.status===status).length])].map(([label,count])=>`<article class="card metric compact"><h3>${label}</h3><strong>${count}</strong></article>`).join('')}</div>
    <div class="btns gap">${portalButton('صفحة الاستعلام العامة للموظفين','staff-portal')}${link('قائمة الموظفين','all-staff','soft')}</div>
    ${card(filterForm(route,[FILTER_YEAR,['status','حالة الطلب',statuses.map(status=>[status,REVIEW_LABELS[status]])],['q','ابحث باسم الموظف أو رقمه','search']],f))}<div class="gap">${table(['التاريخ','اسم الموظف','الحقول','الحالة','الرد','إجراءات'],rows)}</div>`;
};
function reviewForm(kind,id,replyLength) {
  return `<form data-form="${kind}" data-id="${esc(id)}" class="stack gap">${field(['decision','القرار',[['accepted','قبول'],['rejected','رفض']]],'accepted')}${field(['reply','ملاحظات الرد','textarea'],'',{maxlength:replyLength})}${submit('حفظ القرار')}</form>`;
}
actions['staff-review']=id=>{
  const request=lookup('staffRequests',id);
  const rows=STAFF_EDITABLE.filter(([key])=>request.changes[key]).map(([key,label])=>[label,request.changes[key].before,request.changes[key].after]);
  showDialog('طلب تعديل بيانات موظف',`<p>${esc(lookup('staff',request.staff).name)} · ${statusTag(request.status)}</p>${table(['الحقل','القيمة المسجلة','التعديل المقترح'],rows)}${textBlock(request.note)}${request.status==='pending'?reviewForm('staff-review',id,1200):textBlock(request.reply)}`);
};
forms['staff-review']=async(data,form)=>{
  const info={...formText(data),id:form.dataset.id};
  await runWorkflow('staff-review',info,s=>staffRequestDecision(s,info.id,info.decision,info.reply));
  $('#modal').close();render();flash('حُفظ القرار في سجل تعديل الموظفين.');
};

function parentPhotoPanel(student,s) {
  const request=s.photoRequests.filter(x=>x.student===student.id).at(-1);
  return `<div class="sample-footer"><h3>صورة الطالب</h3>${request?'<p>'+statusTag(request.status)+(request.reply?' · '+esc(request.reply):'')+'</p>':''}${request?.status==='pending'?'':btn('رفع صورة للمراجعة','parent-photo',student.id)}</div>`;
}
actions['parent-photo']=id=>{
  if(route!=='parents'||!publicProof||!publicMatches.some(s=>s.id===id))throw new Error('افتح سجل الطالب من بوابة أولياء الأمور.');
  showDialog('رفع صورة الطالب',`<form data-form="parent-photo" data-id="${esc(id)}" class="stack">${field(['photo','صورة الطالب','file',true],'',{accept:'image/png,image/jpeg,image/webp'})}${field(['note','ملاحظة','text'],'',{maxlength:500})}${submit('إرسال للمراجعة')}</form>`);
};
forms['parent-photo']=async(data,form)=>{
  if(route!=='parents'||!publicProof||!publicMatches.some(s=>s.id===form.dataset.id))throw new Error('افتح سجل الطالب من بوابة أولياء الأمور.');
  const image=await photoFile(data.photo), id=form.dataset.id, proof=publicProof;
  if(sharedMode) {
    publicData=await sharedAPI('/api/photo',{id,proof,image,note:str(data.note)});
    publicMatches=publicData.students;
  } else await updateLocalSchool(publicSchoolId,s=>photoRequestDraft(s,id,image,str(data.note),uid()));
  $('#modal').close();render();flash('أُرسلت الصورة إلى المدرسة للمراجعة.');
};
let photoFolder='pending';
pages['approve-photos']=()=>{
  const f=filterData(route);
  const rows=onlyYear(school().photoRequests,f.year).filter(r=>photoFolder==='pending'?r.status==='pending':r.status!=='pending').slice().reverse();
  return header('مراجعة صور الطلاب المرفوعة من أولياء الأمور','',f.year)+card(filterForm(route,[FILTER_YEAR],f))+
    `<div class="tabs gap">${segment('بانتظار المراجعة','photo-folder','pending',photoFolder==='pending')}${segment('السجل','photo-folder','history',photoFolder==='history')}</div>${table(['التاريخ','الطالب','رقم القيد','الصورة','الحالة','إجراءات'],rows.map(r=>{const s=school().students.find(x=>x.id===r.student);return [shortDate(r.date),s?.name||'—',s?.reg||'—',raw(studentAvatar({photo:r.image})),raw(statusTag(r.status)),raw(btn('عرض الصورة','photo-review',r.id,'tiny soft'))];}))}`;
};
actions['photo-folder']=value=>{photoFolder=value;render();};
actions['photo-review']=id=>{
  const r=lookup('photoRequests',id), s=lookup('students',r.student);
  showDialog('صورة الطالب · '+s.name,`<div class="photo-review center">${studentAvatar({photo:r.image},true)}</div><p>${statusTag(r.status)}</p>${textBlock(r.note)}${r.status==='pending'?reviewForm('photo-review',id,500):textBlock(r.reply)}`);
};
forms['photo-review']=async(data,form)=>{
  const info={...formText(data),id:form.dataset.id};
  await runWorkflow('photo-review',info,s=>photoRequestDecision(s,info.id,info.decision,info.reply));
  $('#modal').close();render();flash(info.decision==='accepted'?'اعتُمدت الصورة وظهرت في سجل الطالب.':'حُفظ رفض الصورة في السجل.');
};
actions['guardian-code']=id=>{
  const student=lookup('students',id), configured=school().guardianCodes[id];
  showDialog('رمز الوصول · '+student.name,`<form data-form="guardian-code" data-id="${esc(id)}" class="stack">${field(['pin','رمز الوصول من 4 إلى 8 أرقام','text',!configured],'',{pattern:'[0-9]{4,8}',inputmode:'numeric'})}${configured?field(['disable','إيقاف رمز الوصول','checkbox']):''}${submit('حفظ الرمز')}</form>`);
};
forms['guardian-code']=async(data,form)=>{
  await runWorkflow('guardian-code',{id:form.dataset.id,pin:digits(data.pin),disable:Boolean(data.disable)},()=>{throw new Error('تتاح الرموز عند التشغيل المشترك.');});
  $('#modal').close();render();flash(data.disable?'أُوقف رمز الوصول.':'حُفظ رمز الوصول للطالب.');
};
