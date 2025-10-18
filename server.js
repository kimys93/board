const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 라우트 설정
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/upload', require('./routes/upload'));

// 게시글 상세 페이지 라우트
app.get('/posts/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'detail.html'));
});

// 게시글 수정 페이지 라우트
app.get('/posts/:id/edit', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'edit.html'));
});

// 글쓰기 페이지 라우트
app.get('/write', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'write.html'));
});

// 홈 페이지 라우트
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 루트 경로는 홈으로 리다이렉트
app.get('/', (req, res) => {
    res.redirect('/home');
});

// SPA 라우팅 - API가 아닌 라우트만 index.html로 리다이렉트
app.get('*', (req, res) => {
    // API 요청이 아닌 경우에만 index.html로 리다이렉트
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: '서버 내부 오류가 발생했습니다.' 
    });
});

app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
