// 전역 변수
let currentUser = null;
let currentPostId = null;

// API 기본 URL
const API_BASE = '/api';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupCommentForm();
});

// 앱 초기화
function initializeApp() {
    const pathParts = window.location.pathname.split('/');
    const postId = parseInt(pathParts[2]);

    if (postId) {
        currentPostId = postId;
        checkAuth();
        loadPostDetail(postId);
    } else {
        window.location.href = '/';
    }
}

// 인증 확인
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await apiRequest('/auth/me');
            currentUser = response.user;
            updateAuthUI();
        } catch (error) {
            localStorage.removeItem('token');
            updateAuthUI();
        }
    } else {
        updateAuthUI();
    }
}

// 인증 UI 업데이트
function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');

    if (currentUser) {
        authButtons.classList.add('d-none');
        userMenu.classList.remove('d-none');
        document.getElementById('userName').textContent = currentUser.username;
    } else {
        authButtons.classList.remove('d-none');
        userMenu.classList.add('d-none');
    }
}

// API 요청 헬퍼 함수
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('token');
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const response = await fetch(API_BASE + url, { ...defaultOptions, ...options });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || '요청이 실패했습니다.');
    }
    
    return data;
}

// 게시글 상세 로드
async function loadPostDetail(postId) {
    try {
        console.log('게시글 상세 로드 시작, postId:', postId);
        showLoading(true);
        const response = await apiRequest(`/posts/${postId}`);
        console.log('API 응답:', response);
        const post = response.data;
        console.log('게시글 데이터:', post);
        
        document.getElementById('detailTitle').textContent = post.title;
        document.getElementById('detailAuthor').textContent = post.author_name;
        document.getElementById('detailDate').textContent = formatDate(post.created_at);
        document.getElementById('detailViews').textContent = post.view_count;
        document.getElementById('detailContent').textContent = post.content;
        
        displayAttachments(post.attachments);
        displayDetailActions(post.author_id);
        loadComments(postId);
    } catch (error) {
        console.error('게시글 상세 로드 실패:', error);
        showToast('게시글을 불러오는데 실패했습니다.', 'error');
        window.location.href = '/';
    } finally {
        showLoading(false);
    }
}

