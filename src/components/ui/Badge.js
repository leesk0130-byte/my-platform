/**
 * Badge / Chip: 카테고리 칩 한 가지 스타일 (규칙 4)
 */
(function(global) {
  function Badge(opts) {
    opts = opts || {};
    var label = opts.label || opts.text || '';
    var variant = opts.variant || 'neutral';
    var cls = 'inline-flex items-center px-2 py-0.5 rounded-md text-meta font-semibold ';
    if (variant === 'notice') cls += 'bg-amber-50 text-amber-800';
    else cls += 'bg-slate-100 text-slate-600';
    return '<span class="' + cls + '">' + (opts.escape !== false ? escapeHtml(label) : label) + '</span>';
  }
  function escapeHtml(s) {
    if (!s) return '';
    var div = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    return String(s).replace(/[&<>"]/g, function(c) { return div[c] || c; });
  }
  global.Components = global.Components || {};
  global.Components.Badge = Badge;
})(typeof window !== 'undefined' ? window : this);
