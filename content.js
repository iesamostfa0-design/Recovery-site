/*
  تحميل المحتوى من data/*.json
  - يُخزَّن آخر إصدار ناجح محليًا ليعمل التطبيق بدون إنترنت.
  - لاحقًا: تُستبدل جهة الجلب بمزامنة من قاعدة المحتوى دون تغيير الواجهات.
*/
Tafafi.content = {
  _memory: {},

  /* كل ملفات المحتوى (تُستخدم في فحص التحديثات) */
  files: [
    'app', 'daily-messages', 'sos', 'journey', 'events', 'knowledge', 'more',
    'articles', 'videos', 'challenges', 'hobbies', 'games', 'support', 'privacy'
  ],

  async load(name) {
    if (this._memory[name]) return this._memory[name];

    try {
      const res = await fetch(`data/${name}.json`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      this._memory[name] = data;
      Tafafi.storage.set('content:' + name, data);
      return data;
    } catch (e) {
      const cached = Tafafi.storage.get('content:' + name);
      if (cached) {
        this._memory[name] = cached;
        return cached;
      }
      throw e;
    }
  },

  /*
    فحص المحتوى الجديد وتنزيله.
    يعيد: { updated: [...], same: n, failed: [...], offline: bool }
    ملاحظة: عندما يخدم الـ Service Worker نسخة مخزنة لانقطاع الشبكة يضيف الترويسة X-Tafafi-Cache،
    فنعتبرها فشلًا في الاتصال بدل أن نُظهر نجاحًا كاذبًا.
  */
  async refreshAll() {
    const result = { updated: [], same: 0, failed: [], offline: false };

    for (const name of this.files) {
      try {
        const res = await fetch(`data/${name}.json`, { cache: 'reload' });
        if (!res.ok) throw new Error(res.status);
        if (res.headers.get('X-Tafafi-Cache')) {
          result.offline = true;
          result.failed.push(name);
          continue;
        }
        const data = await res.json();
        const old = Tafafi.storage.get('content:' + name);
        /* ملف لم يكن محفوظًا على الجهاز من قبل يُحفظ الآن للعمل بدون إنترنت، ولا يُعدّ «تحديثًا» */
        if (old === null || JSON.stringify(old) === JSON.stringify(data)) result.same++;
        else result.updated.push(name);
        this._memory[name] = data;
        Tafafi.storage.set('content:' + name, data);
      } catch (e) {
        result.failed.push(name);
      }
    }

    if (!result.failed.length) Tafafi.storage.set('meta:lastRefresh', Date.now());
    return result;
  },

  lastRefresh() {
    const t = Tafafi.storage.get('meta:lastRefresh', null);
    return typeof t === 'number' ? t : null;
  }
};
