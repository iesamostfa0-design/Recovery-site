/* الألعاب: ألعاب خفيفة تعمل بالكامل دون إنترنت. */
(function () {
  const { esc, num } = Tafafi.utils;
  const ui = Tafafi.ui;
  const BACK_MORE = ui.backLink('#/more', 'المزيد');
  const BACK_GAMES = ui.backLink('#/more/games', 'الألعاب');
  const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function bestOf(key) {
    const v = Tafafi.storage.get(key, null);
    return typeof v === 'number' && isFinite(v) && v > 0 ? v : null;
  }

  /* ---------- لعبة الذاكرة ---------- */
  const EMOJI = ['🌿', '🌙', '⭐', '🌊', '🔥', '🌸', '🍃', '☀️'];
  const CLOSED = 'بطاقة مغلقة';

  const memory = {
    render() {
      const best = bestOf('games:memory:best');
      const cards = Array.from({ length: 16 }, (_, i) =>
        `<button class="tile-btn hidden" type="button" data-action="flip" data-i="${i}" aria-label="${CLOSED}"></button>`).join('');
      return `
        ${BACK_GAMES}
        <h2 class="page-title">🃏 لعبة الذاكرة</h2>
        <p class="page-sub">اقلب بطاقتين وابحث عن الأزواج المتشابهة بأقل عدد من الحركات.</p>
        <p id="memStatus" role="status">الحركات: ${num(0)}${best ? ` · أفضل نتيجة: ${num(best)}` : ''}</p>
        <div class="board">${cards}</div>
        <button class="btn btn-ghost" type="button" data-action="restart">لعبة جديدة</button>`;
    },

    after(root) {
      const deck = shuffle([...EMOJI, ...EMOJI]);
      const status = root.querySelector('#memStatus');
      let first = null;
      let lock = false;
      let moves = 0;
      let pairs = 0;

      const open = btn => {
        btn.classList.remove('hidden');
        btn.textContent = deck[Number(btn.dataset.i)];
        btn.setAttribute('aria-label', deck[Number(btn.dataset.i)]);
      };
      const close = btn => {
        btn.classList.add('hidden');
        btn.textContent = '';
        btn.setAttribute('aria-label', CLOSED);
      };

      ui.bind(root, {
        click: {
          flip(el) {
            if (lock || el === first || el.classList.contains('matched')) return;
            open(el);
            if (!first) { first = el; return; }

            moves++;
            const a = first;
            const same = deck[Number(a.dataset.i)] === deck[Number(el.dataset.i)];
            first = null;

            if (same) {
              [a, el].forEach(b => { b.classList.add('matched'); b.disabled = true; });
              pairs++;
              status.textContent = `الحركات: ${num(moves)}`;
              if (pairs === EMOJI.length) {
                const prev = bestOf('games:memory:best');
                const record = !prev || moves < prev;
                if (record) Tafafi.storage.set('games:memory:best', moves);
                status.textContent = `أحسنت! أنهيتها في ${num(moves)} حركة${record ? ' وهذا رقم قياسي جديد 🎉' : ''}.`;
              }
            } else {
              status.textContent = `الحركات: ${num(moves)}`;
              lock = true;
              setTimeout(() => {
                if (root.contains(a)) { close(a); close(el); }
                lock = false;
              }, 800);
            }
          },
          restart() { Tafafi.router.refresh(); }
        }
      });
    }
  };

  /* ---------- رتّب الأرقام ---------- */
  const order = {
    render() {
      const best = bestOf('games:order:best');
      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const cells = nums.map(n =>
        `<button class="tile-btn" type="button" data-action="pick" data-n="${n}" aria-label="الرقم ${n}">${num(n)}</button>`).join('');
      return `
        ${BACK_GAMES}
        <h2 class="page-title">🔢 رتّب الأرقام</h2>
        <p class="page-sub">اضغط الأرقام من 1 إلى 9 بالترتيب بأسرع ما تستطيع. يبدأ الوقت عند أول ضغطة.</p>
        <p id="ordStatus" role="status">التالي: ${num(1)}${best ? ` · أفضل زمن: ${num(best.toFixed(1))} ثانية` : ''}</p>
        <div class="board board-3">${cells}</div>
        <button class="btn btn-ghost" type="button" data-action="restart">لعبة جديدة</button>`;
    },

    after(root) {
      const status = root.querySelector('#ordStatus');
      let next = 1;
      let started = 0;

      ui.bind(root, {
        click: {
          pick(el) {
            const n = Number(el.dataset.n);
            if (!started) started = performance.now();
            if (n !== next) {
              el.classList.remove('wrong');
              void el.offsetWidth;
              el.classList.add('wrong');
              return;
            }
            el.classList.add('done');
            el.disabled = true;
            next++;
            if (next > 9) {
              const secs = (performance.now() - started) / 1000;
              const prev = bestOf('games:order:best');
              const record = !prev || secs < prev;
              if (record) Tafafi.storage.set('games:order:best', Number(secs.toFixed(2)));
              status.textContent = `أحسنت! زمنك ${num(secs.toFixed(1))} ثانية${record ? ' وهذا رقم قياسي جديد 🎉' : ''}.`;
            } else {
              status.textContent = `التالي: ${num(next)}`;
            }
          },
          restart() { Tafafi.router.refresh(); }
        }
      });
    }
  };

  const GAMES = { memory, order };

  Tafafi.pages.more.games = {
    async render(parts) {
      const id = parts[0];
      if (id && hasOwn(GAMES, id)) return GAMES[id].render();

      const data = await Tafafi.content.load('games');
      const items = (Array.isArray(data.items) ? data.items : []).filter(g => g && hasOwn(GAMES, g.id));
      return `
        ${BACK_MORE}
        <h2 class="page-title">الألعاب</h2>
        <p class="page-sub">ألعاب خفيفة تشغل وقتك بشكل مفيد وتعمل بدون إنترنت.</p>
        <div class="item-list">${items.map(g => `
          <a class="item" href="#/more/games/${esc(g.id)}">
            <span class="item-icon" aria-hidden="true">${esc(g.icon || '🎮')}</span>
            <span class="item-text">
              <span class="item-title">${esc(g.title)}</span>
              <span class="item-desc"><br>${esc(g.desc)}</span>
            </span>
            <span class="item-chevron" aria-hidden="true">‹</span>
          </a>`).join('') || ui.empty('لا توجد ألعاب بعد.')}</div>`;
    },

    after(root, parts) {
      const id = parts[0];
      if (id && hasOwn(GAMES, id)) GAMES[id].after(root);
    }
  };
})();
