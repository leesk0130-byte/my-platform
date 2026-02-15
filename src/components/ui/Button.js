/**
 * Button: Primary / Secondary / Ghost / Outline
 * 규칙: 타이포 3단, 터치 영역 44px
 */
(function(global) {
  function Button(opts) {
    opts = opts || {};
    var variant = opts.variant || 'primary';
    var size = opts.size || 'md';
    var href = opts.href;
    var label = opts.label || opts.text || '';
    var className = opts.className || '';
    var base = 'inline-flex items-center justify-center font-semibold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px] ';
    var variants = {
      primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm',
      secondary: 'bg-slate-600 text-white hover:bg-slate-700',
      ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 border border-slate-300',
      outline: 'bg-transparent text-primary border-2 border-primary hover:bg-primary hover:text-white',
    };
    var sizes = {
      sm: 'px-3 py-2 text-sm min-h-[36px]',
      md: 'px-4 py-3 text-[15px]',
      lg: 'px-6 py-4 text-lg min-h-[52px]',
    };
    var cls = base + (variants[variant] || variants.primary) + ' ' + (sizes[size] || sizes.md) + ' ' + className;
    if (href) {
      return '<a href="' + escapeHtml(href) + '" class="' + cls + '">' + escapeHtml(label) + '</a>';
    }
    var extra = opts.onclick ? ' onclick="' + opts.onclick + '"' : '';
    var type = opts.type || 'button';
    return '<button type="' + type + '" class="' + cls + '"' + extra + '>' + escapeHtml(label) + '</button>';
  }
  function escapeHtml(s) {
    if (!s) return '';
    var div = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    return String(s).replace(/[&<>"]/g, function(c) { return div[c] || c; });
  }
  global.Components = global.Components || {};
  global.Components.Button = Button;
})(typeof window !== 'undefined' ? window : this);
