# 게시판 애플리케이션

Node.js, Express, MySQL을 사용한 테스트 자동화 코드 연습을 위한 게시판 애플리케이션입니다.
해당 코드는 커서 AI로 구성하였으며, 코드 그대로 클론 시 일부 에러가 발생할 수 있으니 주의바랍니다.

## 🚀 주요 기능

### 인증 및 사용자 관리
- **회원가입 및 로그인** - JWT 기반 인증
- **프로필 관리** - 사용자 정보 수정, 프로필 이미지 업로드
- **비밀번호 변경** - 보안을 위한 비밀번호 변경 기능
- **사용자 온라인 상태** - 실시간 온라인/오프라인 상태 표시

### 게시판 기능
- **게시글 관리** - CRUD 기능 (작성, 조회, 수정, 삭제)
- **댓글 시스템** - 게시글별 댓글 작성/수정/삭제
- **파일 업로드** - 게시글에 이미지 파일 첨부 가능
- **페이지네이션** - 게시글 목록 페이지네이션
- **검색 기능** - 제목/내용/작성자별 검색

### 실시간 통신
- **1:1 채팅** - WebSocket 기반 실시간 채팅
- **사용자 검색** - 채팅 상대방 검색
- **채팅방 관리** - 채팅방 목록 조회 및 메시지 히스토리

### 알림 시스템
- **브라우저 알림** - 채팅 메시지 및 댓글 알림
- **알림 설정** - 채팅/댓글 알림 ON/OFF 설정
- **알림 목록** - 알림 조회, 읽음 처리, 삭제
- **실시간 알림** - WebSocket을 통한 실시간 알림 수신

### UI/UX
- **반응형 디자인** - Bootstrap 5 사용
- **실시간 상태 업데이트** - 사용자 온라인 상태 실시간 표시

## 🛠 기술 스택

### Backend
- **Node.js** - JavaScript 런타임
- **Express** - 웹 프레임워크
- **MySQL** - 데이터베이스
- **WebSocket (ws)** - 실시간 통신
- **Multer** - 파일 업로드 처리
- **JWT** - 인증 토큰

### Frontend
- **HTML5/CSS3/JavaScript** - 기본 웹 기술
- **Bootstrap 5** - UI 프레임워크
- **Font Awesome** - 아이콘
- **WebSocket API** - 실시간 통신
- **Notification API** - 브라우저 알림

### DevOps
- **Docker** - 컨테이너화
- **Jenkins** - CI/CD

## 📁 프로젝트 구조

```
board/
├── public/                 # 프론트엔드 파일
│   ├── index.html         # 게시판 메인 페이지
│   ├── chat.html          # 채팅 페이지
│   ├── profile.html       # 프로필 관리 페이지
│   ├── notifications.html # 알림 설정 페이지
│   ├── css/
│   │   └── style.css      # 커스텀 스타일
│   └── js/
│       ├── app.js         # 메인 애플리케이션 로직
│       ├── navbar.js      # 네비게이션 바 (WebSocket 연결)
│       ├── chat.js        # 채팅 기능
│       ├── notifications.js # 알림 관리
│       └── profile.js     # 프로필 관리
├── config/
│   └── database.js        # 데이터베이스 설정
├── middleware/
│   └── auth.js           # 인증 미들웨어
├── routes/               # API 라우트
│   ├── auth.js          # 인증 관련 (회원가입, 로그인, 프로필)
│   ├── posts.js         # 게시글 관련
│   ├── comments.js      # 댓글 관련
│   ├── chat.js          # 채팅 관련
│   ├── notifications.js # 알림 관련
│   └── upload.js        # 파일 업로드
├── database/
│   └── init.sql         # 데이터베이스 초기화
├── uploads/             # 업로드된 파일
│   └── profiles/        # 프로필 이미지
├── server.js            # Express 서버 및 WebSocket 설정
├── docker-compose.yml   # Docker Compose 설정
├── Dockerfile          # Node.js 컨테이너 설정
├── package.json        # Node.js 의존성
├── API_TEST_GUIDE.md   # API 테스트 가이드
└── README.md          # 프로젝트 설명
```

## 🚀 설치 및 실행

### 1. 프로젝트 클론 및 의존성 설치

```bash
# 프로젝트 디렉토리로 이동
cd board

# Node.js 의존성 설치
npm install
```

### 2. 환경 변수 설정

```bash
# .env 파일 생성 (env.example 참고)
cp env.example .env

# .env 파일 편집하여 데이터베이스 설정 확인
```

### 3. Docker로 실행

```bash
# 모든 서비스 시작 (MySQL, Node.js, Jenkins)
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 4. 개별 서비스 접속

- **웹 애플리케이션**: http://localhost:3000
- **Jenkins**: http://localhost:8080
- **MySQL**: localhost:3306

## 🔧 개발 환경 설정

### 로컬 개발 서버 실행

```bash
# 데이터베이스만 Docker로 실행
docker-compose up -d db

