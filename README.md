# 게시판 애플리케이션

Node.js, Express, MySQL을 사용한 테스트 자동화 코드 연습을 위한 게시판 애플리케이션입니다.
해당 코드는 커서 AI로 구성하였으며, 코드 그대로 클론 시 일부 에러가 발생할 수 있으니 주의바랍니다.

## 🚀 주요 기능

### 인증 및 사용자 관리
- **사이트 접속 인증** - HTTP Basic Authentication (모든 IP 허용)
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
- **실시간 메시지 표시** - 채팅 중 메시지 실시간 표시 (페이지 새로고침 불필요)
- **사용자 검색** - 채팅 상대방 검색
- **채팅방 관리** - 채팅방 목록 조회 및 메시지 히스토리
- **스마트 알림** - 채팅 중일 때는 알림 생성하지 않음 (서버에서 사용자 뷰 상태 추적)

### 알림 시스템
- **브라우저 알림** - 채팅 메시지 및 댓글 알림
- **알림 설정** - 채팅/댓글 알림 ON/OFF 설정
- **알림 목록** - 알림 조회, 읽음 처리, 삭제
- **실시간 알림** - WebSocket을 통한 실시간 알림 수신
- **스마트 알림 관리** - 채팅 중일 때는 알림 생성하지 않음, 채팅방 열면 자동 읽음 처리
- **통합 메시지 알림** - 같은 사용자로부터 여러 메시지가 오면 하나의 알림으로 통합

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
- **cookie-parser** - 쿠키 기반 세션 관리

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
│   ├── auth.js           # JWT 인증 미들웨어
│   └── siteAuth.js       # 사이트 접속 인증 (HTTP Basic Auth)
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

### 3. 사이트 접속 인증 설정

```bash
# siteAuth.credentials 파일 생성
cp siteAuth.credentials.example siteAuth.credentials

# siteAuth.credentials 파일 편집하여 실제 ID/PW 입력
# SITE_ID=your_id
# SITE_PW=your_password
```

> ⚠️ **중요**: `siteAuth.credentials` 파일은 `.gitignore`에 포함되어 GitHub에 푸시되지 않습니다.  
> 이 파일에는 사이트 접속 인증에 사용되는 ID/PW가 저장되므로 절대 공개 저장소에 커밋하지 마세요.

### 4. Docker로 실행

```bash
# 모든 서비스 시작 (MySQL, Node.js, Jenkins)
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 5. 개별 서비스 접속

- **웹 애플리케이션**: http://localhost:3000
  - 접속 시 HTTP Basic Authentication 다이얼로그 표시
  - `siteAuth.credentials` 파일에 설정한 ID/PW 입력
- **Jenkins**: http://localhost:8080
- **MySQL**: localhost:3306

### 6. 네트워크 환경 및 접속 제한

> ⚠️ **중요**: 현재 서버는 **로컬 네트워크(WiFi)에서만 접속 가능**합니다.

#### 접속 가능한 환경
- ✅ **같은 WiFi 네트워크에 연결된 기기**: 접속 가능
- ✅ **같은 로컬 네트워크(192.168.x.x)의 기기**: 접속 가능

#### 접속 불가능한 환경
- ❌ **5G/LTE 모바일 데이터 네트워크**: 접속 불가
- ❌ **인터넷을 통한 외부 접속**: 접속 불가

#### 이유
서버는 코드상으로 모든 네트워크에서 접속 가능하도록 설정되어 있지만, 실제 네트워크 인프라(라우터 방화벽, 포트 포워딩 없음)로 인해 외부 접속이 차단됩니다.

#### 보안상 이점
이 설정은 보안상 유리합니다:
- 내부 네트워크만 접속 가능하여 외부 공격 차단
- 라우터 방화벽이 추가 보안 계층 제공
- 외부 인터넷에서 직접 접속 불가

#### 외부 접속이 필요한 경우
외부(5G/LTE, 인터넷)에서 접속하려면 다음 설정이 필요합니다:
1. 라우터에서 포트 포워딩 설정 (3000번 포트)
2. 방화벽에서 3000번 포트 허용
3. 공인 IP 주소 확인

> ⚠️ **보안 경고**: 외부 접속을 허용하면 보안 위험이 증가합니다.  
> 반드시 강력한 비밀번호를 사용하고, 가능하면 HTTPS를 적용하세요.

## 🔧 개발 환경 설정

### 로컬 개발 서버 실행

```bash
# 데이터베이스만 Docker로 실행
docker-compose up -d db

