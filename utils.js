/* أدوات مساعدة صغيرة (بدون استخدام this حتى يصح تفكيكها) */
(function () {
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  /* رقم اليوم في السنة (لاختيار رسالة اليوم) */
  function dayOfYear(date = new Date()) {
    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000);
  }

  function greeting(date = new Date()) {
    const h = date.getHours();
    if (h < 5)  return 'ليلة هادئة';
    if (h < 12) return 'صباح الخير';
    if (h < 18) return 'مساء النور';
    return 'مساء الخير';
  }

  /* مفتاح التاريخ المحلي بصيغة YYYY-MM-DD */
  function dateKey(d = new Date()) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  function isDateKey(key) {
    if (typeof key !== 'string' || !DATE_RE.test(key)) return false;
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }

  function parseKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(key, n) {
    const d = parseKey(key);
    d.setDate(d.getDate() + n);
    return dateKey(d);
  }

  function formatDate(key) {
    if (!isDateKey(key)) return '';
    return parseKey(key).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function num(n) {
    return Number(n || 0).toLocaleString('ar-EG');
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  Tafafi.utils = { esc, dayOfYear, greeting, dateKey, isDateKey, parseKey, addDays, formatDate, num, uid };
})();
