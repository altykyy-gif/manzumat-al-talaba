const YEAR = '2026-2027';
const YEARS = [YEAR, '2025-2026', '2024-2025', '2023-2024', '2022-2023', '2021-2022'];
const CLASSES = ['الأول - رياض اطفال','الثاني - رياض اطفال','الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','الأول ثانوي','الثاني ثانوي','الثالث ثانوي'];
const SECTIONS = Array.from({length:10}, (_, i) => 'الفصل ' + (i+1));
const DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const PERIODS = ['الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة','السابعة','الثامنة'];
const SCHOOL_TYPES = ['عامة / تعليم أساسي','عامة / تعليم ثانوي','عامة / تعليم أساسي وثانوي','خاصة / تعليم أساسي','خاصة / تعليم ثانوي','خاصة / تعليم أساسي وثانوي'];
const REGIONS = 'امساعد|البردي|طبرق|قصر الجدي|بئر الأشهب|الجغبوب|الشعبة|درنة|أم الرزم|القبة|القيقب|الابرق|سوسة|شحات|عمر المختار|البيضاء|وردامه|الساحل|المرج|جردس العبيد|الابيار|المليطانية|توكرة|بنغازي|بنينا|سلوق|قمينس|اجدابيا|انتلات البيضان|الزويتينة سلطان|البريقة|جالو|أوجلة|اجخرة|مرادة|الكفرة|ربيانة|تازربو|سرت|أهراوة|وادي زمزم|خليج السدرة|الجفرة|تاورغاء|مصراتة|زليتن|تينيناي|المردوم|بني وليد|الخمس|مسلاتة|ترهونة|قصر الأخيار|القره بوللي|تاجوراء|سوق الجمعة|عين زارة|طرابلس المركز|حي الاندلس|ابو سليم|جنزور|سواني بني آدم|قصر بن غشير|اسبيعة|سوق الخميس|العواتة|سيدي السائح|الزهراء|الناصرية|العامرية|الجليدة|العزيزية|المعمورة|الماية|الزاوية الغرب|الزاوية الجنوب|الزاوية المركز|صرمان|صبراتة|العجيلات|الجديدة|زوارة|الجميل|زلطن|رقدالين|باطن الجبل|وازن|نالوت|الحوامد|كاباو|الحرابة|سيناون|درج|غدامس|العربان|غريان|الشقيقة|القريات|مزدة|نسمة|الشويرف|رأس الطبل|ككلة|القواليش|الاصابعة|المشاشية|يفرن|القلعة|الرياينة|الزنتان|ظاهر الجبل|الرحيبات|الرجبان|جادو|القرضة وادي الشاطئ|براك الشاطئ|إدري الشاطئ|برقن|سبها|وادي البوانيس|تراغن|وادي عتبة|مرزق|الشرقية|القطرون|تجرهي|أوباري|بنت بية|الغريفة|تهالة|البركت|العوينات|غات|خارج ليبيا'.split('|');
const NATIONALITIES = 'ليبيا|سوريا|فلسطيـن|مصر|الأردن|العراق|السـودان|المغرب|الجزائر|تونس|موريتانيا|لبنان|اليمن|اريتريا|تشاد|دول عربية|دول غير عربية|اثيوبيا|الصومال|المملكة العربية السعودية'.split('|');
const MENU = [
  ['لوحة التحكم','◴','dashboard'], ['إضافة طالب','⊕','add-student'],
  ['قائمة الطلاب','♟', [['all-student','جميع الطلاب'],['transferred-students','الطلبة المنتقلون الارشيف'],['inter-school-transfers','النقل عبر المدارس'],['books-receipt','إدارة كشف استلام الكتب'],['data-transfer','نقل البيانات من SRS']]],
  ['الدرجات','◆', [['add_kindergarten_grades','تقييمات رياض الأطفال'],['add_grades','أعمال سنة – 1 إلى 5'],['add_activity_grades','رصد تقديرات مواد النشاط'],['student-grades-sse','أعمال سنة – النقل'],['remedial_grades','درجات الدور الثاني - النقل'],['record-exam-score','رصد برقم السري – النقل'],['student-grades-ninth','أعمال سنة - نظامي'],['student-grades-first-secondary','أعمال سنة – الأول ثانوي'],['student-grades-second-secondary','أعمال سنة – الثاني ثانوي'],['student-grades-third-secondary','أعمال سنة – الثالث ثانوي'],['student-grades-barcode','رصد الدرجات بالباركود'],['vertical-grades','الرصد العمودي للدرجات']]],
  ['الحضور والغياب','✓', [['attendance','تسجيل الحضور اليومي']]],
  ['الترحــــيل','↑', [['student-promotion','ترحيل الطلبة'],['students-cases','حالات الطلبة المسجلون وغير المسجلين']]],
  ['إدارة الامتحانات','▤', [['students-hall','أرقام الجلوس'],['exam-questions','إنشاء أسئلة الامتحانات'],['exam-schedule','جدول الامتحانات'],['exam-observers','توزيع الملاحظين على القاعات']]],
  ['الجداول الدراسية','▦', [['manage-classes','إدارة الصفوف والفصول'],['manage-subjects','إدارة المواد الدراسية'],['import-teachers-names','استيراد المعلمين من الموظفين'],['assign-subjects','إسناد المواد للمعلمين'],['create-schedule-new','إنشاء الجداول تلقائيا'],['create-schedule-manual','إنشاء جدول يدوي'],['view-schedules','عرض الجداول المنشأة تلقائيا']]],
  ['المالية','◉', [['payments','إدارة المدفوعات'],['finance-report','التقارير المالية']]],
  ['النتائج','▥', [['student_results','الاستعلام عن النتائج للطلبة الشهائد'],['results','رابط نتائج الطلبة الإلكتروني']]],
  ['الموارد البشرية','♟', [['add-staff','إضافة معلم/موظف'],['all-staff','جميع الموظفين'],['staff-attendance','حضور وغياب الموظفين'],['review-staff-requests','مراجعة طلبات تعديل البيانات'],['staff-payments','مالية الموظفين']]],
  ['بوابة أولياء الأمور','◇', [['parent-portal','إدارة ملاحظات ومستندات الطلاب'],['approve-photos','مراجعة صور الطلاب']]],
  ['بوابة المعلمين','▣', [['manage-teacher-accounts','إدارة حسابات وأكواد المعلمين'],['teachers','دخول بوابة المعلم']]],
  ['المقصف المدرسي','▧', [['manage-canteen','إدارة أصناف ومبيعات المقصف'],['canteen','نقطة بيع المقصف (الكاشير)']]],
  ['الدردشة','◌', [['chat','الدردشة العامة'],['school-messages','مراسلات المدارس']]],
  ['المستخدمون الفرعيون','♟', [['sub-users','إدارة المستخدمين الفرعيين']]],
  ['إدارة الأيام الدراسية','▦','manage-days'], ['الملف الشخصي','◉','user-profile']
];
const TITLES = Object.fromEntries(MENU.flatMap(([title,,links]) => typeof links === 'string' ? [[links,title]] : links));
const GROUPS = Object.fromEntries(MENU.flatMap(([title,,links]) => typeof links === 'string' ? [[links,title]] : links.map(([id]) => [id,title])));
const PUBLIC = ['home','login','register','parents','results','teachers','canteen','staff-portal','privacy'];
const STUDENT_FIELDS = [
  ['year','السنة الدراسية',YEARS,true], ['reg','رقم القيد','text',true], ['national','الرقم الوطني','text'],
  ['name','اسم الطالب','text',true], ['mother','اسم الأم','text'], ['phone','رقم هاتف ولي الأمر','tel'],
  ['nation','الجنسية',NATIONALITIES], ['birth','تاريخ الميلاد','date'], ['gender','الجنس',['ذكر','أنثى']],
  ['cls','مرحلة الطالب',CLASSES,true], ['section','الفصل',SECTIONS], ['stream','التخصص',['علمي','أدبي']]
];
const STUDENT_EXPORT = [['reg','رقم القيد'],['national','الرقم الوطني'],['name','الاسم'],['mother','اسم الأم'],['nation','الجنسية'],['gender','الجنس'],['birth','تاريخ الميلاد'],['cls','الصف'],['section','الفصل'],['stream','التخصص'],['phone','رقم هاتف ولي الأمر']];
const STAFF_FIELDS = [
  ['year','السنة الدراسية',YEARS,true], ['education','الرقم التعليمي','text'], ['name','الاسم الكامل','text',true],
  ['national','الرقم الوطني','text'], ['gender','الجنس',['ذكر','أنثى']], ['birth','تاريخ الميلاد','date'],
  ['shift','الفترة',['صباحية','مسائية'],true], ['civil','الحالة الاجتماعية',['أعزب','متزوج','مطلق','أرمل']],
  ['financial','الرقم المالي','text'], ['phone','رقم الهاتف','tel'], ['university','الجامعة المتخرج منها','text'],
  ['graduate','سنة التخرج','text'], ['employment','نوع التوظيف',['ملاك','عقد','تكليف','ندب']],
  ['appointed','سنة التعيين','text'], ['decision','رقم قرار التعيين','text'], ['degree_year','سنة الحصول على الدرجة','text'],
  ['start','تاريخ المباشرة','date'], ['note','ملاحظة','text'], ['mother','اسم الأم','text'],
  ['status','الحالة الوظيفية',['يعمل','إجازة','منتدب','منقول','متقاعد']], ['religion','الديانة','text'],
  ['children','عدد الأولاد','number'], ['loaned','منتدب من','text'], ['bonus','المكافأة الحالية','number'],
  ['due','شهر الاستحقاق','month'], ['health','الحالة الصحية','text'], ['school_type','نوع التعليم','text'],
  ['union','رقم بطاقة النقابة','text'], ['social','رقم بطاقة الضمان الاجتماعي','text'],
  ['icdl','يمتلك شهادة ICDL','checkbox'], ['languages','يمتلك لغات','checkbox'], ['modern','يمتلك تعليم حديث','checkbox'],
  ['curriculum','يمتلك دورات منهجية','checkbox'], ['trained','يمتلك تأهيل تعليمي','checkbox'], ['training','دورات أخرى','text'],
  ['entry_grade','درجة التعيين','text'], ['grade','الدرجة الحالية','text'], ['institution','اسم المؤسسة','text'],
  ['address','محل الإقامة','text'], ['birthplace','مكان الميلاد','text'], ['job_grade','الدرجة الوظيفية','text'],
  ['job','الوظيفة','text'], ['nation','الجنسية',NATIONALITIES], ['qualification','المؤهل العلمي','text']
];
const GRADE_ROUTES = ['add_kindergarten_grades','add_grades','add_activity_grades','student-grades-sse','remedial_grades','student-grades-ninth','student-grades-first-secondary','student-grades-second-secondary','student-grades-third-secondary','vertical-grades'];
const SUBJECTS = {
  q:'القرآن الكريم', i:'التربية الإسلامية', a:'اللغة العربية', w:'الكتابة (التعبير والإملاء والخط)', e:'اللغة الإنجليزية',
  c:'الحاسوب', t:'تقنية المعلومات', m:'الرياضيات', s:'العلوم', g:'الاجتماعيات', h:'التاريخ', j:'الجغرافيا',
  n:'التربية الوطنية', p:'الفيزياء', k:'الكيمياء', b:'الأحياء', z:'علم الاجتماع', x:'الإحصاء', f:'الفلسفة', u:'التربية وعلم النفس',
  ar:'التربية الفنية', mu:'التربية الموسيقية', sp:'التربية البدنية', ex:'غياب مشروع (أيام)', un:'غياب غير مشروع (أيام)'
};
const BASE_PRIMARY = {q:80,i:80,a:240,e:120,c:40,m:200};
const UPPER_PRIMARY = {q:80,i:80,a:160,w:80,e:120,c:40,m:200,s:120,g:120};
const SIXTH = {q:80,i:80,a:160,w:80,e:160,c:80,m:200,s:120,g:120};
const UPPER_TRANSPORT = {q:80,i:80,a:120,w:80,e:160,c:80,m:200,s:160,h:80,j:80,n:40};
const NINTH = {q:24,i:24,a:36,w:24,e:48,c:24,m:60,s:60,h:24,j:24,n:16};
const FIRST_SECONDARY = {q:80,i:80,a:160,e:160,t:80,m:200,p:120,k:120,b:120,h:80,j:80,n:40,z:40};
const SECOND_SCIENCE = {q:80,i:80,a:160,e:160,t:80,m:160,x:80,p:200,k:160,b:120,n:40};
const SECOND_ARTS = {q:80,i:80,a:280,e:200,t:80,x:80,h:120,j:120,n:40,f:80,z:80,u:80};
const THIRD_SCIENCE = {q:24,i:24,a:48,e:48,t:24,m:60,x:24,p:60,k:48,b:48,n:16};
const THIRD_ARTS = {q:24,i:24,a:84,e:60,t:24,x:24,h:36,j:36,n:16,f:36,z:24,u:24};
const KINDERGARTEN = ['المجال اللغوي','المجال الرياضي','السلوك والانضباط','المهارات الاجتماعية','المهارات الحركية الدقيقة','المهارات الحركية الكبرى','الأنشطة الفنية والإبداعية'];
const ATTENDANCE = ['حاضر','غائب','متأخر','مستأذن'];
const SEMESTERS = ['أعمال فصل أول','امتحان فصل أول','أعمال فصل ثان','امتحان فصل ثان'];

