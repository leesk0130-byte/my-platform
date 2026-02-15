/**
 * ErrorState: 한 문장 + 재시도 버튼 (규칙 8)
 */
(function(global) {
  function ErrorState(opts) {
    opts = opts || {};
    var title = opts.title || '일시적인 오류가 났어요';
    var desc = opts.desc || '잠시 후 다시 시도해 주세요.';
    var retryId = opts.retryId || 'error-retry-btn';
    return '<div class="py-12 px-6 text-center">' +
      '<p class="text-title text-red-600 mb-2">' + escapeHtml(title) + '</p>' +
      '<p class="text-body text-muted mb-6">' + escapeHtml(desc) + '</p>' +
      '<button type="button" id="' + retryId + '" class="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover">다시 시도</button>' +
    '</div>';
  }
  function escapeHtml(s) {
    if (!s) return '';
    var div = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    return String(s).replace(/[&<>"]/g, function(c) { return div[c] || c; });
  }
  global.Components = global.Components || {};
  global.Components.ErrorState = ErrorState;
})(typeof window !== 'undefined' ? window : this);
