/* نقطة بدء التطبيق */
(function () {
  const { esc } = Tafafi.utils;

  async function setupTitle() {
    try {
      const app = await Tafafi.content.load('app');
      if (app.name) {
        document.getElementById('appTitle').textContent = app.name;
        document.title = app.name;
      }
    } catch (e) { /* العنوان الافتراضي يكفي */ }
  }

  async function openSos() {
    const sheet = document.getElementById('sosSheet');
    const body = document.getElementById('sosBody');

    try {
      const sos = await Tafafi.content.load('sos');
      const steps = (sos.steps || []).map(s => `<li>${esc(s)}</li>`).join('');
      body.innerHTML = `
        <h2 id="sosTitle">${esc(sos.title)}</h2>
        <p>${esc(sos.intro)}</p>
        <ol>${steps}</ol>
        <button class="btn btn-ghost" type="button" data-sos="passed">مرّت الرغبة وتجاوزتها ✓</button>
        <p class="muted" style="margin-top:12px">${esc(sos.note)}</p>`;
    } catch (e) {
      body.innerHTML = `
        <h2 id="sosTitle">أنت لست وحدك</h2>
        <p>خذ نفسًا بطيئًا، وابتعد عن المكان الذي تشعر فيه بالضغط، وتواصل مع شخص تثق به. إن كنت في خطر فاتصل بالإسعاف أو الطوارئ في بلدك.</p>`;
    }

    if (typeof sheet.showModal === 'function') {
      if (!sheet.open) sheet.showModal();
    } else {
      sheet.setAttribute('open', '');
    }
  }

  function closeSos() {
    const sheet = document.getElementById('sosSheet');
    if (typeof sheet.close === 'function') sheet.close();
    else sheet.removeAttribute('open');
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('sw.js').catch(() => { /* العمل بدون Service Worker ممكن */ });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('sosBtn').addEventListener('click', openSos);
    document.getElementById('sosClose').addEventListener('click', closeSos);

    const sheet = document.getElementById('sosSheet');
    /* الإغلاق بالنقر على الخلفية */
    sheet.addEventListener('click', e => { if (e.target === sheet) closeSos(); });

    /* تسجيل رغبة تم تجاوزها من نافذة المساعدة */
    document.getElementById('sosBody').addEventListener('click', e => {
      const btn = e.target.closest('[data-sos="passed"]');
      if (!btn) return;
      if (Tafafi.journey.logUrge({ outcome: 'passed', trigger: '' })) {
        Tafafi.ui.toast('أحسنت! سُجّل أنك تجاوزت الرغبة.');
        closeSos();
      } else {
        Tafafi.ui.saveFailed();
      }
    });

    setupTitle();
    Tafafi.router.init(document.getElementById('view'));
    registerServiceWorker();
  });
})();
