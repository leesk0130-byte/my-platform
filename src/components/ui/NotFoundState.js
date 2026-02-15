/**
 * NotFoundState: 한 문장 + 목록으로 버튼 (규칙 8)
 */
(function(global) {
  function NotFoundState(opts) {
    opts = opts || {};
    var title = opts.title || '글이 없거나 삭제되었습니다';
    var desc = opts.desc || '요청하신 글을 찾을 수 없어요.';
    var backHref = opts.backHref || 'community.html';
    return '<div class="py-12 px-6 text-center">' +
      '<p class="text-4xl mb-4 opacity-50" aria-hidden="true">🔍</p>' +
      '<p class="text-title text-slate-800 mb-2">' + escapeHtml(title) + '</p>' +
      '<p class="text-body text-muted mb-6">' + escapeHtml(desc) + '</p>' +
      '<a href="' + escapeHtml(backHref) + '" class="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover">목록으로</a>' +
    '</div>';
  }
  function escapeHtml(s) {
    if (!s) return '';
    var div = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    return String(s).replace(/[&<>"]/g, function(c) { return div[c] || c; });
  }
  global.Components = global.Components || {};
  global.Components.NotFoundState = NotFoundState;
})(typeof window !== 'undefined' ? window : this);
