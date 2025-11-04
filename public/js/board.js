// 게시판 JavaScript 로직
document.addEventListener('DOMContentLoaded', function() {
    initializeBoard();
});

// 게시판 초기화
function initializeBoard() {
    setupEventListeners();
    loadPosts();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 글쓰기 버튼
    document.getElementById('writeBtn').addEventListener('click', function() {
        const token = localStorage.getItem('token');
        if (!token) {
            // 로그인 유도 모달 표시
            if (typeof showLoginModal === 'function') {
                showLoginModal('글쓰기');
            } else {
                alert('글쓰기를 하려면 로그인이 필요합니다.');
                window.location.href = '/login';
            }
        } else {
            window.location.href = '/write';
        }
    });
    
    // 검색 버튼
    document.getElementById('searchBtn').addEventListener('click', function() {
        const searchInput = document.getElementById('searchInput');
        const originalValue = searchInput.value;
        const searchTerm = originalValue.trim();
        
        // 원본 값이 비어있으면 전체 게시글 표시, 공백만 있으면 무시
        if (originalValue === '') {
            // 진짜 빈 값일 때만 전체 게시글 표시
            searchInput.value = '';
            loadPosts(1);
        } else if (searchTerm === '') {
            // 공백만 입력된 경우 검색하지 않음 (현재 상태 유지)
            searchInput.value = '';
            return;
        } else {
            // 검색어가 있을 때만 검색 실행
            searchPosts(searchTerm);
        }
    });
    
    // 검색 입력 엔터키
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const originalValue = this.value;
            const searchTerm = originalValue.trim();
            
            // 원본 값이 비어있으면 전체 게시글 표시, 공백만 있으면 무시
            if (originalValue === '') {
                // 진짜 빈 값일 때만 전체 게시글 표시
                this.value = '';
                loadPosts(1);
            } else if (searchTerm === '') {
                // 공백만 입력된 경우 검색하지 않음 (현재 상태 유지)
                this.value = '';
                return;
            } else {
                // 검색어가 있을 때만 검색 실행
                searchPosts(searchTerm);
            }
        }
    });
}

// 게시글 목록 로드
async function loadPosts(page = 1) {
    try {
        showLoading(true);
        
        const response = await fetch(`/api/posts?page=${page}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API 응답 데이터:', data); // 디버깅용
        
        if (data.success) {
            displayPosts(data.data?.posts || []);
            displayPagination(data.data?.pagination || {});
            updatePostCount(data.data?.pagination?.totalPosts || 0);
        } else {
            console.error('API 오류:', data.message);
            showToast(data.message || '게시글을 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('게시글 로드 오류:', error);
        showToast('서버 오류가 발생했습니다.', 'error');
        
        // 오류 발생 시 빈 배열로 표시
        displayPosts([]);
    } finally {
        showLoading(false);
    }
}

// 게시글 검색
async function searchPosts(searchTerm) {
    try {
        showLoading(true);
        
        // 검색어가 비어있으면 검색하지 않음
        if (!searchTerm || searchTerm.trim() === '') {
            showLoading(false);
            return;
        }
        
        const searchType = document.getElementById('searchType')?.value || 'title';
        const params = new URLSearchParams();
        params.append('search', searchTerm.trim());
        params.append('searchType', searchType);
        
        const response = await fetch(`/api/posts?${params}`);
        const data = await response.json();
        
        if (data.success) {
            displayPosts(data.data?.posts || []);
            displayPagination(data.data?.pagination || {});
            updatePostCount(data.data?.pagination?.totalPosts || 0);
        } else {
            showToast('검색에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('검색 오류:', error);
        showToast('검색 중 오류가 발생했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// 게시글 목록 표시
function displayPosts(posts) {
    const tbody = document.getElementById('postsList');
    
    // posts가 undefined이거나 null인 경우 처리
    if (!posts || !Array.isArray(posts)) {
        console.error('posts 데이터가 올바르지 않습니다:', posts);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <i class="fas fa-exclamation-triangle me-2"></i>데이터를 불러올 수 없습니다.
                </td>
            </tr>
        `;
        return;
    }
    
    if (posts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <i class="fas fa-inbox me-2"></i>게시글이 없습니다.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = posts.map(post => `
        <tr class="align-middle">
            <td class="text-center">
                <span class="badge bg-secondary">${post.id}</span>
            </td>
            <td>
                <a href="/posts/${post.id}" class="text-decoration-none text-dark fw-semibold">
                    ${post.title}
                    ${post.comment_count > 0 ? `<span class="badge bg-info ms-2">${post.comment_count}</span>` : ''}
                </a>
            </td>
            <td class="text-center">
                <span class="badge bg-primary">${post.author_name || '알 수 없음'}</span>
            </td>
            <td class="text-center text-muted">
                <small>${formatDate(post.created_at)}</small>
            </td>
            <td class="text-center">
                <span class="badge bg-light text-dark">
                    <i class="fas fa-eye me-1"></i>${post.view_count || 0}
                </span>
            </td>
        </tr>
    `).join('');
}

// 페이지네이션 표시
function displayPagination(pagination) {
    const paginationEl = document.getElementById('pagination');
    
    if (!pagination || pagination.totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // 이전 페이지
    if (pagination.currentPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="loadPosts(${pagination.currentPage - 1})">이전</a>
            </li>
        `;
    }
    
    // 페이지 번호들
    for (let i = 1; i <= pagination.totalPages; i++) {
        const isActive = i === pagination.currentPage;
        paginationHTML += `
            <li class="page-item ${isActive ? 'active' : ''}">
                <a class="page-link" href="#" onclick="loadPosts(${i})">${i}</a>
            </li>
        `;
    }
    
    // 다음 페이지
    if (pagination.currentPage < pagination.totalPages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="loadPosts(${pagination.currentPage + 1})">다음</a>
            </li>
        `;
    }
    
    paginationEl.innerHTML = paginationHTML;
}

// 날짜 포맷팅
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
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

// 게시글 수 업데이트
function updatePostCount(total) {
    const postCountEl = document.getElementById('postCount');
    if (postCountEl) {
        postCountEl.textContent = `총 ${total}개의 게시글`;
    }
}

// 토스트 알림
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    
    // 토스트 타입에 따른 스타일 변경
    const toastHeader = toast.querySelector('.toast-header');
    const icon = toastHeader.querySelector('i');
    
    icon.className = type === 'error' ? 'fas fa-exclamation-triangle text-danger me-2' : 
                     type === 'success' ? 'fas fa-check-circle text-success me-2' : 
                     'fas fa-bell text-primary me-2';
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}
