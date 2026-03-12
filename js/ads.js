(function () {
  'use strict';

  function safePush() {
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      return true;
    } catch (e) {
      return false;
    }
  }

  function ensureIns(slotEl) {
    if (!slotEl) return null;
    var existing = slotEl.querySelector('ins.adsbygoogle');
    if (existing) return existing;

    var client = slotEl.getAttribute('data-ad-client');
    var adSlot = slotEl.getAttribute('data-ad-slot');
    if (!client || !adSlot) return null;

    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', client);
    ins.setAttribute('data-ad-slot', adSlot);

    var format = slotEl.getAttribute('data-ad-format');
    if (format) ins.setAttribute('data-ad-format', format);
    var responsive = slotEl.getAttribute('data-full-width-responsive');
    if (responsive) ins.setAttribute('data-full-width-responsive', responsive);
    var layout = slotEl.getAttribute('data-ad-layout');
    if (layout) ins.setAttribute('data-ad-layout', layout);
    var layoutKey = slotEl.getAttribute('data-ad-layout-key');
    if (layoutKey) ins.setAttribute('data-ad-layout-key', layoutKey);

    var inner = slotEl.querySelector('.ad-slot-inner') || slotEl;
    inner.appendChild(ins);
    return ins;
  }

  function renderSlot(slotEl) {
    if (!slotEl) return false;
    slotEl.classList.remove('is-empty');
    var ins = ensureIns(slotEl);
    if (!ins) {
      slotEl.classList.add('is-empty');
      return false;
    }
    return safePush();
  }

  function initAll() {
    var slots = Array.prototype.slice.call(document.querySelectorAll('.ad-slot'));
    if (!slots.length) return;
    slots.forEach(function (slotEl) {
      // 승인 전에는 data-ad-slot을 비워둬도 됨(레이아웃만 유지)
      renderSlot(slotEl);
    });
  }

  window.Ads = {
    init: initAll,
    render: renderSlot
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();

