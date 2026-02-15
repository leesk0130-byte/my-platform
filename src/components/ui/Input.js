/**
 * Input / Search: placeholder 하나, label 중복 제거 (규칙 5)
 */
(function(global) {
  function Input(opts) {
    opts = opts || {};
    var type = opts.type || 'text';
    var placeholder = opts.placeholder || '';
    var id = opts.id || '';
    var value = opts.value || '';
    var className = opts.className || '';
    var cls = 'w-full px-4 py-3 border border-border rounded-xl text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ' + className;
    return '<input type="' + type + '"' + (id ? ' id="' + id + '"' : '') + ' class="' + cls + '" placeholder="' + escapeHtml(placeholder) + '" value="' + escapeHtml(value) + '"' + (opts.ariaLabel ? ' aria-label="' + escapeHtml(opts.ariaLabel) + '"' : '') + '>';
  }
  function escapeHtml(s) {
    if (!s) return '';
    var div = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    return String(s).replace(/[&<>"]/g, function(c) { return div[c] || c; });
  }
  global.Components = global.Components || {};
  global.Components.Input = Input;
})(typeof window !== 'undefined' ? window : this);
