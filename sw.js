/*
  Service Worker: يجعل التطبيق يعمل بدون إنترنت.
  الاستراتيجية: الشبكة أولًا (فيحصل المستخدم دائمًا على آخر نسخة عند توفر الاتصال)،
  ثم الذاكرة المخزنة عند انقطاع الشبكة.
  عند تقديم نسخة مخزنة بسبب انقطاع الشبكة نضيف الترويسة X-Tafafi-Cache حتى لا يعتبرها التطبيق «تحديثًا ناجحًا».
  عند إضافة ملف جديد للمشروع أضفه إلى SHELL ورفّع رقم CACHE.
*/
const CACHE = 'tafafi-v2';

const SHELL = [
  './',
  'index.html',
  'css/variables.css', 'css/base.css', 'css/components.css',
  'js/config.js', 'js/utils.js', 'js/storage.js', 'js/prefs.js', 'js/content.js',
  'js/ui.js', 'js/outbox.js', 'js/journey-store.js', 'js/router.js',
  'js/views/sections.js', 'js/views/home.js', 'js/views/journey.js',
  'js/views/knowledge.js', 'js/views/events.js', 'js/views/games.js', 'js/views/more.js',
  'js/app.js',
  'data/app.json', 'data/daily-messages.json', 'data/sos.json', 'data/journey.json',
  'data/events.json', 'data/knowledge.json', 'data/more.json', 'data/articles.json',
  'data/videos.json', 'data/challenges.json', 'data/hobbies.json', 'data/games.json',
  'data/support.json', 'data/privacy.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(SHELL.map(url =>
        /* فشل ملف واحد لا يمنع التثبيت */
        cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (err) {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set('X-Tafafi-Cache', '1');
        return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers });
      }
      if (req.mode === 'navigate') {
        const shell = await caches.match('index.html');
        if (shell) return shell;
      }
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});
