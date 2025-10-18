// 전역 변수
let currentUser = null;

// API 기본 URL
const API_BASE = '/api';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 앱 초기화
function initializeApp() {
    checkAuth();
    setupEventListeners();
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

// 이벤트 리스너 설정
function setupEventListeners() {
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

// 회원가입 처리
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    if (password !== passwordConfirm) {
        showToast('비밀번호가 일치하지 않습니다.', 'error');
        return;
    }
    
    try {
        showLoading(true);
        await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
        
        showToast('회원가입이 완료되었습니다. 로그인해주세요.', 'success');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
        
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
    updateAuthUI();
    showToast('로그아웃되었습니다.', 'info');
    window.location.href = '/';
}

// API 요청 헬퍼 함수
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('token');
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...options
    };
    
    const response = await fetch(API_BASE + url, config);
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '요청 처리 중 오류가 발생했습니다.');
    }
    
    return response.json();
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
