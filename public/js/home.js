// 전역 변수
let currentUser = null;
let currentPage = 1;

// API 기본 URL
const API_BASE = '/api';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// 앱 초기화
function initializeApp() {
    checkAuth();
    loadPosts();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 검색 입력 엔터키 처리
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchPosts();
        }
    });
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

// 게시글 목록 로드
async function loadPosts(page = 1) {
    try {
        showLoading(true);
        currentPage = page;
        const search = document.getElementById('searchInput').value;
        const params = new URLSearchParams({ page, limit: 10 });
        if (search) params.append('search', search);
        
        const response = await apiRequest(`/posts?${params}`);
        displayPosts(response.data.posts);
        displayPagination(response.data.pagination);
    } catch (error) {
        showToast('게시글을 불러오는데 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// 게시글 표시
function displayPosts(posts) {
    const container = document.getElementById('postsList');
    
    if (!posts || posts.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-4">게시글이 없습니다.</div>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h5 class="card-title">
                            <a href="/posts/${post.id}" class="text-decoration-none">${escapeHtml(post.title)}</a>
                        </h5>
                        <p class="card-text text-muted">${escapeHtml(post.content.substring(0, 100))}${post.content.length > 100 ? '...' : ''}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-user me-1"></i>${escapeHtml(post.author_name)} | 
                                <i class="fas fa-eye me-1"></i>${post.view_count} | 
                                <i class="fas fa-comment me-1"></i>${post.comment_count} | 
                                <i class="fas fa-clock me-1"></i>${formatDate(post.created_at)}
                            </small>
                        </div>
                    </div>
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
        if (i === currentPage) {
            html += `<li class="page-item active">
                <span class="page-link bg-primary text-white border-primary">${i}</span>
            </li>`;
        } else {
            html += `<li class="page-item">
                <a class="page-link" href="javascript:void(0)" onclick="loadPosts(${i}); return false;">${i}</a>
            </li>`;
        }
    }
    
    // 다음 버튼
    if (hasNext) {
        html += `<li class="page-item"><a class="page-link" href="javascript:void(0)" onclick="loadPosts(${currentPage + 1}); return false;">다음</a></li>`;
    }
    
    container.innerHTML = html;
}

// 검색
function searchPosts() {
    loadPosts(1);
}

// 글쓰기 페이지로 이동
function goToWrite() {
    if (!currentUser) {
        showToast('로그인이 필요합니다.', 'warning');
        window.location.href = '/login.html';
        return;
    }
    window.location.href = '/write';
}

// 로그아웃
function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    updateAuthUI();
    showToast('로그아웃되었습니다.', 'info');
    loadPosts();
}

// 로딩 표시
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.remove('d-none');
    } else {
        spinner.classList.add('d-none');
    }
}
