# API 테스트 가이드

## 기본 정보
- **Base URL**: `http://localhost:3000/api`
- **JWT 토큰**: Bearer Token (일부 API 필요)
- **Content-Type**: `application/json` (파일 업로드 제외)

## ⚠️ 중요: 인증 방법

### JWT 토큰 (일부 API 필요)
로그인 후 받은 JWT 토큰을 일부 API에 포함해야 합니다.

**cURL 예시**:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/api/posts
```

**Postman 설정**:
1. Authorization 탭 → Type: Bearer Token
2. Token: 로그인 API에서 받은 JWT 토큰 입력

**JavaScript (fetch) 예시**:
```javascript
fetch('http://localhost:3000/api/posts', {
    headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
    }
});
```

---

## 1. 인증 (Authentication) - `/api/auth`

### 1.1 회원가입
**POST** `/api/auth/register`

**Headers**:
```
Content-Type: application/json
```

**참고**: JWT 토큰 불필요 (회원가입 API는 인증 없이 호출 가능)

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

**에러 응답** (400) - 유효성 검사 실패:
```json
{
  "success": false,
  "message": "입력 데이터가 유효하지 않습니다.",
  "errors": [
    {
      "msg": "ID는 영어와 숫자만 사용 가능합니다.",
      "param": "id",
      "location": "body"
    }
  ]
}
```

**에러 응답** (400) - 중복 ID/이메일:
```json
{
  "success": false,
  "message": "이미 사용 중인 ID, 이메일입니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 1.2 ID 중복 확인
**POST** `/api/auth/check-id`

**Headers**:
```
Content-Type: application/json
```

**참고**: JWT 토큰 불필요 (중복 확인 API는 인증 없이 호출 가능)

**Body**:
```json
{
  "id": "testuser123"
}
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "사용 가능한 ID입니다."
}
```

**에러 응답** (400) - 유효성 검사 실패:
```json
{
  "success": false,
  "message": "ID는 영어와 숫자만 사용 가능하며, 3-20자 사이여야 합니다."
}
```

**에러 응답** (400) - 중복 ID:
```json
{
  "success": false,
  "message": "이미 사용 중인 ID입니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 1.3 이메일 중복 확인
**POST** `/api/auth/check-email`

**Headers**:
```
Content-Type: application/json
```

**참고**: JWT 토큰 불필요 (중복 확인 API는 인증 없이 호출 가능)

**Body**:
```json
{
  "email": "test@example.com"
}
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "사용 가능한 이메일입니다."
}
```

**에러 응답** (400) - 유효성 검사 실패:
```json
{
  "success": false,
  "message": "유효한 이메일 주소를 입력해주세요."
}
```

**에러 응답** (400) - 중복 이메일:
```json
{
  "success": false,
  "message": "이미 사용 중인 이메일입니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 1.4 로그인
**POST** `/api/auth/login`

**Headers**:
```
Content-Type: application/json
```

**참고**: JWT 토큰 불필요 (로그인 API는 인증 없이 호출 가능)

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
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiaG9uZyIsImlhdCI6MTY0MDAwMDAwMCwiZXhwIjoxNjQwMDg2NDAwfQ.abc123...",
  "user": {
    "id": 1,
    "username": "홍길동",
    "email": "test@example.com"
  }
}
```

**⚠️ 중요: Bearer Token 받기**

로그인 성공 시 응답의 `token` 필드에 JWT 토큰이 포함됩니다. 이 토큰을 저장하고 이후 API 호출 시 사용해야 합니다.

**cURL 예시**:
```bash
# 1. 로그인 요청
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test1","password":"test1234"}'

# 응답에서 token 값을 복사한 후:
# 2. 토큰을 사용하여 다른 API 호출 (예: 게시글 목록)
curl -X GET http://localhost:3000/api/posts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Postman 예시**:
1. **로그인 요청**:
   - Method: POST
   - URL: `http://localhost:3000/api/auth/login`
   - Body (raw JSON):
     ```json
     {
       "username": "test1",
       "password": "test1234"
     }
     ```
   - Send 클릭 후 응답에서 `token` 값 복사

