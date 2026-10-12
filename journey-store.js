/*
  بيانات «رحلتي»: محفزات، عادات، التزام يومي، مزاج، رغبات، أهداف.
  كلها محلية. القراءة دفاعية: أي بيانات تالفة أو مستعادة من نسخة غير موثوقة تُفلتر بدل أن تكسر التطبيق.
*/
Tafafi.journey = (function () {
  const S = Tafafi.storage;
  const U = Tafafi.utils;

  const KEYS = {
    triggers: 'journey:triggers',
    habits: 'journey:habits',
    checkins: 'journey:checkins',
    moods: 'journey:moods',
    urges: 'journey:urges',
    goals: 'journey:goals'
  };

  const ID_RE = /^[a-z0-9]{4,24}$/;
  const CATS = { time: 'وقت', place: 'مكان', feeling: 'شعور', people: 'أشخاص', other: 'أخرى' };
  const MAX_ITEMS = 60;
  const MAX_URGES = 500;

  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  function readList(key, map) {
    const raw = S.get(key, []);
    if (!Array.isArray(raw)) return [];
    return raw.map(item => (item && typeof item === 'object' ? map(item) : null)).filter(Boolean);
  }

  function readObject(key) {
    const raw = S.get(key, {});
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  }

  /* ---------- المحفزات ---------- */
  function triggers() {
    return readList(KEYS.triggers, t => {
      const text = str(t.text, 80).trim();
      if (!ID_RE.test(t.id) || !text) return null;
      return { id: t.id, text, cat: hasOwn(CATS, t.cat) ? t.cat : 'other', plan: str(t.plan, 120), at: Number(t.at) || 0 };
    });
  }

  function addTrigger({ text, cat, plan }) {
    const clean = str(text, 80).trim();
    if (!clean) return { ok: false, reason: 'empty' };
    const list = triggers();
    if (list.length >= MAX_ITEMS) return { ok: false, reason: 'limit' };
    list.unshift({ id: U.uid(), text: clean, cat: hasOwn(CATS, cat) ? cat : 'other', plan: str(plan, 120).trim(), at: Date.now() });
    return S.set(KEYS.triggers, list) ? { ok: true } : { ok: false, reason: 'storage' };
  }

  function removeTrigger(id) {
    return S.set(KEYS.triggers, triggers().filter(t => t.id !== id));
  }

  /* ---------- العادات ---------- */
  function habits() {
    return readList(KEYS.habits, h => {
      const name = str(h.name, 60).trim();
      if (!ID_RE.test(h.id) || !name) return null;
      return { id: h.id, name, alternative: str(h.alternative, 80), at: Number(h.at) || 0 };
    });
  }

  function addHabit({ name, alternative }) {
    const clean = str(name, 60).trim();
    if (!clean) return { ok: false, reason: 'empty' };
    const list = habits();
    if (list.length >= 20) return { ok: false, reason: 'limit' };
    list.push({ id: U.uid(), name: clean, alternative: str(alternative, 80).trim(), at: Date.now() });
    return S.set(KEYS.habits, list) ? { ok: true } : { ok: false, reason: 'storage' };
  }

  /* حذف العادة يحذف سجلاتها كذلك */
  function removeHabit(id) {
    const ok = S.set(KEYS.habits, habits().filter(h => h.id !== id));
    const all = readObject(KEYS.checkins);
    const next = {};
    Object.keys(all).forEach(date => {
      const day = all[date];
      if (!U.isDateKey(date) || !day || typeof day !== 'object') return;
      const copy = {};
      Object.keys(day).forEach(hid => { if (hid !== id) copy[hid] = day[hid]; });
      if (Object.keys(copy).length) next[date] = copy;
    });
    S.set(KEYS.checkins, next);
    return ok;
  }

  /* ---------- الالتزام اليومي ---------- */
  function statusOf(date, habitId) {
    const all = readObject(KEYS.checkins);
    const day = hasOwn(all, date) ? all[date] : null;
    if (!day || typeof day !== 'object' || !hasOwn(day, habitId)) return null;
    const s = day[habitId];
    return s === 'ok' || s === 'slip' ? s : null;
  }

  /* status: 'ok' | 'slip' | null (لإزالة التسجيل) */
  function setCheckin(date, habitId, status) {
    if (!U.isDateKey(date) || !habits().some(h => h.id === habitId)) return false;
    if (status !== 'ok' && status !== 'slip' && status !== null) return false;
    const all = readObject(KEYS.checkins);
    const day = hasOwn(all, date) && all[date] && typeof all[date] === 'object' ? Object.assign({}, all[date]) : {};
    if (status === null) delete day[habitId];
    else day[habitId] = status;
    if (Object.keys(day).length) all[date] = day;
    else delete all[date];
    return S.set(KEYS.checkins, all);
  }

  function stats(habitId) {
    const all = readObject(KEYS.checkins);
    const dates = Object.keys(all).filter(d => U.isDateKey(d) && statusOf(d, habitId)).sort();
    let ok = 0, slip = 0, best = 0, run = 0, lastOk = null;
    dates.forEach(d => {
      if (statusOf(d, habitId) === 'ok') {
        ok++;
        run = lastOk && U.addDays(lastOk, 1) === d ? run + 1 : 1;
        lastOk = d;
        if (run > best) best = run;
      } else {
        slip++;
        run = 0;
        lastOk = null;
      }
    });

    /* السلسلة الحالية: تُحسب حتى اليوم، أو حتى أمس إن لم يُسجَّل اليوم بعد */
    const today = U.dateKey();
    const todayStatus = statusOf(today, habitId);
    let current = 0;
    if (todayStatus !== 'slip') {
      let d = todayStatus === 'ok' ? today : U.addDays(today, -1);
      while (statusOf(d, habitId) === 'ok') {
        current++;
        d = U.addDays(d, -1);
      }
    }
    return { ok, slip, best, current };
  }

  /* آخر n يومًا (الأقدم أولًا) */
  function recent(habitId, n) {
    const today = U.dateKey();
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const key = U.addDays(today, -i);
      out.push({ key, status: statusOf(key, habitId) });
    }
    return out;
  }

  /* ---------- المزاج ---------- */
  function moodOf(date) {
    const m = readObject(KEYS.moods);
    const v = hasOwn(m, date) ? Number(m[date]) : 0;
    return v >= 1 && v <= 5 && Number.isInteger(v) ? v : 0;
  }

  function setMood(date, value) {
    if (!U.isDateKey(date)) return false;
    const v = Number(value);
    if (!Number.isInteger(v) || v < 0 || v > 5) return false;
    const m = readObject(KEYS.moods);
    if (v === 0) delete m[date];
    else m[date] = v;
    return S.set(KEYS.moods, m);
  }

  /* متوسط مزاج آخر n يومًا، أو null إن لم يوجد تسجيل */
  function moodAverage(n) {
    const today = U.dateKey();
    let sum = 0, count = 0;
    for (let i = 0; i < n; i++) {
      const v = moodOf(U.addDays(today, -i));
      if (v) { sum += v; count++; }
    }
    return count ? sum / count : null;
  }

  /* ---------- الرغبات ---------- */
  function urges() {
    return readList(KEYS.urges, u => {
      if (u.outcome !== 'passed' && u.outcome !== 'slipped') return null;
      return {
        id: str(u.id, 30),
        outcome: u.outcome,
        trigger: ID_RE.test(u.trigger) ? u.trigger : '',
        at: Number(u.at) || 0
      };
    });
  }

  function logUrge({ outcome, trigger }) {
    if (outcome !== 'passed' && outcome !== 'slipped') return false;
    const list = urges();
    list.push({ id: U.uid(), outcome, trigger: ID_RE.test(trigger) ? trigger : '', at: Date.now() });
    return S.set(KEYS.urges, list.slice(-MAX_URGES));
  }

  /* أكثر المحفزات تكرارًا في الرغبات المسجلة (للمحفزات الموجودة فقط) */
  function topTriggers(limit) {
    const counts = {};
    urges().forEach(u => { if (u.trigger) counts[u.trigger] = (counts[u.trigger] || 0) + 1; });
    return triggers()
      .map(t => ({ trigger: t, count: counts[t.id] || 0 }))
      .filter(x => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /* ---------- الأهداف ---------- */
  function goals() {
    return readList(KEYS.goals, g => {
      const text = str(g.text, 100).trim();
      if (!ID_RE.test(g.id) || !text) return null;
      return { id: g.id, text, due: U.isDateKey(g.due) ? g.due : '', done: g.done === true, at: Number(g.at) || 0 };
    });
  }

  function addGoal({ text, due }) {
    const clean = str(text, 100).trim();
    if (!clean) return { ok: false, reason: 'empty' };
    const list = goals();
    if (list.length >= MAX_ITEMS) return { ok: false, reason: 'limit' };
    list.unshift({ id: U.uid(), text: clean, due: U.isDateKey(due) ? due : '', done: false, at: Date.now() });
    return S.set(KEYS.goals, list) ? { ok: true } : { ok: false, reason: 'storage' };
  }

  function toggleGoal(id) {
    const list = goals().map(g => (g.id === id ? Object.assign({}, g, { done: !g.done }) : g));
    return S.set(KEYS.goals, list);
  }

  function removeGoal(id) {
    return S.set(KEYS.goals, goals().filter(g => g.id !== id));
  }

  return {
    CATS, MAX_ITEMS,
    triggers, addTrigger, removeTrigger,
    habits, addHabit, removeHabit,
    statusOf, setCheckin, stats, recent,
    moodOf, setMood, moodAverage,
    urges, logUrge, topTriggers,
    goals, addGoal, toggleGoal, removeGoal
  };
})();