# Node.js 서버 실행
npm run dev
```

## 🚀 CI/CD 설정 (Jenkins)

### Jenkins 서버 구성

이 프로젝트는 Jenkins를 사용한 CI/CD 파이프라인을 지원합니다.

#### 1. Jenkins Credentials 설정

Jenkins에서 빌드 파이프라인을 실행하기 전에 다음 Credentials를 설정해야 합니다:

1. **Jenkins 관리** → **Credentials** → **System** → **Global credentials** 이동

2. **Add Credentials** 클릭하여 다음 두 개의 Credentials를 생성:

   **첫 번째 Credential (SITE_ID용):**
   - **Kind**: Secret text
   - **Scope**: Global
   - **Secret**: `ID`
   - **ID**: `site-auth-id` (반드시 이 ID를 사용해야 함)
   - **Description**: Site authentication ID

   **두 번째 Credential (SITE_PW용):**
   - **Kind**: Secret text
   - **Scope**: Global
   - **Secret**: `password`
   - **ID**: `site-auth-pw` (반드시 이 ID를 사용해야 함)
   - **Description**: Site authentication Password

3. **OK** 클릭하여 저장

> ⚠️ **중요**: 
> - Credentials ID는 반드시 `site-auth-id`와 `site-auth-pw`로 설정해야 합니다.
> - Jenkinsfile에서 이 ID를 사용하여 credentials를 참조합니다.
> - Secret 값은 실제 사용할 SITE_ID와 SITE_PW로 변경하세요.

#### 2. Jenkins Pipeline 프로젝트 생성

1. **새 Item** 클릭
2. **Pipeline** 선택
3. **Pipeline definition**에서 **Pipeline script from SCM** 선택
4. **SCM**에서 **Git** 선택
5. **Repository URL**에 Git 저장소 URL 입력
6. **Credentials**에 Git 접근용 credentials 설정 (필요한 경우)
7. **Script Path**에 `Jenkinsfile` 입력
8. **Save** 클릭

#### 3. 빌드 파라미터

Pipeline에는 다음 파라미터가 포함되어 있습니다:

- **reset_db**: DB 데이터를 초기화하고 서버를 재시작합니다 (기본값: false)
  - `true`로 설정하면 모든 데이터가 삭제됩니다!

#### 4. 빌드 실행

1. 프로젝트 페이지에서 **Build with Parameters** 클릭
2. **reset_db** 옵션 선택 (필요한 경우)
3. **Build** 클릭

#### 5. 빌드 단계

Pipeline은 다음 단계로 구성되어 있습니다:

1. **Setup**: `siteAuth.credentials` 파일 생성
2. **Build**: Docker 이미지 빌드
3. **Deploy**: 컨테이너 배포 및 서버 상태 확인

#### 6. 배포 확인

빌드가 성공하면 다음 주소에서 서버에 접속할 수 있습니다:

- **웹 애플리케이션**: http://localhost:3000
- **Jenkins**: http://localhost:8080

> 💡 **팁**: 
> - 빌드 실패 시 Jenkins 콘솔 출력에서 오류 메시지를 확인하세요.
> - Docker 컨테이너가 이미 실행 중인 경우 충돌이 발생할 수 있습니다. 이 경우 기존 컨테이너를 정리한 후 다시 빌드하세요.

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
- `PUT /api/notifications/read-chat-room/:roomId` - 특정 채팅방의 메시지 알림 읽음 처리
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
- `viewing_room` - 현재 보고 있는 채팅방 ID 전송 (서버에서 알림 생성 여부 판단)

### 서버 → 클라이언트

- `auth_success` - 인증 성공
- `online_users` - 온라인 사용자 목록
- `user_joined` - 사용자 접속
- `user_left` - 사용자 접속 해제
- `user_status_change` - 사용자 상태 변경 (온라인/오프라인)
- `notification` - 실시간 알림 (채팅 메시지, 댓글)
- `chat_message` - 실시간 채팅 메시지 (채팅방에 열려있을 때 실시간 표시)

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

- **HTTP Basic Authentication** - 사이트 접속 시 ID/PW 인증 (모든 IP 허용)
- **JWT 토큰** - 24시간 유효 기간
- **비밀번호 해싱** - bcryptjs 사용
- **입력 검증** - express-validator 사용
- **파일 업로드 제한** - 이미지 파일만 허용 (최대 10MB)

### 사이트 접속 인증

사이트 접속 시 브라우저 기본 인증 다이얼로그가 표시됩니다.

#### 인증 정보 설정

1. `siteAuth.credentials.example` 파일을 `siteAuth.credentials`로 복사:
   ```bash
   cp siteAuth.credentials.example siteAuth.credentials
   ```

2. `siteAuth.credentials` 파일을 편집하여 실제 ID/PW 입력:
   ```
   SITE_ID=your_id
   SITE_PW=your_password
   ```

3. Docker 컨테이너 재시작:
   ```bash
   docker-compose restart web
   ```

#### 인증 방식
- **HTTP Basic Authentication**: 브라우저 기본 인증 다이얼로그 사용
- **쿠키 기반 세션**: 인증 성공 후 24시간 동안 쿠키로 세션 유지 (cookie-parser 사용)
- **네트워크 무관**: WiFi와 모바일 데이터 모두에서 동일하게 작동 (단, 로컬 네트워크 접속 제한은 유지)

> ⚠️ **보안 주의사항**:
> - `siteAuth.credentials` 파일은 절대 GitHub에 커밋하지 마세요
> - 프로덕션 환경에서는 반드시 강력한 비밀번호를 사용하세요
> - 정기적으로 비밀번호를 변경하세요

## 🎯 주요 업데이트 내역

### v2.2 (최신)
- ✅ 실시간 채팅 메시지 표시 기능 추가
- ✅ 채팅 중일 때 알림 생성하지 않기 (서버에서 사용자 뷰 상태 추적)
- ✅ 로그인/로그아웃 시 실시간 온라인 상태 반영
- ✅ 채팅방 열었을 때 자동 읽음 처리
- ✅ 통합 메시지 알림 (같은 사용자로부터 여러 메시지 통합)
- ✅ WebSocket을 통한 채팅 메시지 브로드캐스트

### v2.1
- ✅ HTTP Basic Authentication 추가 (모든 IP 허용)
- ✅ 쿠키 기반 세션 관리 추가 (cookie-parser) - 모바일 네트워크 호환성 개선
- ✅ IP 필터링 제거 (외부 접속 완전 허용)
- ✅ 코드 정리 및 최적화

### v2.0
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

### 일반 주의사항
- 이 프로젝트는 학습 목적으로 제작되었습니다.
- 프로덕션 환경에서 사용 시 보안 및 성능 최적화가 필요합니다.
- 데이터베이스 백업을 정기적으로 수행하세요.

### 네트워크 환경
- **로컬 네트워크 제한**: 현재 서버는 같은 WiFi 네트워크에 연결된 기기에서만 접속 가능합니다.
- **5G/LTE 접속 불가**: 모바일 데이터 네트워크에서는 접속할 수 없습니다.
- **보안상 이점**: 이 설정은 외부 공격을 차단하여 보안을 강화합니다.

### 인증 설정
- **siteAuth.credentials 필수**: 서버 실행 전 반드시 `siteAuth.credentials` 파일을 설정해야 합니다.
- **파일 보안**: `siteAuth.credentials` 파일은 절대 공개 저장소에 커밋하지 마세요.
- **비밀번호 강도**: 프로덕션 환경에서는 반드시 강력한 비밀번호를 사용하세요.