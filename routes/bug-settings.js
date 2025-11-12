const express = require('express');
const { checkAdmin } = require('../middleware/admin');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// 특정 버그 설정 조회 (공개 API - 버그 동작 확인용, 모든 유저 접근 가능)
// 이 라우트는 /bugs보다 먼저 정의되어야 함 (라우트 매칭 순서)
router.get('/bug/:bugKey', async (req, res) => {
    try {
        const { bugKey } = req.params;
        
        const [settings] = await pool.query(
            'SELECT setting_value FROM system_settings WHERE setting_key = ?',
            [bugKey]
        );
        
        if (settings.length === 0) {
            return res.json({
                success: true,
                is_enabled: false
            });
        }
        
        const isEnabled = settings[0].setting_value === '1' || settings[0].setting_value === 1;
        
        res.json({
            success: true,
            is_enabled: isEnabled
        });
    } catch (error) {
        console.error('버그 설정 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '버그 설정을 불러오는데 실패했습니다.'
        });
    }
});

// 버그 설정 목록 조회 (관리자만 가능)
router.get('/bugs', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const [settings] = await pool.query(
            'SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE "bts_%" ORDER BY setting_key'
        );

        const bugs = settings.map(setting => ({
            bug_name: setting.setting_key,
            is_enabled: setting.setting_value === '1' || setting.setting_value === 1
        }));

        res.json({
            success: true,
            bugs: bugs
        });
    } catch (error) {
        console.error('버그 설정 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '버그 설정을 불러오는데 실패했습니다.'
        });
    }
});

// 특정 버그 설정 조회 (내부 사용용)
async function getBugSetting(bugKey) {
    try {
        const [settings] = await pool.query(
            'SELECT setting_value FROM system_settings WHERE setting_key = ?',
            [bugKey]
        );
        if (settings.length === 0) return false;
        return settings[0].setting_value === '1' || settings[0].setting_value === 1;
    } catch (error) {
        console.error(`버그 설정 조회 오류 (${bugKey}):`, error);
        return false;
    }
}

// 버그 설정 토글 (관리자만 가능)
router.put('/bugs/:bugKey', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const { bugKey } = req.params;
        const { is_enabled } = req.body;

        // DB 업데이트
        await pool.query(
            'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            [bugKey, is_enabled ? 1 : 0, is_enabled ? 1 : 0]
        );

        res.json({
            success: true,
            message: `버그 "${bugKey}"가 ${is_enabled ? '활성화' : '비활성화'}되었습니다.`
        });
    } catch (error) {
        console.error('버그 설정 변경 오류:', error);
        res.status(500).json({
            success: false,
            message: '버그 설정 변경에 실패했습니다.'
        });
    }
});

// 모듈 내보내기
module.exports = router;
module.exports.getBugSetting = getBugSetting;

