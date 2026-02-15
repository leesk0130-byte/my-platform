/**
 * Container: max-width 1040px (규칙 1)
 */
(function(global) {
  function Container(opts) {
    opts = opts || {};
    var children = opts.children || '';
    var className = opts.className || '';
    return '<div class="max-w-container mx-auto px-4 sm:px-6 ' + className + '">' + children + '</div>';
  }
  global.Components = global.Components || {};
  global.Components.Container = Container;
})(typeof window !== 'undefined' ? window : this);
