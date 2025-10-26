// 전역 변수
let currentUser = null;
let currentPage = 1;
let currentPostId = null;

// API 기본 URL
const API_BASE = '/api';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// 앱 초기화
function initializeApp() {
    // URL 라우팅
    const path = window.location.pathname;
    
    if (path === '/' || path === '/home') {
        showHome();
    } else if (path.startsWith('/posts/')) {
        const postId = parseInt(path.split('/')[2]);
        if (postId) {
            showDetail(postId);
        } else {
            showHome();
        }
    } else {
        showHome();
    }
    
    // 토큰 확인은 navbar.js에서 처리
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 로그인 폼
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // 회원가입 폼
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // 게시글 작성 폼
    document.getElementById('writeForm').addEventListener('submit', handleWritePost);
    
    // 댓글 폼
    document.getElementById('commentForm').addEventListener('submit', handleComment);
    
    // 파일 입력 검증
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', validateFileInput);
    }
    
    // 브라우저 뒤로가기 처리는 서버 사이드 라우팅으로 처리됨
}

// 파일 입력 검증
function validateFileInput(event) {
    const files = event.target.files;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    for (let file of files) {
        // 파일 타입 검증
        if (!allowedTypes.includes(file.type)) {
            showToast('이미지 파일만 업로드할 수 있습니다. (JPG, PNG, GIF, WEBP)', 'error');
            event.target.value = ''; // 파일 선택 취소
            return;
        }
        
        // 파일 크기 검증
        if (file.size > maxSize) {
            showToast('파일 크기는 10MB를 초과할 수 없습니다.', 'error');
            event.target.value = ''; // 파일 선택 취소
            return;
        }
    }
    
    if (files.length > 0) {
        showToast(`${files.length}개의 이미지 파일이 선택되었습니다.`, 'success');
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

// 인증 확인
async function checkAuth() {
    try {
        const response = await apiRequest('/auth/me');
        currentUser = response.user;
        updateAuthUI();
        showHome();
    } catch (error) {
        localStorage.removeItem('token');
        showHome();
    }
}

// 인증 UI 업데이트
function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const writeBtn = document.getElementById('writeBtn');
    
    if (currentUser) {
        authButtons.classList.add('d-none');
        userMenu.classList.remove('d-none');
        writeBtn.style.display = 'block';
        document.getElementById('userName').textContent = currentUser.username;
    } else {
        authButtons.classList.remove('d-none');
        userMenu.classList.add('d-none');
        writeBtn.style.display = 'none';
    }
}

// 페이지 표시 함수들
function showHome() {
    hideAllPages();
    document.getElementById('homePage').classList.remove('d-none');
    loadPosts();
}

function showLogin() {
    hideAllPages();
    document.getElementById('loginPage').classList.remove('d-none');
}

function showRegister() {
    hideAllPages();
    document.getElementById('registerPage').classList.remove('d-none');
}

function showWritePost() {
    if (!currentUser) {
        showToast('로그인이 필요합니다.', 'warning');
        showLogin();
        return;
    }
    hideAllPages();
    document.getElementById('writePage').classList.remove('d-none');
    document.getElementById('writeForm').reset();
}

function showDetail(postId) {
    hideAllPages();
    document.getElementById('detailPage').classList.remove('d-none');
    currentPostId = postId;
    loadPostDetail(postId);
}

function hideAllPages() {
    const pages = ['homePage', 'loginPage', 'registerPage', 'writePage', 'detailPage'];
    pages.forEach(page => {
        document.getElementById(page).classList.add('d-none');
    });
}

// 로그인 처리
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        showLoading(true);
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        localStorage.setItem('token', response.token);
        currentUser = response.user;
        showToast('로그인 성공!', 'success');
        
        // navbar 새로고침하여 실시간 상태 업데이트
        if (window.navbarInstance) {
            window.navbarInstance.checkAuthStatus();
        }
        
        showHome();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 회원가입 처리
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        showLoading(true);
        await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
        
        showToast('회원가입이 완료되었습니다!', 'success');
        showLogin();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 로그아웃
function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    showToast('로그아웃되었습니다.', 'info');
    showHome();
}

