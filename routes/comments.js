const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// 댓글 작성
router.post('/', authenticateToken, [
    body('post_id').isInt().withMessage('게시글 ID는 숫자여야 합니다'),
    body('content').trim().isLength({ min: 1 }).withMessage('댓글 내용을 입력해주세요')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '입력 데이터가 올바르지 않습니다.',
                errors: errors.array()
            });
        }

        const { post_id, content } = req.body;
        const author_id = req.user.id;

        // 댓글 작성
        const [result] = await pool.execute(
            'INSERT INTO comments (post_id, author_id, content) VALUES (?, ?, ?)',
            [post_id, author_id, content]
        );

        res.status(201).json({
            success: true,
            message: '댓글이 작성되었습니다.',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('댓글 작성 오류:', error);
        res.status(500).json({
            success: false,
            message: '댓글 작성 중 오류가 발생했습니다.'
        });
    }
});

// 댓글 수정
router.put('/:commentId', authenticateToken, [
    body('content').trim().isLength({ min: 1 }).withMessage('댓글 내용을 입력해주세요')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '입력 데이터가 올바르지 않습니다.',
                errors: errors.array()
            });
        }

        const { commentId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        // 댓글 작성자 확인
        const [comment] = await pool.execute(
            'SELECT author_id FROM comments WHERE id = ?',
            [commentId]
        );

        if (comment.length === 0) {
            return res.status(404).json({
                success: false,
                message: '댓글을 찾을 수 없습니다.'
            });
        }

        if (comment[0].author_id !== userId) {
            return res.status(403).json({
                success: false,
                message: '댓글을 수정할 권한이 없습니다.'
            });
        }

        // 댓글 수정
        await pool.execute(
            'UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [content, commentId]
        );

        res.json({
            success: true,
            message: '댓글이 수정되었습니다.'
        });
    } catch (error) {
        console.error('댓글 수정 오류:', error);
        res.status(500).json({
            success: false,
            message: '댓글 수정 중 오류가 발생했습니다.'
        });
    }
});

// 댓글 목록 조회
router.get('/:postId', async (req, res) => {
    try {
        const postId = req.params.postId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // 댓글 목록 조회
        const [comments] = await pool.query(`
            SELECT 
                c.id, c.content, c.created_at, c.updated_at,
                u.username as author_name, u.id as author_id
            FROM comments c 
            JOIN users u ON c.author_id = u.id 
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
            LIMIT ? OFFSET ?
        `, [postId, limit, offset]);

        // 전체 댓글 수 조회
        const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM comments WHERE post_id = ?',
            [postId]
        );
        const totalComments = countResult[0].total;

        const totalPages = Math.ceil(totalComments / limit);

        res.json({
            success: true,
            data: {
                comments,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalComments,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        console.error('댓글 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 댓글 작성
router.post('/:postId', authenticateToken, [
    body('content').isLength({ min: 1, max: 1000 }).withMessage('댓글 내용은 1-1000자 사이여야 합니다.')
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

        const postId = req.params.postId;
        const { content } = req.body;
        const authorId = req.user.id;

        // 게시글 존재 확인
        const [posts] = await pool.query(
            'SELECT id FROM posts WHERE id = ?',
            [postId]
        );

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message: '게시글을 찾을 수 없습니다.'
            });
        }

        const [result] = await pool.query(
            'INSERT INTO comments (post_id, author_id, content) VALUES (?, ?, ?)',
            [postId, authorId, content]
        );

        res.status(201).json({
            success: true,
            message: '댓글이 작성되었습니다.',
            commentId: result.insertId
        });
    } catch (error) {
        console.error('댓글 작성 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 댓글 수정
router.put('/:id', authenticateToken, [
    body('content').isLength({ min: 1, max: 1000 }).withMessage('댓글 내용은 1-1000자 사이여야 합니다.')
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

        const commentId = req.params.id;
        const { content } = req.body;
        const userId = req.user.id;

        // 댓글 소유자 확인
        const [comments] = await pool.query(
            'SELECT author_id FROM comments WHERE id = ?',
            [commentId]
        );

        if (comments.length === 0) {
            return res.status(404).json({
                success: false,
                message: '댓글을 찾을 수 없습니다.'
            });
        }

        if (comments[0].author_id !== userId) {
            return res.status(403).json({
                success: false,
                message: '댓글을 수정할 권한이 없습니다.'
            });
        }

        await pool.query(
            'UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [content, commentId]
        );

        res.json({
            success: true,
            message: '댓글이 수정되었습니다.'
        });
    } catch (error) {
        console.error('댓글 수정 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 댓글 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.user.id;

        // 댓글 소유자 확인
        const [comments] = await pool.query(
            'SELECT author_id FROM comments WHERE id = ?',
            [commentId]
        );

        if (comments.length === 0) {
            return res.status(404).json({
                success: false,
                message: '댓글을 찾을 수 없습니다.'
            });
        }

        if (comments[0].author_id !== userId) {
            return res.status(403).json({
                success: false,
                message: '댓글을 삭제할 권한이 없습니다.'
            });
        }

        await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);

        res.json({
            success: true,
            message: '댓글이 삭제되었습니다.'
        });
    } catch (error) {
        console.error('댓글 삭제 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

module.exports = router;
