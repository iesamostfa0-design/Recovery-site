/* رحلتي: المحفزات، العادات، الأهداف، التقدم. كلها محلية. */
(function () {
  const { esc, dateKey, formatDate, num } = Tafafi.utils;
  const J = Tafafi.journey;
  const ui = Tafafi.ui;

  const BACK = ui.backLink('#/journey', 'رحلتي');
  const MOODS = [
    { v: 1, icon: '😞', label: 'سيئ جدًا' },
    { v: 2, icon: '🙁', label: 'سيئ' },
    { v: 3, icon: '😐', label: 'عادي' },
    { v: 4, icon: '🙂', label: 'جيد' },
    { v: 5, icon: '😄', label: 'ممتاز' }
  ];

  const REASONS = {
    empty: 'اكتب نصًا أولًا.',
    limit: 'وصلت إلى الحد الأقصى. احذف بعض العناصر القديمة أولًا.',
    storage: 'تعذّر الحفظ على جهازك. قد تكون المساحة ممتلئة.'
  };

  /* يعالج نتيجة الإضافة ويُرجع true عند النجاح */
  function handleAdd(res, successMessage) {
    if (res.ok) { ui.toast(successMessage); return true; }
    ui.toast(REASONS[res.reason] || REASONS.storage);
    return false;
  }

  /* ---------- المحفزات ---------- */
  Tafafi.pages.journey.triggers = {
    async render() {
      const list = J.triggers();
      const catOptions = Object.keys(J.CATS)
        .map(k => `<option value="${k}">${esc(J.CATS[k])}</option>`).join('');

      const items = list.map(t => `
        <div class="item">
          <div class="item-text">
            <div class="item-title">${esc(t.text)} <span class="badge">${esc(J.CATS[t.cat])}</span></div>
            ${t.plan ? `<div class="item-desc">بدلًا من ذلك: ${esc(t.plan)}</div>` : ''}
          </div>
          <button class="icon-btn" type="button" data-action="del-trigger" data-id="${esc(t.id)}"
                  aria-label="حذف المحفز: ${esc(t.text)}">🗑️</button>
        </div>`).join('');

      return `
        ${BACK}
        <h2 class="page-title">المحفزات</h2>
        <p class="page-sub">المحفز هو ما يسبق الرغبة: وقت أو مكان أو شعور أو أشخاص. فهمه يساعدك على الاستعداد له.</p>

        <form class="card form" data-form="trigger">
          <div class="field">
            <label for="trText">ما الذي يسبق الرغبة؟</label>
            <input id="trText" name="text" type="text" maxlength="80" required placeholder="مثال: الجلوس وحدي في الليل">
          </div>
          <div class="field">
            <label for="trCat">نوعه</label>
            <select id="trCat" name="cat">${catOptions}</select>
          </div>
          <div class="field">
            <label for="trPlan">ماذا سأفعل بدلًا من ذلك؟ (اختياري)</label>
            <input id="trPlan" name="plan" type="text" maxlength="120" placeholder="مثال: أخرج للمشي عشر دقائق">
          </div>
          <button class="btn btn-primary" type="submit">إضافة المحفز</button>
        </form>

        <h3 class="section-label">محفزاتي (${num(list.length)})</h3>
        <div class="item-list">${items || ui.empty('لم تضف محفزات بعد.')}</div>`;
    },

    after(root) {
      ui.bind(root, {
        submit: {
          trigger(form) {
            const fd = new FormData(form);
            const res = J.addTrigger({ text: fd.get('text'), cat: fd.get('cat'), plan: fd.get('plan') });
            if (handleAdd(res, 'تمت إضافة المحفز.')) Tafafi.router.refresh();
          }
        },
        click: {
          async 'del-trigger'(el) {
            const ok = await ui.confirm({
              title: 'حذف المحفز؟', message: 'سيُحذف هذا المحفز من جهازك.',
              okText: 'حذف', danger: true
            });
            if (!ok) return;
            if (!J.removeTrigger(el.dataset.id)) ui.saveFailed();
            Tafafi.router.refresh();
          }
        }
      });
    }
  };

  /* ---------- العادات ---------- */
  function habitForm(open) {
    return `
      <form class="card form" data-form="habit">
        <div class="field">
          <label for="hbName">العادة التي أريد التخلص منها</label>
          <input id="hbName" name="name" type="text" maxlength="60" required placeholder="اكتبها بكلماتك أنت">
        </div>
        <div class="field">
          <label for="hbAlt">العادة البديلة التي سأفعلها (اختياري)</label>
          <input id="hbAlt" name="alternative" type="text" maxlength="80" placeholder="مثال: المشي أو القراءة">
        </div>
        <button class="btn btn-primary" type="submit">${open ? 'إضافة عادة' : 'ابدأ'}</button>
      </form>`;
  }

  Tafafi.pages.journey.habits = {
    async render() {
      const habits = J.habits();
      const today = dateKey();

      if (!habits.length) {
        return `
          ${BACK}
          <h2 class="page-title">عاداتي</h2>
          <p class="page-sub">ابدأ بعادة واحدة. التركيز على عادة بديلة أسهل من الاكتفاء بالمنع.</p>
          ${habitForm(false)}`;
      }

      const cards = habits.map(h => {
        const st = J.statusOf(today, h.id);
        const s = J.stats(h.id);
        return `
          <section class="card" aria-label="${esc(h.name)}">
            <div class="item-title">${esc(h.name)}</div>
            ${h.alternative ? `<div class="muted">البديل: ${esc(h.alternative)}</div>` : ''}
            <div class="btn-row">
              <button class="btn btn-ghost" type="button" data-action="checkin" data-id="${esc(h.id)}"
                      data-status="ok" aria-pressed="${st === 'ok'}">✓ التزمت اليوم</button>
              <button class="btn btn-ghost btn-warn-pressed" type="button" data-action="checkin" data-id="${esc(h.id)}"
                      data-status="slip" aria-pressed="${st === 'slip'}">تعثرت اليوم</button>
            </div>
            <p class="muted" style="margin-top:10px">أيام الالتزام المتتالية: ${num(s.current)} · إجمالي أيام الالتزام: ${num(s.ok)}</p>
            <button class="link-btn" type="button" data-action="del-habit" data-id="${esc(h.id)}"
                    data-name="${esc(h.name)}">حذف هذه العادة</button>
          </section>`;
      }).join('');

      const mood = J.moodOf(today);
      const moodBtns = MOODS.map(m => `
        <button class="mood-btn" type="button" data-action="mood" data-v="${m.v}"
                aria-pressed="${mood === m.v}" aria-label="${esc(m.label)}">${m.icon}</button>`).join('');

      const trigOptions = J.triggers()
        .map(t => `<option value="${esc(t.id)}">${esc(t.text)}</option>`).join('');

      return `
        ${BACK}
        <h2 class="page-title">عاداتي</h2>
        <p class="page-sub">${esc(formatDate(today))}</p>

        ${cards}

        <section class="card" aria-label="مزاج اليوم">
          <div class="item-title" style="margin-bottom:8px">كيف حالك اليوم؟</div>
          <div class="moods">${moodBtns}</div>
        </section>

        <section class="card" aria-label="تسجيل رغبة">
          <div class="item-title">مرّت بي رغبة الآن</div>
          <p class="muted" style="margin-bottom:8px">تسجيلها يساعدك على فهم محفزاتك. لا حكم ولا لوم هنا.</p>
          ${trigOptions ? `
            <div class="field">
              <label for="urgeTrigger">ما الذي سبقها؟ (اختياري)</label>
              <select id="urgeTrigger"><option value="">لا أعرف / لا أريد التحديد</option>${trigOptions}</select>
            </div>` : `<p class="muted">أضف <a href="#/journey/triggers">محفزاتك</a> لتربطها بالرغبات.</p>`}
          <div class="btn-row">
            <button class="btn btn-primary" type="button" data-action="urge" data-outcome="passed">مرّت وتجاوزتها</button>
            <button class="btn btn-ghost" type="button" data-action="urge" data-outcome="slipped">لم أستطع تجاوزها</button>
          </div>
        </section>

        <details class="faq" style="margin-top:16px">
          <summary>إضافة عادة أخرى</summary>
          ${habitForm(true)}
        </details>`;
    },

    after(root) {
      ui.bind(root, {
        submit: {
          habit(form) {
            const fd = new FormData(form);
            const res = J.addHabit({ name: fd.get('name'), alternative: fd.get('alternative') });
            if (handleAdd(res, 'تمت إضافة العادة. بداية موفقة!')) Tafafi.router.refresh();
          }
        },
        click: {
          checkin(el) {
            const today = dateKey();
            const wanted = el.dataset.status;
            const current = J.statusOf(today, el.dataset.id);
            const next = current === wanted ? null : wanted;
            if (!J.setCheckin(today, el.dataset.id, next)) { ui.saveFailed(); return; }
            if (next === 'ok') ui.toast('أحسنت. خطوة جديدة في رحلتك.');
            else if (next === 'slip') ui.toast('لا بأس، التعثر جزء من التغيير. ما الذي سبقه؟ أضفه إلى محفزاتك وتابع.');
            Tafafi.router.refresh();
          },
          mood(el) {
            const today = dateKey();
            const v = Number(el.dataset.v);
            const next = J.moodOf(today) === v ? 0 : v;
            if (!J.setMood(today, next)) ui.saveFailed();
            Tafafi.router.refresh();
          },
          urge(el) {
            const select = root.querySelector('#urgeTrigger');
            const ok = J.logUrge({ outcome: el.dataset.outcome, trigger: select ? select.value : '' });
            if (!ok) { ui.saveFailed(); return; }
            ui.toast(el.dataset.outcome === 'passed'
              ? 'ممتاز! الرغبة مرّت وأنت أقوى منها.'
              : 'شكرًا لصدقك مع نفسك. سُجّلت، وتابع من جديد.');
          },
          async 'del-habit'(el) {
            const ok = await ui.confirm({
              title: 'حذف العادة؟',
              message: `ستُحذف العادة «${el.dataset.name}» وكل سجلات التزامها من جهازك.`,
              okText: 'حذف', danger: true
            });
            if (!ok) return;
            if (!J.removeHabit(el.dataset.id)) ui.saveFailed();
            Tafafi.router.refresh();
          }
        }
      });
    }
  };

  /* ---------- الأهداف ---------- */
  Tafafi.pages.journey.goals = {
    async render() {
      const goals = J.goals();
      const open = goals.filter(g => !g.done);
      const done = goals.filter(g => g.done);

      const row = g => `
        <div class="item">
          <button class="icon-btn" type="button" data-action="toggle-goal" data-id="${esc(g.id)}"
                  role="checkbox" aria-checked="${g.done}" aria-label="${esc(g.text)}">${g.done ? '☑️' : '⬜'}</button>
          <div class="item-text">
            <div class="item-title"${g.done ? ' style="text-decoration:line-through;opacity:.7"' : ''}>${esc(g.text)}</div>
            ${g.due ? `<div class="item-desc">الموعد: ${esc(formatDate(g.due))}</div>` : ''}
          </div>
          <button class="icon-btn" type="button" data-action="del-goal" data-id="${esc(g.id)}"
                  aria-label="حذف الهدف: ${esc(g.text)}">🗑️</button>
        </div>`;

      return `
        ${BACK}
        <h2 class="page-title">الأهداف</h2>
        <p class="page-sub">أهداف صغيرة وواضحة تُنجز في أيام قليلة أفضل من هدف كبير غامض.</p>

        <form class="card form" data-form="goal">
          <div class="field">
            <label for="glText">هدفي</label>
            <input id="glText" name="text" type="text" maxlength="100" required placeholder="مثال: أمشي ثلاث مرات هذا الأسبوع">
          </div>
          <div class="field">
            <label for="glDue">الموعد (اختياري)</label>
            <input id="glDue" name="due" type="date">
          </div>
          <button class="btn btn-primary" type="submit">إضافة الهدف</button>
        </form>

        <h3 class="section-label">قيد التنفيذ (${num(open.length)})</h3>
        <div class="item-list">${open.map(row).join('') || ui.empty('لا أهداف قيد التنفيذ.')}</div>

        ${done.length ? `
          <h3 class="section-label">أنجزتها (${num(done.length)})</h3>
          <div class="item-list">${done.map(row).join('')}</div>` : ''}`;
    },

    after(root) {
      ui.bind(root, {
        submit: {
          goal(form) {
            const fd = new FormData(form);
            const res = J.addGoal({ text: fd.get('text'), due: fd.get('due') });
            if (handleAdd(res, 'تمت إضافة الهدف.')) Tafafi.router.refresh();
          }
        },
        click: {
          'toggle-goal'(el) {
            if (!J.toggleGoal(el.dataset.id)) ui.saveFailed();
            Tafafi.router.refresh();
          },
          async 'del-goal'(el) {
            const ok = await ui.confirm({ title: 'حذف الهدف؟', message: 'سيُحذف هذا الهدف من جهازك.', okText: 'حذف', danger: true });
            if (!ok) return;
            if (!J.removeGoal(el.dataset.id)) ui.saveFailed();
            Tafafi.router.refresh();
          }
        }
      });
    }
  };

  /* ---------- التقدم ---------- */
  Tafafi.pages.journey.progress = {
    async render() {
      const habits = J.habits();
      const urges = J.urges();
      const goals = J.goals();

      if (!habits.length && !urges.length && !goals.length) {
        return `
          ${BACK}
          <h2 class="page-title">التقدم</h2>
          ${ui.empty('لا توجد بيانات بعد. ابدأ بإضافة عادة وتسجيل التزامك اليومي.')}
          <a class="btn btn-primary" href="#/journey/habits">ابدأ الآن</a>`;
      }

      const habitCards = habits.map(h => {
        const s = J.stats(h.id);
        const cells = J.recent(h.id, 14).map(d => {
          const cls = d.status === 'ok' ? 'cell-ok' : d.status === 'slip' ? 'cell-slip' : '';
          const label = d.status === 'ok' ? 'التزام' : d.status === 'slip' ? 'تعثر' : 'بلا تسجيل';
          return `<span class="cell ${cls}" role="img" aria-label="${esc(formatDate(d.key))}: ${label}"></span>`;
        }).join('');
        return `
          <section class="card" aria-label="${esc(h.name)}">
            <div class="item-title">${esc(h.name)}</div>
            <div class="tiles">
              <div class="tile"><b>${num(s.current)}</b><span>أيام متتالية الآن</span></div>
              <div class="tile"><b>${num(s.best)}</b><span>أطول سلسلة</span></div>
              <div class="tile"><b>${num(s.ok)}</b><span>إجمالي أيام الالتزام</span></div>
              <div class="tile"><b>${num(s.slip)}</b><span>أيام التعثر المسجلة</span></div>
            </div>
            <div class="muted">آخر 14 يومًا</div>
            <div class="days">${cells}</div>
            <div class="legend">
              <span><i style="background:var(--c-primary-strong)"></i>التزام</span>
              <span><i style="background:var(--c-warn)"></i>تعثر</span>
              <span><i style="background:var(--c-border)"></i>بلا تسجيل</span>
            </div>
            ${s.ok > 0 ? '<p class="muted" style="margin-top:10px">أيام التزامك رصيد يبقى لك حتى لو تعثرت. المهم أن تعود.</p>' : ''}
          </section>`;
      }).join('');

      const passed = urges.filter(u => u.outcome === 'passed').length;
      const top = J.topTriggers(3);
      const urgeCard = urges.length ? `
        <section class="card" aria-label="الرغبات">
          <div class="item-title">الرغبات</div>
          <p>تجاوزت <b>${num(passed)}</b> من أصل <b>${num(urges.length)}</b> رغبة مسجلة.</p>
          ${top.length ? `
            <div class="muted" style="margin-top:8px">أكثر المحفزات تكرارًا:</div>
            <div class="item-list" style="margin-top:6px">
              ${top.map(x => `<div class="item"><div class="item-text">${esc(x.trigger.text)}</div><span class="badge">${num(x.count)}</span></div>`).join('')}
            </div>` : ''}
        </section>` : '';

      const goalsDone = goals.filter(g => g.done).length;
      const pct = goals.length ? Math.round((goalsDone / goals.length) * 100) : 0;
      const goalCard = goals.length ? `
        <section class="card" aria-label="الأهداف">
          <div class="item-title">الأهداف</div>
          <p>أنجزت ${num(goalsDone)} من ${num(goals.length)}.</p>
          <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
        </section>` : '';

      const avg = J.moodAverage(7);
      const moodCard = avg !== null ? `
        <section class="card" aria-label="المزاج">
          <div class="item-title">مزاجك آخر 7 أيام</div>
          <p>متوسط ${esc(MOODS[Math.round(avg) - 1].icon)} (${num(avg.toFixed(1))} من 5)</p>
        </section>` : '';

      return `
        ${BACK}
        <h2 class="page-title">التقدم</h2>
        <p class="page-sub">تقدمك أوسع من عدّ الأيام: التزام، وفهم لمحفزاتك، وأهداف تنجزها.</p>
        ${habitCards}${urgeCard}${goalCard}${moodCard}`;
    }
  };
})();
