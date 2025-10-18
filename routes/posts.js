const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// 게시글 목록 조회 (페이지네이션)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let whereClause = '';
        let queryParams = [];

        if (search) {
            whereClause = 'WHERE p.title LIKE ? OR p.content LIKE ?';
            queryParams = [`%${search}%`, `%${search}%`];
        }

        // 전체 게시글 수 조회
        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as total FROM posts p ${whereClause}`,
            queryParams
        );
        console.log('Count result:', countResult);
        const totalPosts = countResult[0].total;

        // 게시글 목록 조회
        const [posts] = await pool.query(`
            SELECT 
                p.id, p.title, p.content, p.view_count, p.created_at, p.updated_at,
                u.username as author_name
            FROM posts p 
            JOIN users u ON p.author_id = u.id 
            ${whereClause}
            ORDER BY p.created_at DESC 
            LIMIT ? OFFSET ?
        `, [...queryParams, limit, offset]);

        // 각 게시글의 댓글 수 조회
        for (let post of posts) {
            const [commentCountResult] = await pool.query(
                'SELECT COUNT(*) as count FROM comments WHERE post_id = ?',
                [post.id]
            );
            post.comment_count = commentCountResult[0].count;
        }

        const totalPages = Math.ceil(totalPosts / limit);

        res.json({
            success: true,
            data: {
                posts,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalPosts,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        console.error('게시글 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 게시글 상세 조회
router.get('/:id', async (req, res) => {
    try {
        const postId = req.params.id;

        // 게시글 조회
        const [posts] = await pool.query(`
            SELECT 
                p.id, p.title, p.content, p.view_count, p.created_at, p.updated_at,
                u.username as author_name, u.id as author_id
            FROM posts p 
            JOIN users u ON p.author_id = u.id 
            WHERE p.id = ?
        `, [postId]);

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message: '게시글을 찾을 수 없습니다.'
            });
        }

        // 조회수 증가
        await pool.execute(
            'UPDATE posts SET view_count = view_count + 1 WHERE id = ?',
            [postId]
        );

        // 첨부파일 조회
        const [attachments] = await pool.query(
            'SELECT id, filename, original_name, file_size, mime_type FROM attachments WHERE post_id = ?',
            [postId]
        );

        const post = posts[0];
        post.attachments = attachments;

        res.json({
            success: true,
            data: post
        });
    } catch (error) {
        console.error('게시글 상세 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 게시글 작성
router.post('/', authenticateToken, [
    body('title').isLength({ min: 1, max: 200 }).withMessage('제목은 1-200자 사이여야 합니다.'),
    body('content').isLength({ min: 1 }).withMessage('내용을 입력해주세요.')
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

        const { title, content } = req.body;
        const authorId = req.user.id;

        const [result] = await pool.execute(
            'INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?)',
            [title, content, authorId]
        );

        res.status(201).json({
            success: true,
            message: '게시글이 작성되었습니다.',
            postId: result.insertId
        });
    } catch (error) {
        console.error('게시글 작성 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 게시글 수정
router.put('/:id', authenticateToken, [
    body('title').isLength({ min: 1, max: 200 }).withMessage('제목은 1-200자 사이여야 합니다.'),
    body('content').isLength({ min: 1 }).withMessage('내용을 입력해주세요.')
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

        const postId = req.params.id;
        const { title, content } = req.body;
        const userId = req.user.id;

        // 게시글 소유자 확인
        const [posts] = await pool.execute(
            'SELECT author_id FROM posts WHERE id = ?',
            [postId]
        );

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message: '게시글을 찾을 수 없습니다.'
            });
        }

        if (posts[0].author_id !== userId) {
            return res.status(403).json({
                success: false,
                message: '게시글을 수정할 권한이 없습니다.'
            });
        }

        await pool.execute(
            'UPDATE posts SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title, content, postId]
        );

        res.json({
            success: true,
            message: '게시글이 수정되었습니다.'
        });
    } catch (error) {
        console.error('게시글 수정 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 게시글 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        // 게시글 소유자 확인
        const [posts] = await pool.execute(
            'SELECT author_id FROM posts WHERE id = ?',
            [postId]
        );

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message: '게시글을 찾을 수 없습니다.'
            });
        }

        if (posts[0].author_id !== userId) {
            return res.status(403).json({
                success: false,
                message: '게시글을 삭제할 권한이 없습니다.'
            });
        }

        await pool.execute('DELETE FROM posts WHERE id = ?', [postId]);

        res.json({
            success: true,
            message: '게시글이 삭제되었습니다.'
        });
    } catch (error) {
        console.error('게시글 삭제 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

module.exports = router;
