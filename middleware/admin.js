const { authenticateToken } = require('./auth');

// Admin 권한 체크 미들웨어
const checkAdmin = async (req, res, next) => {
    // 먼저 인증 체크
    await authenticateToken(req, res, () => {
        // Admin 권한 체크
        const isAdmin = req.user.user_id === 'admin' || req.user.user_id === 'administrator';
        
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: '관리자 권한이 필요합니다.'
            });
        }
        
        next();
    });
};

module.exports = { checkAdmin };

