const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// 미읽은 알림 수 조회
router.get('/unread-count', auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 미읽은 알림 목록 조회
        const [notifications] = await pool.query(
            'SELECT message FROM notifications WHERE user_id = ? AND read_status = 0',
            [userId]
        );

        // 메시지 타입 알림의 경우 messageCount를 합산
        let totalCount = 0;
        notifications.forEach(notification => {
            try {
                const messageData = JSON.parse(notification.message);
                // 메시지 타입 알림이고 messageCount가 있으면 그 값을 사용, 없으면 1
                if (messageData.messageCount) {
                    totalCount += messageData.messageCount;
                } else {
                    totalCount += 1;
                }
            } catch (e) {
                // JSON 파싱 실패 시 일반 알림으로 간주하여 1 추가
                totalCount += 1;
            }
        });

        res.json({
            success: true,
            unreadCount: totalCount
        });
    } catch (error) {
        console.error('미읽은 알림 수 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 알림 목록 조회
router.get('/', auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [notifications] = await pool.query(
            `SELECT id, title, message, type, read_status as is_read, created_at 
             FROM notifications 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [userId]
        );

        // 메시지 타입 알림의 경우 메시지 개수 표시를 위해 title 업데이트
        const processedNotifications = notifications.map(notification => {
            if (notification.type === 'message') {
                try {
                    const messageData = JSON.parse(notification.message);
                    if (messageData.messageCount && messageData.messageCount > 1) {
                        notification.title = `새 메시지 (${messageData.messageCount}개)`;
                    }
                } catch (e) {
                    // JSON 파싱 실패 시 원본 유지
                }
            }
            return notification;
        });

        res.json({
            success: true,
            notifications: processedNotifications
        });
    } catch (error) {
        console.error('알림 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 알림 설정 조회
router.get('/settings', auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [settings] = await pool.query(
            'SELECT * FROM notification_settings WHERE user_id = ?',
            [userId]
        );

        if (settings.length === 0) {
            // 기본 설정 생성
            await pool.query(
                `INSERT INTO notification_settings 
                 (user_id, browser_notification, chat_notification, comment_notification) 
                 VALUES (?, 1, 1, 1)`,
                [userId]
            );
            
            const [newSettings] = await pool.query(
                'SELECT * FROM notification_settings WHERE user_id = ?',
                [userId]
            );
            
            return res.json({
                success: true,
                settings: newSettings[0]
            });
        }

        res.json({
            success: true,
            settings: settings[0]
        });
    } catch (error) {
        console.error('알림 설정 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 알림 설정 업데이트
router.put('/settings', [
    auth.authenticateToken,
    body('chat_notification').isBoolean().withMessage('채팅 알림 설정이 올바르지 않습니다.'),
    body('comment_notification').isBoolean().withMessage('댓글 알림 설정이 올바르지 않습니다.')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '입력 데이터가 유효하지 않습니다.',
                errors: errors.array()
            });
        }

        const userId = req.user.id;
        let {
            chat_notification,
            comment_notification
        } = req.body;

        // Boolean 값을 0/1로 변환
        chat_notification = chat_notification === true || chat_notification === 'true' || chat_notification === 1 ? 1 : 0;
        comment_notification = comment_notification === true || comment_notification === 'true' || comment_notification === 1 ? 1 : 0;

        console.log(`💾 알림 설정 업데이트: userId=${userId}, chat_notification=${chat_notification}, comment_notification=${comment_notification}`);

        // 설정 업데이트 또는 생성 (browser_notification은 항상 1로 유지)
        await pool.query(
            `INSERT INTO notification_settings 
             (user_id, browser_notification, chat_notification, comment_notification) 
             VALUES (?, 1, ?, ?)
             ON DUPLICATE KEY UPDATE
             chat_notification = VALUES(chat_notification),
             comment_notification = VALUES(comment_notification)`,
            [userId, chat_notification, comment_notification]
        );

        // 업데이트된 설정 조회하여 응답에 포함
        const [updatedSettings] = await pool.query(
            'SELECT * FROM notification_settings WHERE user_id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: '알림 설정이 성공적으로 저장되었습니다.',
            settings: updatedSettings[0]
        });
    } catch (error) {
        console.error('알림 설정 업데이트 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 알림 읽음 처리
router.put('/:id/read', auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

        await pool.query(
            'UPDATE notifications SET read_status = 1 WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );

        res.json({
            success: true,
            message: '알림이 읽음 처리되었습니다.'
        });
    } catch (error) {
        console.error('알림 읽음 처리 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 모든 알림 읽음 처리
router.put('/read-all', auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        await pool.query(
            'UPDATE notifications SET read_status = 1 WHERE user_id = ? AND read_status = 0',
            [userId]
        );

        res.json({
            success: true,
            message: '모든 알림이 읽음 처리되었습니다.'
        });
    } catch (error) {
        console.error('모든 알림 읽음 처리 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 특정 채팅방의 메시지 알림 읽음 처리
router.put('/read-chat-room/:roomId', auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { roomId } = req.params;

        // 해당 채팅방의 모든 읽지 않은 메시지 알림을 읽음 처리
        await pool.query(
            `UPDATE notifications 
             SET read_status = 1 
             WHERE user_id = ? 
             AND type = 'message' 
             AND read_status = 0 
             AND JSON_EXTRACT(message, '$.roomId') = ?`,
            [userId, parseInt(roomId)]
        );

        res.json({
            success: true,
            message: '채팅방 알림이 읽음 처리되었습니다.'
        });
    } catch (error) {
        console.error('채팅방 알림 읽음 처리 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 모든 알림 삭제 (특수 경로를 먼저 정의)
router.delete('/clear-all', auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        await pool.query(
            'DELETE FROM notifications WHERE user_id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: '모든 알림이 삭제되었습니다.'
        });
    } catch (error) {
        console.error('모든 알림 삭제 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 알림 삭제 (개별)
router.delete('/:id', auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

        // ID가 숫자인지 확인
        if (isNaN(notificationId)) {
            return res.status(400).json({
                success: false,
                message: '잘못된 알림 ID입니다.'
            });
        }

        await pool.query(
            'DELETE FROM notifications WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );

        res.json({
            success: true,
            message: '알림이 삭제되었습니다.'
        });
    } catch (error) {
        console.error('알림 삭제 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 알림 테스트
router.post('/test', auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, message } = req.body;

        // 테스트 알림 생성
        await pool.query(
            'INSERT INTO notifications (user_id, title, message, type, read_status) VALUES (?, ?, ?, ?, 0)',
            [userId, `테스트 ${type} 알림`, message || '테스트 알림입니다.', type || 'test']
        );

        res.json({
            success: true,
            message: '테스트 알림이 생성되었습니다.'
        });
    } catch (error) {
        console.error('알림 테스트 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

module.exports = router;