2. **다른 API 요청** (예: 게시글 목록):
   - Method: GET
   - URL: `http://localhost:3000/api/posts`
   - Authorization 탭 → Type: Bearer Token
   - Token: 위에서 복사한 토큰 값 붙여넣기

**JavaScript (fetch) 예시**:
```javascript
// 1. 로그인
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'test1',
    password: 'test1234'
  })
});

const loginData = await loginResponse.json();

if (loginData.success) {
  // 2. 토큰 저장 (localStorage 또는 변수에)
  const token = loginData.token;
  localStorage.setItem('jwt_token', token);
  
  console.log('로그인 성공! 토큰:', token);
  console.log('사용자 정보:', loginData.user);
  
  // 3. 토큰을 사용하여 다른 API 호출
  const postsResponse = await fetch('http://localhost:3000/api/posts', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const postsData = await postsResponse.json();
  console.log('게시글 목록:', postsData);
} else {
  console.error('로그인 실패:', loginData.message);
}
```

**에러 응답** (400) - 유효성 검사 실패:
```json
{
  "success": false,
  "message": "입력 데이터가 유효하지 않습니다.",
  "errors": [
    {
      "msg": "ID 또는 이메일을 입력해주세요.",
      "param": "username",
      "location": "body"
    }
  ]
}
```

