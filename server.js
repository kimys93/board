const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const WebSocket = require('ws');
const http = require('http');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 파일 업로드 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 라우트 설정
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/chat', require('./routes/chat'));

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

// 로그인 페이지 라우트
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 회원가입 페이지 라우트
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// 프로필 관리 페이지 라우트
app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// 채팅 페이지 라우트
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// 알림 설정 페이지 라우트
app.get('/notifications', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'notifications.html'));
});

// 게시글 작성 페이지 라우트
app.get('/write', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'write.html'));
});

// 게시글 수정 페이지 라우트
app.get('/posts/:id/edit', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'edit.html'));
});

// 게시글 상세 페이지 라우트
app.get('/posts/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'detail.html'));
});

// 메인 페이지 라우트
app.get('/', (req, res) => {
    console.log('메인 페이지 라우트 호출됨');
    res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

// 게시판 페이지 라우트
app.get('/board', (req, res) => {
    console.log('게시판 페이지 라우트 호출됨');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 에러 처리
app.get('*', (req, res) => {
    res.status(404).send('페이지를 찾을 수 없습니다.');
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: '서버 내부 오류가 발생했습니다.' 
    });
});

// HTTP 서버 생성
const server = http.createServer(app);

// WebSocket 서버 생성
const wss = new WebSocket.Server({ 
    server,
    path: '/chat'
});

// 연결된 클라이언트들을 저장
const clients = new Map();

// WebSocket 연결 처리
wss.on('connection', (ws, req) => {
    console.log('새로운 WebSocket 연결');
    
    let userId = null;
    let username = null;
    
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'auth':
                    // 인증 처리
                    const token = message.token;
                    if (token) {
                        try {
                            const jwt = require('jsonwebtoken');
                            const decoded = jwt.verify(token, process.env.JWT_SECRET);
                            userId = decoded.userId;
                            username = decoded.username;
                            
                            // 클라이언트 정보 저장
                            clients.set(ws, { userId, username });
                            
                            // 다른 클라이언트들에게 사용자 입장 알림
                            broadcast({
                                type: 'user_joined',
                                user: username
                            }, ws);
                            
                            // 온라인 사용자 목록 업데이트
                            broadcastOnlineUsers();
                            
                            ws.send(JSON.stringify({
                                type: 'auth_success',
                                message: '인증 성공'
                            }));
                        } catch (error) {
                            ws.send(JSON.stringify({
                                type: 'auth_error',
                                message: '인증 실패'
                            }));
                        }
                    }
                    break;
                    
                case 'message':
                    if (userId && username) {
                        // 메시지를 데이터베이스에 저장
                        await saveMessage({
                            userId,
                            username,
                            content: message.content,
                            messageType: 'text'
                        });
                        
                        // 모든 클라이언트에게 메시지 브로드캐스트
                        broadcast({
                            type: 'message',
                            message: {
                                user: username,
                                content: message.content,
                                timestamp: message.timestamp
                            }
                        });
                    }
                    break;
                    
                case 'typing':
                    if (username) {
                        broadcast({
                            type: 'typing',
                            user: username
                        }, ws);
                    }
                    break;
                    
                case 'stop_typing':
                    if (username) {
                        broadcast({
                            type: 'stop_typing',
                            user: username
                        }, ws);
                    }
                    break;
            }
        } catch (error) {
            console.error('WebSocket 메시지 처리 오류:', error);
        }
    });
    
    ws.on('close', async () => {
        if (username) {
            console.log(`🔌 사용자 연결 종료: ${username} (ID: ${userId || 'unknown'})`);
            
            // 사용자 퇴장 알림
            broadcast({
                type: 'user_left',
                user: username
            }, ws);
            
            // 사용자 상태를 오프라인으로 변경
            let targetUserId = userId;
            
            // userId가 없으면 사용자 이름으로 찾기
            if (!targetUserId) {
                try {
                    const pool = require('./config/database');
                    const [users] = await pool.query(
                        'SELECT id FROM users WHERE username = ?',
                        [username]
                    );
                    if (users.length > 0) {
                        targetUserId = users[0].id;
                        console.log(`🔍 ${username}의 userId 찾음: ${targetUserId}`);
                    }
                } catch (error) {
                    console.error('❌ userId 찾기 실패:', error);
                }
            }
            
            if (targetUserId) {
                try {
                    const pool = require('./config/database');
                    await pool.query(
                        `INSERT INTO user_status (user_id, is_online, last_seen) 
                         VALUES (?, ?, CURRENT_TIMESTAMP) 
                         ON DUPLICATE KEY UPDATE 
                         is_online = VALUES(is_online), 
                         last_seen = CURRENT_TIMESTAMP`,
                        [targetUserId, false]
                    );
                    console.log(`💾 ${username} 오프라인 상태로 DB 업데이트 완료`);
                    
                    // 상태 변경 브로드캐스트 (연결이 끊어진 WebSocket 제외)
                    console.log(`🔄 ${username} 상태 변경 브로드캐스트 시작...`);
                    broadcastUserStatusChange(targetUserId, false);
                    console.log(`📤 ${username} 오프라인 상태 브로드캐스트 완료`);
                } catch (error) {
                    console.error('❌ 상태 업데이트 실패:', error);
                }
            } else {
                console.log(`⚠️ ${username}의 userId를 찾을 수 없어서 상태 변경을 건너뜀`);
            }
            
            // 온라인 사용자 목록 업데이트
            broadcastOnlineUsers();
        }
        
        // 클라이언트 목록에서 제거
        clients.delete(ws);
        console.log('WebSocket 연결 종료');
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket 오류:', error);
    });
});

// 모든 클라이언트에게 메시지 브로드캐스트
function broadcast(data, excludeWs = null) {
    const message = JSON.stringify(data);
    let sentCount = 0;
    
    clients.forEach((clientInfo, ws) => {
        if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
            ws.send(message);
            sentCount++;
        }
    });
    
    console.log(`📤 브로드캐스트 완료: ${sentCount}개 클라이언트에게 전송`);
}

// 온라인 사용자 목록 브로드캐스트
function broadcastOnlineUsers() {
    const onlineUsers = Array.from(clients.values()).map(client => client.username);
    broadcast({
        type: 'online_users',
        users: onlineUsers
    });
}

// 사용자 상태 변경 브로드캐스트
function broadcastUserStatusChange(userId, isOnline) {
    console.log(`🔄 사용자 상태 변경 브로드캐스트: userId ${userId} -> ${isOnline ? '온라인' : '오프라인'}`);
    console.log(`📡 연결된 클라이언트 수: ${clients.size}`);
    
    // 직접 브로드캐스트 실행
    const message = JSON.stringify({
        type: 'user_status_change',
        userId: userId,
        isOnline: isOnline
    });
    
    let sentCount = 0;
    clients.forEach((clientInfo, ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
            sentCount++;
        }
    });
    
    console.log(`📤 상태 변경 브로드캐스트 완료: ${sentCount}개 클라이언트에게 전송`);
}

// 메시지를 데이터베이스에 저장
async function saveMessage(messageData) {
    try {
        const pool = require('./config/database');
        await pool.query(
            'INSERT INTO chat_messages (user_id, username, content, message_type) VALUES (?, ?, ?, ?)',
            [messageData.userId, messageData.username, messageData.content, messageData.messageType]
        );
    } catch (error) {
        console.error('메시지 저장 오류:', error);
    }
}

// 앱에 브로드캐스트 함수 등록
app.set('broadcastUserStatusChange', broadcastUserStatusChange);

server.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
