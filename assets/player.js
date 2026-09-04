/* Listen-along player for articles. Written by article_player.py. */
(function () {
  var card = document.getElementById('articleaudio');
  if (!card) return;
  var a = card.querySelector('audio'),
      now = card.querySelector('.ap-now'),
      list = card.querySelector('.ap-list'),
      more = card.querySelector('.ap-more'),
      rows = [].slice.call(card.querySelectorAll('.ap-list button')),
      rateBtn = card.querySelector('.ap-rate'),
      mini = document.getElementById('ap-mini'),
      miniT = mini ? mini.querySelector('.ap-mt') : null,
      miniPlay = mini ? mini.querySelector('[data-act="play"]') : null,
      miniFill = mini ? mini.querySelector('.ap-mpf') : null,
      miniBar = mini ? mini.querySelector('.ap-mp') : null,
      miniTime = mini ? mini.querySelector('.ap-mtime') : null,
      miniRate = mini ? mini.querySelector('[data-act="rate"]') : null,
      cur = -1, visible = true;

  function mmss(t) {
    if (!isFinite(t)) return '0:00';
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* Playback speed. Remembered across parts and across articles: someone who
     listens at 1.5x wants that everywhere, not once per file. */
  var RATES = [1, 1.25, 1.5, 2, 0.9], rate = 1;
  try {
    var saved = parseFloat(localStorage.getItem('ap-rate'));
    if (RATES.indexOf(saved) >= 0) rate = saved;
  } catch (e) {}
  function applyRate() {
    a.playbackRate = rate;
    var label = rate + '\u00d7';
    if (rateBtn) rateBtn.textContent = label;
    if (miniRate) miniRate.textContent = label;
  }
  function cycleRate() {
    rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    try { localStorage.setItem('ap-rate', rate); } catch (e) {}
    applyRate();
  }
  if (rateBtn) rateBtn.addEventListener('click', cycleRate);
  if (miniRate) miniRate.addEventListener('click', cycleRate);

  more.addEventListener('click', function () {
    var open = list.hasAttribute('hidden');
    if (open) { list.removeAttribute('hidden'); } else { list.setAttribute('hidden', ''); }
    more.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  function select(i, play) {
    if (i < 0 || i >= rows.length) return;
    cur = i;
    rows.forEach(function (r, j) { r.setAttribute('aria-current', j === i ? 'true' : 'false'); });
    var name = rows[i].querySelector('.ap-nm').textContent;
    a.src = rows[i].getAttribute('data-src');
    a.playbackRate = rate;   /* setting src resets this, so reapply */
    now.textContent = (i + 1) + '. ' + name;
    if (miniT) miniT.textContent = name;
    if (miniFill) miniFill.style.width = '0%';
    if (play) a.play().catch(function () {});
  }
  rows.forEach(function (r, i) { r.addEventListener('click', function () { select(i, true); }); });
  a.addEventListener('ended', function () { if (cur + 1 < rows.length) select(cur + 1, true); });

  function sync() {
    if (!mini) return;
    var show = !a.paused && !visible;
    if (show) { mini.removeAttribute('hidden'); } else { mini.setAttribute('hidden', ''); }
    document.body.classList.toggle('ap-bar-open', show);
  }
  a.addEventListener('play', sync);
  a.addEventListener('pause', sync);
  a.addEventListener('play', function () { if (miniPlay) miniPlay.innerHTML = '&#10073;&#10073;'; });
  a.addEventListener('pause', function () { if (miniPlay) miniPlay.innerHTML = '&#9654;'; });
  a.addEventListener('timeupdate', function () {
    if (!mini || mini.hasAttribute('hidden')) return;
    var d = a.duration;
    if (miniFill && isFinite(d) && d) miniFill.style.width = (a.currentTime / d * 100) + '%';
    if (miniTime) miniTime.textContent = mmss(a.currentTime) + ' / ' + mmss(d);
  });
  if (miniPlay) {
    miniPlay.addEventListener('click', function () {
      if (a.paused) { a.play().catch(function () {}); } else { a.pause(); }
    });
  }
  if (miniBar) {
    miniBar.addEventListener('click', function (ev) {
      var r = miniBar.getBoundingClientRect();
      if (isFinite(a.duration)) a.currentTime = (ev.clientX - r.left) / r.width * a.duration;
    });
  }
  if (mini) {
    var nextBtn = mini.querySelector('[data-act="next"]');
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (cur + 1 < rows.length) select(cur + 1, true);
    });
  }
  if (miniT) {
    miniT.addEventListener('click', function () {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting; sync();
    }, { threshold: 0.15 }).observe(card);
  }
  applyRate();
  select(0, false);
})();