**에러 응답** (401) - 사용자명 또는 비밀번호 오류:
```json
{
  "success": false,
  "message": "사용자명 또는 비밀번호가 올바르지 않습니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 1.5 토큰 검증
**GET** `/api/auth/verify`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**참고**: HTTP Basic Authentication (쿠키) + JWT 토큰 필요

**성공 응답** (200):
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "testuser123",
    "email": "test@example.com"
  }
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (401) - 토큰 만료/유효하지 않음:
```json
{
  "success": false,
  "message": "유효하지 않은 토큰입니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 1.6 사용자 정보 조회
**GET** `/api/auth/me`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**성공 응답** (200):
```json
{
  "success": true,
  "user": {
    "id": 1,
    "userId": "testuser123",
    "username": "홍길동"
  }
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (401) - 토큰 만료/유효하지 않음:
```json
{
  "success": false,
  "message": "유효하지 않은 토큰입니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 1.7 프로필 정보 조회
**GET** `/api/auth/profile`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**성공 응답** (200):
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "홍길동",
    "user_id": "testuser123",
    "email": "test@example.com",
    "gender": "male",
    "phone": "010-1234-5678",
    "profile_image": null
  }
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (401) - 토큰 만료/유효하지 않음:
```json
{
  "success": false,
  "message": "유효하지 않은 토큰입니다."
}
```

**에러 응답** (404) - 사용자 없음:
```json
{
  "success": false,
  "message": "사용자를 찾을 수 없습니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 1.8 프로필 업데이트
**PUT** `/api/auth/profile`

**Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data (프로필 이미지 포함 시)
또는
Content-Type: application/json (프로필 이미지 없을 시)
```

**Body** (JSON):
```json
{
  "name": "홍길동",
  "email": "newemail@example.com",
  "gender": "male",
  "phone": "010-9876-5432"
}
```

**Body** (FormData - 프로필 이미지 포함):
```
name: "홍길동"
email: "newemail@example.com"
gender: "male"
phone: "010-9876-5432"
profile_image: [파일]
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "프로필이 성공적으로 업데이트되었습니다."
}
```

**에러 응답** (400) - 중복 이메일:
```json
{
  "success": false,
  "message": "이미 사용 중인 이메일입니다."
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 1.9 비밀번호 변경
**POST** `/api/auth/change-password`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Body**:
```json
{
  "currentPassword": "password123",
  "newPassword": "newpassword456"
}
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "비밀번호가 성공적으로 변경되었습니다."
}
```

**에러 응답** (400) - 현재 비밀번호 오류:
```json
{
  "success": false,
  "message": "현재 비밀번호가 올바르지 않습니다."
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (404) - 사용자 없음:
```json
{
  "success": false,
  "message": "사용자를 찾을 수 없습니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 1.10 계정 삭제
**DELETE** `/api/auth/delete-account`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Body**:
```json
{
  "password": "password123"
}
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "계정이 성공적으로 삭제되었습니다."
}
```

**에러 응답** (400) - 비밀번호 오류:
```json
{
  "success": false,
  "message": "비밀번호가 올바르지 않습니다."
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (404) - 사용자 없음:
```json
{
  "success": false,
  "message": "사용자를 찾을 수 없습니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

## 2. 게시글 (Posts) - `/api/posts`

### 2.1 게시글 목록 조회
**GET** `/api/posts`

**Headers**:
```
Authorization: Basic {base64_encoded_credentials}
```

**참고**: HTTP Basic Authentication 필요 (JWT 토큰 불필요)

**Query Parameters**:
- `page` (optional): 페이지 번호 (기본값: 1)
- `limit` (optional): 페이지당 게시글 수 (기본값: 10)
- `search` (optional): 검색어
- `searchType` (optional): 검색 타입 (`title`, `content`, `author`) - 기본값: `title`

**예시**:
```
GET /api/posts
GET /api/posts?page=1&limit=10
GET /api/posts?search=테스트&searchType=title
GET /api/posts?search=홍길동&searchType=author
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
        "updated_at": "2024-01-01T00:00:00.000Z",
        "author_name": "testuser123",
        "comment_count": 5
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalPosts": 100,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 2.2 게시글 상세 조회
**GET** `/api/posts/:id`

**Headers**:
```
Authorization: Basic {base64_encoded_credentials}
```

**참고**: HTTP Basic Authentication 필요 (JWT 토큰 불필요)

**Path Parameters**:
- `id`: 게시글 ID

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
    "updated_at": "2024-01-01T00:00:00.000Z",
    "author_name": "testuser123",
    "author_id": 1,
    "attachments": [
      {
        "id": 1,
        "filename": "file-1234567890.jpg",
        "original_name": "이미지.jpg",
        "file_size": 1024000,
        "mime_type": "image/jpeg"
      }
    ]
  }
}
```

**에러 응답** (404) - 게시글 없음:
```json
{
  "success": false,
  "message": "게시글을 찾을 수 없습니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
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

**에러 응답** (400) - 유효성 검사 실패:
```json
{
  "success": false,
  "message": "입력 데이터가 유효하지 않습니다.",
  "errors": [
    {
      "msg": "제목은 1-200자 사이여야 합니다.",
      "param": "title",
      "location": "body"
    }
  ]
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 2.4 게시글 수정
**PUT** `/api/posts/:id`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
- `id`: 게시글 ID

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

**에러 응답** (400) - 유효성 검사 실패:
```json
{
  "success": false,
  "message": "입력 데이터가 유효하지 않습니다.",
  "errors": [
    {
      "msg": "제목은 1-200자 사이여야 합니다.",
      "param": "title",
      "location": "body"
    }
  ]
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (403) - 권한 없음:
```json
{
  "success": false,
  "message": "게시글을 수정할 권한이 없습니다."
}
```

**에러 응답** (404) - 게시글 없음:
```json
{
  "success": false,
  "message": "게시글을 찾을 수 없습니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 2.5 게시글 삭제
**DELETE** `/api/posts/:id`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
- `id`: 게시글 ID

**예시**:
```
DELETE /api/posts/1
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "게시글이 삭제되었습니다."
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (403) - 권한 없음:
```json
{
  "success": false,
  "message": "게시글을 삭제할 권한이 없습니다."
}
```

**에러 응답** (404) - 게시글 없음:
```json
{
  "success": false,
  "message": "게시글을 찾을 수 없습니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
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

**에러 응답** (400) - 유효성 검사 실패:
```json
{
  "success": false,
  "message": "입력 데이터가 올바르지 않습니다.",
  "errors": [
    {
      "msg": "댓글 내용을 입력해주세요",
      "param": "content",
      "location": "body"
    }
  ]
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "댓글 작성 중 오류가 발생했습니다."
}
```

---

### 3.2 댓글 작성 (게시글 ID 포함)
**POST** `/api/comments/:postId`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
- `postId`: 게시글 ID

**Body**:
```json
{
  "content": "댓글 내용입니다."
}
```

**성공 응답** (201):
```json
{
  "success": true,
  "message": "댓글이 작성되었습니다.",
  "commentId": 1
}
```

**에러 응답** (400) - 유효성 검사 실패:
```json
{
  "success": false,
  "message": "입력 데이터가 유효하지 않습니다.",
  "errors": [
    {
      "msg": "댓글 내용은 1-1000자 사이여야 합니다.",
      "param": "content",
      "location": "body"
    }
  ]
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (404) - 게시글 없음:
```json
{
  "success": false,
  "message": "게시글을 찾을 수 없습니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 3.3 댓글 목록 조회
**GET** `/api/comments/:postId`

**Headers**:
```
Authorization: Basic {base64_encoded_credentials}
```

**참고**: HTTP Basic Authentication 필요 (JWT 토큰 불필요)

**Path Parameters**:
- `postId`: 게시글 ID

**Query Parameters**:
- `page` (optional): 페이지 번호 (기본값: 1)
- `limit` (optional): 페이지당 댓글 수 (기본값: 10)

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
        "updated_at": null,
        "author_name": "testuser123",
        "author_id": 1
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalComments": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 3.4 댓글 수정
**PUT** `/api/comments/:commentId`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
- `commentId`: 댓글 ID

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

**에러 응답** (400) - 유효성 검사 실패:
```json
{
  "success": false,
  "message": "입력 데이터가 올바르지 않습니다.",
  "errors": [
    {
      "msg": "댓글 내용을 입력해주세요",
      "param": "content",
      "location": "body"
    }
  ]
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (403) - 권한 없음:
```json
{
  "success": false,
  "message": "댓글을 수정할 권한이 없습니다."
}
```

**에러 응답** (404) - 댓글 없음:
```json
{
  "success": false,
  "message": "댓글을 찾을 수 없습니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "댓글 수정 중 오류가 발생했습니다."
}
```

---

### 3.5 댓글 삭제
**DELETE** `/api/comments/:commentId`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
- `commentId`: 댓글 ID

**예시**:
```
DELETE /api/comments/1
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "댓글이 삭제되었습니다."
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (403) - 권한 없음:
```json
{
  "success": false,
  "message": "댓글을 삭제할 권한이 없습니다."
}
```

**에러 응답** (404) - 댓글 없음:
```json
{
  "success": false,
  "message": "댓글을 찾을 수 없습니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "댓글 삭제 중 오류가 발생했습니다."
}
```

---

## 4. 채팅 (Chat) - `/api/chat`

### 4.1 사용자 검색
**GET** `/api/chat/search`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Query Parameters**:
- `query`: 검색어 (최소 2자 이상)

**예시**:
```
GET /api/chat/search?query=홍길동
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
      "is_online": true,
      "last_seen": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
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
      "other_user_id": 2,
      "other_user_name": "홍길동",
      "other_user_user_id": "hong123",
      "other_user_profile": null,
      "other_user_online": true,
      "other_user_last_seen": "2024-01-01T00:00:00.000Z",
      "last_message": "안녕하세요",
      "last_message_time": "2024-01-01T00:00:00.000Z",
      "last_message_sender_id": 1,
      "unread_count": 0
    }
  ]
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
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

**에러 응답** (400) - 자기 자신과 채팅:
```json
{
  "success": false,
  "message": "자기 자신과는 채팅할 수 없습니다."
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (404) - 사용자 없음:
```json
{
  "success": false,
  "message": "사용자를 찾을 수 없습니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 4.4 채팅 메시지 조회
**GET** `/api/chat/messages/:roomId`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
- `roomId`: 채팅방 ID

**예시**:
```
GET /api/chat/messages/1
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
      "sender_name": "홍길동",
      "sender_user_id": "testuser123"
    }
  ]
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (403) - 채팅방 접근 권한 없음:
```json
{
  "success": false,
  "message": "채팅방에 접근할 수 없습니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
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

**에러 응답** (400) - 유효성 검사 실패:
```json
{
  "success": false,
  "message": "입력 데이터가 유효하지 않습니다.",
  "errors": [
    {
      "msg": "메시지를 입력해주세요.",
      "param": "message",
      "location": "body"
    }
  ]
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (403) - 채팅방 접근 권한 없음:
```json
{
  "success": false,
  "message": "채팅방에 접근할 수 없습니다."
}
```

**에러 응답** (404) - 채팅방 없음:
```json
{
  "success": false,
  "message": "채팅방을 찾을 수 없습니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
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

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
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
      "message": "{\"message\":\"홍길동님이 \\\"게시글 제목\\\" 게시글에 댓글을 남겼습니다.\",\"postId\":1,\"commentId\":1,\"authorName\":\"홍길동\"}",
      "type": "comment",
      "is_read": false,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "title": "새 메시지",
      "message": "{\"message\":\"홍길동: 안녕하세요\",\"roomId\":1,\"senderId\":2,\"senderName\":\"홍길동\"}",
      "type": "message",
      "is_read": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**참고**: `message` 필드는 JSON 문자열로 저장되어 있습니다. 파싱이 필요합니다.

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 5.3 알림 설정 조회
**GET** `/api/notifications/settings`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**성공 응답** (200):
```json
{
  "success": true,
  "settings": {
    "id": 1,
    "user_id": 1,
    "browser_notification": 1,
    "chat_notification": 1,
    "comment_notification": 1,
    "sms_notification": 0,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 5.4 알림 설정 업데이트
**PUT** `/api/notifications/settings`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Body**:
```json
{
  "chat_notification": true,
  "comment_notification": false
}
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "알림 설정이 성공적으로 저장되었습니다.",
  "settings": {
    "id": 1,
    "user_id": 1,
    "browser_notification": 1,
    "chat_notification": 1,
    "comment_notification": 0,
    "sms_notification": 0,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**에러 응답** (400) - 유효성 검사 실패:
```json
{
  "success": false,
  "message": "입력 데이터가 유효하지 않습니다.",
  "errors": [
    {
      "msg": "채팅 알림 설정이 올바르지 않습니다.",
      "param": "chat_notification",
      "location": "body"
    }
  ]
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 5.5 알림 읽음 처리
**PUT** `/api/notifications/:id/read`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
- `id`: 알림 ID

**예시**:
```
PUT /api/notifications/1/read
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "알림이 읽음 처리되었습니다."
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 5.6 모든 알림 읽음 처리
**PUT** `/api/notifications/read-all`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "모든 알림이 읽음 처리되었습니다."
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 5.7 모든 알림 삭제
**DELETE** `/api/notifications/clear-all`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "모든 알림이 삭제되었습니다."
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 5.8 알림 삭제 (개별)
**DELETE** `/api/notifications/:id`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
- `id`: 알림 ID

**예시**:
```
DELETE /api/notifications/1
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "알림이 삭제되었습니다."
}
```

**에러 응답** (400) - 잘못된 알림 ID:
```json
{
  "success": false,
  "message": "잘못된 알림 ID입니다."
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

### 5.9 알림 테스트
**POST** `/api/notifications/test`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Body**:
```json
{
  "type": "test",
  "message": "테스트 알림입니다."
}
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "테스트 알림이 생성되었습니다."
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
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

**에러 응답** (400) - 파일 없음:
```json
{
  "success": false,
  "message": "파일을 선택해주세요."
}
```

**에러 응답** (400) - 게시글 ID 없음:
```json
{
  "success": false,
  "message": "게시글 ID가 필요합니다."
}
```

**에러 응답** (400) - 잘못된 파일 형식:
```json
{
  "success": false,
  "message": "이미지 파일만 업로드할 수 있습니다. (JPG, PNG, GIF, WEBP)"
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (403) - 권한 없음:
```json
{
  "success": false,
  "message": "파일을 업로드할 권한이 없습니다."
}
```

**에러 응답** (404) - 게시글 없음:
```json
{
  "success": false,
  "message": "게시글을 찾을 수 없습니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "파일 업로드 중 오류가 발생했습니다."
}
```

---

### 6.2 파일 다운로드
**GET** `/api/upload/:filename`

**Headers**: 없음

**Path Parameters**:
- `filename`: 파일명

**예시**:
```
GET /api/upload/file-1234567890.jpg
```

**성공 응답** (200): 파일 바이너리 스트림

**에러 응답** (404) - 파일 없음:
```json
{
  "success": false,
  "message": "파일을 찾을 수 없습니다."
}
```

**에러 응답** (404) - 파일 시스템에 없음:
```json
{
  "success": false,
  "message": "파일이 서버에 존재하지 않습니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "파일 다운로드 중 오류가 발생했습니다."
}
```

---

### 6.3 파일 삭제
**DELETE** `/api/upload/:id`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
- `id`: 파일 ID

**예시**:
```
DELETE /api/upload/1
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "파일이 삭제되었습니다."
}
```

**에러 응답** (401) - 토큰 없음:
```json
{
  "success": false,
  "message": "인증 토큰이 필요합니다."
}
```

**에러 응답** (403) - 권한 없음:
```json
{
  "success": false,
  "message": "파일을 삭제할 권한이 없습니다."
}
```

**에러 응답** (404) - 파일 없음:
```json
{
  "success": false,
  "message": "파일을 찾을 수 없습니다."
}
```

**에러 응답** (500) - 서버 오류:
```json
{
  "success": false,
  "message": "파일 삭제 중 오류가 발생했습니다."
}
```

---

## 7. 관리자 (Admin) - `/api/admin`

> ⚠️ **주의**: 모든 관리자 API는 관리자 권한이 필요합니다. (`user_id`가 `admin` 또는 `administrator`인 사용자만 접근 가능)

### 7.1 회원 목록 조회
**GET** `/api/admin/users`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Query Parameters** (선택):
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 10)
- `search`: 검색어 (이름, ID, 이메일)

**예시**:
```
GET /api/admin/users?page=1&limit=10&search=test
```

**성공 응답** (200):
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "user_id": "testuser",
        "name": "테스트 사용자",
        "email": "test@example.com",
        "phone": "010-1234-5678",
        "gender": "male",
        "is_banned": 0,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalUsers": 1,
      "totalPages": 1
    }
  }
}
```

**에러 응답** (403) - 관리자 권한 없음:
```json
{
  "success": false,
  "message": "관리자 권한이 필요합니다."
}
```

---

### 7.2 회원 이용 제재/해제
**PUT** `/api/admin/users/:id/ban`

**Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Path Parameters**:
- `id`: 회원 ID

**Body**:
```json
{
  "is_banned": true
}
```

**예시**:
```
PUT /api/admin/users/2/ban
Body: {"is_banned": true}
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "회원이 제재되었습니다."
}
```

**에러 응답** (403) - 관리자 권한 없음:
```json
{
  "success": false,
  "message": "관리자 권한이 필요합니다."
}
```

**에러 응답** (400) - 자기 자신 제재 시도:
```json
{
  "success": false,
  "message": "자기 자신을 제재할 수 없습니다."
}
```

---

### 7.3 회원 삭제
**DELETE** `/api/admin/users/:id`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
- `id`: 회원 ID

**예시**:
```
DELETE /api/admin/users/2
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "회원이 삭제되었습니다."
}
```

**에러 응답** (403) - 관리자 권한 없음:
```json
{
  "success": false,
  "message": "관리자 권한이 필요합니다."
}
```

**에러 응답** (400) - 자기 자신 삭제 시도:
```json
{
  "success": false,
  "message": "자기 자신을 삭제할 수 없습니다."
}
```

**에러 응답** (400) - 관리자 계정 삭제 시도:
```json
{
  "success": false,
  "message": "관리자 계정은 삭제할 수 없습니다."
}
```

---

## 8. 버그 설정 (Bug Settings) - `/api/bug-settings`

### 8.1 버그 설정 목록 조회 (관리자만)
**GET** `/api/bug-settings/bugs`

> ⚠️ **주의**: 관리자 권한이 필요합니다.

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**예시**:
```
GET /api/bug-settings/bugs
```

**성공 응답** (200):
```json
{
  "success": true,
  "bugs": [
    {
      "bug_name": "bts_1",
      "is_enabled": false
    },
    {
      "bug_name": "bts_2",
      "is_enabled": false
    }
  ]
}
```

**에러 응답** (403) - 관리자 권한 없음:
```json
{
  "success": false,
  "message": "관리자 권한이 필요합니다."
}
```

---

### 8.2 특정 버그 설정 조회 (공개)
**GET** `/api/bug-settings/bug/:bugKey`

> ℹ️ **참고**: 이 API는 공개 API입니다. 인증 토큰이 필요하지 않습니다.

**Path Parameters**:
- `bugKey`: 버그 키 (예: `bts_1`, `bts_2`, ...)

**예시**:
```
GET /api/bug-settings/bug/bts_1
```

**성공 응답** (200):
```json
{
  "success": true,
  "is_enabled": false
}
```

**버그 키 목록**:
- `bts_1`: 검색 시 항상 "게시글이 없습니다" 페이지가 노출됨
- `bts_2`: 게시글 작성 후 페이지 리다이렉트가 되지 않음 (중복 제출 가능)
- `bts_3`: 페이지네이션 오류 (잘못된 페이지 표시)
- `bts_4`: 게시글 목록이 오름차순으로 표시됨
- `bts_5`: 파일 업로드 후 파일 목록이 갱신되지 않음
- `bts_6`: 알림이 중복으로 표시됨
- `bts_7`: 게시글 작성 시간이 UTC 시간 기준으로 표시됨
- `bts_8`: 댓글 작성 후 목록 갱신 안 됨
- `bts_9`: 게시글 상세 페이지에서 조회수가 표시되지 않음
- `bts_10`: 채팅 메시지가 두 개씩 전송됨

---

### 8.3 버그 설정 토글 (관리자만)
**PUT** `/api/bug-settings/bugs/:bugKey`

> ⚠️ **주의**: 관리자 권한이 필요합니다.

**Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Path Parameters**:
- `bugKey`: 버그 키 (예: `bts_1`, `bts_2`, ...)

**Body**:
```json
{
  "is_enabled": true
}
```

**예시**:
```
PUT /api/bug-settings/bugs/bts_1
Body: {"is_enabled": true}
```

**성공 응답** (200):
```json
{
  "success": true,
  "message": "버그 \"bts_1\"가 활성화되었습니다."
}
```

**에러 응답** (403) - 관리자 권한 없음:
```json
{
  "success": false,
  "message": "관리자 권한이 필요합니다."
}
```

---

## 테스트 시나리오 예시

### 시나리오 1: 회원가입 → 로그인 → 게시글 작성
1. **회원가입**
   ```bash
   POST /api/auth/register
   Body: {"id": "user1", "name": "사용자1", "email": "user1@test.com", "gender": "male", "phone": "010-1111-1111", "password": "password123"}
   ```

2. **로그인**
   ```bash
   POST /api/auth/login
   Body: {"username": "user1", "password": "password123"}
   Response에서 token 저장
   ```

3. **게시글 작성**
   ```bash
   POST /api/posts
   Headers: Authorization: Bearer {jwt_token}
   Body: {"title": "테스트 게시글", "content": "테스트 내용입니다."}
   ```

---

### 시나리오 2: 댓글 작성 → 알림 확인
1. **댓글 작성** (다른 사용자로 로그인)
   ```bash
   POST /api/comments
   Headers: Authorization: Bearer {jwt_token}
   Body: {"post_id": 1, "content": "댓글입니다."}
   ```

2. **알림 확인** (게시글 작성자로 로그인)
   ```bash
   GET /api/notifications
   Headers: Authorization: Bearer {jwt_token}
   ```

---

### 시나리오 3: 채팅 테스트
1. **사용자 검색**
   ```bash
   GET /api/chat/search?query=사용자
   Headers: Authorization: Bearer {jwt_token}
   ```

2. **채팅방 생성**
   ```bash
   POST /api/chat/room
   Headers: Authorization: Bearer {jwt_token}
   Body: {"otherUserId": 2}
   ```

3. **메시지 전송**
   ```bash
   POST /api/chat/message
   Headers: Authorization: Bearer {jwt_token}
   Body: {"roomId": 1, "message": "안녕하세요!"}
   ```

---

## Postman Collection 예시

Postman에서 사용할 수 있는 환경 변수:
- `base_url`: `http://localhost:3000/api`
- `token`: 로그인 후 받은 JWT 토큰

### Pre-request Script (인증 필요 API):
```javascript
pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.environment.get('token')
});
```

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

