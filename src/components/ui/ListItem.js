/**
 * ListItem: 리스트 밀도 (규칙 2) - padding-y 12~14px, 구분선 1px, 제목 ellipsis, 메타 다음 줄, 제목 우측 댓글수
 */
(function(global) {
  function escapeHtml(s) {
    if (!s) return '';
    var div = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    return String(s).replace(/[&<>"]/g, function(c) { return div[c] || c; });
  }
  function ListItem(opts) {
    opts = opts || {};
    var href = opts.href || '#';
    var title = opts.title || '';
    var meta = opts.meta || '';
    var commentCount = opts.commentCount != null ? opts.commentCount : 0;
    var categoryLabel = opts.categoryLabel || '';
    var commentHtml = (commentCount > 0)
      ? '<span class="comment-count shrink-0 text-meta text-muted ml-2">💬 ' + commentCount + '</span>'
      : '';
    var categoryHtml = categoryLabel
      ? '<span class="badge shrink-0 mr-2">' + escapeHtml(categoryLabel) + '</span>'
      : '';
    return '<li class="border-b border-border-soft last:border-b-0">' +
      '<a href="' + escapeHtml(href) + '" class="flex items-center gap-2 py-[12px] sm:py-[14px] px-4 hover:bg-slate-50 transition">' +
        '<span class="flex-1 min-w-0 flex items-center gap-2">' +
          categoryHtml +
          '<span class="text-title truncate">' + escapeHtml(title) + '</span>' +
          commentHtml +
        '</span>' +
      '</a>' +
      (meta ? '<div class="text-meta text-muted px-4 pb-2">' + escapeHtml(meta) + '</div>' : '') +
    '</li>';
  }
  global.Components = global.Components || {};
  global.Components.ListItem = ListItem;
})(typeof window !== 'undefined' ? window : this);
