const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: '액세스 토큰이 필요합니다.' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 사용자 정보 확인
        const [users] = await pool.execute(
            'SELECT id, user_id, name, email FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: '유효하지 않은 토큰입니다.' 
            });
        }

        req.user = users[0];
        next();
    } catch (error) {
        return res.status(403).json({ 
            success: false, 
            message: '토큰이 유효하지 않습니다.' 
        });
    }
};

module.exports = { authenticateToken };
