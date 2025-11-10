// 개인 채팅 JavaScript
let currentUser = null;
let currentRoomId = null;
let currentOtherUser = null;
let chatRooms = [];
let searchResults = [];
let displayedMessageIds = new Set(); // 이미 표시된 메시지 ID 추적
let websocketSetup = false; // WebSocket 이벤트 리스너 중복 등록 방지

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 앱 초기화
async function initializeApp() {
    await checkAuth();
    setupEventListeners();
    loadChatRooms();
    // 온라인 상태는 navbar에서 관리하므로 여기서는 설정하지 않음
    setupWebSocket();
    
    // URL 파라미터에서 roomId 확인 (알림 클릭으로 이동한 경우)
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomId');
    if (roomId) {
        // 채팅방 목록 로드 후 해당 채팅방 선택
        setTimeout(() => {
            const room = chatRooms.find(r => r.room_id === parseInt(roomId));
            if (room) {
                selectChatRoom(
                    room.room_id,
                    room.other_user_id,
                    room.other_user_name,
                    room.other_user_user_id,
                    room.other_user_online
                );
            }
            // URL에서 roomId 제거
            window.history.replaceState({}, '', '/chat');
        }, 500);
    } else {
        // 채팅방이 열려있지 않으면 서버에 알림
        notifyServerViewingRoom(null);
    }
}

// 인증 확인
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
        } else {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('인증 확인 실패:', error);
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 사용자 검색
    document.getElementById('userSearch').addEventListener('input', debounce(handleUserSearch, 300));
    document.getElementById('searchBtn').addEventListener('click', handleUserSearch);
    
    // 모달 검색
    document.getElementById('modalUserSearch').addEventListener('input', debounce(handleModalUserSearch, 300));
    document.getElementById('modalSearchBtn').addEventListener('click', handleModalUserSearch);
    
    // 메시지 전송
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // 페이지 언로드 시 서버에 채팅방을 보고 있지 않다고 알림
    window.addEventListener('beforeunload', function() {
        notifyServerViewingRoom(null);
    });
    
    // 페이지가 숨겨질 때도 서버에 알림
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            notifyServerViewingRoom(null);
        } else if (currentRoomId) {
            notifyServerViewingRoom(currentRoomId);
        }
    });
}

// 사용자 검색 (사이드바)
async function handleUserSearch() {
    const query = document.getElementById('userSearch').value.trim();
    console.log('검색 쿼리:', query);
    
    if (query.length < 2) {
        console.log('검색어가 너무 짧습니다.');
        return;
    }
    
    try {
        console.log('검색 API 호출 중...');
        const response = await fetch(`/api/chat/search?query=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        console.log('응답 상태:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('검색 결과:', data);
            showSearchResults(data.users);
        } else {
            const errorData = await response.json();
            console.error('검색 실패:', errorData);
            showToast('검색 중 오류가 발생했습니다.', 'error');
        }
    } catch (error) {
        console.error('사용자 검색 실패:', error);
        showToast('검색 중 오류가 발생했습니다.', 'error');
    }
}

// 모달 사용자 검색
async function handleModalUserSearch() {
    const query = document.getElementById('modalUserSearch').value.trim();
    if (query.length < 2) {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`/api/chat/search?query=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            showModalSearchResults(data.users);
        }
    } catch (error) {
        console.error('사용자 검색 실패:', error);
    }
}

// 사이드바 검색 결과 표시
function showSearchResults(users) {
    const chatRoomsList = document.getElementById('chatRoomsList');
    if (users.length === 0) {
        chatRoomsList.innerHTML = '<div class="text-center text-muted py-3">검색 결과가 없습니다.</div>';
        return;
    }
    
    chatRoomsList.innerHTML = users.map(user => `
        <div class="user-item" data-user-id="${user.id}" onclick="startChat(${user.id})">
            <div class="d-flex align-items-center">
                <div class="online-indicator ${user.is_online ? 'online' : 'offline'}"></div>
                <div class="flex-grow-1">
                    <div class="fw-bold">${user.name}</div>
                    <small class="text-muted">@${user.user_id}</small>
                </div>
                <div class="text-end">
                    <small class="text-muted">${user.is_online ? '온라인' : formatLastSeen(user.last_seen)}</small>
                </div>
            </div>
        </div>
    `).join('');
}

