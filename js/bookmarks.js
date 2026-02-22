(function () {
  'use strict';
  var KEY = 'gmp_bookmarks';

  function getIdsSync() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function getIds(callback) {
    if (window.app && window.app.getBookmarkIds && typeof callback === 'function') {
      window.app.getBookmarkIds(function (err, ids) { callback(ids || []); });
      return;
    }
    if (typeof callback === 'function') callback(getIdsSync());
  }

  function add(id, callback) {
    if (!id) { if (callback) callback(); return; }
    if (window.app && window.app.addBookmark) {
      window.app.addBookmark(id, function () { if (callback) callback(); });
      return;
    }
    var ids = getIdsSync();
    if (ids.indexOf(id) !== -1) { if (callback) callback(); return; }
    ids.push(id);
    try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) {}
    if (callback) callback();
  }

  function remove(id, callback) {
    if (window.app && window.app.removeBookmark) {
      window.app.removeBookmark(id, function () { if (callback) callback(); });
      return;
    }
    var ids = getIdsSync().filter(function (x) { return x !== id; });
    try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) {}
    if (callback) callback();
  }

  function toggle(id, callback) {
    if (window.app && window.app.toggleBookmark && typeof callback === 'function') {
      window.app.toggleBookmark(id, callback);
      return;
    }
    var ids = getIdsSync();
    var idx = ids.indexOf(id);
    if (idx !== -1) { ids.splice(idx, 1); } else { ids.push(id); }
    try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) {}
    if (callback) callback(idx === -1);
  }

  function is(id, callback) {
    if (window.app && window.app.isBookmarked && typeof callback === 'function') {
      window.app.isBookmarked(id, callback);
      return;
    }
    if (typeof callback === 'function') callback(getIdsSync().indexOf(id) !== -1);
  }

  window.Bookmarks = {
    getIds: getIds,
    getIdsSync: getIdsSync,
    add: add,
    remove: remove,
    toggle: toggle,
    isBookmarked: is
  };
})();
