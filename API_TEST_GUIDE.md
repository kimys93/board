# API 테스트 가이드

## 기본 정보
- **Base URL**: `http://localhost:3000/api`
- **JWT 토큰**: Bearer Token (일부 API 필요)
- **Content-Type**: `application/json` (파일 업로드 제외)

## ⚠️ 중요: 인증 방법

### JWT 토큰 사용
로그인 후 받은 JWT 토큰을 일부 API에 포함해야 합니다.

**cURL 예시**:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/api/posts
```

**Postman 설정**:
1. Authorization 탭 → Type: Bearer Token
2. Token: 로그인 API에서 받은 JWT 토큰 입력

---

## 1. 인증 (Authentication) - `/api/auth`

### 1.1 회원가입
**POST** `/api/auth/register`

**Body**:
```json
{
  "id": "testuser123",
  "name": "홍길동",
  "email": "test@example.com",
  "gender": "male",
  "phone": "010-1234-5678",
  "password": "password123"
}
```

**성공 응답** (201):
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다.",
  "userId": 1
}
```

---

### 1.2 로그인
**POST** `/api/auth/login`

**Body**:
```json
{
  "username": "testuser123",
  "password": "password123"
}
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "로그인 성공",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "홍길동",
    "email": "test@example.com"
  }
}
```

**⚠️ 중요**: 응답의 `token` 값을 저장하고 이후 API 호출 시 `Authorization: Bearer {token}` 헤더에 포함해야 합니다.

---

## 2. 게시글 (Posts) - `/api/posts`

### 2.1 게시글 목록 조회
**GET** `/api/posts`

**Query Parameters** (선택):
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 게시글 수 (기본값: 10)
- `search`: 검색어
- `searchType`: 검색 타입 (`title`, `content`, `author`)

**예시**:
```
GET /api/posts?page=1&limit=10
GET /api/posts?search=테스트&searchType=title
```

**성공 응답** (200):
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 1,
        "title": "게시글 제목",
        "content": "게시글 내용",
        "view_count": 10,
        "created_at": "2024-01-01T00:00:00.000Z",
        "author_name": "testuser123",
        "comment_count": 5
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalPosts": 100
    }
  }
}
```

---

### 2.2 게시글 상세 조회
**GET** `/api/posts/:id`

**예시**:
```
GET /api/posts/1
```

**성공 응답** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "게시글 제목",
    "content": "게시글 내용",
    "view_count": 11,
    "created_at": "2024-01-01T00:00:00.000Z",
    "author_name": "testuser123",
    "author_id": 1
  }
}
```

---

### 2.3 게시글 작성
**POST** `/api/posts`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Body**:
```json
{
  "title": "게시글 제목",
  "content": "게시글 내용입니다."
}
```

**성공 응답** (201):
```json
{
  "success": true,
  "message": "게시글이 작성되었습니다.",
  "postId": 1
}
```

---

### 2.4 게시글 수정
**PUT** `/api/posts/:id`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Body**:
```json
{
  "title": "수정된 게시글 제목",
  "content": "수정된 게시글 내용입니다."
}
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "게시글이 수정되었습니다."
}
```

---

### 2.5 게시글 삭제
**DELETE** `/api/posts/:id`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "게시글이 삭제되었습니다."
}
```

---

## 3. 댓글 (Comments) - `/api/comments`

### 3.1 댓글 작성
**POST** `/api/comments`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Body**:
```json
{
  "post_id": 1,
  "content": "댓글 내용입니다."
}
```

**성공 응답** (201):
```json
{
  "success": true,
  "message": "댓글이 작성되었습니다.",
  "data": {
    "id": 1
  }
}
```

---

### 3.2 댓글 목록 조회
**GET** `/api/comments/:postId`

**Query Parameters** (선택):
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 댓글 수 (기본값: 10)

**예시**:
```
GET /api/comments/1?page=1&limit=10
```

**성공 응답** (200):
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": 1,
        "content": "댓글 내용",
        "created_at": "2024-01-01T00:00:00.000Z",
        "author_name": "testuser123",
        "author_id": 1
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalComments": 1
    }
  }
}
```

---

### 3.3 댓글 수정
**PUT** `/api/comments/:commentId`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Body**:
```json
{
  "content": "수정된 댓글 내용입니다."
}
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "댓글이 수정되었습니다."
}
```

---

