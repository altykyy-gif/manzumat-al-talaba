const primarySubjects = {q:2,i:2,a:6,e:3,c:1,m:5};
const upperPrimarySubjects = {q:2,i:2,a:4,w:2,e:3,c:1,m:5,s:3,g:3};
const transportSubjects = {q:2,i:2,a:3,w:2,e:4,c:2,m:5,s:4,h:2,j:2,n:1};
const scienceSecondarySubjects = {q:2,i:2,a:4,e:4,t:2,m:4,x:2,p:5,k:4,b:3,n:1};
const artsSecondarySubjects = {q:2,i:2,a:7,e:5,t:2,x:2,h:3,j:3,n:1,f:2,z:2,u:2};

const promoteByProgress = {components:[.30,.30,.40], autoPromote:true};
const periodRules = {components:[.30,.30,.40], minTotal:.40};
const semesterRules = {components:[.20,.30,.20,.30], finalIndexes:[1,3], minFinal:.40, minTotal:.50};
const basicCertificateRules = {components:[.15,.15,.70], finalIndexes:[2], minFinal:.40, minTotal:.50};
const secondaryCertificateRules = {...basicCertificateRules,minFinal:.50,maxSecondRoundSubjects:3};

// Weekly lessons and components follow the 2026–2027 curriculum memos.
const curriculum2026 = {
  'الأول':{subjects:primarySubjects,rules:promoteByProgress},
  'الثاني':{subjects:primarySubjects,rules:promoteByProgress},
  'الثالث':{subjects:{...primarySubjects,s:2},rules:promoteByProgress},
  'الرابع':{subjects:upperPrimarySubjects,rules:periodRules},
  'الخامس':{subjects:upperPrimarySubjects,rules:periodRules},
  'السادس':{subjects:{...upperPrimarySubjects,e:4,c:2},rules:semesterRules},
  'السابع':{subjects:transportSubjects,rules:semesterRules},
  'الثامن':{subjects:transportSubjects,rules:semesterRules},
  'التاسع':{subjects:{...transportSubjects,s:5},rules:basicCertificateRules},
  'الأول ثانوي':{subjects:{q:2,i:2,a:4,e:4,t:2,m:5,k:3,p:3,b:3,h:2,j:2,n:1,z:1},rules:semesterRules},
  'الثاني ثانوي':{
    'علمي':{subjects:scienceSecondarySubjects,rules:semesterRules},
    'أدبي':{subjects:artsSecondarySubjects,rules:semesterRules}
  },
  'الثالث ثانوي':{
    'علمي':{subjects:{...scienceSecondarySubjects,m:5,b:4},rules:secondaryCertificateRules},
    'أدبي':{subjects:{...artsSecondarySubjects,f:3},rules:secondaryCertificateRules}
  }
};

const gradingCurricula = {'2026-2027':curriculum2026};

export function curriculumFor(year,cls,stream) {
  const entry=gradingCurricula[year]?.[cls];
  return entry?.rules?entry:entry?.[stream==='أدبي'?'أدبي':'علمي']||null;
}

export function curriculumSubject(key,weeklyPeriods,rules,cls) {
  const totalMax=weeklyPeriods*40;
  // The secondary memo gives civics 8 + 8 + 24 in both third-year tracks.
  // Ninth-year civics uses the corrected 30/70 distribution, 6 + 6 + 28.
  const max=cls==='الثالث ثانوي'&&key==='n'?[8,8,24]:rules.components.map(ratio=>Math.round(totalMax*ratio));
  const finalIndexes=rules.finalIndexes||[max.length-1];
  const finalMax=finalIndexes.reduce((total,index)=>total+max[index],0);
  const decimal=(points,ratio)=>Math.round(points*ratio*10)/10;
  const item={weeklyPeriods,totalMax,max,secondRoundMax:rules.autoPromote?null:finalMax,
    minTotal:rules.minTotal?decimal(totalMax,rules.minTotal):null,minFinal:rules.minFinal?decimal(finalMax,rules.minFinal):null};
  if(rules===semesterRules){
    // For sixth-year science this gives 6 + 6 + 12 points of semester work.
    item.workBreakdown={activities:max[0]/4,quizzes:max[0]/4,midterm:max[0]/2};
  }
  if(key==='p'&&['الثاني ثانوي','الثالث ثانوي'].includes(cls)){
    item.parts=[
      {label:cls==='الثاني ثانوي'?'الفيزياء الحرارية وخواص المادة':'الكهرباء والمغناطيسية والفيزياء الذرية',max:120},
      {label:'الميكانيكا',max:80}
    ];
  }
  return item;
}

// The archived 2025–2026 basic-education memo sets Arabic to 160 in grades 7–9.
export function historicalArabicMax(year,cls,source) {
  if(year!=='2025-2026')return null;
  if(['السابع','الثامن'].includes(cls)){
    if(source==='student-grades-sse')return [32,48,32,48];
    if(source==='remedial_grades')return [96];
  }
  if(cls==='التاسع'&&source==='student-grades-ninth')return [24,24];
  return null;
}
