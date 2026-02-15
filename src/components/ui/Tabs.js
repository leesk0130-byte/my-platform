/**
 * Tabs: 상단 컨트롤 바 한 줄 (규칙 5) - 카테고리 탭
 */
(function(global) {
  function Tabs(opts) {
    opts = opts || {};
    var items = opts.items || [];
    var active = opts.active || '';
    var baseUrl = opts.baseUrl || '';
    var html = '<div class="flex flex-wrap gap-1 border-b border-border bg-white overflow-x-auto">';
    items.forEach(function(item) {
      var isActive = (item.value === active);
      var href = item.href || (baseUrl + (item.value && item.value !== 'all' ? '?board=' + item.value : ''));
      var cls = 'px-4 py-3 text-body font-semibold border-b-2 transition ' +
        (isActive ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-slate-800');
      html += '<a href="' + (item.href || href) + '" class="' + cls + '">' + escapeHtml(item.label) + '</a>';
    });
    html += '</div>';
    return html;
  }
  function escapeHtml(s) {
    if (!s) return '';
    var div = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    return String(s).replace(/[&<>"]/g, function(c) { return div[c] || c; });
  }
  global.Components = global.Components || {};
  global.Components.Tabs = Tabs;
})(typeof window !== 'undefined' ? window : this);
