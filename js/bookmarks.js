(function () {
  'use strict';
  var KEY = 'gmp_bookmarks';

  function getIds() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveIds(ids) {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch (e) {}
  }

  function add(id) {
    if (!id) return;
    var ids = getIds();
    if (ids.indexOf(id) !== -1) return;
    ids.push(id);
    saveIds(ids);
  }

  function remove(id) {
    var ids = getIds().filter(function (x) { return x !== id; });
    saveIds(ids);
  }

  function toggle(id) {
    if (is(id)) { remove(id); return false; }
    add(id); return true;
  }

  function is(id) {
    return getIds().indexOf(id) !== -1;
  }

  window.Bookmarks = {
    getIds: getIds,
    add: add,
    remove: remove,
    toggle: toggle,
    isBookmarked: is
  };
})();
