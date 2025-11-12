// 회원 관리 페이지 JavaScript

let currentPage = 1;
let currentSearch = '';
let deleteUserId = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async function() {
    // Admin 권한 체크
    await checkAdminAccess();
    
    // 회원 목록 로드
    await loadUsers();
    
    // 버그 설정 로드
    await loadBugSettings();
    
    // 검색 입력 엔터 키 이벤트
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchUsers();
        }
    });

    // 탭 변경 이벤트
    const bugsTab = document.getElementById('bugs-tab');
    if (bugsTab) {
        bugsTab.addEventListener('shown.bs.tab', function() {
            loadBugSettings();
        });
    }
});

// Admin 권한 체크
async function checkAdminAccess() {
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

        if (!response.ok) {
            window.location.href = '/login';
            return;
        }

        const data = await response.json();
        if (!data.user || !data.user.isAdmin) {
            alert('관리자 권한이 필요합니다.');
            window.location.href = '/';
            return;
        }
    } catch (error) {
        console.error('권한 체크 오류:', error);
        window.location.href = '/login';
    }
}

// 회원 목록 로드
async function loadUsers(page = 1, search = '') {
    currentPage = page;
    currentSearch = search;

    const token = localStorage.getItem('token');
    const params = new URLSearchParams({
        page: page,
        limit: 20,
        search: search
    });

    try {
        const response = await fetch(`/api/admin/users?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 403) {
                alert('관리자 권한이 필요합니다.');
                window.location.href = '/';
                return;
            }
            throw new Error('회원 목록을 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        renderUsers(data.users);
        renderPagination(data.pagination);
    } catch (error) {
        console.error('회원 목록 로드 오류:', error);
        showToast('오류', '회원 목록을 불러오는데 실패했습니다.', 'danger');
    }
}

// 회원 목록 렌더링
function renderUsers(users) {
    const container = document.getElementById('usersContainer');

    if (users.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle me-2"></i>회원이 없습니다.
                </div>
            </div>
        `;
        return;
    }

    let html = '';
    users.forEach(user => {
        const isAdmin = user.user_id === 'admin' || user.user_id === 'administrator';
        const isBanned = user.is_banned === 1 || user.is_banned === true;
        const createdDate = new Date(user.created_at).toLocaleDateString('ko-KR');

        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card user-card h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div class="flex-grow-1">
                                <div class="d-flex align-items-center gap-2 mb-1">
                                    <h6 class="card-title mb-0">${user.name || '이름 없음'}</h6>
                                    ${isBanned ? '<span class="banned-badge"><i class="fas fa-ban"></i>제재</span>' : ''}
                                    ${isAdmin ? '<span class="admin-badge"><i class="fas fa-shield-alt"></i>관리자</span>' : ''}
                                </div>
                                <p class="text-muted small mb-0">${user.user_id}</p>
                            </div>
                        </div>
                        <p class="card-text small text-muted mb-2">
                            <i class="fas fa-envelope me-1"></i>${user.email}
                        </p>
                        <p class="card-text small text-muted mb-2">
                            <i class="fas fa-phone me-1"></i>${user.phone || '-'}
                        </p>
                        <p class="card-text small text-muted mb-3">
                            <i class="fas fa-calendar me-1"></i>가입일: ${createdDate}
                        </p>
                        <div class="d-flex gap-2">
                            ${!isAdmin ? `
                                <button class="btn btn-sm ${isBanned ? 'btn-success' : 'btn-warning'}" 
                                        onclick="toggleBan(${user.id}, ${isBanned})">
                                    <i class="fas fa-${isBanned ? 'check' : 'ban'} me-1"></i>
                                    ${isBanned ? '제재 해제' : '이용 정지'}
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id}, '${user.name}', '${user.user_id}')">
                                    <i class="fas fa-trash me-1"></i>삭제
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// 페이지네이션 렌더링
function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    
    if (pagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // 이전 페이지
    html += `
        <li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadUsers(${pagination.page - 1}, '${currentSearch}'); return false;">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;

    // 페이지 번호
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.totalPages, pagination.page + 2);

    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="loadUsers(1, '${currentSearch}'); return false;">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === pagination.page ? 'active' : ''}">
                <a class="page-link" href="#" onclick="loadUsers(${i}, '${currentSearch}'); return false;">${i}</a>
            </li>
        `;
    }

    if (endPage < pagination.totalPages) {
        if (endPage < pagination.totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `<li class="page-item"><a class="page-link" href="#" onclick="loadUsers(${pagination.totalPages}, '${currentSearch}'); return false;">${pagination.totalPages}</a></li>`;
    }

    // 다음 페이지
    html += `
        <li class="page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadUsers(${pagination.page + 1}, '${currentSearch}'); return false;">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;

    container.innerHTML = html;
}

// 검색
function searchUsers() {
    const search = document.getElementById('searchInput').value.trim();
    loadUsers(1, search);
}

// 이용 제재 토글
async function toggleBan(userId, isCurrentlyBanned) {
    const token = localStorage.getItem('token');
    const isBanned = !isCurrentlyBanned;

    if (!confirm(isBanned ? '이 회원을 이용 정지하시겠습니까?' : '이 회원의 이용 정지를 해제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${userId}/ban`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_banned: isBanned })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('성공', data.message, 'success');
            await loadUsers(currentPage, currentSearch);
        } else {
            showToast('오류', data.message || '제재 처리에 실패했습니다.', 'danger');
        }
    } catch (error) {
        console.error('제재 처리 오류:', error);
        showToast('오류', '제재 처리 중 오류가 발생했습니다.', 'danger');
    }
}

// 회원 삭제
function deleteUser(userId, userName, user_id) {
    deleteUserId = userId;
    document.getElementById('deleteUserInfo').textContent = `회원: ${userName} (${user_id})`;
    const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
    modal.show();
}

// 회원 삭제 확인
async function confirmDeleteUser() {
    if (!deleteUserId) return;

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`/api/admin/users/${deleteUserId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showToast('성공', data.message, 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteUserModal'));
            modal.hide();
            await loadUsers(currentPage, currentSearch);
        } else {
            showToast('오류', data.message || '회원 삭제에 실패했습니다.', 'danger');
        }
    } catch (error) {
        console.error('회원 삭제 오류:', error);
        showToast('오류', '회원 삭제 중 오류가 발생했습니다.', 'danger');
    } finally {
        deleteUserId = null;
    }
}

// 버그 설정 목록 로드
async function loadBugSettings() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('bugsContainer');

    try {
        const response = await fetch('/api/bug-settings/bugs', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 403) {
                container.innerHTML = '<div class="alert alert-danger">관리자 권한이 필요합니다.</div>';
                return;
            }
            throw new Error('버그 설정을 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        renderBugSettings(data.bugs);
    } catch (error) {
        console.error('버그 설정 로드 오류:', error);
        container.innerHTML = '<div class="alert alert-danger">버그 설정을 불러오는데 실패했습니다.</div>';
    }
}

// 전체 버그 토글
async function toggleAllBugs(isEnabled) {
    const token = localStorage.getItem('token');
    const action = isEnabled ? '활성화' : '비활성화';
    
    if (!confirm(`모든 버그를 ${action}하시겠습니까?`)) {
        return;
    }
    
    // 버튼 비활성화
    const buttons = document.querySelectorAll('button[onclick*="toggleAllBugs"]');
    buttons.forEach(btn => btn.disabled = true);
    
    try {
        // 모든 버그 키 목록
        const bugKeys = ['bts_1', 'bts_2', 'bts_3', 'bts_4', 'bts_5', 'bts_6', 'bts_7', 'bts_8', 'bts_9', 'bts_10'];
        
        // 모든 버그를 순차적으로 토글
        const promises = bugKeys.map(bugKey => 
            fetch(`/api/bug-settings/bugs/${bugKey}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ is_enabled: isEnabled })
            })
        );
        
        const results = await Promise.all(promises);
        
        // 모든 요청이 성공했는지 확인
        const allSuccess = results.every(response => response.ok);
        
        if (allSuccess) {
            showToast('성공', `모든 버그가 ${action}되었습니다.`, 'success');
            // 버그 설정 목록 다시 로드
            await loadBugSettings();
        } else {
            showToast('오류', `일부 버그 ${action}에 실패했습니다.`, 'danger');
            // 실패해도 목록 다시 로드
            await loadBugSettings();
        }
    } catch (error) {
        console.error('전체 버그 토글 오류:', error);
        showToast('오류', `전체 버그 ${action} 중 오류가 발생했습니다.`, 'danger');
    } finally {
        // 버튼 다시 활성화
        buttons.forEach(btn => btn.disabled = false);
    }
}

