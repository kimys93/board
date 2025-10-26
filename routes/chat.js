const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// 사용자 검색
router.get('/search', auth.authenticateToken, async (req, res) => {
    try {
        const { query } = req.query;
        const currentUserId = req.user.id;

        if (!query || query.trim().length < 2) {
            return res.json({
                success: true,
                users: []
            });
        }

        const [users] = await pool.query(
            `SELECT u.id, u.name, u.user_id, u.profile_image, 
                    COALESCE(us.is_online, false) as is_online,
                    COALESCE(us.last_seen, u.created_at) as last_seen
             FROM users u
             LEFT JOIN user_status us ON u.id = us.user_id
             WHERE u.id != ? AND (u.name LIKE ? OR u.user_id LIKE ?)
             ORDER BY us.is_online DESC, u.name ASC
             LIMIT 20`,
            [currentUserId, `%${query}%`, `%${query}%`]
        );

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('사용자 검색 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 채팅방 목록 조회
router.get('/rooms', auth.authenticateToken, async (req, res) => {
    try {
        const currentUserId = req.user.id;

        const [rooms] = await pool.query(
            `SELECT cr.id as room_id, 
                    CASE WHEN cr.user1_id = ? THEN cr.user2_id ELSE cr.user1_id END as other_user_id,
                    u.name as other_user_name,
                    u.user_id as other_user_user_id,
                    u.profile_image as other_user_profile,
                    COALESCE(us.is_online, false) as other_user_online,
                    COALESCE(us.last_seen, u.created_at) as other_user_last_seen,
                    cm.content as last_message,
                    cm.created_at as last_message_time,
                    cm.user_id as last_message_sender_id,
                    0 as unread_count
             FROM chat_rooms cr
             LEFT JOIN users u ON (CASE WHEN cr.user1_id = ? THEN cr.user2_id ELSE cr.user1_id END) = u.id
             LEFT JOIN user_status us ON u.id = us.user_id
             LEFT JOIN chat_messages cm ON cr.id = cm.id
             WHERE cr.user1_id = ? OR cr.user2_id = ?
             ORDER BY cr.updated_at DESC`,
            [currentUserId, currentUserId, currentUserId, currentUserId]
        );

        res.json({
            success: true,
            rooms
        });
    } catch (error) {
        console.error('채팅방 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 채팅방 생성 또는 조회
router.post('/room', auth.authenticateToken, async (req, res) => {
    try {
        const { otherUserId } = req.body;
        const currentUserId = req.user.id;

        if (currentUserId === otherUserId) {
            return res.status(400).json({
                success: false,
                message: '자기 자신과는 채팅할 수 없습니다.'
            });
        }

        // 상대방 사용자 확인
        const [users] = await pool.query(
            'SELECT id, name, user_id FROM users WHERE id = ?',
            [otherUserId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        // 기존 채팅방 확인
        const [existingRooms] = await pool.query(
            'SELECT id FROM chat_rooms WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
            [currentUserId, otherUserId, otherUserId, currentUserId]
        );

        let roomId;
        if (existingRooms.length > 0) {
            roomId = existingRooms[0].id;
        } else {
            // 새 채팅방 생성
            const [result] = await pool.query(
                'INSERT INTO chat_rooms (user1_id, user2_id) VALUES (?, ?)',
                [currentUserId, otherUserId]
            );
            roomId = result.insertId;
        }

        res.json({
            success: true,
            roomId,
            otherUser: users[0]
        });
    } catch (error) {
        console.error('채팅방 생성 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 채팅 메시지 조회
router.get('/messages/:roomId', auth.authenticateToken, async (req, res) => {
    try {
        const { roomId } = req.params;
        const currentUserId = req.user.id;

        // 채팅방 접근 권한 확인
        const [rooms] = await pool.query(
            'SELECT id FROM chat_rooms WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
            [roomId, currentUserId, currentUserId]
        );

        if (rooms.length === 0) {
            return res.status(403).json({
                success: false,
                message: '채팅방에 접근할 수 없습니다.'
            });
        }

        // 현재 데이터베이스 구조에 맞춰 간단하게 처리
        const [messages] = await pool.query(
            `SELECT cm.id, cm.content as message, cm.user_id as sender_id, cm.created_at,
                    u.name as sender_name, u.user_id as sender_user_id
             FROM chat_messages cm
             JOIN users u ON cm.user_id = u.id
             WHERE cm.user_id = ? OR cm.user_id IN (
                 SELECT CASE WHEN cr.user1_id = ? THEN cr.user2_id ELSE cr.user1_id END
                 FROM chat_rooms cr 
                 WHERE cr.id = ? AND (cr.user1_id = ? OR cr.user2_id = ?)
             )
             ORDER BY cm.created_at ASC`,
            [currentUserId, currentUserId, roomId, currentUserId, currentUserId]
        );

        // 메시지를 읽음으로 표시 (현재 테이블 구조에서는 읽음 상태 컬럼이 없으므로 생략)
        // await pool.query(
        //     'UPDATE chat_messages SET is_read = true WHERE room_id = ? AND sender_id != ?',
        //     [roomId, currentUserId]
        // );

        res.json({
            success: true,
            messages
        });
    } catch (error) {
        console.error('메시지 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 메시지 전송
router.post('/message', auth.authenticateToken, async (req, res) => {
    try {
        const { roomId, message } = req.body;
        const currentUserId = req.user.id;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: '메시지를 입력해주세요.'
            });
        }

        // 채팅방 접근 권한 확인
        const [rooms] = await pool.query(
            'SELECT id FROM chat_rooms WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
            [roomId, currentUserId, currentUserId]
        );

        if (rooms.length === 0) {
            return res.status(403).json({
                success: false,
                message: '채팅방에 접근할 수 없습니다.'
            });
        }

        // 메시지 저장
        const [result] = await pool.query(
            'INSERT INTO chat_messages (user_id, username, content) VALUES (?, ?, ?)',
            [currentUserId, req.user.name || req.user.user_id, message.trim()]
        );

        // 채팅방 업데이트 시간 갱신
        await pool.query(
            'UPDATE chat_rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [roomId]
        );

        res.json({
            success: true,
            messageId: result.insertId
        });
    } catch (error) {
        console.error('메시지 전송 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 사용자 온라인 상태 업데이트
router.post('/status', auth.authenticateToken, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { isOnline } = req.body;

        await pool.query(
            `INSERT INTO user_status (user_id, is_online, last_seen) 
             VALUES (?, ?, CURRENT_TIMESTAMP) 
             ON DUPLICATE KEY UPDATE 
             is_online = VALUES(is_online), 
             last_seen = CURRENT_TIMESTAMP`,
            [currentUserId, isOnline]
        );

        // WebSocket으로 상태 변경 브로드캐스트
        const broadcastUserStatusChange = req.app.get('broadcastUserStatusChange');
        if (broadcastUserStatusChange) {
            broadcastUserStatusChange(currentUserId, req.user.username, isOnline);
        }

        res.json({
            success: true
        });
    } catch (error) {
        console.error('상태 업데이트 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

module.exports = router;
