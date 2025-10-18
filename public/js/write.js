// 전역 변수
let currentUser = null;

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
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 글쓰기 폼
    document.getElementById('writeForm').addEventListener('submit', handleWritePost);
    
    // 파일 입력 검증
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', validateFileInput);
    }
    
    // 글자 수 카운터
    const titleInput = document.getElementById('postTitle');
    const contentInput = document.getElementById('postContent');
    
    titleInput.addEventListener('input', updateTitleCount);
    contentInput.addEventListener('input', updateContentCount);
    
    // 초기 카운터 설정
    updateTitleCount();
    updateContentCount();
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
        // 로그인이 필요한 경우 홈으로 리다이렉트
        window.location.href = '/';
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

// 파일 입력 검증
function validateFileInput(event) {
    const files = event.target.files;
    
    if (files.length === 0) return;
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gp', 'image/webp'];
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

// 게시글 작성 처리
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
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/upload/${postId}`, {
        method: 'POST',
        headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || '파일 업로드에 실패했습니다.');
    }
    
    return data;
}

// 뒤로가기
function goBack() {
    window.location.href = '/';
}

// 로그아웃
function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    updateAuthUI();
    showToast('로그아웃되었습니다.', 'info');
    window.location.href = '/';
}

// 제목 글자 수 카운터
function updateTitleCount() {
    const titleInput = document.getElementById('postTitle');
    const titleCount = document.getElementById('titleCount');
    const currentLength = titleInput.value.length;
    
    titleCount.textContent = currentLength;
    
    if (currentLength > 200) {
        titleCount.classList.add('text-danger');
    } else if (currentLength > 180) {
        titleCount.classList.add('text-warning');
    } else {
        titleCount.classList.remove('text-danger', 'text-warning');
    }
}

// 내용 글자 수 카운터
function updateContentCount() {
    const contentInput = document.getElementById('postContent');
    const contentCount = document.getElementById('contentCount');
    const currentLength = contentInput.value.length;
    
    contentCount.textContent = currentLength;
    
    if (currentLength > 1000) {
        contentCount.classList.add('text-danger');
    } else if (currentLength > 900) {
        contentCount.classList.add('text-warning');
    } else {
        contentCount.classList.remove('text-danger', 'text-warning');
    }
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