// 첨부파일 표시
function displayAttachments(attachments) {
    const container = document.getElementById('detailAttachments');
    
    if (!attachments || attachments.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = `
        <div class="mb-3">
            <h6><i class="fas fa-paperclip me-1"></i>첨부파일</h6>
            <div class="attachment-list">
                ${attachments.map(attachment => `
                    <a href="/api/upload/${attachment.filename}" class="attachment-item" target="_blank">
                        <i class="fas fa-file me-1"></i>${escapeHtml(attachment.original_name)}
                        <small class="text-muted">(${formatFileSize(attachment.file_size)})</small>
                    </a>
                `).join('')}
            </div>
        </div>
    `;
}

// 상세 페이지 액션 버튼
function displayDetailActions(authorId) {
    const container = document.getElementById('detailActions');
    
    if (currentUser && currentUser.id === authorId) {
        container.innerHTML = `
            <div class="btn-group">
                <button class="btn btn-sm btn-outline-primary" onclick="editPost(${currentPostId})">
                    <i class="fas fa-edit me-1"></i>수정
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deletePost(${currentPostId})">
                    <i class="fas fa-trash me-1"></i>삭제
                </button>
            </div>
        `;
    } else {
        container.innerHTML = '';
    }
}

// 댓글 로드
async function loadComments(postId) {
    try {
        console.log('댓글 로드 시작, postId:', postId);
        const response = await apiRequest(`/comments/${postId}?page=1&limit=50`);
        console.log('댓글 API 응답:', response);
        displayComments(response.data.comments);
    } catch (error) {
        console.error('댓글 로드 실패:', error);
    }
}

// 댓글 표시
function displayComments(comments) {
    const container = document.getElementById('commentsList');
    
    console.log('displayComments 호출, comments:', comments);
    console.log('comments 타입:', typeof comments);
    console.log('comments 길이:', comments?.length);
    
    if (!comments || !Array.isArray(comments) || comments.length === 0) {
        container.innerHTML = '<div class="text-center py-3 text-muted">댓글이 없습니다.</div>';
        return;
    }
    
    container.innerHTML = comments.map(comment => `
        <div class="comment-item mb-3 p-3 border rounded-3 bg-light" data-comment-id="${comment.id}">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <div class="comment-meta mb-2 d-flex align-items-center">
                        <div class="d-flex align-items-center me-3">
                            <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px; font-size: 14px;">
                                <i class="fas fa-user"></i>
                            </div>
                            <div>
                                <div class="fw-bold text-dark">${escapeHtml(comment.author_name)}</div>
                                <small class="text-muted">
                                    <i class="fas fa-clock me-1"></i>${formatDate(comment.created_at)}
                                </small>
                            </div>
                        </div>
                    </div>
                    <div class="comment-content bg-white p-3 rounded border-start border-3 border-primary">
                        ${escapeHtml(comment.content)}
                    </div>
                </div>
                ${currentUser && currentUser.id === comment.author_id ? `
                    <div class="btn-group ms-3">
                        <button class="btn btn-sm btn-outline-primary" onclick="editComment(${comment.id})" title="수정">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteComment(${comment.id})" title="삭제">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// 게시글 수정
function editPost(postId) {
    window.location.href = `/posts/${postId}/edit`;
}

// 게시글 삭제
async function deletePost(postId) {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        showLoading(true);
        await apiRequest(`/posts/${postId}`, { method: 'DELETE' });
        showToast('게시글이 삭제되었습니다.', 'success');
        window.location.href = '/';
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 댓글 수정
function editComment(commentId) {
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (!commentElement) return;
    
    const contentElement = commentElement.querySelector('.comment-content');
    const currentContent = contentElement.textContent;
    
    // 수정 폼으로 변경
    contentElement.innerHTML = `
        <div class="bg-white p-3 rounded border-start border-3 border-warning">
            <div class="d-flex gap-2">
                <textarea class="form-control" id="editCommentContent" rows="3" placeholder="댓글을 수정해주세요...">${currentContent}</textarea>
                <div class="d-flex flex-column gap-2">
                    <button class="btn btn-sm btn-success" onclick="saveCommentEdit(${commentId})" title="저장">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="cancelCommentEdit(${commentId}, '${currentContent}')" title="취소">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// 댓글 수정 저장
async function saveCommentEdit(commentId) {
    const content = document.getElementById('editCommentContent').value.trim();
    if (!content) {
        showToast('댓글 내용을 입력해주세요.', 'error');
        return;
    }
    
    try {
        showLoading(true);
        await apiRequest(`/comments/${commentId}`, {
            method: 'PUT',
            body: JSON.stringify({ content })
        });
        showToast('댓글이 수정되었습니다.', 'success');
        loadComments(currentPostId);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 댓글 수정 취소
function cancelCommentEdit(commentId, originalContent) {
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (commentElement) {
        const contentElement = commentElement.querySelector('.comment-content');
        contentElement.innerHTML = originalContent;
    }
}

// 댓글 삭제
async function deleteComment(commentId) {
    if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        showLoading(true);
        await apiRequest(`/comments/${commentId}`, { method: 'DELETE' });
        showToast('댓글이 삭제되었습니다.', 'success');
        loadComments(currentPostId);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 로그인/회원가입 페이지 표시
function showLogin() {
    window.location.href = '/login.html';
}

function showRegister() {
    window.location.href = '/register.html';
}

// 로그아웃
function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    updateAuthUI();
    showToast('로그아웃되었습니다.', 'info');
    window.location.href = '/';
}

// 댓글 작성 폼 설정
function setupCommentForm() {
    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
        commentForm.addEventListener('submit', handleCommentSubmit);
    }
    
    // 댓글 글자 수 카운터
    const commentInput = document.getElementById('commentContent');
    if (commentInput) {
        commentInput.addEventListener('input', updateCommentCount);
        // 초기 카운터 설정
        updateCommentCount();
    }
}

// 댓글 작성 처리
async function handleCommentSubmit(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showToast('로그인이 필요합니다.', 'error');
        showLogin();
        return;
    }
    
    const content = document.getElementById('commentContent').value.trim();
    if (!content) {
        showToast('댓글 내용을 입력해주세요.', 'error');
        return;
    }
    
    try {
        showLoading(true);
        await apiRequest('/comments', {
            method: 'POST',
            body: JSON.stringify({
                post_id: currentPostId,
                content: content
            })
        });
        
        showToast('댓글이 작성되었습니다.', 'success');
        document.getElementById('commentContent').value = '';
        loadComments(currentPostId);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 댓글 글자 수 카운터
function updateCommentCount() {
    const commentInput = document.getElementById('commentContent');
    const commentCount = document.getElementById('commentCount');
    
    if (!commentInput || !commentCount) return;
    
    const currentLength = commentInput.value.length;
    commentCount.textContent = currentLength;
    
    if (currentLength > 200) {
        commentCount.classList.add('text-danger');
    } else if (currentLength > 180) {
        commentCount.classList.add('text-warning');
    } else {
        commentCount.classList.remove('text-danger', 'text-warning');
    }
}

// 유틸리티 함수들
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.remove('d-none');
    } else {
        spinner.classList.add('d-none');
    }
}

// showToast 함수는 utils.js로 이동됨

// escapeHtml 함수는 utils.js로 이동됨

// formatDate 함수는 utils.js로 이동됨

// formatFileSize 함수는 utils.js로 이동됨
