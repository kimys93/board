const express = require('express');
const fs = require('fs');
const path = require('path');
const { checkAdmin } = require('../middleware/admin');
const pool = require('../config/database');

const router = express.Router();

// 모든 admin 라우트는 checkAdmin 미들웨어 사용
router.use(checkAdmin);

// 회원 목록 조회
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT id, name, user_id, email, gender, phone, profile_image, is_banned, created_at FROM users';
        let countQuery = 'SELECT COUNT(*) as total FROM users';
        const params = [];

        // 검색 조건 추가
        if (search) {
            query += ' WHERE name LIKE ? OR user_id LIKE ? OR email LIKE ?';
            countQuery += ' WHERE name LIKE ? OR user_id LIKE ? OR email LIKE ?';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [users] = await pool.query(query, params);
        const [countResult] = await pool.query(countQuery, search ? params.slice(0, -2) : []);
        const total = countResult[0].total;

        res.json({
            success: true,
            users: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('회원 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '회원 목록을 불러오는 중 오류가 발생했습니다.'
        });
    }
});

// 회원 제재 (이용 정지/해제)
router.put('/users/:id/ban', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_banned } = req.body;

        // 자기 자신은 제재할 수 없음
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: '자기 자신은 제재할 수 없습니다.'
            });
        }

        // admin 계정은 제재할 수 없음
        const [targetUser] = await pool.query(
            'SELECT user_id FROM users WHERE id = ?',
            [id]
        );

        if (targetUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        if (targetUser[0].user_id === 'admin' || targetUser[0].user_id === 'administrator') {
            return res.status(400).json({
                success: false,
                message: '관리자 계정은 제재할 수 없습니다.'
            });
        }

        await pool.query(
            'UPDATE users SET is_banned = ? WHERE id = ?',
            [is_banned ? 1 : 0, id]
        );

        res.json({
            success: true,
            message: is_banned ? '회원이 이용 정지되었습니다.' : '회원의 이용 정지가 해제되었습니다.'
        });
    } catch (error) {
        console.error('회원 제재 오류:', error);
        res.status(500).json({
            success: false,
            message: '회원 제재 처리 중 오류가 발생했습니다.'
        });
    }
});

// 회원 삭제
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 자기 자신은 삭제할 수 없음
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: '자기 자신은 삭제할 수 없습니다.'
            });
        }

        // admin 계정은 삭제할 수 없음
        const [targetUser] = await pool.query(
            'SELECT user_id FROM users WHERE id = ?',
            [id]
        );

        if (targetUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        if (targetUser[0].user_id === 'admin' || targetUser[0].user_id === 'administrator') {
            return res.status(400).json({
                success: false,
                message: '관리자 계정은 삭제할 수 없습니다.'
            });
        }

        // 프로필 이미지 파일 삭제
        const [userInfo] = await pool.query(
            'SELECT profile_image FROM users WHERE id = ?',
            [id]
        );

        if (userInfo.length > 0 && userInfo[0].profile_image) {
            const profileImagePath = path.join(__dirname, '..', userInfo[0].profile_image);
            try {
                if (fs.existsSync(profileImagePath)) {
                    fs.unlinkSync(profileImagePath);
                    console.log(`프로필 이미지 삭제: ${profileImagePath}`);
                }
            } catch (fileError) {
                console.error('프로필 이미지 삭제 실패:', fileError);
                // 파일 삭제 실패해도 회원 삭제는 진행
            }
        }

        // 회원 삭제 (CASCADE로 관련 데이터 자동 삭제)
        await pool.query('DELETE FROM users WHERE id = ?', [id]);

        res.json({
            success: true,
            message: '회원이 삭제되었습니다.'
        });
    } catch (error) {
        console.error('회원 삭제 오류:', error);
        res.status(500).json({
            success: false,
            message: '회원 삭제 중 오류가 발생했습니다.'
        });
    }
});

module.exports = router;