/* المعرفة: أقسام (الدين، الصحة، المقالات، الفيديوهات) وقراءة المقال */
(function () {
  const { esc, num } = Tafafi.utils;
  const ui = Tafafi.ui;
  const BACK_HUB = ui.backLink('#/knowledge', 'المعرفة');

  const CATEGORY_RE = /^[a-z-]{2,20}$/;

  function reviewBadge(item) {
    return item.reviewed === true ? '' : '<span class="badge badge-warn">مسودة قيد المراجعة</span>';
  }

  /* ---------- قائمة قسم ---------- */
  Tafafi.pages.knowledge.category = {
    async render(parts) {
      const catId = parts[0] || '';
      const hub = await Tafafi.content.load('knowledge');
      const cats = hub.categories || {};
      const cat = CATEGORY_RE.test(catId) && Object.prototype.hasOwnProperty.call(cats, catId) ? cats[catId] : null;
      if (!cat) return BACK_HUB + ui.empty('هذا القسم غير موجود.');

      const data = await Tafafi.content.load(cat.source === 'videos' ? 'videos' : 'articles');
      const all = Array.isArray(data.items) ? data.items : [];

      let body;
      if (cat.source === 'videos') {
        const videos = all.filter(v => v && typeof v.url === 'string' && /^https:\/\//.test(v.url));
        body = videos.length
          ? `<div class="item-list">${videos.map(v => `
              <a class="item" href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">
                <span class="item-icon" aria-hidden="true">▶️</span>
                <span class="item-text">
                  <span class="item-title">${esc(v.title)}</span>
                  ${v.desc ? `<span class="item-desc"><br>${esc(v.desc)}</span>` : ''}
                  <span class="item-desc"><br>يحتاج إلى اتصال بالإنترنت</span>
                </span>
                ${reviewBadge(v)}
              </a>`).join('')}</div>`
          : ui.empty(cat.empty);
      } else {
        const items = all.filter(a => a && a.category === catId && typeof a.id === 'string');
        body = items.length
          ? `<div class="item-list">${items.map(a => `
              <a class="item" href="#/knowledge/article/${esc(encodeURIComponent(a.id))}">
                <span class="item-text">
                  <span class="item-title">${esc(a.title)}</span>
                  ${a.summary ? `<span class="item-desc"><br>${esc(a.summary)}</span>` : ''}
                  <span class="item-desc"><br>${a.minutes ? `${num(a.minutes)} دقائق قراءة ` : ''}${reviewBadge(a)}</span>
                </span>
                <span class="item-chevron" aria-hidden="true">‹</span>
              </a>`).join('')}</div>`
          : ui.empty(cat.empty);
      }

      return `${BACK_HUB}<h2 class="page-title">${esc(cat.title)}</h2>${body}`;
    }
  };

  /* ---------- قراءة مقال ---------- */
  function renderBlock(b) {
    if (!b || typeof b !== 'object') return '';
    if (typeof b.h === 'string') return `<h3>${esc(b.h)}</h3>`;
    if (typeof b.p === 'string') return `<p>${esc(b.p)}</p>`;
    if (Array.isArray(b.ul)) return `<ul>${b.ul.map(li => `<li>${esc(li)}</li>`).join('')}</ul>`;
    return '';
  }

  Tafafi.pages.knowledge.article = {
    async render(parts) {
      const id = parts[0] || '';
      const data = await Tafafi.content.load('articles');
      const art = (Array.isArray(data.items) ? data.items : []).find(a => a && a.id === id);
      if (!art) return BACK_HUB + ui.empty('هذا المقال غير موجود.');

      const mine = Tafafi.outbox.list('comment').filter(m => m.ref === art.id);

      return `
        ${ui.backLink('#/knowledge/category/' + encodeURIComponent(art.category || 'articles'), 'رجوع')}
        <article class="article">
          <h2 class="page-title">${esc(art.title)}</h2>
          <p class="muted">${art.minutes ? `${num(art.minutes)} دقائق قراءة` : ''} ${reviewBadge(art)}</p>
          ${art.reviewed === true ? '' : '<p class="notice">هذه المادة مسودة قيد المراجعة من مختصين ولم تُعتمد بعد. استخدمها للاطلاع العام فقط.</p>'}
          ${(Array.isArray(art.body) ? art.body : []).map(renderBlock).join('')}
        </article>

        <h3 class="section-label">تعليق</h3>
        ${ui.messageForm({ id: 'cm', formName: 'comment', label: 'اكتب تعليقك', placeholder: 'شاركنا رأيك أو سؤالك', button: 'حفظ التعليق' })}
        ${mine.length ? ui.messageList(mine, '') : ''}`;
    },

    after(root, parts) {
      const id = parts[0] || '';
      ui.bind(root, {
        submit: {
          comment(form) {
            if (ui.submitMessage(form, { type: 'comment', ref: id })) Tafafi.router.refresh();
          }
        },
        click: {
          async 'del-msg'(el) {
            const ok = await ui.confirm({ title: 'حذف الرسالة؟', message: 'ستُحذف من جهازك.', okText: 'حذف', danger: true });
            if (!ok) return;
            if (!Tafafi.outbox.remove(el.dataset.id)) ui.saveFailed();
            Tafafi.router.refresh();
          }
        }
      });
    }
  };
})();
