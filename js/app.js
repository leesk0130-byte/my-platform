(function () {
  'use strict';

  // 1. 파이어베이스 초기화 (설정값은 config.js에서 가져옴)
  let db = null;
  if (window.FIREBASE_CONFIG && window.firebase) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
      db = firebase.firestore();
    } catch (e) { db = null; }
  }

  // 2. 2026년 최신 수수료 데이터 (2026.02.14 인하분 반영)
  const MERCHANT_FEE_2026 = {
    CARD_YOUNG: 0.40,      // 연매출 3억 이하 영세 가맹점
    CARD_MID_1: 1.00,      // 3억 ~ 5억
    CARD_MID_2: 1.15,      // 5억 ~ 10억
    CARD_MID_3: 1.45,      // 10억 ~ 30억
    BANK_TRANSFER: 1.8,    // 계좌이체
    VIRTUAL_ACC: 300       // 가상계좌 건당
  };

  // 3. 상대 시간 계산 함수 (실시간 동적 표시)
  function timeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return Math.floor(diff / 60000) + '분 전';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '시간 전';
    return new Date(date).toLocaleDateString();
  }

  window.app = {
    // 수수료 상수 노출 (계산기 등에서 사용)
    FEE_2026: MERCHANT_FEE_2026,
    MERCHANT_FEE_2026: MERCHANT_FEE_2026,

    // 4. 글쓰기: 로컬 저장 로직을 완전히 제거하고 Firestore로만 전송
    createPost: function (data, callback) {
      if (!db) return callback('데이터베이스 연결에 실패했습니다. config.js를 확인하세요.');

      db.collection('posts').add({
        ...data,
        hits: 0,
        likeCount: 0,
        commentCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      })
      .then(doc => callback(null, { id: doc.id }))
      .catch(err => callback('Firestore 저장 오류: ' + err.message));
    },

    // 5. 글 목록 불러오기: 모든 사용자가 쓴 글을 실시간으로 가져옴
    fetchPosts: function (board, limit, offset, callback) {
      if (!db) return callback('데이터베이스 연결 실패');

      let query = db.collection('posts').orderBy('createdAt', 'desc').limit(limit || 20);
      if (board && board !== 'all') query = query.where('board', '==', board);

      query.get().then(snapshot => {
        const posts = snapshot.docs.map(doc => {
          const d = doc.data();
          const createdAt = d.createdAt && typeof d.createdAt.toDate === 'function'
            ? d.createdAt.toDate() : (d.createdAt || new Date());
          return {
            id: doc.id,
            title: d.title || '',
            body: d.body || '',
            author: d.author || '익명',
            board: d.board || 'free',
            hits: typeof d.hits === 'number' ? d.hits : 0,
            likeCount: typeof d.likeCount === 'number' ? d.likeCount : 0,
            commentCount: typeof d.commentCount === 'number' ? d.commentCount : 0,
            verified: !!d.verified,
            notice: !!d.notice,
            createdAt: typeof createdAt === 'object' && createdAt.toISOString ? createdAt.toISOString() : String(createdAt),
            date: d.createdAt ? timeAgo(d.createdAt.toDate ? d.createdAt.toDate() : createdAt) : '방금 전'
          };
        });
        if (callback) callback(null, posts, posts.length);
      }).catch(err => callback('글 불러오기 실패: ' + (err && err.message ? err.message : err), [], 0));
    },

    // 6. 좋아요: 서버 트랜잭션으로 처리 (숫자 정확히 올라감)
    togglePostLike: function (postId, callback) {
      if (!db) return callback && callback('데이터베이스 연결 실패');
      const postRef = db.collection('posts').doc(postId);
      db.runTransaction(transaction => {
        return transaction.get(postRef).then(doc => {
          if (!doc.exists) throw new Error('글이 없습니다.');
          const newLikes = (doc.data().likeCount || 0) + 1;
          transaction.update(postRef, { likeCount: newLikes });
          return newLikes;
        });
      })
      .then(newCount => callback && callback(null, newCount))
      .catch(err => callback && callback(err && err.message ? err.message : '좋아요 처리에 실패했어요.'));
    }
  };
})();
