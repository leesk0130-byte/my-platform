/**
 * Skeleton: loading 시 리스트 6줄 (규칙 8)
 */
(function(global) {
  function Skeleton(opts) {
    opts = opts || {};
    var lines = opts.lines != null ? opts.lines : 6;
    var html = '<div class="animate-pulse space-y-0">';
    for (var i = 0; i < lines; i++) {
      html += '<div class="flex items-center gap-2 py-[12px] px-4 border-b border-border-soft">' +
        '<div class="h-4 bg-slate-200 rounded w-3/4"></div>' +
        '<div class="h-3 bg-slate-100 rounded w-1/4"></div>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }
  global.Components = global.Components || {};
  global.Components.Skeleton = Skeleton;
})(typeof window !== 'undefined' ? window : this);
