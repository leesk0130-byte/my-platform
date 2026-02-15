/**
 * EmptyState: 한 문장 + CTA 1개 (규칙 8), 리스트와 동일 카드 시스템
 */
(function(global) {
  function EmptyState(opts) {
    opts = opts || {};
    var title = opts.title || '아직 글이 없어요';
    var desc = opts.desc || '';
    var ctaLabel = opts.ctaLabel || '첫 글 쓰기';
    var ctaHref = opts.ctaHref || 'write.html';
    var icon = opts.icon || '📝';
    return '<div class="py-12 px-6 text-center">' +
      '<p class="text-4xl mb-4 opacity-50" aria-hidden="true">' + icon + '</p>' +
      '<p class="text-title text-slate-800 mb-2">' + escapeHtml(title) + '</p>' +
      (desc ? '<p class="text-body text-muted mb-6">' + escapeHtml(desc) + '</p>' : '') +
      '<a href="' + escapeHtml(ctaHref) + '" class="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover">' + escapeHtml(ctaLabel) + '</a>' +
    '</div>';
  }
  function escapeHtml(s) {
    if (!s) return '';
    var div = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    return String(s).replace(/[&<>"]/g, function(c) { return div[c] || c; });
  }
  global.Components = global.Components || {};
  global.Components.EmptyState = EmptyState;
})(typeof window !== 'undefined' ? window : this);