// 게시글 목록 로드
async function loadPosts(page = 1) {
    try {
        showLoading(true);
        const search = document.getElementById('searchInput').value;
        const params = new URLSearchParams({ page, limit: 10 });
        if (search) params.append('search', search);
        
        const response = await apiRequest(`/posts?${params}`);
        displayPosts(response.data.posts);
        displayPagination(response.data.pagination);
        
        // 홈 페이지 표시 (페이지네이션 클릭 시)
        showHome();
    } catch (error) {
        showToast('게시글을 불러오는데 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// 게시글 표시
function displayPosts(posts) {
    const container = document.getElementById('postsList');
    
    if (posts.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-muted">게시글이 없습니다.</div>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="post-item">
            <div class="row">
                <div class="col-md-8">
                    <a href="/posts/${post.id}" class="post-title">${escapeHtml(post.title)}</a>
                    <div class="post-meta mt-1">
                        <i class="fas fa-user me-1"></i>${escapeHtml(post.author_name)}
                        <i class="fas fa-calendar ms-3 me-1"></i>${formatDate(post.created_at)}
                        <i class="fas fa-eye ms-3 me-1"></i>${post.view_count}
                        <i class="fas fa-comments ms-3 me-1"></i>${post.comment_count}
                    </div>
                </div>
                <div class="col-md-4 text-end">
                    <small class="text-muted">${formatDate(post.created_at)}</small>
                </div>
            </div>
        </div>
    `).join('');
}

// 페이지네이션 표시
function displayPagination(pagination) {
    const container = document.getElementById('pagination');
    const { currentPage, totalPages, hasNext, hasPrev } = pagination;
    
    let html = '';
    
    // 이전 버튼
    if (hasPrev) {
        html += `<li class="page-item"><a class="page-link" href="javascript:void(0)" onclick="loadPosts(${currentPage - 1}); return false;">이전</a></li>`;
    }
    
    // 페이지 번호들
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="javascript:void(0)" onclick="loadPosts(${i}); return false;">${i}</a>
        </li>`;
    }
    
    // 다음 버튼
    if (hasNext) {
        html += `<li class="page-item"><a class="page-link" href="javascript:void(0)" onclick="loadPosts(${currentPage + 1}); return false;">다음</a></li>`;
    }
    
    container.innerHTML = html;
}

// 게시글 상세 로드
async function loadPostDetail(postId) {
    try {
        showLoading(true);
        const response = await apiRequest(`/posts/${postId}`);
        const post = response.data;
        
        document.getElementById('detailTitle').textContent = post.title;
        document.getElementById('detailAuthor').textContent = post.author_name;
        document.getElementById('detailDate').textContent = formatDate(post.created_at);
        document.getElementById('detailViews').textContent = post.view_count;
        document.getElementById('detailContent').textContent = post.content;
        
        // 첨부파일 표시
        displayAttachments(post.attachments);
        
        // 액션 버튼 (작성자만)
        displayDetailActions(post.author_id);
        
        // 댓글 로드
        loadComments(postId);
    } catch (error) {
        showToast('게시글을 불러오는데 실패했습니다.', 'error');
        showHome();
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
            <div>
                ${attachments.map(file => `
                    <a href="/api/upload/${file.id}" class="attachment-item" download="${file.original_name}">
                        <i class="fas fa-file me-1"></i>${escapeHtml(file.original_name)}
                        <small class="text-muted">(${formatFileSize(file.file_size)})</small>
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
        const response = await apiRequest(`/comments/${postId}`);
        displayComments(response.data.comments);
    } catch (error) {
        console.error('댓글 로드 실패:', error);
    }
}

// 댓글 표시
function displayComments(comments) {
    const container = document.getElementById('commentsList');
    
    if (comments.length === 0) {
        container.innerHTML = '<div class="text-center py-3 text-muted">댓글이 없습니다.</div>';
        return;
    }
    
    container.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <div class="comment-meta mb-2">
                        <i class="fas fa-user me-1"></i>${escapeHtml(comment.author_name)}
                        <i class="fas fa-calendar ms-3 me-1"></i>${formatDate(comment.created_at)}
                    </div>
                    <div class="comment-content">${escapeHtml(comment.content)}</div>
                </div>
                ${currentUser && currentUser.id === comment.author_id ? `
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-secondary" onclick="editComment(${comment.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteComment(${comment.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// 게시글 작성
async function handleWritePost(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('로그인이 필요합니다.', 'warning');
        return;
    }
    
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const files = document.getElementById('fileInput').files;
    
    try {
        showLoading(true);
        
        // 게시글 작성
        const response = await apiRequest('/posts', {
            method: 'POST',
            body: JSON.stringify({ title, content })
        });
        
        const postId = response.postId;
        
        // 파일 업로드
        if (files.length > 0) {
            for (let file of files) {
                try {
                    await uploadFile(postId, file);
                } catch (error) {
                    showToast(error.message, 'error');
                    return; // 파일 업로드 실패 시 중단
                }
            }
        }
        
        showToast('게시글이 작성되었습니다.', 'success');
        window.location.href = `/posts/${postId}`;
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 파일 업로드
async function uploadFile(postId, file) {
    // 파일 타입 검증 (프론트엔드에서 미리 체크)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        throw new Error('이미지 파일만 업로드할 수 있습니다. (JPG, PNG, GIF, WEBP)');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('postId', postId);
    
    const token = localStorage.getItem('token');
    const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
    }
    
    return await response.json();
}

// 댓글 작성
async function handleComment(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('로그인이 필요합니다.', 'warning');
        return;
    }
    
    const content = document.getElementById('commentContent').value;
    
    try {
        showLoading(true);
        await apiRequest(`/comments/${currentPostId}`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        
        document.getElementById('commentContent').value = '';
        showToast('댓글이 작성되었습니다.', 'success');
        loadComments(currentPostId);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
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
        showHome();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
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

// 검색
function searchPosts() {
    currentPage = 1;
    loadPosts(1);
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

// showToast와 escapeHtml 함수는 utils.js로 이동됨

// formatDate 함수는 utils.js로 이동됨

// formatFileSize 함수는 utils.js로 이동됨