// 모달 검색 결과 표시
function showModalSearchResults(users) {
    const searchResults = document.getElementById('searchResults');
    if (users.length === 0) {
        searchResults.innerHTML = '<div class="text-center text-muted py-3">검색 결과가 없습니다.</div>';
        return;
    }
    
    searchResults.innerHTML = users.map(user => `
        <div class="user-item" data-user-id="${user.id}" onclick="startChatFromModal(${user.id}, '${user.name}', '${user.user_id}', ${user.is_online})">
            <div class="d-flex align-items-center">
                <div class="online-indicator ${user.is_online ? 'online' : 'offline'}"></div>
                <div class="flex-grow-1">
                    <div class="fw-bold">${user.name}</div>
                    <small class="text-muted">@${user.user_id}</small>
                </div>
                <div class="text-end">
                    <small class="text-muted">${user.is_online ? '온라인' : formatLastSeen(user.last_seen)}</small>
                </div>
            </div>
        </div>
    `).join('');
}

// 채팅 시작 (사이드바에서)
async function startChat(userId) {
    await createOrGetChatRoom(userId);
}

// 채팅 시작 (모달에서)
async function startChatFromModal(userId, userName, userUserId, isOnline) {
    await createOrGetChatRoom(userId);
    // 모달 닫기
    const modal = bootstrap.Modal.getInstance(document.getElementById('userSearchModal'));
    modal.hide();
}

// 채팅방 생성 또는 조회
async function createOrGetChatRoom(otherUserId) {
    try {
        const response = await fetch('/api/chat/room', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ otherUserId })
        });
        
        if (response.ok) {
            const data = await response.json();
            currentRoomId = data.roomId;
            currentOtherUser = data.otherUser;
            
            // 채팅 UI 표시
            showChatInterface();
            loadMessages();
            loadChatRooms(); // 채팅방 목록 새로고침
        } else {
            const error = await response.json();
            showToast(error.message, 'error');
        }
    } catch (error) {
        console.error('채팅방 생성 실패:', error);
        showToast('채팅방을 생성할 수 없습니다.', 'error');
    }
}

// 채팅 UI 표시
function showChatInterface() {
    document.getElementById('noChatSelected').classList.add('d-none');
    document.getElementById('chatHeader').classList.remove('d-none');
    document.getElementById('chatMessages').classList.remove('d-none');
    document.getElementById('chatInput').classList.remove('d-none');
    
    // 헤더 정보 업데이트
    document.getElementById('chatUserName').textContent = currentOtherUser.name;
    document.getElementById('chatUserStatus').textContent = '상대방 정보';
}

// 채팅방 목록 로드
async function loadChatRooms() {
    try {
        const response = await fetch('/api/chat/rooms', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            chatRooms = data.rooms;
            displayChatRooms();
        }
    } catch (error) {
        console.error('채팅방 목록 로드 실패:', error);
    }
}

