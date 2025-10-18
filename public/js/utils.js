// 공통 유틸리티 함수들

// 전역 토스트 인스턴스
let globalToast = null;

// 토스트 알림 표시
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastMessage) {
        console.error('Toast element not found');
        return;
    }
    
    // 기존 토스트가 보여지고 있다면 숨기기
    if (globalToast) {
        globalToast.hide();
    }
    
    // 메시지와 스타일 설정
    toastMessage.textContent = message;
    toast.className = `toast bg-${type === 'error' ? 'danger' : type} text-white`;
    
    // 토스트 인스턴스 생성 (한 번만)
    if (!globalToast) {
        globalToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 3000
        });
    }
    
    // 토스트 표시
    globalToast.show();
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 파일 크기 포맷팅
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 날짜 포맷팅
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