// 버그 설정 목록 렌더링
function renderBugSettings(bugs) {
    const container = document.getElementById('bugsContainer');

    if (!bugs || bugs.length === 0) {
        container.innerHTML = '<div class="alert alert-info">버그 설정이 없습니다.</div>';
        return;
    }

    // 버그 설명 매핑
    const bugDescriptions = {
        'bts_1': '검색 시 항상 "게시글이 없습니다" 페이지가 노출됨',
        'bts_2': '게시글 작성 후 페이지 리다이렉트가 되지 않음 (중복 제출 가능)',
        'bts_3': '페이지네이션 오류 (잘못된 페이지 표시)',
        'bts_4': '게시글 목록이 오름차순으로 표시됨',
        'bts_5': '파일 업로드 후 파일 목록이 갱신되지 않음',
        'bts_6': '알림이 중복으로 표시됨',
        'bts_7': '게시글 작성 시간이 UTC 시간 기준으로 표시됨',
        'bts_8': '댓글 작성 후 목록 갱신 안 됨',
        'bts_9': '게시글 상세 페이지에서 조회수가 표시되지 않음',
        'bts_10': '채팅 메시지가 두 개씩 전송됨'
    };

    let html = '<div class="table-responsive"><table class="table table-hover align-middle">';
    html += '<thead class="table-light"><tr><th style="width: 80px;">번호</th><th>버그 설명</th><th style="width: 120px;" class="text-center">상태</th><th style="width: 100px;" class="text-center">제어</th></tr></thead>';
    html += '<tbody>';

    bugs.forEach((bug, index) => {
        const description = bugDescriptions[bug.bug_name] || bug.bug_name;
        const isEnabled = bug.is_enabled;
        
        html += `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td>${description}</td>
                <td class="text-center">
                    <span class="badge ${isEnabled ? 'bg-danger' : 'bg-success'}">
                        ${isEnabled ? '활성화' : '비활성화'}
                    </span>
                </td>
                <td class="text-center">
                    <div class="form-check form-switch d-inline-block">
                        <input class="form-check-input" type="checkbox" 
                               id="bug-${bug.bug_name}" 
                               ${isEnabled ? 'checked' : ''}
                               onchange="toggleBug('${bug.bug_name}', this.checked)">
                    </div>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// 버그 설정 토글
async function toggleBug(bugKey, isEnabled) {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`/api/bug-settings/bugs/${bugKey}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_enabled: isEnabled })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('성공', data.message, 'success');
            // 버그 설정 목록 다시 로드
            await loadBugSettings();
        } else {
            showToast('오류', data.message || '버그 설정 변경에 실패했습니다.', 'danger');
            // 실패 시 체크박스 원래 상태로 복구
            const checkbox = document.getElementById(`bug-${bugKey}`);
            if (checkbox) {
                checkbox.checked = !isEnabled;
            }
        }
    } catch (error) {
        console.error('버그 설정 변경 오류:', error);
        showToast('오류', '버그 설정 변경 중 오류가 발생했습니다.', 'danger');
        // 실패 시 체크박스 원래 상태로 복구
        const checkbox = document.getElementById(`bug-${bugKey}`);
        if (checkbox) {
            checkbox.checked = !isEnabled;
        }
    }
}

// 토스트 메시지 표시
function showToast(title, message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');

    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    // 타입에 따른 색상 설정
    toast.className = `toast position-fixed top-0 end-0 m-3`;
    if (type === 'success') {
        toast.classList.add('bg-success', 'text-white');
    } else if (type === 'danger') {
        toast.classList.add('bg-danger', 'text-white');
    } else {
        toast.classList.add('bg-info', 'text-white');
    }

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

