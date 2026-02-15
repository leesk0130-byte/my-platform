/**
 * Sidebar: 3개만 - 인기글 Top5, 공지 Top3, 가이드 1카드 (규칙 6)
 */
(function(global) {
  function Sidebar(opts) {
    opts = opts || {};
    var popular = opts.popular || [];
    var notices = opts.notices || [];
    var guide = opts.guide || {};
    var html = '<aside class="space-y-4">';
    if (popular.length) {
      html += '<div class="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">' +
        '<h3 class="px-4 py-3 text-title text-slate-800 border-b border-border-soft">🔥 인기글</h3>' +
        '<ul class="divide-y divide-border-soft">';
      popular.forEach(function(p) {
        html += '<li><a href="' + (p.href || '#') + '" class="block px-4 py-2 text-body hover:bg-slate-50">' +
          '<span class="font-semibold text-slate-800 line-clamp-2">' + (p.title || '') + '</span>' +
          '<span class="text-meta text-muted">조회 ' + (p.hits || 0) + (p.commentCount ? ' · 댓글 ' + p.commentCount : '') + '</span>' +
        '</a></li>';
      });
      html += '</ul></div>';
    }
    if (notices.length) {
      html += '<div class="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">' +
        '<h3 class="px-4 py-3 text-title text-slate-800 border-b border-border-soft">📢 공지</h3>' +
        '<ul class="divide-y divide-border-soft">';
      notices.forEach(function(n) {
        html += '<li><a href="' + (n.href || '#') + '" class="block px-4 py-2 text-body hover:bg-slate-50 bg-amber-50/50">' +
          '<span class="font-semibold text-slate-800">' + (n.title || '') + '</span>' +
        '</a></li>';
      });
      html += '</ul></div>';
    }
    if (guide.title) {
      html += '<div class="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">' +
        '<h3 class="px-4 py-3 text-title text-slate-800 border-b border-border-soft">' + (guide.title || '가이드') + '</h3>' +
        '<div class="p-4 text-body text-muted">' + (guide.body || '') + '</div>' +
        (guide.ctaHref ? '<div class="p-4 pt-0"><a href="' + guide.ctaHref + '" class="text-primary font-semibold">' + (guide.ctaLabel || '자세히') + '</a></div>' : '') +
      '</div>';
    }
    html += '</aside>';
    return html;
  }
  global.Components = global.Components || {};
  global.Components.Sidebar = Sidebar;
})(typeof window !== 'undefined' ? window : this);
