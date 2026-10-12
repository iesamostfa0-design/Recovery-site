/* مكونات واجهة مشتركة: إشعار، تأكيد، نافذة، ربط أحداث */
(function () {
  const { esc } = Tafafi.utils;
  let toastTimer = null;

  Tafafi.ui.toast = function (message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
  };

  /* تأكيد داخل التطبيق. يُرجع Promise<boolean>. */
  Tafafi.ui.confirm = function ({ title = '', message = '', okText = 'تأكيد', cancelText = 'إلغاء', danger = false } = {}) {
    const dlg = document.getElementById('confirmSheet');
    if (!dlg || typeof dlg.showModal !== 'function') {
      return Promise.resolve(window.confirm(message || title));
    }
    return new Promise(resolve => {
      const ok = dlg.querySelector('[data-role="ok"]');
      const cancel = dlg.querySelector('[data-role="cancel"]');
      dlg.querySelector('[data-role="title"]').textContent = title;
      dlg.querySelector('[data-role="message"]').textContent = message;
      ok.textContent = okText;
      cancel.textContent = cancelText;
      ok.classList.toggle('btn-danger', danger);
      ok.classList.toggle('btn-primary', !danger);

      let done = false;
      const finish = value => {
        if (done) return;
        done = true;
        ok.onclick = cancel.onclick = dlg.oncancel = dlg.onclick = null;
        if (dlg.open) dlg.close();
        resolve(value);
      };
      ok.onclick = () => finish(true);
      cancel.onclick = () => finish(false);
      dlg.oncancel = () => finish(false);
      dlg.onclick = e => { if (e.target === dlg) finish(false); };
      dlg.showModal();
    });
  };

  /* نافذة سفلية عامة. تُرجع عنصر النافذة ليربط المستدعي أحداثه. */
  Tafafi.ui.sheet = function ({ title, html }) {
    const dlg = document.getElementById('genericSheet');
    document.getElementById('genericBody').innerHTML =
      `<h2 id="genericTitle">${esc(title)}</h2>${html}`;
    document.getElementById('genericClose').onclick = () => dlg.close();
    dlg.onclick = e => { if (e.target === dlg) dlg.close(); };
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    return dlg;
  };

  Tafafi.ui.closeSheet = function () {
    const dlg = document.getElementById('genericSheet');
    if (dlg && dlg.open) dlg.close();
  };

  Tafafi.ui.backLink = function (href, label) {
    return `<a class="back" href="${esc(href)}"><span aria-hidden="true">→</span> ${esc(label)}</a>`;
  };

  Tafafi.ui.empty = function (message) {
    return `<p class="state-msg">${esc(message)}</p>`;
  };

  /*
    ربط أحداث بالتفويض على عنصر الصفحة. يستبدل المعالجات السابقة (لا تتراكم).
    handlers = { click: {action: fn}, submit: {formName: fn}, change: {name: fn} }
  */
  Tafafi.ui.bind = function (root, handlers = {}) {
    const run = (fn, el, e) => {
      try {
        const r = fn(el, e);
        if (r && typeof r.catch === 'function') r.catch(err => console.error(err));
      } catch (err) { console.error(err); }
    };
    root.onclick = e => {
      const el = e.target.closest('[data-action]');
      if (!el || !root.contains(el) || el.disabled) return;
      const fn = handlers.click && handlers.click[el.dataset.action];
      if (fn) run(fn, el, e);
    };
    root.onsubmit = e => {
      const form = e.target.closest('form[data-form]');
      if (!form) return;
      e.preventDefault();
      const fn = handlers.submit && handlers.submit[form.dataset.form];
      if (fn) run(fn, form, e);
    };
    root.onchange = e => {
      const el = e.target.closest('[data-change]');
      if (!el || !root.contains(el)) return;
      const fn = handlers.change && handlers.change[el.dataset.change];
      if (fn) run(fn, el, e);
    };
  };

  Tafafi.ui.unbind = function (root) {
    root.onclick = root.onsubmit = root.onchange = null;
  };

  /* رسالة موحدة عند فشل الحفظ */
  Tafafi.ui.saveFailed = function () {
    Tafafi.ui.toast('تعذّر الحفظ على جهازك. قد تكون المساحة ممتلئة.');
  };
})();
