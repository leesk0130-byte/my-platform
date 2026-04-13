/*! pg-data.js — 단일 PG 수수료 데이터 로더 (가맹점숲)
 *  window.PGData = { load, get, compare, formatRate, formatKRW, FALLBACK }
 *  - load()      : fetch('/data/pg-fees-2026.json')  (15분 memory cache, fetch 실패 시 FALLBACK 사용)
 *  - get(id)     : provider 단건
 *  - compare(...): 두 PG 간 연간 총 수수료 비교
 */
(function (global) {
  'use strict';

  var CACHE_KEY = '__gmj_pg_cache__';
  var TTL_MS = 15 * 60 * 1000; // 15분

  // 인라인 폴백 — 네트워크 실패 시 최소 동작 보장용 (핵심 숫자만)
  var FALLBACK = {
    updated_at: '2026-04-13',
    source: ['inline fallback'],
    notes: '네트워크 실패 시 인라인 폴백. 표준 공시 기준, 가맹점별 상이.',
    disclaimer: '참고용. 정확한 수수료는 각 PG사 문의.',
    providers: [
      { id:'toss',    name:'토스페이먼츠',   website:'https://www.tosspayments.com/',
        card:{credit:{young:0.40,small1:1.10,small2:1.25,small3:1.45,general:2.90},check:{young:0.15,general:2.50}},
        easypay:{naverpay:2.90,kakaopay:2.90,payco:2.80,tosspay:2.70,samsungpay:2.80,applepay:2.90},
        bank:1.20, virtual_account:300, phone:5.50, overseas:3.80, monthly_fee:9167, notes:'표준 공시 기준, 가맹점별 상이' },
      { id:'kcp',     name:'NHN KCP',      website:'https://www.kcp.co.kr/',
        card:{credit:{young:0.40,small1:1.10,small2:1.25,small3:1.45,general:2.80},check:{young:0.15,general:2.40}},
        easypay:{naverpay:2.80,kakaopay:2.90,payco:2.70,tosspay:2.70,samsungpay:2.70,applepay:2.90},
        bank:1.10, virtual_account:300, phone:5.50, overseas:3.70, monthly_fee:0, notes:'표준 공시 기준, 가맹점별 상이' },
      { id:'inicis',  name:'KG이니시스',    website:'https://www.inicis.com/',
        card:{credit:{young:0.40,small1:1.10,small2:1.25,small3:1.45,general:2.90},check:{young:0.15,general:2.50}},
        easypay:{naverpay:2.90,kakaopay:2.90,payco:2.80,tosspay:2.80,samsungpay:2.80,applepay:2.90},
        bank:1.20, virtual_account:300, phone:5.50, overseas:3.80, monthly_fee:0, notes:'표준 공시 기준, 가맹점별 상이' },
      { id:'nicepay', name:'나이스페이먼츠', website:'https://www.nicepay.co.kr/',
        card:{credit:{young:0.40,small1:1.10,small2:1.25,small3:1.45,general:2.80},check:{young:0.15,general:2.40}},
        easypay:{naverpay:2.80,kakaopay:2.90,payco:2.70,tosspay:2.70,samsungpay:2.70,applepay:2.90},
        bank:1.10, virtual_account:300, phone:5.50, overseas:3.70, monthly_fee:0, notes:'표준 공시 기준, 가맹점별 상이' },
      { id:'danal',   name:'다날',          website:'https://www.danalpay.com/',
        card:{credit:{young:0.40,small1:1.10,small2:1.25,small3:1.45,general:2.90},check:{young:0.15,general:2.50}},
        easypay:{naverpay:2.90,kakaopay:2.90,payco:2.80,tosspay:2.80,samsungpay:2.80,applepay:null},
        bank:1.20, virtual_account:300, phone:4.50, overseas:3.80, monthly_fee:0, notes:'표준 공시 기준, 가맹점별 상이' }
    ]
  };

  function now() { return Date.now(); }

  function readCache() {
    var c = global[CACHE_KEY];
    if (c && (now() - c.at) < TTL_MS) return c.data;
    return null;
  }
  function writeCache(data) {
    global[CACHE_KEY] = { at: now(), data: data };
  }

  function load() {
    var cached = readCache();
    if (cached) return Promise.resolve(cached);
    if (typeof fetch !== 'function') {
      writeCache(FALLBACK);
      return Promise.resolve(FALLBACK);
    }
    return fetch('/data/pg-fees-2026.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (json) {
        writeCache(json);
        return json;
      })
      .catch(function (err) {
        try { console.warn('[PGData] load failed, using fallback:', err && err.message); } catch (e) {}
        writeCache(FALLBACK);
        return FALLBACK;
      });
  }

  function get(providerId) {
    return load().then(function (data) {
      var list = (data && data.providers) || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === providerId) return list[i];
      }
      return null;
    });
  }

  /**
   * compare(idA, idB, monthlySales, mix)
   *   mix: { card:0.7, easypay:0.2, bank:0.05, phone:0.05 } (합=1)
   *   카드 tier 는 mix.cardTier = 'young|small1|small2|small3|general' (기본 general)
   * returns Promise<{ a:{name,annualFee}, b:{name,annualFee}, diff, cheaper }>
   */
  function compare(idA, idB, monthlySales, mix) {
    mix = mix || { card: 1, easypay: 0, bank: 0, phone: 0 };
    var tier = mix.cardTier || 'general';
    return load().then(function (data) {
      var a = find(data, idA), b = find(data, idB);
      function calc(p) {
        if (!p) return { name: '-', annualFee: 0 };
        var yearly = monthlySales * 12;
        var fee =
          yearly * (mix.card    || 0) * (getNum(p.card && p.card.credit && p.card.credit[tier]) / 100) +
          yearly * (mix.easypay || 0) * (avgEasypay(p) / 100) +
          yearly * (mix.bank    || 0) * (getNum(p.bank) / 100) +
          yearly * (mix.phone   || 0) * (getNum(p.phone) / 100) +
          (getNum(p.monthly_fee) * 12);
        return { name: p.name, annualFee: Math.round(fee) };
      }
      var ra = calc(a), rb = calc(b);
      var diff = Math.abs(ra.annualFee - rb.annualFee);
      var cheaper = ra.annualFee === rb.annualFee ? null : (ra.annualFee < rb.annualFee ? ra.name : rb.name);
      return { a: ra, b: rb, diff: diff, cheaper: cheaper };
    });
  }

  function find(data, id) {
    var list = (data && data.providers) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function getNum(v) { return (typeof v === 'number' && !isNaN(v)) ? v : 0; }
  function avgEasypay(p) {
    if (!p.easypay) return 0;
    var keys = Object.keys(p.easypay), sum = 0, n = 0;
    for (var i = 0; i < keys.length; i++) {
      var v = p.easypay[keys[i]];
      if (typeof v === 'number' && !isNaN(v)) { sum += v; n++; }
    }
    return n ? sum / n : 0;
  }

  function formatRate(v) {
    if (v === null || v === undefined || isNaN(v)) return '-';
    return (Math.round(v * 100) / 100).toFixed(2) + '%';
  }
  function formatKRW(v) {
    if (v === null || v === undefined || isNaN(v)) return '-';
    return Math.round(v).toLocaleString('ko-KR') + '원';
  }

  global.PGData = {
    load: load,
    get: get,
    compare: compare,
    formatRate: formatRate,
    formatKRW: formatKRW,
    FALLBACK: FALLBACK
  };
})(typeof window !== 'undefined' ? window : this);
