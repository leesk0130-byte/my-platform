# Firebase Firestore 커뮤니티 연동 설정

커뮤니티 글이 모든 사용자에게 공유되려면 Firebase Console에서 Firestore를 활성화하고 규칙을 설정해야 합니다.

## 1. Firestore 데이터베이스 만들기

1. [Firebase Console](https://console.firebase.google.com/) → 프로젝트 선택
2. **Firestore Database** → **데이터베이스 만들기**
3. **테스트 모드로 시작** 또는 **프로덕션 모드** 선택 후 위치 선택

## 2. 컬렉션 구조

앱이 자동으로 다음 구조를 사용합니다.

- **`posts`** (컬렉션)
  - 문서 필드: `title`, `body`, `author`, `authorId`, `board`, `createdAt`, `notice`, `industry`, `monthlyVolume`, `pgUsed`, `hits`, `likeCount`, `commentCount`, `verified`
- **`posts/{postId}/comments`** (하위 컬렉션)
  - 문서 필드: `author`, `body`, `createdAt`, `parentId`, `verified`
- **`posts/{postId}/likes`** (하위 컬렉션)
  - 문서 ID = 사용자 ID (uid 또는 익명 ID), 필드: `createdAt`

## 3. 인덱스

목록 정렬을 위해 다음 복합 인덱스가 필요할 수 있습니다.  
콘솔에서 오류 메시지의 링크를 따라 자동 생성하거나:

- 컬렉션: `posts`
  - 필드: `createdAt` (내림차순)

## 4. 보안 규칙 예시

Firestore → 규칙에서 아래와 비슷하게 설정하세요. (실서비스에서는 읽기/쓰기 범위를 더 좁히세요.)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null || true;
      allow update, delete: if request.auth != null;
    }
    match /posts/{postId}/comments/{commentId} {
      allow read: if true;
      allow create: if true;
    }
    match /posts/{postId}/likes/{userId} {
      allow read: if true;
      allow create, delete: if true;
    }
  }
}
```

규칙 적용 후 앱에서 글쓰기·댓글·좋아요가 Firestore에 저장되며, 다른 사용자도 동일한 글을 볼 수 있습니다.
