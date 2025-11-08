/**
 * 사이트 접속 인증 미들웨어
 * HTTP Basic Authentication 사용 (브라우저 기본 인증 다이얼로그)
 */

const SITE_ID = 'kimys';
const SITE_PW = 'L0veyUsung!@';

/**
 * HTTP Basic Authentication 미들웨어
 */
const siteAuth = (req, res, next) => {
    // 정적 파일은 제외
    if (req.path.startsWith('/static') || req.path.startsWith('/uploads')) {
        return next();
    }
    
    // Authorization 헤더 확인
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        // 인증 정보가 없으면 401 응답 (브라우저가 인증 다이얼로그 표시)
        res.setHeader('WWW-Authenticate', 'Basic realm="Site Access"');
        return res.status(401).send('인증이 필요합니다.');
    }
    
    // Base64 디코딩
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [id, password] = credentials.split(':');
    
    // ID/PW 확인
    if (id === SITE_ID && password === SITE_PW) {
        console.log(`✅ 사이트 접속 인증 성공: ${id}`);
        return next();
    } else {
        // 인증 실패
        console.log(`❌ 사이트 접속 인증 실패: ${id || 'unknown'}`);
        res.setHeader('WWW-Authenticate', 'Basic realm="Site Access"');
        return res.status(401).send('ID 또는 비밀번호가 올바르지 않습니다.');
    }
};

module.exports = {
    siteAuth
};

