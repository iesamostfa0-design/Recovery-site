/* الشاشة الرئيسية */
Tafafi.views.home = {
  async render() {
    const { esc, greeting, dayOfYear, dateKey, num } = Tafafi.utils;
    const [app, daily] = await Promise.all([
      Tafafi.content.load('app'),
      Tafafi.content.load('daily-messages')
    ]);

    const list = daily.messages || [];
    const message = list.length ? list[dayOfYear() % list.length] : '';

    /* بطاقة «اليوم»: تعتمد على بيانات رحلتي المحلية */
    const J = Tafafi.journey;
    const habits = J.habits();
    const today = dateKey();
    let todayCard;
    if (!habits.length) {
      todayCard = `
        <section class="card" aria-label="ابدأ رحلتك">
          <div class="item-title">ابدأ رحلتك</div>
          <p class="muted" style="margin-bottom:10px">أضف أول عادة تريد تغييرها وعادة بديلة لها. بياناتك تبقى على جهازك فقط.</p>
          <a class="btn btn-primary" href="#/journey/habits">إضافة عادة</a>
        </section>`;
    } else {
      const logged = habits.filter(h => J.statusOf(today, h.id)).length;
      const best = Math.max(...habits.map(h => J.stats(h.id).current));
      todayCard = `
        <section class="card" aria-label="اليوم">
          <div class="item-title">اليوم</div>
          <p>سجّلت ${num(logged)} من ${num(habits.length)} عادة${best > 0 ? ` · أطول سلسلة التزام حاليًا: ${num(best)} يوم` : ''}.</p>
          <a class="btn btn-primary" style="margin-top:10px" href="#/journey/habits">${logged < habits.length ? 'سجّل التزامك اليوم' : 'عرض عاداتي'}</a>
        </section>`;
    }

    /* تحدٍّ نشط إن وُجد */
    let challengeCard = '';
    try {
      const chData = await Tafafi.content.load('challenges');
      const active = (chData.items || []).find(c => Tafafi.challenges.isJoined(c.id) && !Tafafi.challenges.isComplete(c));
      if (active) {
        const done = Tafafi.challenges.doneCount(active.id);
        challengeCard = `
          <a class="item" href="#/events/challenge/${esc(active.id)}" style="margin-bottom:16px">
            <span class="item-icon" aria-hidden="true">🏆</span>
            <span class="item-text">
              <span class="item-title">${esc(active.title)}</span>
              <span class="item-desc"><br>${num(done)} من ${num(active.days)} أيام</span>
            </span>
            <span class="item-chevron" aria-hidden="true">‹</span>
          </a>`;
      }
    } catch (e) { /* لا يمنع عرض الرئيسية */ }

    const shortcuts = Tafafi.config.nav
      .filter(n => n.id !== 'home')
      .map(n => `
        <a class="item" href="#/${n.id}">
          <span class="item-icon" aria-hidden="true">${n.icon}</span>
          <span class="item-text"><span class="item-title">${esc(n.label)}</span></span>
          <span class="item-chevron" aria-hidden="true">‹</span>
        </a>`).join('');

    return `
      <section class="card card-hero">
        <p class="muted">${esc(greeting())}</p>
        <h2 class="page-title">${esc(app.tagline)}</h2>
        ${message ? `<p>${esc(message)}</p>` : ''}
      </section>

      ${todayCard}
      ${challengeCard}

      <h3 class="section-label">انتقال سريع</h3>
      <div class="item-list">${shortcuts}</div>

      <p class="muted" style="margin-top:24px">${esc(app.disclaimer)}</p>
    `;
  }
};
