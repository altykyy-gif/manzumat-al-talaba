import {DAYS} from './data.js';

const attendanceCalendarCodes={حاضر:'ح',غائب:'غ',متأخر:'ت',مستأذن:'إ',عطلة:'ع'};
const attendanceISO=date=>date.toISOString().slice(0,10);
const attendanceDayFormat=new Intl.DateTimeFormat('ar-LY',{month:'long',year:'numeric',timeZone:'UTC'});

export function attendanceReportDates(date,range) {
  const day=new Date(date+'T00:00:00Z');
  if(!Number.isFinite(+day)||attendanceISO(day)!==date)throw new Error('اختر تاريخًا صالحًا للتقرير.');
  const year=day.getUTCFullYear(), month=day.getUTCMonth();
  const start=new Date(day);
  if(range==='أسبوعي')start.setUTCDate(day.getUTCDate()-day.getUTCDay());
  if(range==='شهري')start.setUTCDate(1);
  const count=range==='شهري'?new Date(Date.UTC(year,month+1,0)).getUTCDate():range==='أسبوعي'?7:1;
  const dates=Array.from({length:count},(_,index)=>{
    const date=new Date(start);
    date.setUTCDate(start.getUTCDate()+index);
    return {date:attendanceISO(date),day:date.getUTCDate(),weekday:DAYS[date.getUTCDay()]};
  });
  return {dates,label:range==='شهري'?attendanceDayFormat.format(day):range==='أسبوعي'?dates[0].date+' إلى '+dates.at(-1).date:dates[0].weekday+' '+date};
}

export function buildAttendanceReport(people,records,options) {
  const {staff,year,date,range,periods,periodNames,absentOnly,status=''}=options;
  if(!['يومي','أسبوعي','شهري'].includes(range))throw new Error('اختر مدة التقرير.');
  const {dates,label}=attendanceReportDates(date,range);
  const calendar=range!=='يومي';
  const daily=dates.map(({date})=>records[year+'|'+date]||{});
  const identities=staff?['ر.م','الرقم التعليمي','اسم الموظف','الوظيفة','الفترة']:['ر.م','رقم القيد','اسم الطالب','الصف','الفصل'];
  const totals=absentOnly?['أيام الغياب']:['أيام الحضور','أيام الغياب'];
  const headers=calendar?[...identities,...dates.map(day=>day.weekday+' '+day.date),...totals]:
    [...identities,...periodNames,...(staff?['ملاحظة']:[])];
  const displayHeaders=calendar?[...identities,...dates.map(day=>range==='شهري'?String(day.day):day.weekday+' '+day.date.slice(8)+'/'+day.date.slice(5,7)),...totals]:headers;
  const entries=[];
  for(const person of people){
    const marks=daily.map(day=>periods.map(period=>day[person.id]?.[period]||''));
    const absences=marks.filter(states=>states.includes('غائب')).length;
    const present=marks.filter(states=>states.includes('حاضر')||states.includes('متأخر')).length;
    if(absentOnly&&!absences||status&&!marks.some(states=>states.includes(status)))continue;
    const identity=[entries.length+1,...(staff?[person.education||person.financial||'',person.name,person.job,person.shift]:[person.reg,person.name,person.cls,person.section])];
    if(!calendar){
      const row=[...identity,...marks[0],...(staff?[daily[0][person.id]?.note||'']:[])];
      entries.push({row,display:row});
      continue;
    }
    const totalCells=absentOnly?[absences]:[present,absences];
    const values=marks.map(states=>states.map(state=>absentOnly&&state!=='غائب'?'':state));
    const row=[...identity,...values.map(states=>states.some(Boolean)?states.map(state=>state||'—').join(' / '):''),...totalCells];
    const display=[...identity,...values.map(states=>states.some(Boolean)?states.map(state=>attendanceCalendarCodes[state]||'·').join('\n'):''),...totalCells];
    entries.push({row,display});
  }
  const legend=calendar?(absentOnly?'غ = غائب':Object.entries(attendanceCalendarCodes)
    .filter(([state])=>staff||state!=='عطلة').map(([state,code])=>code+' = '+state).join('  ·  ')):'';
  return {headers,displayHeaders,label,dates,calendar,legend,rows:entries.map(({row})=>row),displayRows:entries.map(({display})=>display)};
}
