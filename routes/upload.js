const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// 업로드 디렉토리 생성
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // 허용되는 파일 타입
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('지원되지 않는 파일 형식입니다.'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
    },
    fileFilter: fileFilter
});

// 파일 업로드
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '파일을 선택해주세요.'
            });
        }

        const { postId } = req.body;
        const userId = req.user.id;

        if (!postId) {
            // 업로드된 파일 삭제
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: '게시글 ID가 필요합니다.'
            });
        }

        // 게시글 소유자 확인
        const [posts] = await pool.execute(
            'SELECT author_id FROM posts WHERE id = ?',
            [postId]
        );

        if (posts.length === 0) {
            // 업로드된 파일 삭제
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                success: false,
                message: '게시글을 찾을 수 없습니다.'
            });
        }

        if (posts[0].author_id !== userId) {
            // 업로드된 파일 삭제
            fs.unlinkSync(req.file.path);
            return res.status(403).json({
                success: false,
                message: '파일을 업로드할 권한이 없습니다.'
            });
        }

        // 파일 정보를 데이터베이스에 저장
        const [result] = await pool.execute(
            'INSERT INTO attachments (post_id, filename, original_name, file_path, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?)',
            [
                postId,
                req.file.filename,
                req.file.originalname,
                req.file.path,
                req.file.size,
                req.file.mimetype
            ]
        );

        res.json({
            success: true,
            message: '파일이 업로드되었습니다.',
            file: {
                id: result.insertId,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimeType: req.file.mimetype
            }
        });
    } catch (error) {
        console.error('파일 업로드 오류:', error);
        
        // 업로드된 파일이 있다면 삭제
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            message: '파일 업로드 중 오류가 발생했습니다.'
        });
    }
});

// 파일 다운로드
router.get('/:id', async (req, res) => {
    try {
        const fileId = req.params.id;

        const [files] = await pool.execute(
            'SELECT filename, original_name, file_path, mime_type FROM attachments WHERE id = ?',
            [fileId]
        );

        if (files.length === 0) {
            return res.status(404).json({
                success: false,
                message: '파일을 찾을 수 없습니다.'
            });
        }

        const file = files[0];

        if (!fs.existsSync(file.file_path)) {
            return res.status(404).json({
                success: false,
                message: '파일이 서버에 존재하지 않습니다.'
            });
        }

        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
        res.setHeader('Content-Type', file.mime_type);
        res.sendFile(path.resolve(file.file_path));
    } catch (error) {
        console.error('파일 다운로드 오류:', error);
        res.status(500).json({
            success: false,
            message: '파일 다운로드 중 오류가 발생했습니다.'
        });
    }
});

// 파일 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const fileId = req.params.id;
        const userId = req.user.id;

        // 파일 정보 조회
        const [files] = await pool.execute(
            'SELECT a.*, p.author_id FROM attachments a JOIN posts p ON a.post_id = p.id WHERE a.id = ?',
            [fileId]
        );

        if (files.length === 0) {
            return res.status(404).json({
                success: false,
                message: '파일을 찾을 수 없습니다.'
            });
        }

        const file = files[0];

        // 권한 확인
        if (file.author_id !== userId) {
            return res.status(403).json({
                success: false,
                message: '파일을 삭제할 권한이 없습니다.'
            });
        }

        // 파일 시스템에서 파일 삭제
        if (fs.existsSync(file.file_path)) {
            fs.unlinkSync(file.file_path);
        }

        // 데이터베이스에서 파일 정보 삭제
        await pool.execute('DELETE FROM attachments WHERE id = ?', [fileId]);

        res.json({
            success: true,
            message: '파일이 삭제되었습니다.'
        });
    } catch (error) {
        console.error('파일 삭제 오류:', error);
        res.status(500).json({
            success: false,
            message: '파일 삭제 중 오류가 발생했습니다.'
        });
    }
});

module.exports = router;
