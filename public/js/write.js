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
    setupEventListeners();
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
    if (!token) {
        // 로그인이 필요한 경우 홈으로 리다이렉트
        window.location.href = '/';
        return;
    }
    
    try {
        const response = await apiRequest('/auth/me');
        currentUser = response.user;
    } catch (error) {
        localStorage.removeItem('token');
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
let isSubmitting = false; // 중복 제출 방지 플래그

async function handleWritePost(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('로그인이 필요합니다.', 'warning');
        return;
    }
    
    // bts_2: 게시글 작성 후 페이지 리다이렉트가 되지 않음 (중복 제출 가능)
    const bts2 = await window.getBugSetting('bts_2');
    
    if (!bts2 && isSubmitting) {
        return; // 정상: 중복 제출 방지
    }
    
    if (!bts2) {
        isSubmitting = true;
    }
    
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const files = document.getElementById('fileInput').files;
    const submitButton = document.querySelector('button[type="submit"]');
    
    if (!bts2 && submitButton) {
        // 정상: 버튼 비활성화
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>작성 중...';
    }
    
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
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = '<i class="fas fa-save me-1"></i>작성';
                    }
                    if (!bts2) {
                        isSubmitting = false;
                    }
                    return; // 파일 업로드 실패 시 중단
                }
            }
        }
        
        showToast('게시글이 작성되었습니다.', 'success');
        
        // bts_2: 게시글 작성 후 페이지 리다이렉트가 되지 않음
        if (!bts2) {
            window.location.href = `/posts/${postId}`;
        } else {
            // 버그: 리다이렉트하지 않아서 버튼을 여러 번 클릭할 수 있음
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-save me-1"></i>작성';
            }
            isSubmitting = false;
        }
    } catch (error) {
        showToast(error.message, 'error');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save me-1"></i>작성';
        }
        if (!bts2) {
            isSubmitting = false;
        }
    } finally {
        showLoading(false);
    }
}

// 파일 업로드
async function uploadFile(postId, file) {
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
        throw new Error(error.message || '파일 업로드에 실패했습니다.');
    }
    
    return await response.json();
}

// 뒤로가기
function goBack() {
    window.location.href = '/';
}

// 로그아웃
function logout() {
    localStorage.removeItem('token');
    currentUser = null;
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
