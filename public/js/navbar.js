// GNB 동적 생성 및 관리
class NavBar {
    constructor() {
        this.currentPath = window.location.pathname;
        this.user = null;
        this.init();
    }

    // 초기화
    async init() {
        this.createNavbar();
        await this.checkAuthStatus();
        this.setActiveNavItem();
        // 로그인된 사용자라면 온라인 상태로 설정
        if (this.user) {
            // 온라인 상태 설정 (페이지 이동 시에도 유지)
            await this.updateOnlineStatus(true);
            this.setupWebSocket();
            // 알림 상태 확인
            await this.checkNotificationStatus();
            // 알림 목록 로드
            this.loadNotificationList();
        }
    }

    // 인증 상태 확인
    async checkAuthStatus() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
                this.user = null;
            return;
        }

            const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
                const data = await response.json();
                this.user = data.user;
                this.createNavbar();
                this.updateAuthUI();
                // 로그인된 사용자라면 온라인 상태로 설정
                await this.updateOnlineStatus(true);
                this.setupWebSocket();
                // 알림 목록 로드
                this.loadNotificationList();
        } else {
            localStorage.removeItem('token');
                this.user = null;
                this.createNavbar();
                this.updateAuthUI();
        }
    } catch (error) {
        console.error('인증 상태 확인 실패:', error);
            this.user = null;
            this.createNavbar();
            this.updateAuthUI();
    }
}

    // 인증 UI 업데이트
    updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
        const userNameSpan = document.getElementById('userName');

        if (this.user) {
            if (authButtons) authButtons.classList.add('d-none');
            if (userMenu) userMenu.classList.remove('d-none');
            if (userNameSpan) userNameSpan.textContent = this.user.name || this.user.user_id;
            // 알림 상태 확인
            this.checkNotificationStatus();
        } else {
    if (authButtons) authButtons.classList.remove('d-none');
    if (userMenu) userMenu.classList.add('d-none');
}
    }

    // 알림 상태 확인
    async checkNotificationStatus() {
        if (!this.user) return;

        try {
            const response = await fetch('/api/notifications/unread-count', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const unreadCount = data.unreadCount || 0;
                console.log('📊 미읽은 알림 수:', unreadCount, '타입:', typeof unreadCount);
                this.updateNotificationBadge(unreadCount);
            } else {
                console.error('알림 상태 조회 실패:', response.status);
            }
        } catch (error) {
            console.error('알림 상태 확인 실패:', error);
        }
    }

    // 알림 배지 업데이트
    updateNotificationBadge(count) {
        const badge = document.getElementById('notificationBadge');
        const icon = document.getElementById('notificationIcon');
        
        console.log('🔔 알림 배지 업데이트:', count, 'badge:', badge, 'icon:', icon);
        
        if (badge && icon) {
            // count가 숫자가 아닌 경우 숫자로 변환
            const badgeCount = typeof count === 'number' ? count : parseInt(count) || 0;
            
            if (badgeCount > 0) {
                badge.textContent = badgeCount > 99 ? '99+' : badgeCount.toString();
                badge.classList.remove('d-none');
                icon.classList.add('text-warning'); // 알림이 있을 때 노란색
                console.log('✅ 알림 배지 표시:', badgeCount);
            } else {
                badge.classList.add('d-none');
                icon.classList.remove('text-warning');
                console.log('❌ 알림 배지 숨김');
            }
        } else {
            console.warn('⚠️ 알림 배지 또는 아이콘을 찾을 수 없습니다.');
        }
        
        // 알림 목록도 업데이트 (비동기이지만 await 없이 호출)
        this.loadNotificationList();
    }
    
    // 채팅방의 메시지 알림 읽음 처리
    async markChatRoomNotificationsAsRead(roomId) {
        try {
            const response = await fetch(`/api/notifications/read-chat-room/${roomId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                console.log(`✅ 채팅방 ${roomId}의 알림을 읽음 처리했습니다.`);
            }
        } catch (error) {
            console.error('채팅방 알림 읽음 처리 실패:', error);
        }
    }

    // 알림 목록 로드
    async loadNotificationList() {
        if (!this.user) return;
        
        try {
            const response = await fetch('/api/notifications?limit=10', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderNotificationList(data.notifications || []);
            }
        } catch (error) {
            console.error('알림 목록 로드 실패:', error);
        }
    }
    
    // 알림 목록 렌더링
    renderNotificationList(notifications) {
        const container = document.getElementById('notificationListContainer');
        if (!container) return;
        
        if (notifications.length === 0) {
            container.innerHTML = '<div class="text-center p-3 text-muted">알림이 없습니다</div>';
            return;
        }
        
        let html = '';
        notifications.forEach(notification => {
            let notificationData = null;
            try {
                notificationData = JSON.parse(notification.message);
            } catch (e) {
                notificationData = { message: notification.message };
            }
            
            const isMessage = notification.type === 'message';
            const isComment = notification.type === 'comment';
            const messageCount = notificationData.messageCount || 1;
            const timeAgo = this.getTimeAgo(new Date(notification.created_at));
            
            // 메시지 알림의 경우 펼침/접힘 기능 추가
            if (isMessage && messageCount > 1) {
                const messages = notificationData.messages || [];
                html += `
                    <li class="notification-item ${!notification.is_read ? 'bg-light' : ''}" data-notification-id="${notification.id}">
                        <div class="px-3 py-2">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="flex-grow-1">
                                    <div class="d-flex align-items-center mb-1">
                                        <i class="fas fa-envelope me-2 text-primary"></i>
                                        <strong>${notification.title}</strong>
                                        ${!notification.is_read ? '<span class="badge bg-danger ms-2">NEW</span>' : ''}
                                    </div>
                                    <p class="mb-1 small">${notificationData.lastMessage || notificationData.message || ''}</p>
                                    <small class="text-muted">${timeAgo}</small>
                                </div>
                                <button class="btn btn-sm btn-link p-0 ms-2" onclick="event.stopPropagation(); this.closest('.notification-item').querySelector('.message-details').classList.toggle('d-none'); this.querySelector('i').classList.toggle('fa-chevron-down'); this.querySelector('i').classList.toggle('fa-chevron-up');">
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                            </div>
                            <div class="message-details d-none mt-2 border-top pt-2">
                                <small class="text-muted d-block mb-2">${messageCount}개의 메시지</small>
                                ${messages.length > 0 ? messages.map(msg => `<div class="small mb-1">${msg}</div>`).join('') : ''}
                            </div>
                        </div>
                    </li>
                `;
            } else {
                html += `
                    <li class="notification-item ${!notification.is_read ? 'bg-light' : ''}" data-notification-id="${notification.id}">
                        <div class="px-3 py-2">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="flex-grow-1">
                                    <div class="d-flex align-items-center mb-1">
                                        <i class="fas fa-${isMessage ? 'envelope' : isComment ? 'comment' : 'bell'} me-2 text-${isMessage ? 'primary' : isComment ? 'info' : 'warning'}"></i>
                                        <strong>${notification.title}</strong>
                                        ${!notification.is_read ? '<span class="badge bg-danger ms-2">NEW</span>' : ''}
                                    </div>
                                    <p class="mb-1 small">${notificationData.message || ''}</p>
                                    <small class="text-muted">${timeAgo}</small>
                                </div>
                            </div>
                        </div>
                    </li>
                `;
            }
        });
        
        container.innerHTML = html;
        
        // 알림 클릭 이벤트 추가
        container.querySelectorAll('.notification-item').forEach(item => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const notificationId = item.dataset.notificationId;
                const notification = notifications.find(n => n.id == notificationId);
                if (notification) {
                    this.handleNotificationClick(notification);
                }
            });
        });
    }
    
    // 알림 클릭 처리
    handleNotificationClick(notification) {
        let notificationData = null;
        try {
            notificationData = JSON.parse(notification.message);
        } catch (e) {
            notificationData = { message: notification.message };
        }
        
        // 읽음 처리
        if (!notification.is_read) {
            fetch(`/api/notifications/${notification.id}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }).then(() => {
                this.checkNotificationStatus();
                this.loadNotificationList();
            });
        }
        
        // 알림 타입에 따라 이동
        if (notification.type === 'message' && notificationData.roomId) {
            // 알림 설정 페이지와 동일하게 roomId 파라미터 사용
            window.location.href = `/chat?roomId=${notificationData.roomId}`;
        } else if (notification.type === 'comment' && notificationData.postId) {
            window.location.href = `/posts/${notificationData.postId}`;
        }
    }
    
    // 시간 표시 (예: "5분 전")
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        if (days < 7) return `${days}일 전`;
        return date.toLocaleDateString('ko-KR');
    }

    // 온라인 상태 업데이트
    async updateOnlineStatus(isOnline) {
        if (!this.user) return;
        
        try {
            await fetch('/api/chat/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ isOnline })
            });
        } catch (error) {
            console.error('상태 업데이트 실패:', error);
        }
    }

    // WebSocket 연결 설정
    setupWebSocket() {
        const token = localStorage.getItem('token');
        if (!token) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/chat`;
        
        console.log('WebSocket 연결 시도:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('✅ NavBar WebSocket 연결됨');
            // WebSocket이 완전히 연결된 후 인증 토큰 전송
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'auth',
                    token: token
                }));
            }
        };
        
        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('📨 WebSocket 메시지 수신:', message);
                
                switch (message.type) {
                    case 'user_status_change':
                        console.log('🔄 사용자 상태 변경:', message);
                        // 사용자 상태 변경 처리
                        this.handleUserStatusChange(message);
                        break;
                    case 'notification':
                        console.log('📬 알림 수신:', message.notification);
                        // 알림 처리
                        this.handleNotification(message.notification);
                        break;
                    case 'chat_message':
                        console.log('💬 채팅 메시지 수신:', message);
                        // 채팅 메시지 처리 (전역 이벤트 발생)
                        window.dispatchEvent(new CustomEvent('chatMessageReceived', {
                            detail: message
                        }));
                        break;
                    case 'auth_success':
                        console.log('✅ NavBar WebSocket 인증 성공');
                        break;
                    case 'auth_error':
                        console.error('❌ NavBar WebSocket 인증 실패:', message.message);
                        break;
                }
            } catch (error) {
                console.error('❌ WebSocket 메시지 파싱 오류:', error);
            }
        };
        
        this.ws.onclose = (event) => {
            console.log('🔌 NavBar WebSocket 연결 종료:', event.code, event.reason);
            // 연결이 끊어지면 자동으로 재연결 시도
            setTimeout(() => {
                if (this.user) {
                    console.log('🔄 WebSocket 재연결 시도...');
                    this.setupWebSocket();
                }
            }, 3000);
        };
        
        this.ws.onerror = (error) => {
            console.error('❌ NavBar WebSocket 오류:', error);
        };
    }

    // 사용자 상태 변경 처리
    handleUserStatusChange(message) {
        const { userId, isOnline } = message;
        
        // userId가 없는 경우 처리
        if (!userId) {
            console.warn('⚠️ userId가 없는 상태 변경 메시지:', message);
            return;
        }
        
        console.log(`🔄 사용자 상태 변경 처리: userId ${userId} -> ${isOnline ? '온라인' : '오프라인'}`);
        
        // 전역 상태 변경 이벤트 발생
        window.dispatchEvent(new CustomEvent('userStatusChange', {
            detail: { userId, isOnline }
        }));
    }

    // 알림 처리
    async handleNotification(notification) {
        console.log('📬 알림 처리 시작:', notification);
        
        // 메시지 알림이고 현재 채팅 페이지에 해당 채팅방이 열려있으면 알림 표시하지 않음
        if (notification.type === 'message' && notification.roomId) {
            const currentPath = window.location.pathname;
            if (currentPath === '/chat') {
                // 전역 변수에서 현재 채팅방 ID 확인
                if (typeof window.currentChatRoomId !== 'undefined' && window.currentChatRoomId === notification.roomId) {
                    console.log('💬 채팅 중이므로 알림 표시하지 않음:', notification.roomId);
                    // 해당 채팅방의 알림을 읽음 처리
                    await this.markChatRoomNotificationsAsRead(notification.roomId);
                    // 배지와 목록만 업데이트 (토스트 팝업은 표시하지 않음)
                    await this.checkNotificationStatus();
                    await this.loadNotificationList();
                    return;
                }
            }
        }
        
        // 알림 타입에 따른 설정 확인
        try {
            const response = await fetch('/api/notifications/settings', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const settings = data.settings;
                
                // 알림 타입에 따라 설정 확인
                let isNotificationEnabled = true;
                if (notification.type === 'message') {
                    // 채팅 알림 설정 확인
                    const chatNotification = settings.chat_notification;
                    isNotificationEnabled = chatNotification === 1 || chatNotification === true || chatNotification === '1';
                } else if (notification.type === 'comment') {
                    // 댓글 알림 설정 확인
                    const commentNotification = settings.comment_notification;
                    isNotificationEnabled = commentNotification === 1 || commentNotification === true || commentNotification === '1';
                }
                
                if (!isNotificationEnabled) {
                    console.log(`🔕 알림 설정 OFF: ${notification.type} 알림 및 배지 업데이트 건너뜀`);
                    // OFF 상태에서는 배지도 업데이트하지 않음
                    return;
                }
            } else {
                console.warn('알림 설정 조회 실패:', response.status);
            }
        } catch (error) {
            console.error('알림 설정 확인 실패:', error);
            // 에러 발생 시에도 알림 표시 (기본 동작)
        }
        
        // 알림 배지 업데이트 (서버에서 최신 개수 가져오기)
        await this.checkNotificationStatus();
        
        // 알림 목록도 업데이트
        await this.loadNotificationList();
        
        // 토스트 팝업 표시
        this.showNotificationToast(notification);
        
        // 브라우저 알림 표시
        if (Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message
            });
        } else if (Notification.permission !== 'denied') {
            // 알림 권한 요청
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(notification.title, {
                        body: notification.message
                    });
                }
            });
        }
        
        // 전역 알림 이벤트 발생
        window.dispatchEvent(new CustomEvent('newNotification', {
            detail: notification
        }));
    }
    
    // 토스트 팝업 표시
    showNotificationToast(notification) {
        const toastContainer = this.getOrCreateToastContainer();
        const SINGLE_TOAST_ID = 'singleNotificationToast';
        
        // 기존 토스트가 있으면 제거
        const existingToast = document.getElementById(SINGLE_TOAST_ID);
        if (existingToast) {
            const existingBootstrapToast = bootstrap.Toast.getInstance(existingToast);
            if (existingBootstrapToast) {
                existingBootstrapToast.hide();
            }
            existingToast.remove();
        }
        
        const icon = notification.type === 'message' ? 'envelope' : notification.type === 'comment' ? 'comment' : 'bell';
        const bgColor = notification.type === 'message' ? 'primary' : notification.type === 'comment' ? 'info' : 'warning';
        const title = notification.type === 'message' ? '새 메시지' : notification.type === 'comment' ? '새 댓글' : '알림';
        
        const toastHTML = `
            <div id="${SINGLE_TOAST_ID}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="5000">
                <div class="toast-header bg-${bgColor} text-white">
                    <i class="fas fa-${icon} me-2"></i>
                    <strong class="me-auto">${title}</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${notification.message || notification.title}
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        const toastElement = document.getElementById(SINGLE_TOAST_ID);
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        
        // 토스트가 숨겨지면 DOM에서 제거
        toastElement.addEventListener('hidden.bs.toast', function() {
            this.remove();
        });
    }
    
    // 토스트 컨테이너 가져오기 또는 생성
    getOrCreateToastContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        return container;
    }

    // GNB HTML 생성
    createNavbar() {
        const navbarHTML = `
            <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
                <div class="container">
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav me-auto">
                            <li class="nav-item">
                                <a class="nav-link" href="/">
                                    <i class="fas fa-home me-1"></i>홈
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="/board">
                                    <i class="fas fa-comments me-1"></i>게시판
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="#" onclick="handleChatClick(event)">
                                    <i class="fas fa-comments me-1"></i>채팅
                                </a>
                            </li>
                        </ul>
                        ${this.user ? this.createUserMenu() : this.createAuthButtons()}
                    </div>
                </div>
            </nav>
        `;

        // 기존 navbar 제거
        const existingNavbar = document.querySelector('nav.navbar');
        if (existingNavbar) {
            existingNavbar.remove();
        }

        // 새 navbar 추가
        document.body.insertAdjacentHTML('afterbegin', navbarHTML);
    }

    // 인증 버튼 생성
    createAuthButtons() {
        return `
            <ul class="navbar-nav">
                <li class="nav-item">
                    <a class="nav-link" href="/login">
                        <i class="fas fa-sign-in-alt me-1"></i>로그인
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/register">
                        <i class="fas fa-user-plus me-1"></i>회원가입
                    </a>
                </li>
            </ul>
        `;
    }

    // 사용자 메뉴 생성
    createUserMenu() {
        return `
            <ul class="navbar-nav">
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                        <i class="fas fa-user me-1"></i>${this.user.name || this.user.user_id || '사용자'}
                    </a>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="/profile">
                            <i class="fas fa-user-edit me-1"></i>프로필 관리
                        </a></li>
                        <li><a class="dropdown-item" href="/notifications">
                            <i class="fas fa-bell me-1"></i>알림 설정
                        </a></li>
                        <li><a class="dropdown-item" href="#" onclick="logout()">
                            <i class="fas fa-sign-out-alt me-1"></i>로그아웃
                        </a></li>
                    </ul>
                </li>
                <li class="nav-item dropdown">
                    <a class="nav-link position-relative dropdown-toggle" href="#" role="button" id="notificationIcon" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-bell"></i>
                        <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" id="notificationBadge">
                            0
                        </span>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end" id="notificationDropdown" style="min-width: 350px; max-height: 500px; overflow-y: auto;">
                        <li><h6 class="dropdown-header">
                            <i class="fas fa-bell me-2"></i>알림
                            <a href="/notifications" class="float-end text-decoration-none small">전체 보기</a>
                        </h6></li>
                        <li><hr class="dropdown-divider"></li>
                        <li id="notificationListContainer">
                            <div class="text-center p-3 text-muted">
                                <i class="fas fa-spinner fa-spin"></i> 로딩 중...
                            </div>
                        </li>
                    </ul>
                </li>
            </ul>
        `;
    }

    // 활성 메뉴 설정
    setActiveNavItem() {
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');

            // 알림 설정 페이지에서는 어떤 메뉴도 active 하지 않음
            if (this.currentPath === '/notifications') {
                return;
            }

            // 홈 페이지
            if (this.currentPath === '/' && href === '/') {
                link.classList.add('active');
            }
            // 게시판 페이지 (게시판 관련 모든 페이지)
            else if ((this.currentPath === '/board' ||
                      this.currentPath === '/write' ||
                      this.currentPath === '/write.html' ||
                      this.currentPath.startsWith('/posts/')) &&
                     href === '/board') {
                link.classList.add('active');
            }
            // 로그인 페이지
            else if (this.currentPath === '/login' && href === '/login') {
                link.classList.add('active');
            }
            // 회원가입 페이지
            else if (this.currentPath === '/register' && href === '/register') {
                link.classList.add('active');
            }
            // 프로필 페이지
            else if (this.currentPath === '/profile' && href === '/profile') {
                link.classList.add('active');
            }
            // 채팅 페이지
            else if (this.currentPath === '/chat' && href === '/chat') {
                link.classList.add('active');
                }
            });
        }
}

