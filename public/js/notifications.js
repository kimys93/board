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
    // 각 토글 버튼에 실시간 변경 이벤트 추가
    const toggleIds = [
        'chatNotification',
        'commentNotification'
    ];
    
    toggleIds.forEach(id => {
        const toggle = document.getElementById(id);
        if (toggle) {
            toggle.addEventListener('change', async function() {
                await saveNotificationSetting(id, this.checked);
            });
        }
    });
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
        notificationElement.className = `notification-item ${notification.is_read ? 'read' : 'unread'} ${(notification.type === 'message' || notification.type === 'comment') ? 'clickable' : ''}`;
        
        // 메시지 알림인 경우 JSON 파싱
        let displayMessage = notification.message;
        let notificationData = null;
        if (notification.type === 'message' || notification.type === 'comment') {
            try {
                notificationData = JSON.parse(notification.message);
                displayMessage = notificationData.message || notification.message;
            } catch (e) {
                // JSON 파싱 실패 시 원본 메시지 사용
                displayMessage = notification.message;
            }
        }
        
        const time = new Date(notification.created_at).toLocaleString('ko-KR');
        
        // 알림 타입에 따른 클릭 핸들러 설정
        let clickHandler = '';
        if (notification.type === 'message' && notificationData) {
            clickHandler = `onclick="openChatFromNotification(${parseInt(notification.id)}, ${parseInt(notificationData.roomId)}, ${parseInt(notificationData.senderId)}, '${String(notificationData.senderName).replace(/'/g, "\\'")}')" style="cursor: pointer;"`;
        } else if (notification.type === 'comment' && notificationData) {
            clickHandler = `onclick="openPostFromNotification(${parseInt(notification.id)}, ${parseInt(notificationData.postId)})" style="cursor: pointer;"`;
        }
        
        notificationElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-start" ${clickHandler} style="${clickHandler ? 'cursor: pointer;' : ''}">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-1">
                        <i class="fas fa-${getNotificationIcon(notification.type)} me-2 text-${getNotificationColor(notification.type)}"></i>
                        <strong>${notification.title}</strong>
                        ${!notification.is_read ? '<span class="badge bg-danger ms-2">NEW</span>' : ''}
                    </div>
                    <p class="mb-1">${displayMessage}</p>
                    <small class="notification-time">${time}</small>
                </div>
                <div class="dropdown" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <ul class="dropdown-menu">
                        ${!notification.is_read ? `<li><a class="dropdown-item" href="#" onclick="markAsRead(${notification.id})"><i class="fas fa-check me-1"></i>읽음</a></li>` : ''}
                        <li><a class="dropdown-item text-danger" href="#" onclick="deleteNotification(${notification.id})"><i class="fas fa-trash me-1"></i>삭제</a></li>
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
    document.getElementById('chatNotification').checked = notificationSettings.chat_notification !== undefined ? notificationSettings.chat_notification : true;
    document.getElementById('commentNotification').checked = notificationSettings.comment_notification !== undefined ? notificationSettings.comment_notification : true;
}

// 개별 설정 실시간 저장
async function saveNotificationSetting(settingId, value) {
    const settingMap = {
        'chatNotification': 'chat_notification',
        'commentNotification': 'comment_notification'
    };
    
    const settingKey = settingMap[settingId];
    if (!settingKey) return;
    
    // 현재 설정값 가져오기
    const currentSettings = {
        chat_notification: document.getElementById('chatNotification').checked,
        comment_notification: document.getElementById('commentNotification').checked
    };
    
    try {
        const response = await apiRequest('/notifications/settings', {
            method: 'PUT',
            body: JSON.stringify(currentSettings)
        });
        
        // 응답에서 업데이트된 설정값 사용
        if (response.settings) {
            notificationSettings = response.settings;
            console.log('💾 저장된 설정:', response.settings);
        } else {
            // 응답에 settings가 없으면 로컬 값 사용
            notificationSettings[settingKey] = value;
        }
        
        console.log(`💾 ${settingId} 설정 ${value ? 'ON' : 'OFF'}으로 변경됨`);
        
        // 알림 설정 변경 로그
        if (settingKey === 'chat_notification') {
            console.log(`💬 채팅 알림 ${value ? 'ON' : 'OFF'}`);
        } else if (settingKey === 'comment_notification') {
            console.log(`💭 댓글 알림 ${value ? 'ON' : 'OFF'}`);
        }
        
    } catch (error) {
        console.error('설정 저장 실패:', error);
        // 실패 시 원래 상태로 복구
        document.getElementById(settingId).checked = !value;
        showToast('설정 저장에 실패했습니다.', 'error');
    }
}

// 알림 설정 저장 (폼 제출 시)
async function handleSettingsSave(e) {
    e.preventDefault();
    
    const settings = {
        browser_notification: document.getElementById('browserNotification').checked,
        chat_notification: document.getElementById('chatNotification').checked,
        comment_notification: document.getElementById('commentNotification').checked
    };
    
    try {
        showLoading(true);
        
        await apiRequest('/notifications/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
        
        // 전역 설정 업데이트
        notificationSettings = settings;
        
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
                body: '브라우저 알림이 정상적으로 작동합니다.'
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
    // 브라우저 알림 (브라우저 권한만 확인)
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
            body: notification.message
        });
    }
    
    // 토스트 알림
    showToast(notification.message, 'info');
}

// 알림 클릭 시 채팅방으로 이동
async function openChatFromNotification(notificationId, roomId, senderId, senderName) {
    try {
        // 알림 읽음 처리
        if (typeof markAsRead === 'function') {
            await markAsRead(notificationId);
        }
        
        // 채팅 페이지로 이동
        if (window.location.pathname !== '/chat') {
            // 채팅 페이지로 이동하면서 roomId 전달
            window.location.href = `/chat?roomId=${roomId}`;
        } else {
            // 이미 채팅 페이지에 있는 경우 바로 채팅방 선택
            // chat.js의 selectChatRoom 함수 사용
            if (typeof selectChatRoom === 'function') {
                // 채팅방 정보 가져오기
                const response = await fetch('/api/chat/rooms', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const room = data.rooms.find(r => r.room_id === roomId);
                    if (room) {
                        selectChatRoom(
                            room.room_id,
                            room.other_user_id,
                            room.other_user_name,
                            room.other_user_user_id,
                            room.other_user_online
                        );
                    }
                }
            } else {
                // chat.js가 아직 로드되지 않은 경우
                window.location.href = `/chat?roomId=${roomId}`;
            }
        }
    } catch (error) {
        console.error('채팅방 이동 실패:', error);
        if (typeof showToast === 'function') {
            showToast('채팅방을 열 수 없습니다.', 'error');
        }
    }
}

// 알림 클릭 시 게시글로 이동
async function openPostFromNotification(notificationId, postId) {
    try {
        // 알림 읽음 처리
        if (typeof markAsRead === 'function') {
            await markAsRead(notificationId);
        }
        
        // 게시글 상세 페이지로 이동
        window.location.href = `/posts/${postId}`;
    } catch (error) {
        console.error('게시글 이동 실패:', error);
        if (typeof showToast === 'function') {
            showToast('게시글을 열 수 없습니다.', 'error');
        }
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
