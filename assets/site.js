/* Luxury HB Home — shared behaviour: header, mobile menu, booking form, lightbox. */
(function () {
  var AIRBNB = 'https://www.airbnb.com/rooms/1303252032926840956';

  /* Header shadow once the page scrolls */
  var header = document.querySelector('.site-header');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* Mobile menu */
  var menuBtn = document.querySelector('.menu-btn'), nav = document.getElementById('site-nav');
  if (menuBtn && nav) {
    function setMenu(open) {
      nav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  }

  /* Booking form → Airbnb with dates and guests filled in.
     Dates use the visitor's LOCAL calendar day: toISOString() is UTC, which made
     "today" unselectable after 5 p.m. in California, and new Date('YYYY-MM-DD')
     parses as UTC midnight, so the suggested checkout landed a day early. */
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function parse(v) { var p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(v, n) { var d = parse(v); d.setDate(d.getDate() + n); return ymd(d); }
  document.querySelectorAll('form.bookbox').forEach(function (f) {
    var ci = f.elements.ci, co = f.elements.co, err = f.querySelector('.form-error');
    var today = ymd(new Date());
    ci.min = today; co.min = addDays(today, 1);
    ci.addEventListener('change', function () {
      if (!ci.value) return;
      co.min = addDays(ci.value, 1);
      if (!co.value || co.value <= ci.value) co.value = addDays(ci.value, 3);
      if (err) err.textContent = '';
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (ci.value && co.value && co.value <= ci.value) {
        if (err) err.textContent = 'Checkout needs to be after check-in.';
        co.focus(); return;
      }
      var u = new URL(AIRBNB);
      if (ci.value) u.searchParams.set('check_in', ci.value);
      if (co.value) u.searchParams.set('check_out', co.value);
      if (f.elements.g && f.elements.g.value) u.searchParams.set('adults', f.elements.g.value);
      var w = window.open(u.toString(), '_blank', 'noopener');
      if (!w) window.location.href = u.toString(); // pop-up blocked
    });
  });

  /* Hide the mobile booking bar while the booking card or footer is on screen */
  var mbar = document.querySelector('.mbar');
  if (mbar && 'IntersectionObserver' in window) {
    var seen = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.isIntersecting ? seen.add(en.target) : seen.delete(en.target); });
      mbar.classList.toggle('hide', seen.size > 0);
    });
    document.querySelectorAll('.bookbox, .site-footer, .cta').forEach(function (el) { io.observe(el); });
  }

  /* Lightbox for [data-lightbox] buttons. Photos come from #photo-data (JSON)
     so "Show all photos" can open the full set, not just what's on the page. */
  var dataEl = document.getElementById('photo-data');
  var triggers = document.querySelectorAll('[data-lightbox]');
  if (!triggers.length) return;
  var photos = dataEl ? JSON.parse(dataEl.textContent) : Array.prototype.map.call(triggers, function (b) {
    return { src: b.getAttribute('data-src'), alt: b.getAttribute('data-alt') || '' };
  });
  var box = document.createElement('div');
  box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Photo gallery');
  box.innerHTML =
    '<div class="bar"><span class="count" aria-live="polite"></span>' +
    '<button type="button" class="close" aria-label="Close gallery"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
    '<div class="stage"><button type="button" class="prev" aria-label="Previous photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg></button>' +
    '<figure><img alt=""><figcaption></figcaption></figure>' +
    '<button type="button" class="next" aria-label="Next photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></button></div>';
  document.body.appendChild(box);
  var img = box.querySelector('img'), cap = box.querySelector('figcaption'), count = box.querySelector('.count');
  var idx = 0, lastFocus = null;
  function show(i) {
    idx = (i + photos.length) % photos.length;
    img.src = photos[idx].src; img.alt = photos[idx].alt; cap.textContent = photos[idx].alt;
    count.textContent = (idx + 1) + ' / ' + photos.length;
    new Image().src = photos[(idx + 1) % photos.length].src; // preload next
  }
  function open(i) { lastFocus = document.activeElement; show(i); box.classList.add('open'); document.body.classList.add('no-scroll'); box.querySelector('.close').focus(); }
  function close() { box.classList.remove('open'); document.body.classList.remove('no-scroll'); if (lastFocus) lastFocus.focus(); }
  triggers.forEach(function (b) {
    b.addEventListener('click', function () {
      var src = b.getAttribute('data-src'), i = 0;
      photos.forEach(function (p, k) { if (p.src === src) i = k; });
      open(i);
    });
  });
  box.querySelector('.close').addEventListener('click', close);
  box.querySelector('.prev').addEventListener('click', function () { show(idx - 1); });
  box.querySelector('.next').addEventListener('click', function () { show(idx + 1); });
  box.addEventListener('click', function (e) { if (e.target === box || e.target.classList.contains('stage')) close(); });
  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
    else if (e.key === 'Tab') { // keep focus inside the dialog
      var f = box.querySelectorAll('button'), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  var x0 = null; // swipe
  box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1)); x0 = null;
  });
})();
