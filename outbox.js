/*
  صندوق الرسائل المحلي: تعليقات، اقتراحات، استشارات، مشكلات تقنية.
  في هذه النسخة تُحفظ على الجهاز فقط ولا تُرسل لأي جهة (config.api = null).
  عند تفعيل خدمة الإدارة لاحقًا تُرسل عبر sync() وتخضع للإشراف قبل النشر.
*/
Tafafi.outbox = {
  KEY: 'outbox',
  TYPES: ['comment', 'suggestion', 'consultation', 'support'],
  LABELS: { comment: 'تعليق', suggestion: 'اقتراح', consultation: 'استشارة', support: 'مشكلة تقنية' },
  MAX_ITEMS: 100,
  MAX_LEN: 500,

  list(type) {
    const raw = Tafafi.storage.get(this.KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(m => m && typeof m.id === 'string' && typeof m.text === 'string' && this.TYPES.includes(m.type))
      .filter(m => !type || m.type === type)
      .map(m => ({
        id: m.id.slice(0, 30),
        type: m.type,
        ref: typeof m.ref === 'string' ? m.ref.slice(0, 60) : '',
        text: m.text.slice(0, this.MAX_LEN),
        at: Number(m.at) || 0
      }));
  },

  /* يُرجع { ok:true } أو { ok:false, reason: 'type'|'empty'|'limit'|'storage' } */
  add({ type, ref = '', text }) {
    if (!this.TYPES.includes(type)) return { ok: false, reason: 'type' };
    const clean = String(text || '').trim().slice(0, this.MAX_LEN);
    if (!clean) return { ok: false, reason: 'empty' };
    const all = this.list();
    if (all.length >= this.MAX_ITEMS) return { ok: false, reason: 'limit' };
    all.unshift({ id: Tafafi.utils.uid(), type, ref: String(ref).slice(0, 60), text: clean, at: Date.now() });
    return Tafafi.storage.set(this.KEY, all) ? { ok: true } : { ok: false, reason: 'storage' };
  },

  remove(id) {
    return Tafafi.storage.set(this.KEY, this.list().filter(m => m.id !== id));
  },

  /* غير مفعّل بعد: لا يوجد خادم. */
  async sync() {
    if (!Tafafi.config.api) return { ok: false, reason: 'not-configured' };
    return { ok: false, reason: 'not-implemented' };
  }
};

/* ---------- مكونات واجهة مشتركة لصفحات الرسائل ---------- */
(function () {
  const { esc } = Tafafi.utils;
  const O = Tafafi.outbox;

  const REASONS = {
    empty: 'اكتب رسالتك أولًا.',
    limit: 'وصل صندوقك إلى الحد الأقصى. احذف بعض الرسائل القديمة أولًا.',
    storage: 'تعذّر الحفظ على جهازك. قد تكون المساحة ممتلئة.',
    type: 'نوع الرسالة غير صالح.'
  };

  /*
    نموذج رسالة. إن مُرّرت types يظهر اختيار النوع، وإلا يُستخدم fixedType.
    id مطلوب لربط label بالحقل ويجب أن يكون فريدًا في الصفحة.
  */
  Tafafi.ui.messageForm = function ({ id, formName, types, label, placeholder, button }) {
    const typeField = types ? `
      <div class="field">
        <label for="${esc(id)}Type">نوع الرسالة</label>
        <select id="${esc(id)}Type" name="type">
          ${types.map(t => `<option value="${esc(t)}">${esc(O.LABELS[t])}</option>`).join('')}
        </select>
      </div>` : '';
    return `
      <form class="card form" data-form="${esc(formName)}">
        ${typeField}
        <div class="field">
          <label for="${esc(id)}Text">${esc(label)}</label>
          <textarea id="${esc(id)}Text" name="text" maxlength="${O.MAX_LEN}" required placeholder="${esc(placeholder || '')}"></textarea>
        </div>
        <p class="notice">لا تكتب اسمك أو رقمك أو أي معلومات تعريفية. في هذه النسخة تُحفظ رسالتك على جهازك فقط ولا تُرسل لأي جهة بعد.</p>
        <button class="btn btn-primary" type="submit">${esc(button || 'حفظ')}</button>
      </form>`;
  };

  /* يحفظ رسالة من نموذج. يُرجع true عند النجاح. */
  Tafafi.ui.submitMessage = function (form, { type, ref = '' }) {
    const fd = new FormData(form);
    const res = O.add({ type: type || fd.get('type'), ref, text: fd.get('text') });
    if (res.ok) {
      Tafafi.ui.toast('حُفظت رسالتك على جهازك.');
      return true;
    }
    Tafafi.ui.toast(REASONS[res.reason] || REASONS.storage);
    return false;
  };

  Tafafi.ui.messageList = function (list, emptyText) {
    if (!list.length) return Tafafi.ui.empty(emptyText);
    return `<div class="item-list">${list.map(m => `
      <div class="item">
        <div class="item-text">
          <div><span class="badge">${esc(O.LABELS[m.type])}</span> <span class="badge badge-warn">محفوظة محليًا، لم تُرسل</span></div>
          <div style="margin-top:6px">${esc(m.text)}</div>
        </div>
        <button class="icon-btn" type="button" data-action="del-msg" data-id="${esc(m.id)}" aria-label="حذف الرسالة">🗑️</button>
      </div>`).join('')}</div>`;
  };
})();
