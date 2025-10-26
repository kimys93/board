// 전역 변수
let currentUser = null;
let notificationSettings = {};

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
    loadNotifications();
    loadNotificationSettings();
    requestNotificationPermission();
}

// 인증 확인
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await apiRequest('/auth/me');
            currentUser = response.user;
        } catch (error) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
    } else {
        window.location.href = '/login';
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 알림 설정 폼
    document.getElementById('notificationSettingsForm').addEventListener('submit', handleSettingsSave);
}

// 알림 목록 로드
async function loadNotifications() {
    try {
        const response = await apiRequest('/notifications');
        displayNotifications(response.notifications);
        updateNotificationBadge(response.unreadCount);
    } catch (error) {
        showToast('알림을 불러오는데 실패했습니다.', 'error');
    }
}

// 알림 설정 로드
async function loadNotificationSettings() {
    try {
        const response = await apiRequest('/notifications/settings');
        notificationSettings = response.settings;
        updateSettingsForm();
    } catch (error) {
        console.error('알림 설정 로드 실패:', error);
    }
}

// 알림 표시
function displayNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    container.innerHTML = '';

    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="text-center p-4 text-muted">
                <i class="fas fa-bell-slash fa-3x mb-3"></i>
                <p>알림이 없습니다.</p>
            </div>
        `;
        return;
    }

    notifications.forEach(notification => {
        const notificationElement = document.createElement('div');
        notificationElement.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
        
        const time = new Date(notification.created_at).toLocaleString('ko-KR');
        
        notificationElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-1">
                        <i class="fas fa-${getNotificationIcon(notification.type)} me-2 text-${getNotificationColor(notification.type)}"></i>
                        <strong>${notification.title}</strong>
                        ${!notification.read ? '<span class="badge bg-danger ms-2">NEW</span>' : ''}
                    </div>
                    <p class="mb-1">${notification.message}</p>
                    <small class="notification-time">${time}</small>
                </div>
                <div class="dropdown">
                    <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <ul class="dropdown-menu">
                        ${!notification.read ? '<li><a class="dropdown-item" href="#" onclick="markAsRead(' + notification.id + ')"><i class="fas fa-check me-1"></i>읽음</a></li>' : ''}
                        <li><a class="dropdown-item text-danger" href="#" onclick="deleteNotification(' + notification.id + ')"><i class="fas fa-trash me-1"></i>삭제</a></li>
                    </ul>
                </div>
            </div>
        `;
        
        container.appendChild(notificationElement);
    });
}

// 알림 아이콘 가져오기
function getNotificationIcon(type) {
    const icons = {
        'comment': 'comment',
        'message': 'envelope',
        'system': 'cog',
        'warning': 'exclamation-triangle',
        'success': 'check-circle'
    };
    return icons[type] || 'bell';
}

// 알림 색상 가져오기
function getNotificationColor(type) {
    const colors = {
        'comment': 'primary',
        'message': 'success',
        'system': 'info',
        'warning': 'warning',
        'success': 'success'
    };
    return colors[type] || 'secondary';
}

// 알림 설정 폼 업데이트
function updateSettingsForm() {
    document.getElementById('emailCommentNotification').checked = notificationSettings.email_comment || false;
    document.getElementById('emailMessageNotification').checked = notificationSettings.email_message || false;
    document.getElementById('emailSystemNotification').checked = notificationSettings.email_system || false;
    document.getElementById('browserNotification').checked = notificationSettings.browser_notification || false;
    document.getElementById('soundNotification').checked = notificationSettings.sound_notification || false;
    document.getElementById('smsNotification').checked = notificationSettings.sms_notification || false;
}

// 알림 설정 저장
async function handleSettingsSave(e) {
    e.preventDefault();
    
    const settings = {
        email_comment: document.getElementById('emailCommentNotification').checked,
        email_message: document.getElementById('emailMessageNotification').checked,
        email_system: document.getElementById('emailSystemNotification').checked,
        browser_notification: document.getElementById('browserNotification').checked,
        sound_notification: document.getElementById('soundNotification').checked,
        sms_notification: document.getElementById('smsNotification').checked
    };
    
    try {
        showLoading(true);
        
        await apiRequest('/notifications/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
        
        showToast('알림 설정이 저장되었습니다.', 'success');
        
    } catch (error) {
        showToast('설정 저장에 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// 알림 권한 요청
async function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                showToast('브라우저 알림이 허용되었습니다.', 'success');
            }
        }
    }
}

