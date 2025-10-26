// 전역 변수
let currentUser = null;

// API 기본 URL
const API_BASE = '/api';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 앱 초기화
async function initializeApp() {
    setupEventListeners();
    
    // 인증된 사용자만 프로필 로드
    const token = localStorage.getItem('token');
    if (token) {
        loadUserProfile();
    } else {
        window.location.href = '/login';
    }
}

// 사용자 프로필 로드
async function loadUserProfile() {
    try {
        const response = await apiRequest('/auth/profile');
        const user = response.user;
        
        // 프로필 정보 표시
        document.getElementById('userDisplayName').textContent = user.name;
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('userPhone').textContent = user.phone;
        document.getElementById('userGender').textContent = getGenderText(user.gender);
        
        
        // 폼에 현재 값 설정
        document.getElementById('updateName').value = user.name;
        document.getElementById('updateEmail').value = user.email;
        document.getElementById('updatePhone').value = user.phone;
        document.getElementById('updateGender').value = user.gender;
        
    } catch (error) {
        showToast('프로필 정보를 불러오는데 실패했습니다.', 'error');
    }
}

// 성별 텍스트 변환
function getGenderText(gender) {
    const genderMap = {
        'male': '남성',
        'female': '여성',
        'other': '기타'
    };
    return genderMap[gender] || '미설정';
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 프로필 수정 폼
    document.getElementById('updateProfileForm').addEventListener('submit', handleProfileUpdate);
    
    // 비밀번호 변경 폼
    document.getElementById('changePasswordForm').addEventListener('submit', handlePasswordChange);
    
    
    // 휴대전화 번호 포맷팅
    document.getElementById('updatePhone').addEventListener('input', formatPhoneNumber);
}

// 프로필 수정 처리
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const name = document.getElementById('updateName').value;
    const email = document.getElementById('updateEmail').value;
    const phone = document.getElementById('updatePhone').value;
    const gender = document.getElementById('updateGender').value;
    
    try {
        showLoading(true);
        
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('phone', phone);
        formData.append('gender', gender);
        
        
        await apiRequest('/auth/profile', {
            method: 'PUT',
            body: formData
        });
        
        showToast('프로필이 성공적으로 업데이트되었습니다.', 'success');
        loadUserProfile();
        cancelEdit();
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 비밀번호 변경 처리
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        showToast('새 비밀번호가 일치하지 않습니다.', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        await apiRequest('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        showToast('비밀번호가 성공적으로 변경되었습니다.', 'success');
        document.getElementById('changePasswordForm').reset();
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}


// 휴대전화 번호 포맷팅
function formatPhoneNumber(e) {
    let value = e.target.value;
    const numbers = value.replace(/\D/g, '');
    const limitedNumbers = numbers.slice(0, 11);
    
    let formatted = '';
    if (limitedNumbers.length > 0) {
        if (limitedNumbers.length <= 3) {
            formatted = limitedNumbers;
        } else if (limitedNumbers.length <= 7) {
            formatted = limitedNumbers.slice(0, 3) + '-' + limitedNumbers.slice(3);
        } else {
            formatted = limitedNumbers.slice(0, 3) + '-' + limitedNumbers.slice(3, 7) + '-' + limitedNumbers.slice(7);
        }
    }
    
    e.target.value = formatted;
}

// 프로필 수정 모드
function editProfile() {
    document.getElementById('profileForm').style.display = 'block';
}

// 프로필 수정 취소
function cancelEdit() {
    document.getElementById('profileForm').style.display = 'none';
    document.getElementById('updateProfileForm').reset();
}

// 계정 삭제
async function deleteAccount() {
    if (!confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        return;
    }
    
    const password = prompt('계정 삭제를 위해 비밀번호를 입력해주세요:');
    if (!password) {
        return;
    }
    
    try {
        showLoading(true);
        
        await apiRequest('/auth/delete-account', {
            method: 'DELETE',
            body: JSON.stringify({ password })
        });
        
        showToast('계정이 성공적으로 삭제되었습니다.', 'success');
        localStorage.removeItem('token');
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 로그아웃 함수는 navbar.js에서 제공됨

// API 요청 헬퍼 함수
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('token');
    const config = {
        headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...options
    };
    
    // FormData가 아닌 경우에만 Content-Type 설정
    if (!(options.body instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
    }
    
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
