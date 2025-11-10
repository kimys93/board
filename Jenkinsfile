pipeline {
    agent any
    
    parameters {
        booleanParam(
            name: 'reset_db',
            defaultValue: false,
            description: 'Reset database and restart server (WARNING: All data will be deleted!)'
        )
    }
    
    environment {
        DOCKER_COMPOSE_FILE = './docker-compose.yml'
        SERVICE_PORT = '3000'
        SITE_ID = credentials('site-auth-id')
        SITE_PW = credentials('site-auth-pw')
    }
    
    stages {
        stage('Setup') {
            steps {
                script {
                    // siteAuth.credentials 파일 생성
                    if (!fileExists('siteAuth.credentials')) {
                        writeFile file: 'siteAuth.credentials', text: "SITE_ID=${env.SITE_ID}\nSITE_PW=${env.SITE_PW}\n"
                        echo '✅ siteAuth.credentials 파일을 생성했습니다.'
                    } else {
                        echo 'ℹ️ siteAuth.credentials 파일이 이미 존재합니다.'
                    }
                }
            }
        }
        
        stage('Build') {
            steps {
                bat "docker compose -f ${DOCKER_COMPOSE_FILE} build"
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    def resetDb = params.reset_db
                    
                    // 기존 컨테이너 강제 정리
                    bat "docker stop board_web board_db 2>nul || echo."
                    bat "docker rm -f board_web board_db 2>nul || echo."
                    
                    if (resetDb) {
                        echo '⚠️⚠️⚠️ DB 리셋 모드: 모든 데이터가 삭제됩니다! ⚠️⚠️⚠️'
                        bat "docker compose -f ${DOCKER_COMPOSE_FILE} down -v --remove-orphans"
                    } else {
                        bat "docker compose -f ${DOCKER_COMPOSE_FILE} down --remove-orphans"
                    }
                    
                    bat "docker compose -f ${DOCKER_COMPOSE_FILE} up -d"
                    
                    // siteAuth.credentials 파일을 컨테이너에 복사
                    sleep time: 3, unit: 'SECONDS'
                    bat 'docker cp siteAuth.credentials board_web:/app/siteAuth.credentials || echo.'
                    bat 'docker restart board_web || echo.'
                    
                    // 서버 상태 확인
                    echo '⏳ 서버 시작 대기 중...'
                    def status = ''
                    def maxRetries = 10
                    def retryDelay = 3
                    
                    for (int i = 0; i < maxRetries; i++) {
                        status = bat(script: "curl -o nul -s -w \"%%{http_code}\" http://localhost:${SERVICE_PORT} || echo 000", returnStdout: true).trim()
                        
                        if (status == '200' || status == '401') {
                            echo "✅ 서버가 정상적으로 시작되었습니다. (상태 코드: ${status})"
                            break
                        } else {
                            echo "⏳ 서버가 아직 준비되지 않았습니다. ${retryDelay}초 후 재시도... (시도 ${i + 1}/${maxRetries})"
                            sleep time: retryDelay, unit: 'SECONDS'
                        }
                    }
                    
                    if (status != '200' && status != '401') {
                        echo "⚠️ 서버 상태 확인 실패 (상태 코드: ${status})"
                        bat 'docker logs board_web --tail 30'
                    }
                    
                    echo '✅ 배포 완료!'
                    echo '🌐 접속 주소: http://localhost:3000'
                }
            }
        }
    }
    
    post {
        always {
            bat 'docker logs --tail=50 board_web 2>nul || echo.'
            bat 'docker logs --tail=50 board_db 2>nul || echo.'
        }
        success {
            echo '✅ 빌드 성공!'
        }
        failure {
            echo '❌ 빌드 실패!'
        }
    }
}
