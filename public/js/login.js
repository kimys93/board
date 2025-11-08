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
    setupEventListeners();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
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
        
        // 로그인 시 온라인 상태로 설정
        try {
            await fetch('/api/chat/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${response.token}`
                },
                body: JSON.stringify({ isOnline: true })
            });
        } catch (error) {
            console.error('온라인 상태 설정 실패:', error);
        }
        
        // navbar 새로고침하여 실시간 상태 업데이트
        if (window.navbarInstance) {
            await window.navbarInstance.checkAuthStatus();
        }
        
        showToast('로그인되었습니다.', 'success');
        setTimeout(() => {
            window.location.href = '/';
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
