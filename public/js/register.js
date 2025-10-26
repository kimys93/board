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
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // 휴대전화 번호 자동 하이픈 추가
    document.getElementById('registerPhone').addEventListener('input', formatPhoneNumber);
    
    // 이메일 중복 확인 버튼
    document.getElementById('checkEmailBtn').addEventListener('click', handleEmailCheck);
    
    // 이메일 입력 시 중복 확인 상태 초기화
    document.getElementById('registerEmail').addEventListener('input', resetEmailCheck);
    
    // ID 입력 시 중복 확인 상태 초기화
    document.getElementById('registerId').addEventListener('input', resetIdCheck);
    
    // 실시간 validation
    document.getElementById('registerId').addEventListener('input', validateIdRealtime);
    document.getElementById('registerName').addEventListener('input', validateNameRealtime);
}

// 회원가입 처리
async function handleRegister(e) {
    e.preventDefault();
    
    const id = document.getElementById('registerId').value;
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const gender = document.getElementById('registerGender').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    // 입력값 검증
    if (!validateForm(id, name, email, gender, phone, password, passwordConfirm)) {
        return;
    }
    
    try {
        showLoading(true);
        await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ 
                id,
                name, 
                email, 
                gender, 
                phone, 
                password 
            })
        });
        
        showToast('회원가입이 완료되었습니다. 로그인해주세요.', 'success');
        setTimeout(() => {
            window.location.href = '/login';
        }, 1000);
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 폼 검증 함수
function validateForm(id, name, email, gender, phone, password, passwordConfirm) {
    let isValid = true;
    
    // ID 검증 (영어와 숫자만)
    const idRegex = /^[a-zA-Z0-9]+$/;
    if (!id.trim()) {
        showToast('ID를 입력해주세요.', 'error');
        isValid = false;
    } else if (id.length < 3 || id.length > 20) {
        showToast('ID는 3-20자 사이여야 합니다.', 'error');
        isValid = false;
    } else if (!idRegex.test(id)) {
        showToast('ID는 영어와 숫자만 사용 가능합니다.', 'error');
        isValid = false;
    }
    
    // 성명 검증 (한글과 영어만)
    const nameRegex = /^[가-힣a-zA-Z\s]+$/;
    if (!name.trim()) {
        showToast('성명을 입력해주세요.', 'error');
        isValid = false;
    } else if (name.length < 2 || name.length > 20) {
        showToast('성명은 2-20자 사이여야 합니다.', 'error');
        isValid = false;
    } else if (!nameRegex.test(name)) {
        showToast('성명은 한글 또는 영어만 사용 가능합니다.', 'error');
        isValid = false;
    }
    
    // 이메일 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
        showToast('이메일을 입력해주세요.', 'error');
        isValid = false;
    } else if (!emailRegex.test(email)) {
        showToast('유효한 이메일 주소를 입력해주세요.', 'error');
        isValid = false;
    }
    
    // 성별 검증
    if (!gender) {
        showToast('성별을 선택해주세요.', 'error');
        isValid = false;
    }
    
    // 휴대전화 번호 검증
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!phone.trim()) {
        showToast('휴대전화 번호를 입력해주세요.', 'error');
        isValid = false;
    } else if (!phoneRegex.test(phone)) {
        showToast('휴대전화 번호는 010으로 시작하는 11자리 숫자여야 합니다.', 'error');
        isValid = false;
    }
    
    // 비밀번호 검증
    if (!password) {
        showToast('비밀번호를 입력해주세요.', 'error');
        isValid = false;
    } else if (password.length < 6) {
        showToast('비밀번호는 최소 6자 이상이어야 합니다.', 'error');
        isValid = false;
    }
    
    // 비밀번호 확인 검증
    if (password !== passwordConfirm) {
        showToast('비밀번호가 일치하지 않습니다.', 'error');
        isValid = false;
    }
    
    return isValid;
}

// 이메일 중복 확인 처리
async function handleEmailCheck() {
    const email = document.getElementById('registerEmail').value;
    const emailError = document.getElementById('emailError');
    const emailSuccess = document.getElementById('emailSuccess');
    const checkBtn = document.getElementById('checkEmailBtn');
    
    if (!email.trim()) {
        showToast('이메일을 입력해주세요.', 'error');
        return;
    }
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('유효한 이메일 주소를 입력해주세요.', 'error');
        return;
    }
    
    try {
        checkBtn.disabled = true;
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>확인 중...';
        
        const response = await apiRequest('/auth/check-email', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        
        // 성공 시
        emailError.style.display = 'none';
        emailSuccess.style.display = 'block';
        document.getElementById('registerEmail').classList.remove('is-invalid');
        document.getElementById('registerEmail').classList.add('is-valid');
        
        showToast('사용 가능한 이메일입니다.', 'success');
        
    } catch (error) {
        // 실패 시
        emailSuccess.style.display = 'none';
        emailError.style.display = 'block';
        emailError.textContent = error.message;
        document.getElementById('registerEmail').classList.remove('is-valid');
        document.getElementById('registerEmail').classList.add('is-invalid');
        
        showToast(error.message, 'error');
    } finally {
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-check me-1"></i>중복 확인';
    }
}