// 채팅방 목록 표시
function displayChatRooms() {
    const container = document.getElementById('chatRoomsList');
    
    if (chatRooms.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-3">채팅방이 없습니다.</div>';
        return;
    }
    
    container.innerHTML = chatRooms.map(room => {
        const isActive = room.room_id === currentRoomId;
        const hasUnread = room.unread_count > 0;
        const isLastMessageFromMe = room.last_message_sender_id === currentUser.id;
        
        return `
        <div class="user-item ${isActive ? 'active' : ''}" data-user-id="${room.other_user_id}" onclick="selectChatRoom(${room.room_id}, ${room.other_user_id}, '${room.other_user_name}', '${room.other_user_user_id}', ${room.other_user_online})">
            <div class="d-flex align-items-center">
                <div class="online-indicator ${room.other_user_online ? 'online' : 'offline'}"></div>
                <div class="flex-grow-1">
                    <div class="fw-bold">${room.other_user_name}</div>
                    <small class="text-muted">@${room.other_user_user_id}</small>
                    ${room.last_message ? `
                        <div class="text-truncate mt-1" style="max-width: 200px;">
                            ${isLastMessageFromMe ? '나: ' : ''}${room.last_message}
                        </div>
                    ` : ''}
                </div>
                <div class="text-end">
                    ${hasUnread && !isLastMessageFromMe ? `<span class="unread-badge">${room.unread_count}</span>` : ''}
                    <div class="text-muted small">${formatLastSeen(room.last_message_time || room.other_user_last_seen)}</div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// 채팅방 선택
function selectChatRoom(roomId, otherUserId, otherUserName, otherUserUserId, isOnline) {
    currentRoomId = roomId;
    // 전역 변수에 현재 채팅방 ID 저장 (알림 처리 시 사용)
    window.currentChatRoomId = roomId;
    
    // 채팅방이 변경되면 표시된 메시지 ID 초기화
    displayedMessageIds.clear();
    
    currentOtherUser = {
        id: otherUserId,
        name: otherUserName,
        user_id: otherUserUserId
    };
    
    showChatInterface();
    loadMessages();
    
    // 서버에 현재 채팅방을 보고 있다고 알림
    notifyServerViewingRoom(roomId);
    
    // 채팅방을 열었을 때 해당 채팅방의 모든 읽지 않은 메시지 알림을 읽음 처리
    markChatRoomNotificationsAsRead(roomId);
    
    loadChatRooms(); // 채팅방 목록 새로고침 (알림 상태 업데이트)
    
    // GNB 채팅 알림 상태 업데이트 (채팅방 선택 시 알림 제거)
    if (typeof window.updateChatNotificationStatus === 'function') {
        window.updateChatNotificationStatus();
    }
}

// 서버에 현재 채팅방을 보고 있다고 알림
function notifyServerViewingRoom(roomId) {
    const navbar = window.navbarInstance;
    if (navbar && navbar.ws && navbar.ws.readyState === WebSocket.OPEN) {
        navbar.ws.send(JSON.stringify({
            type: 'viewing_room',
            roomId: roomId
        }));
        console.log(`📡 서버에 채팅방 ${roomId}를 보고 있다고 알림`);
    }
}

// 채팅방의 메시지 알림 읽음 처리
async function markChatRoomNotificationsAsRead(roomId) {
    try {
        const response = await fetch(`/api/notifications/read-chat-room/${roomId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            console.log(`✅ 채팅방 ${roomId}의 알림을 읽음 처리했습니다.`);
            // 알림 배지 업데이트
            if (typeof window.updateChatNotificationStatus === 'function') {
                window.updateChatNotificationStatus();
            }
        }
    } catch (error) {
        console.error('채팅방 알림 읽음 처리 실패:', error);
    }
}

// 메시지 로드
async function loadMessages() {
    if (!currentRoomId) return;
    
    try {
        const response = await fetch(`/api/chat/messages/${currentRoomId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayMessages(data.messages);
        }
    } catch (error) {
        console.error('메시지 로드 실패:', error);
    }
}

// 메시지 표시
function displayMessages(messages) {
    const container = document.getElementById('chatMessages');
    
    // 현재 채팅방의 표시된 메시지 ID 초기화
    displayedMessageIds.clear();
    
    container.innerHTML = messages.map(message => {
        // 메시지 ID를 Set에 추가
        displayedMessageIds.add(message.id);
        
        return `
        <div class="message-item ${message.sender_id === currentUser.id ? 'message-sent' : 'message-received'}" data-message-id="${message.id}">
            <div class="message-bubble">
                ${message.message}
            </div>
            <div class="message-time">
                ${formatMessageTime(message.created_at)}
            </div>
        </div>
    `;
    }).join('');
    
    // 스크롤을 맨 아래로
    container.scrollTop = container.scrollHeight;
}

// 메시지 전송
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message || !currentRoomId) return;
    
    try {
        const response = await fetch('/api/chat/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                roomId: currentRoomId,
                message: message
            })
        });
        
        if (response.ok) {
            messageInput.value = '';
            // WebSocket으로 메시지가 브로드캐스트되므로 loadMessages()는 호출하지 않음
            // 대신 채팅방 목록만 업데이트
            loadChatRooms(); // 채팅방 목록 새로고침
            
            // GNB 채팅 알림 상태 업데이트
            if (typeof window.updateChatNotificationStatus === 'function') {
                window.updateChatNotificationStatus();
            }
        } else {
            const error = await response.json();
            showToast(error.message, 'error');
        }
    } catch (error) {
        console.error('메시지 전송 실패:', error);
        showToast('메시지 전송에 실패했습니다.', 'error');
    }
}

// 온라인 상태 업데이트
async function updateOnlineStatus(isOnline) {
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

// WebSocket 연결 설정 (NavBar에서 전역으로 처리하므로 여기서는 이벤트 리스너만 설정)
function setupWebSocket() {
    // 이미 설정되었으면 중복 등록 방지
    if (websocketSetup) return;
    websocketSetup = true;
    
    // 전역 상태 변경 이벤트 수신
    window.addEventListener('userStatusChange', function(event) {
        handleUserStatusChange(event.detail);
    });
    
    // 채팅 메시지 수신 이벤트 리스너
    window.addEventListener('chatMessageReceived', function(event) {
        const messageData = event.detail;
        handleChatMessage(messageData);
    });
}

// 채팅 메시지 처리
function handleChatMessage(messageData) {
    const { roomId, message } = messageData;
    
    // 현재 열려있는 채팅방의 메시지인지 확인
    if (currentRoomId && currentRoomId === roomId) {
        // 메시지를 UI에 추가
        addMessageToUI(message);
        // 채팅방 목록도 업데이트
        loadChatRooms();
    } else {
        // 다른 채팅방의 메시지면 채팅방 목록만 업데이트
        loadChatRooms();
    }
}

// 메시지를 UI에 추가
function addMessageToUI(message) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    // 이미 표시된 메시지인지 확인 (중복 방지)
    if (displayedMessageIds.has(message.id)) {
        console.log('이미 표시된 메시지입니다:', message.id);
        return;
    }
    
    // 메시지 ID를 Set에 추가
    displayedMessageIds.add(message.id);
    
    const isOwnMessage = message.user_id === currentUser.id;
    const messageHTML = `
        <div class="message-item ${isOwnMessage ? 'message-sent' : 'message-received'}" data-message-id="${message.id}">
            <div class="message-bubble">
                ${message.content}
            </div>
            <div class="message-time">
                ${formatMessageTime(message.created_at)}
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', messageHTML);
    
    // 스크롤을 맨 아래로
    container.scrollTop = container.scrollHeight;
}

// 사용자 상태 변경 처리
function handleUserStatusChange(message) {
    const { userId, isOnline } = message;
    
    // 채팅방 목록에서 해당 사용자의 상태 업데이트 (userId로 비교)
    const userItems = document.querySelectorAll('.user-item');
    userItems.forEach(item => {
        const itemUserId = item.getAttribute('data-user-id');
        if (itemUserId && parseInt(itemUserId) === userId) {
            const onlineIndicator = item.querySelector('.online-indicator');
            
            if (onlineIndicator) {
                onlineIndicator.className = `online-indicator ${isOnline ? 'online' : 'offline'}`;
            }
        }
    });
    
    // 현재 채팅 중인 사용자의 상태가 변경된 경우 (userId로 비교)
    if (currentOtherUser && currentOtherUser.id === userId) {
        const chatUserStatus = document.getElementById('chatUserStatus');
        if (chatUserStatus) {
            chatUserStatus.textContent = isOnline ? '온라인' : '오프라인';
        }
    }
}

// 유틸리티 함수들
function formatLastSeen(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${Math.floor(diff / 86400000)}일 전`;
}

function formatMessageTime(timestamp) {
    const time = new Date(timestamp);
    return time.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 로그아웃
function logout() {
    updateOnlineStatus(false);
    localStorage.removeItem('token');
    currentUser = null;
    showToast('로그아웃되었습니다.', 'info');
    window.location.href = '/';
}