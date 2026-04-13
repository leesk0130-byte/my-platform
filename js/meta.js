/*!
 * js/meta.js - 공통 메타태그/구조화데이터 주입 헬퍼
 * 모든 페이지가 <script src="/js/meta.js" defer></script> 로 로드.
 * DOMContentLoaded 에 자동 실행. 전역 side effect 없음.
 */
(function () {
  'use strict';

  var SITE_NAME = '가맹점숲';
  var SITE_URL = 'https://bizimshop.co.kr';
  var DEFAULT_OG_IMAGE = SITE_URL + '/og-image.svg';
  var DEFAULT_DESC =
    '가맹점숲 - 온라인 가맹점을 위한 PG 수수료 비교·계산기와 정산/세금/환불 실무 가이드.';

  function ensureHtmlLang() {
    var html = document.documentElement;
    if (!html.getAttribute('lang')) html.setAttribute('lang', 'ko');
  }

  function upsertMeta(attrKey, attrVal, content) {
    if (!content) return;
    var sel = 'meta[' + attrKey + '="' + attrVal + '"]';
    var el = document.head.querySelector(sel);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrKey, attrVal);
      document.head.appendChild(el);
    }
    if (!el.getAttribute('content')) el.setAttribute('content', content);
  }

  function getOrCreateMeta(attrKey, attrVal) {
    var sel = 'meta[' + attrKey + '="' + attrVal + '"]';
    var el = document.head.querySelector(sel);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrKey, attrVal);
      document.head.appendChild(el);
    }
    return el;
  }

  function deriveDescription() {
    var desc = document.head.querySelector('meta[name="description"]');
    if (desc && desc.getAttribute('content')) return desc.getAttribute('content');
    var p = document.body && document.body.querySelector('main p, article p, p');
    var text = p ? (p.textContent || '').trim().replace(/\s+/g, ' ') : '';
    if (text.length > 160) text = text.slice(0, 157) + '...';
    return text || DEFAULT_DESC;
  }

  function pageUrl() {
    try {
      var u = new URL(location.href);
      u.hash = '';
      return u.toString();
    } catch (e) {
      return SITE_URL + location.pathname;
    }
  }

  function pageTitle() {
    return (document.title || SITE_NAME).trim();
  }

  function injectJsonLd(obj) {
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  }

  function injectOrganization() {
    injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: DEFAULT_OG_IMAGE,
      sameAs: []
    });
  }

  function injectArticleIfPost() {
    var type = document.body && document.body.getAttribute('data-post-type');
    if (!type) return;
    var published =
      document.body.getAttribute('data-post-published') ||
      (document.head.querySelector('meta[property="article:published_time"]') || {}).content ||
      new Date().toISOString().slice(0, 10);
    injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: pageTitle(),
      datePublished: published,
      dateModified: published,
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: { '@type': 'ImageObject', url: DEFAULT_OG_IMAGE }
      },
      image: [DEFAULT_OG_IMAGE],
      mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl() },
      articleSection: type
    });
  }

  function run() {
    ensureHtmlLang();

    var desc = deriveDescription();
    var descEl = getOrCreateMeta('name', 'description');
    if (!descEl.getAttribute('content')) descEl.setAttribute('content', desc);

    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:type', document.body && document.body.getAttribute('data-post-type') ? 'article' : 'website');
    upsertMeta('property', 'og:title', pageTitle());
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:image', DEFAULT_OG_IMAGE);
    upsertMeta('property', 'og:url', pageUrl());
    upsertMeta('property', 'og:locale', 'ko_KR');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', pageTitle());
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', DEFAULT_OG_IMAGE);

    injectOrganization();
    injectArticleIfPost();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
