/* الفعاليات والتحديات. المشاركة في التحديات محلية على الجهاز. */

/* ---------- حالة التحديات (محلية) ---------- */
Tafafi.challenges = (function () {
  const KEY = 'challenges:state';
  const ID_RE = /^[a-z0-9-]{2,30}$/;
  const U = Tafafi.utils;
  const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  function read() {
    const raw = Tafafi.storage.get(KEY, {});
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    Object.keys(raw).forEach(id => {
      const e = raw[id];
      if (!ID_RE.test(id) || !e || typeof e !== 'object' || !U.isDateKey(e.start)) return;
      const done = {};
      if (e.done && typeof e.done === 'object' && !Array.isArray(e.done)) {
        Object.keys(e.done).forEach(d => { if (U.isDateKey(d) && e.done[d] === true) done[d] = true; });
      }
      out[id] = { start: e.start, done };
    });
    return out;
  }

  function write(state) { return Tafafi.storage.set(KEY, state); }

  return {
    isJoined(id) { return hasOwn(read(), id); },
    join(id) {
      if (!ID_RE.test(id)) return false;
      const s = read();
      s[id] = { start: U.dateKey(), done: {} };
      return write(s);
    },
    leave(id) {
      const s = read();
      delete s[id];
      return write(s);
    },
    doneCount(id) {
      const s = read();
      return hasOwn(s, id) ? Object.keys(s[id].done).length : 0;
    },
    doneToday(id) {
      const s = read();
      return hasOwn(s, id) && s[id].done[U.dateKey()] === true;
    },
    toggleToday(id) {
      const s = read();
      if (!hasOwn(s, id)) return false;
      const today = U.dateKey();
      if (s[id].done[today]) delete s[id].done[today];
      else s[id].done[today] = true;
      return write(s);
    },
    isComplete(ch) {
      return this.isJoined(ch.id) && this.doneCount(ch.id) >= (Number(ch.days) || 0);
    }
  };
})();

(function () {
  const { esc, num, isDateKey, formatDate, dateKey } = Tafafi.utils;
  const C = Tafafi.challenges;
  const ui = Tafafi.ui;
  const BACK = ui.backLink('#/events', 'الفعاليات');

  /* ---------- الصفحة الرئيسية للفعاليات ---------- */
  Tafafi.pages.events._hub = {
    async render() {
      const [evData, chData] = await Promise.all([
        Tafafi.content.load('events'),
        Tafafi.content.load('challenges')
      ]);

      const challenges = Array.isArray(chData.items) ? chData.items : [];
      const chItems = challenges.map(c => {
        const joined = C.isJoined(c.id);
        const done = C.doneCount(c.id);
        const badge = !joined ? '' : C.isComplete(c)
          ? '<span class="badge">أنجزته ✓</span>'
          : `<span class="badge">${num(done)}/${num(c.days)}</span>`;
        return `
          <a class="item" href="#/events/challenge/${esc(encodeURIComponent(c.id))}">
            <span class="item-icon" aria-hidden="true">${esc(c.icon || '🏆')}</span>
            <span class="item-text">
              <span class="item-title">${esc(c.title)}</span>
              <span class="item-desc"><br>${esc(c.desc)}</span>
            </span>
            ${badge}
          </a>`;
      }).join('');

      /* الفعاليات: القادمة أولًا ثم السابقة */
      const today = dateKey();
      const events = (Array.isArray(evData.items) ? evData.items : [])
        .filter(e => e && typeof e.title === 'string' && isDateKey(e.date));
      const upcoming = events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
      const past = events.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date));

      const row = e => `
        <div class="item">
          <span class="item-icon" aria-hidden="true">📅</span>
          <div class="item-text">
            <div class="item-title">${esc(e.title)}</div>
            <div class="item-desc">${esc(formatDate(e.date))}${e.time ? ' · ' + esc(e.time) : ''}${e.place ? ' · ' + esc(e.place) : ''}</div>
            ${e.desc ? `<div class="item-desc">${esc(e.desc)}</div>` : ''}
          </div>
        </div>`;

      return `
        <h2 class="page-title">${esc(evData.title || 'الفعاليات')}</h2>
        <p class="page-sub">${esc(evData.subtitle || '')}</p>

        <h3 class="section-label">التحديات</h3>
        <div class="item-list">${chItems || ui.empty('لا توجد تحديات حاليًا.')}</div>

        <h3 class="section-label">الفعاليات القادمة</h3>
        <div class="item-list">${upcoming.map(row).join('') || ui.empty('لا توجد فعاليات قادمة الآن. ستظهر هنا عند نشرها من الإدارة.')}</div>

        ${past.length ? `<h3 class="section-label">فعاليات سابقة</h3><div class="item-list">${past.map(row).join('')}</div>` : ''}`;
    }
  };

  /* ---------- صفحة تحدٍّ ---------- */
  async function findChallenge(id) {
    const data = await Tafafi.content.load('challenges');
    return (Array.isArray(data.items) ? data.items : []).find(c => c && c.id === id) || null;
  }

  Tafafi.pages.events.challenge = {
    async render(parts) {
      const ch = await findChallenge(parts[0] || '');
      if (!ch) return BACK + ui.empty('هذا التحدي غير موجود.');

      const days = Math.max(1, Math.min(60, Number(ch.days) || 7));
      const joined = C.isJoined(ch.id);
      const done = C.doneCount(ch.id);
      const complete = joined && done >= days;
      const today = C.doneToday(ch.id);

      const dots = Array.from({ length: days }, (_, i) => `<span class="dot ${i < done ? 'on' : ''}"></span>`).join('');

      let action;
      if (!joined) {
        action = '<button class="btn btn-primary" type="button" data-action="join">انضم إلى التحدي</button>';
      } else if (complete) {
        action = `
          <p class="notice" style="background:var(--c-primary-soft)">أحسنت! أنجزت التحدي. 🎉</p>
          <button class="btn btn-ghost" type="button" data-action="restart">ابدأ التحدي من جديد</button>`;
      } else {
        action = `
          <button class="btn btn-ghost" type="button" data-action="today" aria-pressed="${today}">
            ${today ? '✓ سجّلت اليوم' : esc(ch.task || 'أنجزت مهمة اليوم')}
          </button>
          <button class="link-btn" type="button" data-action="leave">الخروج من التحدي</button>`;
      }

      return `
        ${BACK}
        <h2 class="page-title">${esc(ch.icon || '🏆')} ${esc(ch.title)}</h2>
        <p class="page-sub">${esc(ch.desc)}</p>
        <section class="card" aria-label="تقدمك">
          ${joined ? `<div class="item-title">${num(done)} من ${num(days)} أيام</div>
            <div class="dots" role="img" aria-label="${num(done)} من ${num(days)} أيام">${dots}</div>` : '<p class="muted">انضم لتبدأ التسجيل اليومي. التسجيل يتم على جهازك فقط.</p>'}
          ${action}
        </section>`;
    },

    after(root, parts) {
      const id = parts[0] || '';
      const rerender = ok => { if (!ok) ui.saveFailed(); Tafafi.router.refresh(); };
      ui.bind(root, {
        click: {
          join() { rerender(C.join(id)); },
          today() { rerender(C.toggleToday(id)); },
          restart() { rerender(C.join(id)); },
          async leave() {
            const ok = await ui.confirm({
              title: 'الخروج من التحدي؟', message: 'سيُحذف تقدمك في هذا التحدي من جهازك.',
              okText: 'خروج', danger: true
            });
            if (ok) rerender(C.leave(id));
          }
        }
      });
    }
  };
})();
