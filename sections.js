/*
  أقسام رحلتي والفعاليات والمعرفة والمزيد.
  - الصفحة الرئيسية لكل تبويب تُرسم من data/*.json بنفس الشكل، لذلك يُضاف محتوى جديد دون تعديل الكود:
    { "title", "subtitle", "groups": [ { "label", "items": [ { "icon", "title", "desc", "badge", "href" } ] } ] }
    العنصر الذي له href يصبح رابطًا لصفحة فرعية.
  - الصفحات الفرعية تُسجَّل في Tafafi.pages.<tab>.<name>. وإن وُجد pages._hub فهو يحل محل الرسم العام للصفحة الرئيسية.
*/
Tafafi.ui.renderSection = function (data) {
  const { esc } = Tafafi.utils;

  const groups = (data.groups || []).map(group => {
    const items = (group.items || []).map(it => {
      const inner = `
        <span class="item-icon" aria-hidden="true">${esc(it.icon || '•')}</span>
        <span class="item-text">
          <span class="item-title">${esc(it.title)}</span>
          ${it.desc ? `<span class="item-desc"><br>${esc(it.desc)}</span>` : ''}
        </span>
        ${it.badge ? `<span class="badge">${esc(it.badge)}</span>` : ''}`;

      /* الروابط الداخلية فقط (#/...) */
      if (typeof it.href === 'string' && it.href.startsWith('#/')) {
        return `<a class="item" href="${esc(it.href)}">${inner}<span class="item-chevron" aria-hidden="true">‹</span></a>`;
      }
      return `<div class="item">${inner}</div>`;
    }).join('');

    return `
      ${group.label ? `<h3 class="section-label">${esc(group.label)}</h3>` : ''}
      <div class="item-list">${items}</div>`;
  }).join('');

  const empty = (data.groups || []).length
    ? ''
    : '<p class="state-msg">لا يوجد محتوى بعد.</p>';

  return `
    <h2 class="page-title">${esc(data.title)}</h2>
    ${data.subtitle ? `<p class="page-sub">${esc(data.subtitle)}</p>` : ''}
    ${groups}${empty}`;
};

['journey', 'events', 'knowledge', 'more'].forEach(name => {
  const pageOf = parts => {
    const pages = Tafafi.pages[name];
    const sub = parts && parts[0];
    if (sub && Object.prototype.hasOwnProperty.call(pages, sub) && sub !== '_hub') {
      return { page: pages[sub], rest: parts.slice(1) };
    }
    return { page: null, rest: [], unknown: !!sub };
  };

  Tafafi.views[name] = {
    async render(parts) {
      const { page, rest, unknown } = pageOf(parts);
      if (page) return page.render(rest);
      if (unknown) {
        return Tafafi.ui.backLink('#/' + name, 'رجوع') +
          Tafafi.ui.empty('هذه الصفحة غير موجودة.');
      }
      const hub = Tafafi.pages[name]._hub;
      if (hub) return hub.render([]);
      return Tafafi.ui.renderSection(await Tafafi.content.load(name));
    },

    after(root, parts) {
      const { page, rest } = pageOf(parts);
      if (page && page.after) return page.after(root, rest);
      const hub = Tafafi.pages[name]._hub;
      if (!page && hub && hub.after) hub.after(root, []);
    }
  };
});
