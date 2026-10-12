/*
  موجّه يعتمد على الـ hash مثل: #/home  أو  #/journey/habits  أو  #/knowledge/article/sleep-mood
  أول جزء = التبويب، والباقي = أجزاء الصفحة الفرعية تُمرَّر إلى view.render(parts).
*/
Tafafi.router = {
  _root: null,
  _token: 0,

  init(root) {
    this._root = root;
    this._renderNav();
    window.addEventListener('hashchange', () => this.go());
    this.go();
  },

  /* يُرجع { id, parts } */
  current() {
    const hash = location.hash.replace(/^#\/?/, '').split('?')[0];
    const segments = hash.split('/').filter(Boolean).map(s => {
      try { return decodeURIComponent(s); } catch (e) { return s; }
    });
    const id = segments[0];
    const valid = Tafafi.config.nav.some(n => n.id === id);
    return valid
      ? { id, parts: segments.slice(1) }
      : { id: Tafafi.config.defaultRoute, parts: [] };
  },

  _renderNav() {
    const nav = document.getElementById('bottomNav');
    nav.innerHTML = Tafafi.config.nav.map(n => `
      <a class="nav-item" href="#/${n.id}" data-route="${n.id}">
        <span class="nav-icon" aria-hidden="true">${n.icon}</span>
        <span>${n.label}</span>
      </a>`).join('');
  },

  _markActive(id) {
    document.querySelectorAll('.nav-item').forEach(a => {
      const active = a.dataset.route === id;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  },

  /* إعادة رسم الصفحة الحالية بعد تغيير بيانات، مع الحفاظ على موضع التمرير */
  refresh() {
    return this.go({ keepScroll: true });
  },

  async go({ keepScroll = false } = {}) {
    const { id, parts } = this.current();
    const view = Tafafi.views[id];
    const token = ++this._token;
    const y = window.scrollY;

    Tafafi.ui.unbind(this._root);
    this._markActive(id);
    if (!keepScroll) this._root.innerHTML = '<p class="state-msg">جارٍ التحميل…</p>';

    try {
      const html = await view.render(parts);
      if (token !== this._token) return; // تم الانتقال لصفحة أخرى
      this._root.innerHTML = html;
      if (!keepScroll) {
        this._root.classList.remove('view-enter');
        void this._root.offsetWidth;
        this._root.classList.add('view-enter');
      }
      if (view.after) view.after(this._root, parts);
    } catch (e) {
      if (token !== this._token) return;
      console.error(e);
      this._root.innerHTML =
        '<p class="state-msg">تعذّر تحميل هذه الصفحة الآن. حاول مرة أخرى بعد قليل.</p>';
    }

    if (keepScroll) window.scrollTo(0, y);
    else {
      window.scrollTo(0, 0);
      this._root.focus({ preventScroll: true });
    }
  }
};
