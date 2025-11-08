/**
 * 사이트 접속 인증 미들웨어
 * HTTP Basic Authentication 사용 (브라우저 기본 인증 다이얼로그)
 * 쿠키 기반 세션으로 인증 상태 유지 (모바일 데이터 네트워크 호환)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 인증 정보 파일 경로
const CREDENTIALS_FILE = path.join(__dirname, '..', 'siteAuth.credentials');

// 인증 정보 로드
function loadCredentials() {
    try {
        const fileContent = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
        const credentials = {};
        
        fileContent.split('\n').forEach(line => {
            line = line.trim();
            // 주석 제외
            if (line && !line.startsWith('#')) {
                const [key, value] = line.split('=');
                if (key && value) {
                    credentials[key.trim()] = value.trim();
                }
            }
        });
        
        return {
            SITE_ID: credentials.SITE_ID || '',
            SITE_PW: credentials.SITE_PW || ''
        };
    } catch (error) {
        console.error('❌ 인증 정보 파일을 읽을 수 없습니다:', error.message);
        console.error('💡 siteAuth.credentials.example 파일을 siteAuth.credentials로 복사하고 설정하세요.');
        return { SITE_ID: '', SITE_PW: '' };
    }
}

const { SITE_ID, SITE_PW } = loadCredentials();

// 세션 저장소 (간단한 메모리 기반)
const sessions = new Map();
const AUTH_COOKIE_NAME = 'site_auth_token';
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24시간

// 세션 토큰 생성
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * HTTP Basic Authentication 미들웨어 (쿠키 기반 세션)
 */
const siteAuth = (req, res, next) => {
    // 정적 파일은 제외
    if (req.path.startsWith('/static') || req.path.startsWith('/uploads')) {
        return next();
    }
    
    // 쿠키에서 세션 토큰 확인
    const sessionToken = req.cookies?.[AUTH_COOKIE_NAME];
    
    if (sessionToken && sessions.has(sessionToken)) {
        const session = sessions.get(sessionToken);
        // 세션이 24시간 이내면 유효
        if (Date.now() - session.timestamp < SESSION_MAX_AGE) {
            return next();
        } else {
            // 세션 만료
            sessions.delete(sessionToken);
        }
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
    if (!SITE_ID || !SITE_PW) {
        console.error('❌ 인증 정보가 설정되지 않았습니다. siteAuth.credentials 파일을 확인하세요.');
        return res.status(500).send('서버 설정 오류가 발생했습니다.');
    }
    
    if (id === SITE_ID && password === SITE_PW) {
        // 세션 토큰 생성 및 저장
        const token = generateSessionToken();
        sessions.set(token, { id, timestamp: Date.now() });
        
        // 쿠키에 세션 토큰 저장
        res.cookie(AUTH_COOKIE_NAME, token, {
            maxAge: SESSION_MAX_AGE,
            httpOnly: true,
            secure: false, // HTTPS가 아닌 경우 false
            sameSite: 'lax'
        });
        
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

