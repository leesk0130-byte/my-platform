/**
 * Card: 리스트/상태 UI와 동일 폭·시스템 재사용 (규칙 8)
 */
(function(global) {
  function Card(opts) {
    opts = opts || {};
    var children = opts.children || '';
    var className = opts.className || '';
    var cls = 'bg-white border border-border rounded-2xl overflow-hidden shadow-sm ' + className;
    return '<div class="' + cls + '">' + children + '</div>';
  }
  global.Components = global.Components || {};
  global.Components.Card = Card;
})(typeof window !== 'undefined' ? window : this);
