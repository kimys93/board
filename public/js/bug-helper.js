// 버그 설정 확인 헬퍼 함수 (공개 API 사용 - 모든 유저 접근 가능)
async function getBugSetting(bugKey) {
    try {
        const response = await fetch(`/api/bug-settings/bug/${bugKey}`);
        
        if (!response.ok) {
            console.log('버그 설정 API 응답 실패:', response.status);
            return false;
        }
        
        const data = await response.json();
        if (!data.success) {
            console.log('버그 설정 API 응답 실패:', data);
            return false;
        }
        
        console.log(`버그 설정 조회 (${bugKey}):`, data.is_enabled); // 디버깅용
        return data.is_enabled || false;
    } catch (error) {
        console.error('버그 설정 조회 오류:', error);
        return false;
    }
}

// 전역으로 사용할 수 있도록 window에 등록
window.getBugSetting = getBugSetting;

