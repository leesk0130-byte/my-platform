/*
 * js/app.js — 리모델링 후 슬림 버전 (Agent 4 정리)
 *
 * 이전 버전은 Firebase Auth/Firestore 에 강하게 묶여 있었으나, 가맹점숲 v2 는
 * Cloudflare D1 + Pages Functions 로 이관되면서 프런트 JS 에서 Firebase 를
 * 전부 제거했다. 이 파일은 레거시 HTML 페이지(`calculator.html` 등)가
 * 여전히 참조하는 최소한의 window.app 네임스페이스만 유지한다.
 *
 * 남은 책임:
 *  - FEE_2026 카드 수수료 상수 (계산기 프리셋용, 2026.02.14 인하 기준)
 *  - 간단한 포맷/토스트 유틸
 *  - 계산기 즐겨찾기 저장(localStorage 기반, no-op fallback)
 */
(function () {
  "use strict";

  // 2026년 카드 수수료 (영세/중소/일반 우대 수수료율, %)
  var FEE_2026 = {
    CARD_YOUNG: 0.40,   // 연매출 3억 이하 영세
    CARD_MID_1: 1.00,   // 3억 ~ 5억
    CARD_MID_2: 1.15,   // 5억 ~ 10억
    CARD_MID_3: 1.45,   // 10억 ~ 30억
    CASH_TRANSFER: 1.8, // 계좌이체
    VIRTUAL_ACCOUNT: 300 // 가상계좌 건당(원)
  };

  function formatRelativeDate(d) {
    if (!(d instanceof Date)) d = new Date(d);
    var diff = Date.now() - d.getTime();
    if (isNaN(diff)) return "";
    if (diff < 60000) return "방금 전";
    if (diff < 3600000) return Math.floor(diff / 60000) + "분 전";
    if (diff < 86400000) return Math.floor(diff / 3600000) + "시간 전";
    if (diff < 604800000) return Math.floor(diff / 86400000) + "일 전";
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
  }

  function showToast(message, type) {
    var text = (message || "").toString().trim();
    if (!text) return;
    type = type || "default";
    var container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    var toast = document.createElement("div");
    toast.className = "toast" + (type === "error" ? " toast-error" : type === "success" ? " toast-success" : "");
    toast.setAttribute("role", "alert");
    toast.textContent = text;
    container.appendChild(toast);
    setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3500);
  }

  // 계산기 즐겨찾기 — 서버 저장 없이 localStorage 로만 유지
  var SAVED_KEY = "bizimshop_saved_calculations";
  function readSaved() {
    try {
      var raw = localStorage.getItem(SAVED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function writeSaved(list) {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(list || [])); } catch (e) {}
  }

  function saveCalculation(payload, callback) {
    try {
      var list = readSaved();
      var id = "calc_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      list.unshift({
        id: id,
        name: (payload && payload.name) || "계산",
        params: (payload && payload.params) || {},
        createdAt: new Date().toISOString()
      });
      writeSaved(list.slice(0, 30));
      if (callback) callback(null, id);
    } catch (e) {
      if (callback) callback((e && e.message) || "저장 실패");
    }
  }

  function listSavedCalculations(callback) {
    try { if (callback) callback(null, readSaved()); }
    catch (e) { if (callback) callback((e && e.message) || "조회 실패"); }
  }

  function getSavedCalculationById(id, callback) {
    try {
      var found = readSaved().filter(function (x) { return x.id === id; })[0] || null;
      if (callback) callback(null, found);
    } catch (e) {
      if (callback) callback((e && e.message) || "조회 실패");
    }
  }

  function deleteSavedCalculation(id, callback) {
    try {
      var list = readSaved().filter(function (x) { return x.id !== id; });
      writeSaved(list);
      if (callback) callback(null);
    } catch (e) {
      if (callback) callback((e && e.message) || "삭제 실패");
    }
  }

  window.app = {
    FEE_2026: FEE_2026,
    MERCHANT_FEE_2026: FEE_2026, // 레거시 alias
    formatRelativeDate: formatRelativeDate,
    showToast: showToast,
    saveCalculation: saveCalculation,
    listSavedCalculations: listSavedCalculations,
    getSavedCalculationById: getSavedCalculationById,
    deleteSavedCalculation: deleteSavedCalculation,
    // 예전 API 호환 no-op 들 (로그인/피드는 v2 에서 제거됨)
    isLoggedIn: function () { return false; },
    getUser: function () { return null; },
    logout: function () {}
  };
})();
