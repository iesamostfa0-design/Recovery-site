/* تفضيلات المظهر: السمة (تلقائي/فاتح/داكن) وحجم الخط. تُحفظ محليًا. */
Tafafi.prefs = {
  THEMES: ['auto', 'light', 'dark'],
  SIZES: ['small', 'normal', 'large'],

  get() {
    const p = Tafafi.storage.get('prefs', {}) || {};
    return {
      theme: this.THEMES.includes(p.theme) ? p.theme : 'auto',
      size: this.SIZES.includes(p.size) ? p.size : 'normal'
    };
  },

  set(patch) {
    const next = Object.assign(this.get(), patch);
    const saved = Tafafi.storage.set('prefs', { theme: next.theme, size: next.size });
    this.apply();
    return saved;
  },

  apply() {
    const p = this.get();
    const prefersDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const dark = p.theme === 'dark' || (p.theme === 'auto' && prefersDark);
    const root = document.documentElement;
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.setAttribute('data-size', p.size);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#1b2623' : '#2f7d6d');
  }
};

Tafafi.prefs.apply();
if (window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => Tafafi.prefs.apply();
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
}
