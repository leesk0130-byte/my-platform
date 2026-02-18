(function () {
  var overlay = null, drawer = null, triggerBtn = null;
  function init() {
    overlay = document.getElementById('drawerOverlay');
    drawer  = document.getElementById('mobileDrawer');
    if (!overlay || !drawer) return;
    var closeBtn = drawer.querySelector('.drawer-close');
    overlay.addEventListener('click', closeDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.keyCode === 27) closeDrawer();
    });
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var all = Array.prototype.slice.call(drawer.querySelectorAll('a[href], button:not([disabled])'));
      if (!all.length) return;
      var first = all[0], last = all[all.length - 1];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    });
  }
  function openDrawer() {
    triggerBtn = document.querySelector('[data-toggle-nav]');
    if (!overlay || !drawer) return;
    overlay.removeAttribute('hidden');
    drawer.removeAttribute('hidden');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('open');
        drawer.classList.add('open');
      });
    });
    document.body.classList.add('no-scroll');
    drawer.setAttribute('aria-hidden', 'false');
    if (triggerBtn) {
      triggerBtn.setAttribute('aria-expanded', 'true');
      triggerBtn.setAttribute('aria-label', '\uba54\ub274 \ub2eb\uae30');
    }
    setTimeout(function () {
      var first = drawer.querySelector('.drawer-nav a, .drawer-close');
      if (first) first.focus();
    }, 80);
  }
  function closeDrawer() {
    if (!overlay || !drawer) return;
    if (!drawer.classList.contains('open')) return;
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.classList.remove('no-scroll');
    drawer.setAttribute('aria-hidden', 'true');
    if (triggerBtn) {
      triggerBtn.setAttribute('aria-expanded', 'false');
      triggerBtn.setAttribute('aria-label', '\uba54\ub274 \uc5f4\uae30');
      triggerBtn.focus();
    }
    var fb = setTimeout(doHide, 400);
    function onEnd(e) {
      if (e.propertyName !== 'transform') return;
      clearTimeout(fb); doHide();
      drawer.removeEventListener('transitionend', onEnd);
    }
    drawer.addEventListener('transitionend', onEnd);
    function doHide() {
      drawer.setAttribute('hidden', '');
      overlay.setAttribute('hidden', '');
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
  window.openDrawer  = openDrawer;
  window.closeDrawer = closeDrawer;
}());