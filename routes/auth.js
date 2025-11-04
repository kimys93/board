const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');

const router = express.Router();

// 프로필 이미지 업로드를 위한 multer 설정
const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/profiles');
        // 디렉토리가 없으면 생성
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'profile-' + uniqueSuffix + ext);
    }
});

const profileUpload = multer({
    storage: profileStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: function (req, file, cb) {
        // 이미지 파일만 허용
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('이미지 파일만 업로드할 수 있습니다. (JPG, PNG, GIF, WEBP)'));
        }
    }
});

// 회원가입
router.post('/register', [
    body('id').matches(/^[a-zA-Z0-9]+$/).withMessage('ID는 영어와 숫자만 사용 가능합니다.'),
    body('id').isLength({ min: 3, max: 20 }).withMessage('ID는 3-20자 사이여야 합니다.'),
    body('name').matches(/^[가-힣a-zA-Z\s]+$/).withMessage('성명은 한글 또는 영어만 사용 가능합니다.'),
    body('name').isLength({ min: 2, max: 20 }).withMessage('성명은 2-20자 사이여야 합니다.'),
    body('email').isEmail().withMessage('유효한 이메일 주소를 입력해주세요.'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('유효한 성별을 선택해주세요.'),
    body('phone').matches(/^010-\d{4}-\d{4}$/).withMessage('휴대전화 번호는 010으로 시작하는 11자리 숫자여야 합니다.'),
    body('password').isLength({ min: 6 }).withMessage('비밀번호는 최소 6자 이상이어야 합니다.')
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

        const { id, name, email, gender, phone, password } = req.body;

        // 중복 사용자 확인 (ID, 이메일만 체크 - 전화번호는 중복 허용)
        const [existingUsers] = await pool.query(
            'SELECT id FROM users WHERE user_id = ? OR email = ?',
            [id, email]
        );

        if (existingUsers.length > 0) {
            // 어떤 필드가 중복인지 확인
            const [duplicateCheck] = await pool.query(
                'SELECT user_id, email FROM users WHERE user_id = ? OR email = ?',
                [id, email]
            );
            
            const duplicate = duplicateCheck[0];
            let duplicateFields = [];
            
            if (duplicate.user_id === id) duplicateFields.push('ID');
            if (duplicate.email === email) duplicateFields.push('이메일');
            
            return res.status(400).json({
                success: false,
                message: `이미 사용 중인 ${duplicateFields.join(', ')}입니다.`
            });
        }

        // 비밀번호 해시화
        const hashedPassword = await bcrypt.hash(password, 10);

        // 사용자 생성
        const [result] = await pool.query(
            'INSERT INTO users (name, user_id, email, password, gender, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [name, id, email, hashedPassword, gender, phone]
        );

        res.status(201).json({
            success: true,
            message: '회원가입이 완료되었습니다.',
            userId: result.insertId
        });
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// ID 중복 확인
router.post('/check-id', [
    body('id').matches(/^[a-zA-Z0-9]+$/).withMessage('ID는 영어와 숫자만 사용 가능합니다.'),
    body('id').isLength({ min: 3, max: 20 }).withMessage('ID는 3-20자 사이여야 합니다.')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'ID는 영어와 숫자만 사용 가능하며, 3-20자 사이여야 합니다.'
            });
        }

        const { id } = req.body;

        // ID 중복 확인
        const [users] = await pool.query(
            'SELECT id FROM users WHERE user_id = ?',
            [id]
        );

        if (users.length > 0) {
            return res.status(400).json({
                success: false,
                message: '이미 사용 중인 ID입니다.'
            });
        }

        res.json({
            success: true,
            message: '사용 가능한 ID입니다.'
        });
    } catch (error) {
        console.error('ID 중복 확인 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 이메일 중복 확인
router.post('/check-email', [
    body('email').isEmail().withMessage('유효한 이메일 주소를 입력해주세요.')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '유효한 이메일 주소를 입력해주세요.'
            });
        }

        const { email } = req.body;

        // 이메일 중복 확인
        const [users] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (users.length > 0) {
            return res.status(400).json({
                success: false,
                message: '이미 사용 중인 이메일입니다.'
            });
        }

        res.json({
            success: true,
            message: '사용 가능한 이메일입니다.'
        });
    } catch (error) {
        console.error('이메일 중복 확인 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 토큰 검증
router.get('/verify', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            user: {
                id: req.user.id,
                username: req.user.user_id,
                email: req.user.email
            }
        });
    } catch (error) {
        console.error('토큰 검증 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 로그인
router.post('/login', [
    body('username').notEmpty().withMessage('ID 또는 이메일을 입력해주세요.'),
    body('password').notEmpty().withMessage('비밀번호를 입력해주세요.')
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

        const { username, password } = req.body;

        // 사용자 조회
        const [users] = await pool.query(
            'SELECT id, user_id, name, email, password FROM users WHERE user_id = ? OR email = ?',
            [username, username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: '사용자명 또는 비밀번호가 올바르지 않습니다.'
            });
        }

        const user = users[0];

        // 비밀번호 확인
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: '사용자명 또는 비밀번호가 올바르지 않습니다.'
            });
        }

        // JWT 토큰 생성
        const token = jwt.sign(
            { userId: user.id, username: user.name },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            success: true,
            message: '로그인 성공',
            token,
            user: {
                id: user.id,
                username: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 사용자 정보 조회
router.get('/me', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user
        });
    } catch (error) {
        console.error('사용자 정보 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 프로필 정보 조회
router.get('/profile', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, user_id, email, gender, phone, profile_image FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        res.json({
            success: true,
            user: users[0]
        });
    } catch (error) {
        console.error('프로필 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 프로필 업데이트 (파일 업로드 선택적)
router.put('/profile', require('../middleware/auth').authenticateToken, (req, res, next) => {
    // Content-Type이 multipart/form-data인 경우에만 multer 사용
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        profileUpload.single('profile_image')(req, res, next);
    } else {
        // JSON 요청인 경우 바로 다음 미들웨어로
        next();
    }
}, async (req, res) => {
    try {
        // FormData 또는 JSON에서 텍스트 필드 파싱
        const { name, email, gender, phone } = req.body;
        const userId = req.user.id;

        // 필수 필드 검증
        if (!name || !email || !gender || !phone) {
            return res.status(400).json({
                success: false,
                message: '모든 필드를 입력해주세요.'
            });
        }

        // 이메일 중복 확인 (자신 제외)
        const [existingEmail] = await pool.query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, userId]
        );

        if (existingEmail.length > 0) {
            return res.status(400).json({
                success: false,
                message: '이미 사용 중인 이메일입니다.'
            });
        }

        // 프로필 이미지 처리
        let profileImage = null;
        if (req.file) {
            // multer가 업로드한 파일 경로
            profileImage = `/uploads/profiles/${req.file.filename}`;
            
            // 기존 프로필 이미지가 있다면 삭제
            const [currentUser] = await pool.query(
                'SELECT profile_image FROM users WHERE id = ?',
                [userId]
            );
            
            if (currentUser.length > 0 && currentUser[0].profile_image) {
                const oldImagePath = path.join(__dirname, '..', currentUser[0].profile_image);
                if (fs.existsSync(oldImagePath)) {
                    try {
                        fs.unlinkSync(oldImagePath);
                    } catch (err) {
                        console.error('기존 프로필 이미지 삭제 실패:', err);
                    }
                }
            }
        }

        // 프로필 업데이트
        const updateFields = ['name = ?', 'email = ?', 'gender = ?', 'phone = ?'];
        const updateValues = [name, email, gender, phone];

        if (profileImage) {
            updateFields.push('profile_image = ?');
            updateValues.push(profileImage);
        }

        updateValues.push(userId);

        await pool.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        res.json({
            success: true,
            message: '프로필이 성공적으로 업데이트되었습니다.'
        });
    } catch (error) {
        console.error('프로필 업데이트 오류:', error);
        
        // 업로드된 파일이 있다면 삭제
        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {
                console.error('업로드된 파일 삭제 실패:', err);
            }
        }
        
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 비밀번호 변경
router.post('/change-password', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // 현재 비밀번호 확인
        const [users] = await pool.query(
            'SELECT password FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: '현재 비밀번호가 올바르지 않습니다.'
            });
        }

        // 새 비밀번호 해시화
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // 비밀번호 업데이트
        await pool.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedNewPassword, userId]
        );

        res.json({
            success: true,
            message: '비밀번호가 성공적으로 변경되었습니다.'
        });
    } catch (error) {
        console.error('비밀번호 변경 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 계정 삭제
router.delete('/delete-account', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user.id;

        // 비밀번호 확인
        const [users] = await pool.query(
            'SELECT password FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, users[0].password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: '비밀번호가 올바르지 않습니다.'
            });
        }

        // 계정 삭제 (CASCADE로 관련 데이터도 삭제됨)
        await pool.query('DELETE FROM users WHERE id = ?', [userId]);

        res.json({
            success: true,
            message: '계정이 성공적으로 삭제되었습니다.'
        });
    } catch (error) {
        console.error('계정 삭제 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

module.exports = router;
