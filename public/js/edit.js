// 전역 변수
let currentUser = null;
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
    const pathParts = window.location.pathname.split('/');
    const postId = parseInt(pathParts[2]);
    
    if (postId) {
        currentPostId = postId;
        checkAuth();
        loadPostData(postId);
    } else {
        window.location.href = '/';
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 수정 폼
    document.getElementById('editForm').addEventListener('submit', handleEditPost);
    
    // 파일 입력 검증
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', validateFileInput);
    }
    
    // 글자 수 카운터
    const titleInput = document.getElementById('editTitle');
    const contentInput = document.getElementById('editContent');
    
    titleInput.addEventListener('input', updateTitleCount);
    contentInput.addEventListener('input', updateContentCount);
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

// 게시글 데이터 로드
async function loadPostData(postId) {
    try {
        showLoading(true);
        const response = await apiRequest(`/posts/${postId}`);
        const post = response.data;
        
        // 권한 확인
        if (currentUser.id !== post.author_id) {
            showToast('게시글을 수정할 권한이 없습니다.', 'error');
            window.location.href = `/posts/${postId}`;
            return;
        }
        
        // 폼에 데이터 채우기
        document.getElementById('editTitle').value = post.title;
        document.getElementById('editContent').value = post.content;
        
        // 기존 첨부파일 표시
        displayExistingFiles(post.attachments);
        
    } catch (error) {
        console.error('게시글 데이터 로드 실패:', error);
        showToast('게시글을 불러오는데 실패했습니다.', 'error');
        window.location.href = '/';
    } finally {
        showLoading(false);
    }
}

// 기존 첨부파일 표시
function displayExistingFiles(attachments) {
    let container = document.getElementById('existingFiles');
    if (!container) {
        // 기존 파일 컨테이너가 없으면 생성
        const fileInput = document.getElementById('fileInput');
        const existingFilesDiv = document.createElement('div');
        existingFilesDiv.id = 'existingFiles';
        existingFilesDiv.className = 'mb-3';
        fileInput.parentNode.insertBefore(existingFilesDiv, fileInput);
        container = existingFilesDiv;
    }
    
    if (!attachments || attachments.length === 0) {
        container.innerHTML = '<div class="text-muted">기존 첨부파일이 없습니다.</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="mb-3">
            <h6><i class="fas fa-paperclip me-1"></i>기존 첨부파일</h6>
            <div class="existing-files-list">
                ${attachments.map(attachment => `
                    <div class="d-flex justify-content-between align-items-center p-2 border rounded mb-2">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-file-image me-2 text-primary"></i>
                            <span>${escapeHtml(attachment.original_name)}</span>
                            <small class="text-muted ms-2">(${formatFileSize(attachment.file_size)})</small>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeExistingFile(${attachment.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// 기존 파일 삭제
async function removeExistingFile(fileId) {
    if (!confirm('이 파일을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await apiRequest(`/upload/${fileId}`, { method: 'DELETE' });
        showToast('파일이 삭제되었습니다.', 'success');
        
        // 파일 목록만 업데이트 (페이지 새로고침 없이)
        await updateFileList();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// 파일 목록 업데이트
async function updateFileList() {
    try {
        const response = await apiRequest(`/posts/${currentPostId}`);
        const post = response.data;
        
        // 파일 목록만 업데이트 (폼 내용은 건드리지 않음)
        displayExistingFiles(post.attachments);
    } catch (error) {
        console.error('파일 목록 업데이트 실패:', error);
    }
}

// 게시글 수정 처리
async function handleEditPost(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showToast('로그인이 필요합니다.', 'error');
        return;
    }
    
    const title = document.getElementById('editTitle').value;
    const content = document.getElementById('editContent').value;
    const files = document.getElementById('fileInput').files;
    
    try {
        showLoading(true);
        
        // 게시글 수정
        await apiRequest(`/posts/${currentPostId}`, {
            method: 'PUT',
            body: JSON.stringify({ title, content })
        });
        
        // 새 파일이 업로드된 경우 기존 파일 삭제 후 새 파일 업로드
        if (files.length > 0) {
            // 기존 파일 모두 삭제
            await deleteAllExistingFiles();
            
            // 새 파일 업로드
            for (let file of files) {
                try {
                    await uploadFile(currentPostId, file);
                } catch (error) {
                    showToast(error.message, 'error');
                    return;
                }
            }
        }
        
        showToast('게시글이 수정되었습니다.', 'success');
        window.location.href = `/posts/${currentPostId}`;
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 파일 업로드
async function uploadFile(postId, file) {
    // 파일 타입 검증
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

// 파일 입력 검증
function validateFileInput(event) {
    const files = event.target.files;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    for (let file of files) {
        // 파일 타입 검증
        if (!allowedTypes.includes(file.type)) {
            showToast('이미지 파일만 업로드할 수 있습니다. (JPG, PNG, GIF, WEBP)', 'error');
            event.target.value = '';
            return;
        }
        
        // 파일 크기 검증
        if (file.size > maxSize) {
            showToast('파일 크기는 10MB를 초과할 수 없습니다.', 'error');
            event.target.value = '';
            return;
        }
    }
    
    if (files.length > 0) {
        showToast(`${files.length}개의 이미지 파일이 선택되었습니다.`, 'success');
    }
}

// 기존 파일 모두 삭제
async function deleteAllExistingFiles() {
    try {
        const response = await apiRequest(`/posts/${currentPostId}`);
        const attachments = response.data.attachments;
        
        if (attachments && attachments.length > 0) {
            for (let attachment of attachments) {
                await apiRequest(`/upload/${attachment.id}`, { method: 'DELETE' });
            }
        }
    } catch (error) {
        console.error('기존 파일 삭제 실패:', error);
    }
}

// 뒤로가기
function goBack() {
    window.location.href = `/posts/${currentPostId}`;
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

// 제목 글자 수 카운터
function updateTitleCount() {
    const titleInput = document.getElementById('editTitle');
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
    const contentInput = document.getElementById('editContent');
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

// formatFileSize 함수는 utils.js로 이동됨

// escapeHtml 함수는 utils.js로 이동됨
