/*
 * js/articles.js — 리모델링 후 얇은 posts API 래퍼 (Agent 4 정리)
 *
 * 이전 버전은 Firestore `articles` 컬렉션에 직접 붙었으나, v2 에서는
 * Cloudflare D1 `posts` 테이블을 `/api/posts` 엔드포인트로 래핑한다.
 * 작성/수정/삭제는 어드민 세션 쿠키(admin_session)가 있을 때만 동작한다.
 *
 * 남은 페이지에서 호출하는 기존 시그니처와의 호환을 위해
 * window.articlesApi 네임스페이스는 유지한다.
 */
(function () {
  "use strict";

  var POSTS_ENDPOINT = "/api/posts";
  var DEFAULT_TYPE = "article";

  function slugify(input) {
    return String(input || "")
      .trim()
      .toLowerCase()
      .replace(/[^\w\u3131-\uD79D\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function estimateReadTimeMinutes(text) {
    var clean = String(text || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return Math.max(1, Math.ceil(clean.length / 500));
  }

  function plainExcerpt(html, max) {
    var s = String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (s.length <= max) return s;
    return s.slice(0, max) + "...";
  }

  function normalizePost(row) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title || "",
      slug: row.slug || "",
      category: row.category || "일반",
      tags: row.tags ? String(row.tags).split(",").map(function (t) { return t.trim(); }).filter(Boolean) : [],
      content: row.content_html || "",
      excerpt: row.excerpt || plainExcerpt(row.content_html || "", 140),
      coverImage: row.cover_image || "",
      isPublished: row.status === "published",
      viewCount: row.views || 0,
      pinned: !!row.pinned,
      readTime: estimateReadTimeMinutes(row.content_html || ""),
      author: "운영자",
      publishedAtIso: row.published_at || "",
      updatedAtIso: row.updated_at || "",
      publishedAt: row.published_at ? new Date(row.published_at).getTime() : 0,
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : 0
    };
  }

  function request(method, url, body) {
    var opts = {
      method: method,
      credentials: "same-origin",
      headers: { "Accept": "application/json" }
    };
    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error((data && data.error) || ("HTTP " + res.status));
        return data;
      });
    });
  }

  function listArticles(options, callback) {
    options = options || {};
    var params = new URLSearchParams();
    params.set("type", options.type || DEFAULT_TYPE);
    params.set("limit", String(options.limit || 50));
    if (options.offset) params.set("offset", String(options.offset));
    if (options.category) params.set("category", options.category);
    if (options.q) params.set("q", options.q);
    request("GET", POSTS_ENDPOINT + "?" + params.toString())
      .then(function (data) {
        var rows = (data && data.items ? data.items : []).map(normalizePost).filter(Boolean);
        if (options.onlyPublished) rows = rows.filter(function (r) { return r.isPublished; });
        callback(null, rows);
      })
      .catch(function (e) { callback((e && e.message) || "목록 조회 실패", []); });
  }

  function getArticleBySlug(slug, callback) {
    if (!slug) return callback(null, null);
    request("GET", POSTS_ENDPOINT + "/" + encodeURIComponent(slug))
      .then(function (data) { callback(null, normalizePost(data && data.item ? data.item : data)); })
      .catch(function () { callback(null, null); });
  }

  function getArticleById(id, callback) {
    // v2 에서는 slug 기반 조회만 사용. id 단건 조회는 slug 로 먼저 받아와야 함.
    // 호환 stub: listArticles 로 찾아서 반환.
    listArticles({ limit: 200 }, function (err, rows) {
      if (err) return callback(err);
      var found = (rows || []).filter(function (r) { return String(r.id) === String(id); })[0] || null;
      callback(null, found);
    });
  }

  function buildPayload(payload) {
    var title = String(payload.title || "").trim();
    var content = String(payload.content || "").trim();
    return {
      type: payload.type || DEFAULT_TYPE,
      slug: slugify(payload.slug || title),
      title: title,
      category: payload.category || "일반",
      tags: Array.isArray(payload.tags) ? payload.tags.join(",") : (payload.tags || ""),
      excerpt: payload.excerpt || plainExcerpt(content, 160),
      content_html: content,
      cover_image: payload.coverImage || "",
      status: payload.isPublished ? "published" : "draft",
      pinned: payload.pinned ? 1 : 0
    };
  }

  function createArticle(payload, callback) {
    request("POST", POSTS_ENDPOINT, buildPayload(payload))
      .then(function (data) { callback(null, data && data.id); })
      .catch(function (e) { callback((e && e.message) || "저장 실패"); });
  }

  function updateArticle(id, payload, callback) {
    request("PUT", POSTS_ENDPOINT + "/" + encodeURIComponent(id), buildPayload(payload))
      .then(function () { callback(null); })
      .catch(function (e) { callback((e && e.message) || "수정 실패"); });
  }

  function deleteArticle(id, callback) {
    request("DELETE", POSTS_ENDPOINT + "/" + encodeURIComponent(id))
      .then(function () { callback(null); })
      .catch(function (e) { callback((e && e.message) || "삭제 실패"); });
  }

  // 조회수는 GET /api/posts/:slug 가 서버에서 +1 처리하므로 noop
  function incrementView() {}

  // "도움이 돼요" / legacy news 삭제 등은 v2 에서 제거됨 — no-op stub
  function toggleHelpful(_id, callback) { if (callback) callback(null, false); }
  function helpfulCount(_id, callback) { if (callback) callback(null, 0); }
  function deleteAllLegacyNews(callback) { if (callback) callback(null); }
  function deleteAllArticles(callback) { if (callback) callback(null); }

  // 관리자 판별은 이제 서버 쿠키로 결정되지만, 레거시 UI 호환을 위해 false 기본.
  function isAdminUser() { return false; }

  window.articlesApi = {
    slugify: slugify,
    estimateReadTimeMinutes: estimateReadTimeMinutes,
    isAdminUser: isAdminUser,
    createArticle: createArticle,
    updateArticle: updateArticle,
    deleteArticle: deleteArticle,
    listArticles: listArticles,
    getArticleById: getArticleById,
    getArticleBySlug: getArticleBySlug,
    incrementView: incrementView,
    toggleHelpful: toggleHelpful,
    helpfulCount: helpfulCount,
    deleteAllLegacyNews: deleteAllLegacyNews,
    deleteAllArticles: deleteAllArticles
  };
})();