function routeForClass(cls) {
  if (CLASSES.slice(0,2).includes(cls)) return 'add_kindergarten_grades';
  if (CLASSES.slice(2,7).includes(cls)) return 'add_grades';
  if (CLASSES.slice(7,10).includes(cls)) return 'student-grades-sse';
  return ['student-grades-ninth','student-grades-first-secondary','student-grades-second-secondary','student-grades-third-secondary'][CLASSES.indexOf(cls)-10];
}
function gradePlan(route, cls, stream) {
  if (route === 'vertical-grades') route = routeForClass(cls);
  let names, weights, totals;
  if (route === 'add_kindergarten_grades') {
    return {components:['الفترة الأولى','الفترة الثانية'], items:KINDERGARTEN.map((label,i)=>({key:'kg'+i,label,choices:['متقن','جيّد','قيد التعلم','يحتاج دعم']}))};
  }
  if (route === 'add_activity_grades') {
    const choices = ['مقبول','جيد','جيد جداً','ممتاز'];
    return {components:CLASSES.indexOf(cls)<7?['الفترة 1','الفترة 2','الفترة 3']:['الفصل الأول','الفصل الثاني'], items:['ar','mu','sp','ex','un'].map((key,i)=>({key,label:SUBJECTS[key],choices:i<3?choices:null,max:[180,180,180]}))};
  }
  if (route === 'add_grades') {
    names = ['أعمال فترة أولى - فترة 1','أعمال فترة ثانية - فترة 2','أعمال فترة ثالثة - فترة 3'];
    weights = [.3,.3,.4];
    totals = ['الرابع','الخامس'].includes(cls)?UPPER_PRIMARY:cls==='الثالث'?{...BASE_PRIMARY,s:80}:BASE_PRIMARY;
  } else if (route === 'student-grades-ninth' || route === 'student-grades-third-secondary') {
    names = ['أعمال - فترة 1','أعمال - فترة 2']; weights = [.5,.5];
    totals = route==='student-grades-ninth'?NINTH:stream==='أدبي'?THIRD_ARTS:THIRD_SCIENCE;
  } else if (route === 'remedial_grades') {
    const primary=['الرابع','الخامس'].includes(cls);
    names = ['امتحان الدور الثاني']; weights = [primary ? .4 : .6];
    totals = primary?UPPER_PRIMARY:cls==='السادس'?SIXTH:cls==='الأول ثانوي'?FIRST_SECONDARY:cls==='الثاني ثانوي'?(stream==='أدبي'?SECOND_ARTS:SECOND_SCIENCE):UPPER_TRANSPORT;
  } else {
    names = SEMESTERS; weights = [.2,.3,.2,.3];
    totals = route==='student-grades-first-secondary'?FIRST_SECONDARY:route==='student-grades-second-secondary'?(stream==='أدبي'?SECOND_ARTS:SECOND_SCIENCE):cls==='السادس'?SIXTH:UPPER_TRANSPORT;
  }
  return {components:names,items:Object.entries(totals).map(([key,total])=>({key,label:route==='student-grades-ninth'&&key==='a'?'النحو والقراءة والنصوص':SUBJECTS[key],max:weights.map(weight=>Math.round(total*weight))}))};
}
const REMEDIAL_CLASSES=['الرابع','الخامس','السادس','السابع','الثامن','الأول ثانوي','الثاني ثانوي'];
export {YEAR,YEARS,CLASSES,SECTIONS,DAYS,PERIODS,ATTENDANCE,SCHOOL_TYPES,REGIONS,REMEDIAL_CLASSES,STUDENT_EXPORT,STAFF_FIELDS,routeForClass,gradePlan};
