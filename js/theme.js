/* js/theme.js — 가맹점숲 테마 관리
   localStorage key: gmj-theme  (dark | light)
   우선순위: localStorage → prefers-color-scheme → dark
   전역: window.GMJTheme = { init, toggle, get, set } */
(function () {
  'use strict';

  var KEY = 'gmj-theme';

  function getStored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setStored(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  function systemPref() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  function getTheme() {
    var s = getStored();
    if (s === 'dark' || s === 'light') return s;
    return systemPref();
  }

  function apply(theme) {
    var t = (theme === 'light') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    return t;
  }

  function setTheme(theme) {
    var t = apply(theme);
    setStored(t);
    document.dispatchEvent(new CustomEvent('gmj:themechange', { detail: { theme: t } }));
    return t;
  }

  function toggleTheme() {
    return setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  function initTheme() {
    apply(getTheme());
    // follow system changes only if user never explicitly chose
    if (!getStored() && window.matchMedia) {
      try {
        window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (e) {
          if (getStored()) return;
          apply(e.matches ? 'light' : 'dark');
        });
      } catch (e) { /* older Safari */ }
    }
  }

  window.GMJTheme = {
    init: initTheme,
    toggle: toggleTheme,
    get: getTheme,
    set: setTheme
  };

  // self-init (safe even if snippet already ran)
  initTheme();
})();
