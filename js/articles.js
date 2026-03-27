(function () {
  "use strict";

  var ADMIN_EMAIL = "leesk0130@naver.com";
  var ADMIN_UIDS = ["_put_real_admin_uid_here_"];

  function getDb() {
    if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) return null;
    if (typeof window.firebase.firestore !== "function") return null;
    return window.firebase.firestore();
  }

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
    var length = clean.length;
    var perMin = 500; // Korean rough reading speed by chars
    return Math.max(1, Math.ceil(length / perMin));
  }

  function plainExcerpt(html, max) {
    var s = String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (s.length <= max) return s;
    return s.slice(0, max) + "...";
  }

  function isAdminUser(user) {
    if (!user) return false;
    var email = (user.email || "").toLowerCase().trim();
    if (email === ADMIN_EMAIL.toLowerCase()) return true;
    if (ADMIN_UIDS.indexOf(user.uid || "") !== -1) return true;
    return false;
  }

  function toMillis(ts) {
    if (!ts) return 0;
    if (typeof ts.toDate === "function") return ts.toDate().getTime();
    if (ts.seconds) return ts.seconds * 1000;
    if (typeof ts === "number") return ts;
    if (typeof ts === "string") return new Date(ts).getTime();
    return 0;
  }

  function toIso(ts) {
    var ms = toMillis(ts);
    return ms ? new Date(ms).toISOString() : "";
  }

  function normalizeArticle(doc) {
    var d = doc.data ? doc.data() : doc || {};
    var publishedMs = toMillis(d.publishedAt);
    var updatedMs = toMillis(d.updatedAt);
    return {
      id: doc.id || d.id || "",
      title: d.title || "",
      slug: d.slug || "",
      category: d.category || "일반",
      content: d.content || "",
      tags: Array.isArray(d.tags) ? d.tags : [],
      isPublished: !!d.isPublished,
      author: d.author || "",
      viewCount: typeof d.viewCount === "number" ? d.viewCount : 0,
      readTime: typeof d.readTime === "number" ? d.readTime : estimateReadTimeMinutes(d.content || ""),
      excerpt: d.excerpt || plainExcerpt(d.content || "", 140),
      publishedAt: publishedMs,
      updatedAt: updatedMs,
      publishedAtIso: toIso(d.publishedAt),
      updatedAtIso: toIso(d.updatedAt),
    };
  }

  function createArticle(payload, callback) {
    var db = getDb();
    if (!db) return callback("Firestore 연결 실패");
    var title = String(payload.title || "").trim();
    if (!title) return callback("제목이 필요합니다.");
    var content = String(payload.content || "").trim();
    if (!content) return callback("본문이 필요합니다.");
    var slug = slugify(payload.slug || title);
    var tags = (payload.tags || []).map(function (t) { return String(t).trim(); }).filter(Boolean);
    var article = {
      title: title,
      slug: slug,
      category: payload.category || "일반",
      content: content,
      tags: tags,
      isPublished: !!payload.isPublished,
      excerpt: plainExcerpt(content, 160),
      readTime: estimateReadTimeMinutes(content),
      author: payload.author || "관리자",
      viewCount: 0,
      publishedAt: payload.isPublished ? window.firebase.firestore.FieldValue.serverTimestamp() : null,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    };
    db.collection("articles").add(article)
      .then(function (ref) { callback(null, ref.id); })
      .catch(function (e) { callback((e && e.message) || "저장 실패"); });
  }

  function updateArticle(id, payload, callback) {
    var db = getDb();
    if (!db) return callback("Firestore 연결 실패");
    var update = {
      title: String(payload.title || "").trim(),
      slug: slugify(payload.slug || payload.title),
      category: payload.category || "일반",
      content: String(payload.content || "").trim(),
      tags: (payload.tags || []).map(function (t) { return String(t).trim(); }).filter(Boolean),
      isPublished: !!payload.isPublished,
      excerpt: plainExcerpt(payload.content || "", 160),
      readTime: estimateReadTimeMinutes(payload.content || ""),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (payload.isPublished && !payload.wasPublished) {
      update.publishedAt = window.firebase.firestore.FieldValue.serverTimestamp();
    }
    db.collection("articles").doc(id).update(update)
      .then(function () { callback(null); })
      .catch(function (e) { callback((e && e.message) || "수정 실패"); });
  }

  function deleteArticle(id, callback) {
    var db = getDb();
    if (!db) return callback("Firestore 연결 실패");
    db.collection("articles").doc(id).delete()
      .then(function () { callback(null); })
      .catch(function (e) { callback((e && e.message) || "삭제 실패"); });
  }

  function listArticles(options, callback) {
    var db = getDb();
    if (!db) return callback(null, []);
    options = options || {};
    var limit = options.limit || 50;
    var onlyPublished = !!options.onlyPublished;
    var q = db.collection("articles");
    if (onlyPublished) q = q.where("isPublished", "==", true);
    q.orderBy("updatedAt", "desc").limit(limit).get()
      .then(function (snap) {
        var rows = [];
        snap.forEach(function (doc) { rows.push(normalizeArticle(doc)); });
        callback(null, rows);
      })
      .catch(function () {
        // Fallback for missing composite/field indexes
        db.collection("articles").limit(limit).get()
          .then(function (snap2) {
            var rows2 = [];
            snap2.forEach(function (doc) { rows2.push(normalizeArticle(doc)); });
            rows2.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
            if (onlyPublished) rows2 = rows2.filter(function (r) { return r.isPublished; });
            callback(null, rows2);
          })
          .catch(function (e) { callback((e && e.message) || "목록 조회 실패"); });
      });
  }

  function getArticleById(id, callback) {
    var db = getDb();
    if (!db) return callback(null, null);
    db.collection("articles").doc(id).get()
      .then(function (doc) {
        if (!doc.exists) return callback(null, null);
        callback(null, normalizeArticle(doc));
      })
      .catch(function (e) { callback((e && e.message) || "조회 실패"); });
  }

  function getArticleBySlug(slug, callback) {
    var db = getDb();
    if (!db) return callback(null, null);
    db.collection("articles").where("slug", "==", String(slug || "").trim()).limit(1).get()
      .then(function (snap) {
        if (snap.empty) return callback(null, null);
        callback(null, normalizeArticle(snap.docs[0]));
      })
      .catch(function () { callback(null, null); });
  }

  function incrementView(id) {
    var db = getDb();
    if (!db || !id) return;
    db.collection("articles").doc(id).update({
      viewCount: window.firebase.firestore.FieldValue.increment(1),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    }).catch(function () {});
  }

  function toggleHelpful(articleId, callback) {
    var db = getDb();
    if (!db || !articleId) return callback("Firestore 연결 실패");
    var uid = (window.app && window.app.getUser && window.app.getUser() && window.app.getUser().uid) || localStorage.getItem("bizimshop_helpful_uid");
    if (!uid) {
      uid = "anon_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      localStorage.setItem("bizimshop_helpful_uid", uid);
    }
    var ref = db.collection("articles").doc(articleId).collection("helpful").doc(uid);
    ref.get().then(function (doc) {
      if (doc.exists) {
        return ref.delete().then(function () { callback(null, false); });
      }
      return ref.set({ at: window.firebase.firestore.FieldValue.serverTimestamp() }).then(function () { callback(null, true); });
    }).catch(function (e) { callback((e && e.message) || "반영 실패"); });
  }

  function helpfulCount(articleId, callback) {
    var db = getDb();
    if (!db || !articleId) return callback(null, 0);
    db.collection("articles").doc(articleId).collection("helpful").get()
      .then(function (snap) { callback(null, snap.size || 0); })
      .catch(function () { callback(null, 0); });
  }

  function deleteAllLegacyNews(callback) {
    var db = getDb();
    if (!db) return callback("Firestore 연결 실패");
    db.collection("news").get().then(function (snap) {
      var batch = db.batch();
      snap.forEach(function (doc) { batch.delete(doc.ref); });
      return batch.commit();
    }).then(function () { callback(null); }).catch(function (e) { callback((e && e.message) || "news 삭제 실패"); });
  }

  function deleteAllArticles(callback) {
    var db = getDb();
    if (!db) return callback("Firestore 연결 실패");
    db.collection("articles").get().then(function (snap) {
      var batch = db.batch();
      snap.forEach(function (doc) { batch.delete(doc.ref); });
      return batch.commit();
    }).then(function () { callback(null); }).catch(function (e) { callback((e && e.message) || "articles 삭제 실패"); });
  }

  window.articlesApi = {
    ADMIN_EMAIL: ADMIN_EMAIL,
    ADMIN_UIDS: ADMIN_UIDS,
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
    deleteAllArticles: deleteAllArticles,
  };
})();
