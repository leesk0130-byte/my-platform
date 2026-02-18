/**
 * KPI 이벤트 스텁. 개인정보처리방침에 맞게 나중에 분석 도구와 연동할 수 있습니다.
 * 이벤트: pageview, search, calc_run, bookmark, share
 */
(function () {
  'use strict';
  function trackEvent(name, data) {
    try {
      if (typeof name !== 'string') return;
      // 스텁: 필요 시 여기서 GA/GTag 등으로 전송
      if (typeof console !== 'undefined' && console.debug) {
        console.debug('[KPI]', name, data || {});
      }
    } catch (e) {}
  }
  window.trackEvent = trackEvent;
})();