// 브라우저 알림 테스트
function testBrowserNotification() {
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            new Notification('알림 테스트', {
                body: '브라우저 알림이 정상적으로 작동합니다.',
                icon: '/static/images/notification-icon.png'
            });
            showToast('브라우저 알림을 전송했습니다.', 'success');
        } else {
            showToast('브라우저 알림 권한이 필요합니다.', 'error');
        }
    } else {
        showToast('이 브라우저는 알림을 지원하지 않습니다.', 'error');
    }
}

// 이메일 알림 테스트
async function testEmailNotification() {
    try {
        showLoading(true);
        
        await apiRequest('/notifications/test/email', {
            method: 'POST',
            body: JSON.stringify({
                type: 'test',
                message: '이메일 알림 테스트입니다.'
            })
        });
        
        showToast('테스트 이메일을 전송했습니다.', 'success');
        
    } catch (error) {
        showToast('이메일 전송에 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// SMS 알림 테스트
async function testSmsNotification() {
    try {
        showLoading(true);
        
        await apiRequest('/notifications/test/sms', {
            method: 'POST',
            body: JSON.stringify({
                type: 'test',
                message: 'SMS 알림 테스트입니다.'
            })
        });
        
        showToast('테스트 SMS를 전송했습니다.', 'success');
        
    } catch (error) {
        showToast('SMS 전송에 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// 알림 읽음 처리
async function markAsRead(notificationId) {
    try {
        await apiRequest(`/notifications/${notificationId}/read`, {
            method: 'PUT'
        });
        
        loadNotifications();
        showToast('알림을 읽음으로 표시했습니다.', 'success');
        
    } catch (error) {
        showToast('알림 처리에 실패했습니다.', 'error');
    }
}

// 모든 알림 읽음 처리
async function markAllAsRead() {
    try {
        showLoading(true);
        
        await apiRequest('/notifications/read-all', {
            method: 'PUT'
        });
        
        loadNotifications();
        showToast('모든 알림을 읽음으로 표시했습니다.', 'success');
        
    } catch (error) {
        showToast('알림 처리에 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// 알림 삭제
async function deleteNotification(notificationId) {
    if (!confirm('이 알림을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await apiRequest(`/notifications/${notificationId}`, {
            method: 'DELETE'
        });
        
        loadNotifications();
        showToast('알림을 삭제했습니다.', 'success');
        
    } catch (error) {
        showToast('알림 삭제에 실패했습니다.', 'error');
    }
}

// 모든 알림 삭제
async function clearAllNotifications() {
    if (!confirm('모든 알림을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        await apiRequest('/notifications/clear-all', {
            method: 'DELETE'
        });
        
        loadNotifications();
        showToast('모든 알림을 삭제했습니다.', 'success');
        
    } catch (error) {
        showToast('알림 삭제에 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// 알림 배지 업데이트
function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// 실시간 알림 수신 (WebSocket 또는 Server-Sent Events)
function setupRealtimeNotifications() {
    // Server-Sent Events 사용
    const eventSource = new EventSource('/api/notifications/stream');
    
    eventSource.onmessage = function(event) {
        const notification = JSON.parse(event.data);
        showRealtimeNotification(notification);
        loadNotifications(); // 알림 목록 새로고침
    };
    
    eventSource.onerror = function(event) {
        console.error('SSE 연결 오류:', event);
    };
}

// 실시간 알림 표시
function showRealtimeNotification(notification) {
    // 브라우저 알림
    if (notificationSettings.browser_notification && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
            body: notification.message,
            icon: '/static/images/notification-icon.png'
        });
    }
    
    // 소리 알림
    if (notificationSettings.sound_notification) {
        playNotificationSound();
    }
    
    // 토스트 알림
    showToast(notification.message, 'info');
}

// 알림 소리 재생
function playNotificationSound() {
    const audio = new Audio('/static/sounds/notification.mp3');
    audio.play().catch(e => console.log('소리 재생 실패:', e));
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