// 채팅 클릭 핸들러
function handleChatClick(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
        // 로그인 유도 팝업 표시
        showLoginModal('채팅');
    } else {
        // 로그인된 상태면 채팅 페이지로 이동
        window.location.href = '/chat';
    }
}

// 로그인 유도 모달 표시 (전역 함수)
window.showLoginModal = function(feature = '기능') {
    const modalHTML = `
        <div class="modal fade" id="loginModal" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="loginModalLabel">
                            <i class="fas fa-sign-in-alt me-2"></i>로그인이 필요합니다
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center">
                            <i class="fas fa-lock fa-3x text-primary mb-3"></i>
                            <p class="mb-3">${feature}을(를) 사용하려면 로그인이 필요합니다.</p>
                            <p class="text-muted">로그인 후 모든 기능을 자유롭게 이용해보세요!</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>
                        <a href="/login" class="btn btn-primary">
                            <i class="fas fa-sign-in-alt me-1"></i>로그인하기
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 기존 모달 제거
    const existingModal = document.getElementById('loginModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 새 모달 추가
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 모달 표시
    const modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
    
    // 모달이 닫힐 때 제거
    document.getElementById('loginModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// 전역 인증 상태 확인 함수
window.checkAuthStatus = async function() {
    const navbar = window.navbarInstance;
    if (navbar) {
        await navbar.checkAuthStatus();
        navbar.setActiveNavItem();
    }
};

// 전역 알림 상태 업데이트 함수
window.updateNotificationStatus = function() {
    const navbar = window.navbarInstance;
    if (navbar && navbar.user) {
        navbar.checkNotificationStatus();
    }
};

// 로그아웃 함수 (전역)
async function logout() {
    console.log('🚪 로그아웃 시작');
    
    // 로그아웃 전에 오프라인 상태로 변경 (WebSocket 연결이 끊어지기 전에)
    try {
        console.log('📤 오프라인 상태 전송 중...');
        await fetch('/api/chat/status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ isOnline: false })
        });
        console.log('✅ 오프라인 상태 전송 완료');
    } catch (error) {
        console.error('❌ 로그아웃 상태 업데이트 실패:', error);
    }
    
    // 잠시 대기 (브로드캐스트가 완료될 시간을 줌)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // WebSocket 연결 종료
    if (window.navbarInstance && window.navbarInstance.ws) {
        console.log('🔌 WebSocket 연결 종료');
        window.navbarInstance.ws.close();
    }
    
    localStorage.removeItem('token');
    window.location.href = '/';
}

// 페이지 로드 시 GNB 생성
document.addEventListener('DOMContentLoaded', function() {
    window.navbarInstance = new NavBar();
});