// Fallback page-transition animation for browsers that don't yet support
// native cross-document View Transitions (e.g. Safari, Firefox).
// Chromium browsers with native support skip this entirely — see the
// `vt-fallback` check below and the matching `@view-transition` rule in styles.css.
(function () {
  var DURATION = 260; // ms, should stay close to the CSS transition durations

  var supportsNative =
    window.CSS && CSS.supports && CSS.supports('view-transition-name', 'none');
  if (supportsNative) return;

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.classList.add('vt-fallback');

  function fadeIn() {
    document.documentElement.classList.remove('fade-out');
    if (reduceMotion) {
      document.documentElement.classList.add('fade-in');
      return;
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.documentElement.classList.add('fade-in');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', fadeIn);
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) fadeIn(); // back/forward cache
  });

  document.addEventListener('click', function (e) {
    if (reduceMotion) return; // let default navigation happen instantly

    var link = e.target.closest('a');
    if (!link) return;
    if (link.target && link.target !== '_self') return;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (link.hasAttribute('download')) return;

    var url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (err) {
      return;
    }

    if (url.origin !== window.location.origin) return; // external / mailto / tel
    if (!/\.html?$/i.test(url.pathname)) return; // only internal .html pages
    if (url.pathname === window.location.pathname && url.hash) return; // same-page anchor

    e.preventDefault();
    document.documentElement.classList.remove('fade-in');
    document.documentElement.classList.add('fade-out');
    setTimeout(function () {
      window.location.href = url.href;
    }, DURATION);
  });
})();