### 3.4 댓글 삭제
**DELETE** `/api/comments/:commentId`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "댓글이 삭제되었습니다."
}
```

---

## 4. 채팅 (Chat) - `/api/chat`

### 4.1 사용자 검색
**GET** `/api/chat/search?query=홍길동`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**성공 응답** (200):
```json
{
  "success": true,
  "users": [
    {
      "id": 2,
      "name": "홍길동",
      "user_id": "hong123",
      "profile_image": null,
      "is_online": true
    }
  ]
}
```

---

### 4.2 채팅방 목록 조회
**GET** `/api/chat/rooms`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**성공 응답** (200):
```json
{
  "success": true,
  "rooms": [
    {
      "room_id": 1,
      "other_user_name": "홍길동",
      "last_message": "안녕하세요",
      "last_message_time": "2024-01-01T00:00:00.000Z",
      "unread_count": 0
    }
  ]
}
```

---

### 4.3 채팅방 생성 또는 조회
**POST** `/api/chat/room`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Body**:
```json
{
  "otherUserId": 2
}
```

**성공 응답** (200):
```json
{
  "success": true,
  "roomId": 1,
  "otherUser": {
    "id": 2,
    "name": "홍길동",
    "user_id": "hong123"
  }
}
```

---

### 4.4 채팅 메시지 조회
**GET** `/api/chat/messages/:roomId`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**성공 응답** (200):
```json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "message": "안녕하세요",
      "sender_id": 1,
      "created_at": "2024-01-01T00:00:00.000Z",
      "sender_name": "홍길동"
    }
  ]
}
```

---

### 4.5 메시지 전송
**POST** `/api/chat/message`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Body**:
```json
{
  "roomId": 1,
  "message": "안녕하세요!"
}
```

**성공 응답** (200):
```json
{
  "success": true,
  "messageId": 1
}
```

---

## 5. 알림 (Notifications) - `/api/notifications`

### 5.1 미읽은 알림 수 조회
**GET** `/api/notifications/unread-count`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**성공 응답** (200):
```json
{
  "success": true,
  "unreadCount": 5
}
```

---

### 5.2 알림 목록 조회
**GET** `/api/notifications`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**성공 응답** (200):
```json
{
  "success": true,
  "notifications": [
    {
      "id": 1,
      "title": "새 댓글",
      "message": "홍길동님이 게시글에 댓글을 남겼습니다.",
      "type": "comment",
      "is_read": false,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 5.3 알림 읽음 처리
**PUT** `/api/notifications/:id/read`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "알림이 읽음 처리되었습니다."
}
```

---

## 6. 파일 업로드 (Upload) - `/api/upload`

### 6.1 파일 업로드
**POST** `/api/upload`

**Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
```

**Body** (FormData):
```
file: [이미지 파일]
postId: 1
```

**제한사항**:
- 파일 형식: JPG, PNG, GIF, WEBP만 허용
- 파일 크기: 최대 10MB

**성공 응답** (200):
```json
{
  "success": true,
  "message": "파일이 업로드되었습니다.",
  "file": {
    "id": 1,
    "filename": "file-1234567890.jpg",
    "originalName": "이미지.jpg",
    "size": 1024000,
    "mimeType": "image/jpeg"
  }
}
```

---

### 6.2 파일 다운로드
**GET** `/api/upload/:filename`

**예시**:
```
GET /api/upload/file-1234567890.jpg
```

**성공 응답** (200): 파일 바이너리 스트림

---

## 테스트 시나리오 예시

### 시나리오 1: 회원가입 → 로그인 → 게시글 작성
1. **회원가입**: `POST /api/auth/register`
2. **로그인**: `POST /api/auth/login` (token 저장)
3. **게시글 작성**: `POST /api/posts` (Authorization 헤더에 token 포함)

### 시나리오 2: 댓글 작성 → 알림 확인
1. **댓글 작성**: `POST /api/comments` (다른 사용자로 로그인)
2. **알림 확인**: `GET /api/notifications` (게시글 작성자로 로그인)

### 시나리오 3: 채팅 테스트
1. **사용자 검색**: `GET /api/chat/search?query=사용자`
2. **채팅방 생성**: `POST /api/chat/room`
3. **메시지 전송**: `POST /api/chat/message`

---

## 에러 응답 형식

모든 API는 실패 시 다음 형식으로 응답합니다:

```json
{
  "success": false,
  "message": "에러 메시지",
  "errors": [
    {
      "msg": "상세 에러 메시지",
      "param": "필드명",
      "location": "body"
    }
  ]
}
```

**주요 HTTP 상태 코드**:
- `200`: 성공
- `201`: 생성 성공
- `400`: 잘못된 요청 (유효성 검사 실패)
- `401`: 인증 실패
- `403`: 권한 없음
- `404`: 리소스를 찾을 수 없음
- `500`: 서버 오류
