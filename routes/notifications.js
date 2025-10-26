const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// 미읽은 알림 수 조회
router.get('/unread-count', auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [result] = await pool.query(
            'SELECT COUNT(*) as unreadCount FROM notifications WHERE user_id = ? AND read_status = 0',
            [userId]
        );

        res.json({
            success: true,
            unreadCount: result[0].unreadCount
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

        res.json({
            success: true,
            notifications
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
                 (user_id, email_comment, email_message, email_system, browser_notification, sound_notification, sms_notification) 
                 VALUES (?, 1, 1, 1, 1, 1, 0)`,
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
    body('email_comment').isBoolean().withMessage('이메일 댓글 알림 설정이 올바르지 않습니다.'),
    body('email_message').isBoolean().withMessage('이메일 메시지 알림 설정이 올바르지 않습니다.'),
    body('email_system').isBoolean().withMessage('이메일 시스템 알림 설정이 올바르지 않습니다.'),
    body('browser_notification').isBoolean().withMessage('브라우저 알림 설정이 올바르지 않습니다.'),
    body('sound_notification').isBoolean().withMessage('소리 알림 설정이 올바르지 않습니다.'),
    body('sms_notification').isBoolean().withMessage('SMS 알림 설정이 올바르지 않습니다.')
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
        const {
            email_comment,
            email_message,
            email_system,
            browser_notification,
            sound_notification,
            sms_notification
        } = req.body;

        // 설정 업데이트 또는 생성
        await pool.query(
            `INSERT INTO notification_settings 
             (user_id, email_comment, email_message, email_system, browser_notification, sound_notification, sms_notification) 
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             email_comment = VALUES(email_comment),
             email_message = VALUES(email_message),
             email_system = VALUES(email_system),
             browser_notification = VALUES(browser_notification),
             sound_notification = VALUES(sound_notification),
             sms_notification = VALUES(sms_notification)`,
            [userId, email_comment, email_message, email_system, browser_notification, sound_notification, sms_notification]
        );

        res.json({
            success: true,
            message: '알림 설정이 성공적으로 저장되었습니다.'
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

// 알림 삭제
router.delete('/:id', auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

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

// 모든 알림 삭제
router.delete('/', auth.authenticateToken, async (req, res) => {
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
