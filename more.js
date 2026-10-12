/* المزيد: الهوايات، التعليقات، الدعم، الاقتراحات، الخصوصية، الإعدادات، التحديثات */
(function () {
  const { esc, num } = Tafafi.utils;
  const ui = Tafafi.ui;
  const O = Tafafi.outbox;
  const BACK = ui.backLink('#/more', 'المزيد');
  const HOBBY_ID_RE = /^[a-z-]{2,30}$/;

  /* ---------- الهوايات ---------- */
  function wanted() {
    const raw = Tafafi.storage.get('hobbies:wanted', []);
    return Array.isArray(raw) ? raw.filter(id => typeof id === 'string' && HOBBY_ID_RE.test(id)) : [];
  }

  Tafafi.pages.more.hobbies = {
    async render() {
      const data = await Tafafi.content.load('hobbies');
      const list = (Array.isArray(data.items) ? data.items : []).filter(h => h && HOBBY_ID_RE.test(h.id));
      const mine = wanted();
      return `
        ${BACK}
        <h2 class="page-title">الهوايات</h2>
        <p class="page-sub">اختر هواية تشغل وقتك وتبني بها نفسك. علّم ما تريد تجربته، وسيبقى ذلك على جهازك فقط.</p>
        ${list.map(h => {
          const on = mine.includes(h.id);
          return `
            <details class="faq">
              <summary><span aria-hidden="true">${esc(h.icon || '✨')}</span> ${esc(h.title)}</summary>
              <p>${esc(h.desc)}</p>
              <ol class="muted" style="padding-inline-start:22px">${(Array.isArray(h.start) ? h.start : []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
              <button class="btn btn-ghost" type="button" data-action="want" data-id="${esc(h.id)}" aria-pressed="${on}"
                      style="margin-top:10px">${on ? '✓ أريد تجربتها' : 'أريد تجربتها'}</button>
            </details>`;
        }).join('') || ui.empty('لا توجد هوايات بعد.')}`;
    },

    after(root) {
      ui.bind(root, {
        click: {
          want(el) {
            const id = el.dataset.id;
            const cur = wanted();
            const next = cur.includes(id) ? cur.filter(x => x !== id) : cur.concat(id);
            if (!Tafafi.storage.set('hobbies:wanted', next)) { ui.saveFailed(); return; }
            /* تحديث الزر في مكانه حتى لا ينطوي القسم المفتوح */
            const on = next.includes(id);
            el.setAttribute('aria-pressed', String(on));
            el.textContent = on ? '✓ أريد تجربتها' : 'أريد تجربتها';
          }
        }
      });
    }
  };

  /* ---------- صفحات الرسائل: تعليقات، دعم، اقتراحات ---------- */
  function messageBinding(fixedType) {
    return root => {
      ui.bind(root, {
        submit: {
          message(form) {
            if (ui.submitMessage(form, { type: fixedType })) Tafafi.router.refresh();
          }
        },
        click: {
          async 'del-msg'(el) {
            const ok = await ui.confirm({ title: 'حذف الرسالة؟', message: 'ستُحذف من جهازك.', okText: 'حذف', danger: true });
            if (!ok) return;
            if (!O.remove(el.dataset.id)) ui.saveFailed();
            Tafafi.router.refresh();
          }
        }
      });
    };
  }

  Tafafi.pages.more.comments = {
    async render() {
      const mine = O.list('comment');
      return `
        ${BACK}
        <h2 class="page-title">التعليقات</h2>
        <p class="page-sub">تكتب تعليقك من صفحة المقال نفسه. عند تفعيل خدمة الإدارة لاحقًا ستُراجع التعليقات قبل نشرها.</p>
        <a class="btn btn-ghost" href="#/knowledge">تصفح المعرفة</a>
        <h3 class="section-label">تعليقاتي (${num(mine.length)})</h3>
        ${ui.messageList(mine, 'لم تكتب تعليقات بعد.')}`;
    },
    after(root) {
      ui.bind(root, {
        click: {
          async 'del-msg'(el) {
            const ok = await ui.confirm({ title: 'حذف التعليق؟', message: 'سيُحذف من جهازك.', okText: 'حذف', danger: true });
            if (!ok) return;
            if (!O.remove(el.dataset.id)) ui.saveFailed();
            Tafafi.router.refresh();
          }
        }
      });
    }
  };

  Tafafi.pages.more.support = {
    async render() {
      const data = await Tafafi.content.load('support');
      const faqs = Array.isArray(data.faqs) ? data.faqs : [];
      const mine = O.list('support');
      return `
        ${BACK}
        <h2 class="page-title">الدعم الفني</h2>
        <p class="page-sub">أجوبة سريعة لأكثر الأسئلة شيوعًا.</p>
        ${faqs.map(f => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}

        <h3 class="section-label">أبلغ عن مشكلة</h3>
        ${ui.messageForm({ id: 'sp', formName: 'message', label: 'صف المشكلة', placeholder: 'ماذا حدث؟ وما الذي كنت تفعله؟', button: 'حفظ البلاغ' })}
        ${mine.length ? `<h3 class="section-label">بلاغاتي (${num(mine.length)})</h3>${ui.messageList(mine, '')}` : ''}`;
    },
    after: messageBinding('support')
  };

  Tafafi.pages.more.suggestions = {
    async render() {
      const mine = O.list('suggestion').concat(O.list('consultation')).sort((a, b) => b.at - a.at);
      return `
        ${BACK}
        <h2 class="page-title">الاستشارات والاقتراحات</h2>
        <p class="page-sub">اقتراحاتك تساعدنا على تطوير التطبيق.</p>
        <p class="notice">الاستشارات هنا عامة وليست بديلًا عن الطبيب أو المختص. وإن كنت في أزمة أو تشعر بخطر فاضغط زر «أحتاج مساعدة الآن» أو اتصل بالطوارئ في بلدك.</p>
        ${ui.messageForm({ id: 'sg', formName: 'message', types: ['suggestion', 'consultation'], label: 'رسالتك', placeholder: 'اكتب اقتراحك أو سؤالك', button: 'حفظ الرسالة' })}
        ${mine.length ? `<h3 class="section-label">رسائلي (${num(mine.length)})</h3>${ui.messageList(mine, '')}` : ''}`;
    },
    after: messageBinding(null)
  };

  /* ---------- الخصوصية وإدارة البيانات ---------- */
  function downloadJson(json) {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tafafi-backup-${Tafafi.utils.dateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyText(text, textarea) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* نجرّب البديل */ }
    try {
      textarea.focus();
      textarea.select();
      return document.execCommand('copy');
    } catch (e) {
      return false;
    }
  }

  function openExport() {
    const json = JSON.stringify(Tafafi.storage.exportUser(), null, 2);
    const dlg = ui.sheet({
      title: 'نسخة احتياطية',
      html: `
        <p class="muted">هذه كل بياناتك. احفظها في مكان آمن. من يملك هذا النص يستطيع قراءة بياناتك.</p>
        <textarea class="export-box" id="exportBox" readonly aria-label="نص النسخة الاحتياطية"></textarea>
        <div class="btn-row">
          <button class="btn btn-ghost" type="button" id="exCopy">نسخ</button>
          <button class="btn btn-primary" type="button" id="exDownload">تنزيل ملف</button>
        </div>`
    });
    const box = dlg.querySelector('#exportBox');
    box.value = json;
    dlg.querySelector('#exCopy').onclick = async () => {
      ui.toast((await copyText(json, box)) ? 'تم النسخ.' : 'تعذّر النسخ. حدّد النص وانسخه يدويًا.');
    };
    dlg.querySelector('#exDownload').onclick = () => downloadJson(json);
  }

  function openImport() {
    const dlg = ui.sheet({
      title: 'استعادة نسخة احتياطية',
      html: `
        <p class="muted">الصق نص النسخة الاحتياطية هنا. ستحل البيانات المستعادة محل البيانات الحالية من النوع نفسه.</p>
        <textarea class="export-box" id="importBox" aria-label="الصق النسخة الاحتياطية هنا"></textarea>
        <button class="btn btn-primary" type="button" id="imDo">استعادة</button>`
    });
    dlg.querySelector('#imDo').onclick = async () => {
      const text = dlg.querySelector('#importBox').value.trim();
      if (!text) { ui.toast('الصق النص أولًا.'); return; }
      if (text.length > 1000000) { ui.toast('الملف كبير جدًا.'); return; }
      let obj;
      try { obj = JSON.parse(text); } catch (e) { ui.toast('النص غير صالح.'); return; }
      if (!obj || obj.app !== 'tafafi' || !obj.data || typeof obj.data !== 'object') {
        ui.toast('هذا ليس ملف نسخة احتياطية من تعافي.');
        return;
      }
      const ok = await ui.confirm({
        title: 'استعادة البيانات؟',
        message: 'ستُستبدل بياناتك الحالية من النوع نفسه بما في النسخة الاحتياطية.',
        okText: 'استعادة'
      });
      if (!ok) return;
      const n = Tafafi.storage.importUser(obj);
      if (n < 0) { ui.toast('هذا ليس ملف نسخة احتياطية من تعافي.'); return; }
      Tafafi.prefs.apply();
      ui.closeSheet();
      ui.toast(`تمت استعادة ${num(n)} عنصرًا.`);
      Tafafi.router.refresh();
    };
  }

  Tafafi.pages.more.privacy = {
    async render() {
      const data = await Tafafi.content.load('privacy');
      const sections = Array.isArray(data.sections) ? data.sections : [];
      return `
        ${BACK}
        <h2 class="page-title">الخصوصية</h2>
        <p class="page-sub">خصوصيتك أولوية: لا حسابات، وبياناتك على جهازك.</p>
        ${sections.map(s => `
          <section class="card">
            <div class="item-title">${esc(s.title)}</div>
            ${(Array.isArray(s.body) ? s.body : []).map(p => `<p class="muted" style="margin-top:6px">${esc(p)}</p>`).join('')}
          </section>`).join('')}

        <h3 class="section-label">بياناتي</h3>
        <button class="btn btn-ghost" type="button" data-action="export">تصدير نسخة احتياطية</button>
        <button class="btn btn-ghost" type="button" data-action="import" style="margin-top:10px">استعادة نسخة احتياطية</button>
        <button class="btn btn-danger" type="button" data-action="wipe" style="margin-top:10px">حذف كل بياناتي</button>`;
    },

    after(root) {
      ui.bind(root, {
        click: {
          export: openExport,
          import: openImport,
          async wipe() {
            const ok = await ui.confirm({
              title: 'حذف كل بياناتك؟',
              message: 'ستُحذف عاداتك ومحفزاتك وأهدافك وتقدمك ورسائلك وتفضيلاتك من هذا الجهاز نهائيًا، ولا يمكن التراجع. صدّر نسخة احتياطية أولًا إن أردت.',
              okText: 'حذف نهائيًا', danger: true
            });
            if (!ok) return;
            Tafafi.storage.clearUser();
            Tafafi.prefs.apply();
            ui.toast('تم حذف كل بياناتك من هذا الجهاز.');
            Tafafi.router.refresh();
          }
        }
      });
    }
  };

  /* ---------- الإعدادات ---------- */
  Tafafi.pages.more.settings = {
    async render() {
      const p = Tafafi.prefs.get();
      const radios = (name, value, options) => options.map(([v, label]) => `
        <label class="choice">
          <input type="radio" name="${name}" value="${v}" data-change="${name}" ${value === v ? 'checked' : ''}>
          <span>${esc(label)}</span>
        </label>`).join('');
      return `
        ${BACK}
        <h2 class="page-title">الإعدادات</h2>
        <p class="page-sub">تُحفظ تفضيلاتك على جهازك.</p>
        <section class="card">
          <fieldset>
            <legend>المظهر</legend>
            ${radios('theme', p.theme, [['auto', 'تلقائي (حسب الجهاز)'], ['light', 'فاتح'], ['dark', 'داكن']])}
          </fieldset>
        </section>
        <section class="card">
          <fieldset>
            <legend>حجم الخط</legend>
            ${radios('size', p.size, [['small', 'صغير'], ['normal', 'عادي'], ['large', 'كبير']])}
          </fieldset>
        </section>`;
    },

    after(root) {
      const apply = key => el => {
        if (!Tafafi.prefs.set({ [key]: el.value })) ui.saveFailed();
      };
      ui.bind(root, { change: { theme: apply('theme'), size: apply('size') } });
    }
  };

  /* ---------- التحديثات ---------- */
  function lastRefreshText() {
    const t = Tafafi.content.lastRefresh();
    return t ? new Date(t).toLocaleString('ar-EG') : 'لم يتم بعد';
  }

  Tafafi.pages.more.updates = {
    async render() {
      const app = await Tafafi.content.load('app');
      return `
        ${BACK}
        <h2 class="page-title">التحديثات</h2>
        <p class="page-sub">عند توفر الإنترنت يمكنك تنزيل المحتوى الجديد ليصبح متاحًا لاحقًا بدون إنترنت.</p>
        <section class="card">
          <p>إصدار التطبيق: <b>${esc(Tafafi.config.version)}</b></p>
          <p>إصدار المحتوى: <b>${esc(app.version != null ? app.version : '-')}</b></p>
          <p class="muted">آخر تحقق ناجح: <span id="lastRefresh">${esc(lastRefreshText())}</span></p>
        </section>
        <button class="btn btn-primary" type="button" data-action="refresh" id="refreshBtn">التحقق من المحتوى الجديد</button>
        <p id="refreshResult" role="status" class="muted" style="margin-top:12px"></p>`;
    },

    after(root) {
      ui.bind(root, {
        click: {
          async refresh(el) {
            const out = root.querySelector('#refreshResult');
            el.disabled = true;
            out.textContent = 'جارٍ التحقق…';
            try {
              const r = await Tafafi.content.refreshAll();
              if (r.offline || (r.failed.length && !r.updated.length && !r.same)) {
                out.textContent = 'لا يوجد اتصال بالإنترنت الآن. المحتوى المحفوظ على جهازك ما زال متاحًا.';
              } else if (r.failed.length) {
                out.textContent = `تعذّر تحديث بعض الملفات (${num(r.failed.length)}). حاول مرة أخرى لاحقًا.`;
              } else if (r.updated.length) {
                out.textContent = `تم تحديث ${num(r.updated.length)} من ملفات المحتوى.`;
              } else {
                out.textContent = 'محتواك محدّث. لا جديد الآن.';
              }
              const last = root.querySelector('#lastRefresh');
              if (last) last.textContent = lastRefreshText();
            } finally {
              el.disabled = false;
            }
          }
        }
      });
    }
  };
})();