# Node.js 서버 실행
npm run dev
```

### 데이터베이스 접속

```bash
# MySQL 컨테이너 접속
docker exec -it board_db mysql -u board_user -p board_db

# 또는 외부 클라이언트로 접속
# Host: localhost
# Port: 3306
# User: board_user
# Password: board_password
# Database: board_db
```

## 📝 API 문서

자세한 API 문서는 [API_TEST_GUIDE.md](./API_TEST_GUIDE.md)를 참조하세요.

### 인증 API

- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/verify` - 토큰 검증
- `GET /api/auth/me` - 사용자 정보 조회
- `GET /api/auth/profile` - 프로필 정보 조회
- `PUT /api/auth/profile` - 프로필 업데이트 (이미지 포함 가능)
- `POST /api/auth/change-password` - 비밀번호 변경
- `DELETE /api/auth/delete-account` - 계정 삭제

### 게시글 API

- `GET /api/posts` - 게시글 목록 (페이지네이션, 검색)
  - Query: `page`, `limit`, `search`, `searchType` (title/content/author)
- `GET /api/posts/:id` - 게시글 상세
- `POST /api/posts` - 게시글 작성
- `PUT /api/posts/:id` - 게시글 수정
- `DELETE /api/posts/:id` - 게시글 삭제

### 댓글 API

- `GET /api/comments/:postId` - 댓글 목록
- `POST /api/comments` - 댓글 작성
- `POST /api/comments/:postId` - 댓글 작성 (게시글 ID 포함)
- `PUT /api/comments/:id` - 댓글 수정
- `DELETE /api/comments/:id` - 댓글 삭제

### 채팅 API

- `GET /api/chat/search` - 사용자 검색
- `GET /api/chat/rooms` - 채팅방 목록
- `POST /api/chat/room` - 채팅방 생성 또는 조회
- `GET /api/chat/messages/:roomId` - 메시지 조회
- `POST /api/chat/message` - 메시지 전송

### 알림 API

- `GET /api/notifications/unread-count` - 미읽은 알림 수
- `GET /api/notifications` - 알림 목록
- `GET /api/notifications/settings` - 알림 설정 조회
- `PUT /api/notifications/settings` - 알림 설정 업데이트
- `PUT /api/notifications/:id/read` - 알림 읽음 처리
- `PUT /api/notifications/read-all` - 모든 알림 읽음 처리
- `DELETE /api/notifications/:id` - 알림 삭제
- `DELETE /api/notifications/clear-all` - 모든 알림 삭제

### 파일 업로드 API

- `POST /api/upload` - 파일 업로드 (게시글 첨부)
- `GET /api/upload/:filename` - 파일 다운로드
- `DELETE /api/upload/:id` - 파일 삭제

## 🔌 WebSocket 이벤트

서버는 WebSocket을 통해 실시간 통신을 지원합니다.

### 클라이언트 → 서버

- `auth` - 토큰 인증
- `message` - 채팅 메시지 전송

### 서버 → 클라이언트

- `auth_success` - 인증 성공
- `online_users` - 온라인 사용자 목록
- `user_joined` - 사용자 접속
- `user_left` - 사용자 접속 해제
- `user_status_change` - 사용자 상태 변경 (온라인/오프라인)
- `notification` - 실시간 알림 (채팅 메시지, 댓글)

## 📊 데이터베이스 구조

### 주요 테이블

- `users` - 사용자 정보
- `posts` - 게시글
- `comments` - 댓글
- `attachments` - 파일 첨부
- `chat_rooms` - 채팅방
- `chat_messages` - 채팅 메시지
- `notifications` - 알림
- `notification_settings` - 알림 설정
- `user_status` - 사용자 온라인 상태

자세한 스키마는 [database/init.sql](./database/init.sql)을 참조하세요.

## 🔐 인증 및 보안

- **JWT 토큰** - 24시간 유효 기간
- **비밀번호 해싱** - bcryptjs 사용
- **입력 검증** - express-validator 사용
- **파일 업로드 제한** - 이미지 파일만 허용 (최대 10MB)

## 🎯 주요 업데이트 내역

### v2.0 (최신)
- ✅ 실시간 채팅 기능 추가
- ✅ 브라우저 알림 시스템 구현
- ✅ 프로필 이미지 업로드 기능
- ✅ 사용자 온라인 상태 실시간 표시
- ✅ 게시글 검색 기능 강화 (제목/내용/작성자)
- ✅ 알림 설정 관리 (채팅/댓글 알림 ON/OFF)

### v1.0
- ✅ 기본 게시판 CRUD 기능
- ✅ 댓글 시스템
- ✅ 파일 업로드
- ✅ 회원가입/로그인

## 📚 추가 문서

- [API 테스트 가이드](./API_TEST_GUIDE.md) - 모든 API 엔드포인트와 테스트 방법

## ⚠️ 주의사항

- 이 프로젝트는 학습 목적으로 제작되었습니다.
- 프로덕션 환경에서 사용 시 보안 및 성능 최적화가 필요합니다.
- 데이터베이스 백업을 정기적으로 수행하세요.