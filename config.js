/* مساحة الاسم العامة للتطبيق */
window.Tafafi = window.Tafafi || {};

Tafafi.config = {
  version: '1.0.0',
  storagePrefix: 'tafafi:',
  defaultRoute: 'home',

  /*
    لاحقًا: رابط خدمة المزامنة والإرسال للإدارة (المراحل المستقبلية).
    القيمة null تعني أن التطبيق يعمل محليًا فقط، ولا يُرسل أي شيء لأي جهة.
  */
  api: null,

  nav: [
    { id: 'home',      icon: '🏠', label: 'الرئيسية' },
    { id: 'journey',   icon: '🧭', label: 'رحلتي' },
    { id: 'events',    icon: '🎯', label: 'الفعاليات' },
    { id: 'knowledge', icon: '📚', label: 'المعرفة' },
    { id: 'more',      icon: '⋯',  label: 'المزيد' }
  ]
};

Tafafi.views = {};
Tafafi.ui = {};

/* صفحات فرعية لكل تبويب: Tafafi.pages.<tab>.<name> = { render(parts), after(root, parts) } */
Tafafi.pages = { journey: {}, events: {}, knowledge: {}, more: {} };
