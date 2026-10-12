/* تخزين محلي فقط. لا شيء يغادر الجهاز. */
Tafafi.storage = {
  /* المفاتيح التي تخص المستخدم (تُصدَّر وتُحذف وتُستعاد). ذاكرة المحتوى المؤقتة ليست منها. */
  USER_KEY_RE: /^(journey|challenges|hobbies|games|outbox|prefs)(:|$)/,

  _key(key) { return Tafafi.config.storagePrefix + key; },

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this._key(key));
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(this._key(key), JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },

  remove(key) {
    try { localStorage.removeItem(this._key(key)); } catch (e) {}
  },

  keys() {
    const out = [];
    try {
      const prefix = Tafafi.config.storagePrefix;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) out.push(k.slice(prefix.length));
      }
    } catch (e) {}
    return out;
  },

  isUserKey(name) {
    return typeof name === 'string' && name.length <= 60 && this.USER_KEY_RE.test(name);
  },

  /* نسخة احتياطية من بيانات المستخدم فقط */
  exportUser() {
    const data = {};
    this.keys().filter(k => this.isUserKey(k)).forEach(k => { data[k] = this.get(k); });
    return { app: 'tafafi', version: 1, exportedAt: new Date().toISOString(), data };
  },

  /* استعادة: تقبل مفاتيح المستخدم المعروفة فقط. تُرجع عدد العناصر المستعادة، أو -1 إن كان الملف غير صالح. */
  importUser(obj) {
    if (!obj || obj.app !== 'tafafi' || !obj.data ||
        typeof obj.data !== 'object' || Array.isArray(obj.data)) return -1;
    let count = 0;
    Object.keys(obj.data).forEach(k => {
      if (this.isUserKey(k) && this.set(k, obj.data[k])) count++;
    });
    return count;
  },

  clearUser() {
    this.keys().filter(k => this.isUserKey(k)).forEach(k => this.remove(k));
  }
};