// 이메일 입력 시 중복 확인 상태 초기화
function resetEmailCheck() {
    const emailError = document.getElementById('emailError');
    const emailSuccess = document.getElementById('emailSuccess');
    const emailInput = document.getElementById('registerEmail');
    
    emailError.style.display = 'none';
    emailSuccess.style.display = 'none';
    emailInput.classList.remove('is-valid', 'is-invalid');
}

// ID 실시간 validation
function validateIdRealtime() {
    const idInput = document.getElementById('registerId');
    const idError = document.getElementById('idError');
    const idSuccess = document.getElementById('idSuccess');
    const id = idInput.value;
    
    // ID 검증 (영어와 숫자만)
    const idRegex = /^[a-zA-Z0-9]+$/;
    let isValid = true;
    let message = '';
    
    if (id.length === 0) {
        // 입력이 없으면 validation 상태 초기화
        idInput.classList.remove('is-valid', 'is-invalid');
        idError.style.display = 'none';
        idSuccess.style.display = 'none';
        return;
    }
    
    if (id.length < 3) {
        isValid = false;
        message = 'ID는 최소 3자 이상이어야 합니다.';
    } else if (id.length > 20) {
        isValid = false;
        message = 'ID는 최대 20자까지 입력 가능합니다.';
    } else if (!idRegex.test(id)) {
        isValid = false;
        message = 'ID는 영어와 숫자만 사용 가능합니다.';
    }
    
    // 시각적 피드백
    if (isValid) {
        idInput.classList.remove('is-invalid');
        idInput.classList.add('is-valid');
        idError.style.display = 'none';
        idSuccess.style.display = 'block';
        idInput.setCustomValidity(''); // validation 통과 시 오류 메시지 제거
    } else {
        idInput.classList.remove('is-valid');
        idInput.classList.add('is-invalid');
        idError.textContent = message;
        idError.style.display = 'block';
        idSuccess.style.display = 'none';
        idInput.setCustomValidity(message);
    }
}

// 성명 실시간 validation
function validateNameRealtime() {
    const nameInput = document.getElementById('registerName');
    const nameError = document.getElementById('nameError');
    const nameSuccess = document.getElementById('nameSuccess');
    const name = nameInput.value;
    
    // 성명 검증 (한글과 영어만)
    const nameRegex = /^[가-힣a-zA-Z\s]+$/;
    let isValid = true;
    let message = '';
    
    if (name.length === 0) {
        // 입력이 없으면 validation 상태 초기화
        nameInput.classList.remove('is-valid', 'is-invalid');
        nameError.style.display = 'none';
        nameSuccess.style.display = 'none';
        return;
    }
    
    if (name.length < 2) {
        isValid = false;
        message = '성명은 최소 2자 이상이어야 합니다.';
    } else if (name.length > 20) {
        isValid = false;
        message = '성명은 최대 20자까지 입력 가능합니다.';
    } else if (!nameRegex.test(name)) {
        isValid = false;
        message = '성명은 한글 또는 영어만 사용 가능합니다.';
    }
    
    // 시각적 피드백
    if (isValid) {
        nameInput.classList.remove('is-invalid');
        nameInput.classList.add('is-valid');
        nameError.style.display = 'none';
        nameSuccess.style.display = 'block';
        nameInput.setCustomValidity(''); // validation 통과 시 오류 메시지 제거
    } else {
        nameInput.classList.remove('is-valid');
        nameInput.classList.add('is-invalid');
        nameError.textContent = message;
        nameError.style.display = 'block';
        nameSuccess.style.display = 'none';
        nameInput.setCustomValidity(message);
    }
}

// 휴대전화 번호 자동 포맷팅 함수
function formatPhoneNumber(e) {
    let value = e.target.value;
    
    // 숫자만 추출
    const numbers = value.replace(/\D/g, '');
    
    // 11자리 제한
    const limitedNumbers = numbers.slice(0, 11);
    
    // 하이픈 자동 추가
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

// ID 중복확인
async function checkId() {
    const idInput = document.getElementById('registerId');
    const id = idInput.value.trim();
    
    if (!id) {
        showToast('ID를 입력해주세요.', 'warning');
        return;
    }
    
    // ID 형식 검증
    if (!/^[a-zA-Z0-9]+$/.test(id)) {
        showToast('ID는 영어와 숫자만 사용 가능합니다.', 'error');
        return;
    }
    
    if (id.length < 3 || id.length > 20) {
        showToast('ID는 3-20자 사이여야 합니다.', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await apiRequest('/auth/check-id', {
            method: 'POST',
            body: JSON.stringify({ id })
        });
        
        // 성공 시 UI 업데이트
        idInput.classList.remove('is-invalid');
        idInput.classList.add('is-valid');
        document.getElementById('idError').style.display = 'none';
        document.getElementById('idSuccess').style.display = 'block';
        
        showToast('사용 가능한 ID입니다.', 'success');
        
    } catch (error) {
        // 실패 시 UI 업데이트
        idInput.classList.remove('is-valid');
        idInput.classList.add('is-invalid');
        document.getElementById('idSuccess').style.display = 'none';
        document.getElementById('idError').textContent = error.message;
        document.getElementById('idError').style.display = 'block';
        
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ID 중복확인 상태 초기화
function resetIdCheck() {
    const idInput = document.getElementById('registerId');
    idInput.classList.remove('is-valid', 'is-invalid');
    document.getElementById('idError').style.display = 'none';
    document.getElementById('idSuccess').style.display = 'none';
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
