# 게시판 애플리케이션

Node.js, Express, MySQL을 사용한 테스트 자동화 코드 연습을 위한 게시판 애플리케이션입니다.
해당 코드는 커서 AI로 구성하였으며, 코드 그대로 클론 시 일부 에러가 발생할 수 있으니 주의바랍니다.

## 🚀 주요 기능

- **회원가입 및 로그인** - JWT 기반 인증
- **게시글 관리** - CRUD 기능 (작성, 조회, 수정, 삭제)
- **댓글 시스템** - 게시글별 댓글 작성/수정/삭제
- **파일 업로드** - 게시글에 파일 첨부 가능
- **페이지네이션** - 게시글 목록 페이지네이션
- **검색 기능** - 제목/내용 기반 검색
- **반응형 디자인** - Bootstrap 5 사용

## 🛠 기술 스택

### Backend
- **Node.js** - JavaScript 런타임
- **Express** - 웹 프레임워크
- **MySQL** - 데이터베이스

### Frontend
- **HTML5/CSS3/JavaScript** - 기본 웹 기술
- **Bootstrap 5** - UI 프레임워크
- **Font Awesome** - 아이콘

### DevOps
- **Docker** - 컨테이너화
- **Jenkins** - CI/CD

## 📁 프로젝트 구조

```
board/
├── public/                 # 프론트엔드 파일
│   ├── index.html         # 메인 HTML
│   ├── css/
│   │   └── style.css      # 커스텀 스타일
│   └── js/
│       └── app.js         # 프론트엔드 JavaScript
├── config/
│   └── database.js        # 데이터베이스 설정
├── middleware/
│   └── auth.js           # 인증 미들웨어
├── routes/               # API 라우트
│   ├── auth.js          # 인증 관련
│   ├── posts.js         # 게시글 관련
│   ├── comments.js      # 댓글 관련
│   └── upload.js        # 파일 업로드
├── database/
│   └── init.sql         # 데이터베이스 초기화
├── uploads/             # 업로드된 파일
├── docker-compose.yml   # Docker Compose 설정
├── Dockerfile          # Node.js 컨테이너 설정
├── package.json        # Node.js 의존성
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

### 인증 API

- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 사용자 정보 조회

### 게시글 API

- `GET /api/posts` - 게시글 목록 (페이지네이션)
- `GET /api/posts/:id` - 게시글 상세
- `POST /api/posts` - 게시글 작성
- `PUT /api/posts/:id` - 게시글 수정
- `DELETE /api/posts/:id` - 게시글 삭제

### 댓글 API

- `GET /api/comments/:postId` - 댓글 목록
- `POST /api/comments/:postId` - 댓글 작성
- `PUT /api/comments/:id` - 댓글 수정
- `DELETE /api/comments/:id` - 댓글 삭제

### 파일 업로드 API

- `POST /api/upload` - 파일 업로드
- `GET /api/upload/:id` - 파일 다운로드
- `DELETE /api/upload/:id` - 파일 삭제



