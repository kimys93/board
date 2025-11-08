pipeline {
    agent any
    
    environment {
        DOCKER_COMPOSE = 'docker-compose'
        PROJECT_NAME = 'board'
        // Jenkins Credentials 사용 (보안)
        SITE_ID = credentials('site-auth-id')
        SITE_PW = credentials('site-auth-pw')
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo '📥 GitHub에서 코드 체크아웃 중...'
                checkout scm
            }
        }
        
        stage('Setup') {
            steps {
                echo '⚙️ 환경 설정 중...'
                script {
                    // siteAuth.credentials 파일이 없으면 생성
                    sh '''
                        if [ ! -f siteAuth.credentials ]; then
                            if [ -z "$SITE_ID" ] || [ -z "$SITE_PW" ]; then
                                echo "❌ 오류: SITE_ID와 SITE_PW 환경 변수가 설정되지 않았습니다."
                                echo "💡 Jenkins 프로젝트 설정에서 환경 변수를 추가하거나 Jenkins Credentials를 사용하세요."
                                exit 1
                            fi
                            echo "SITE_ID=${SITE_ID}" > siteAuth.credentials
                            echo "SITE_PW=${SITE_PW}" >> siteAuth.credentials
                            echo "✅ siteAuth.credentials 파일을 생성했습니다."
                        else
                            echo "ℹ️ siteAuth.credentials 파일이 이미 존재합니다."
                        fi
                    '''
                }
            }
        }
        
        stage('Build') {
            steps {
                echo '🔨 Docker 이미지 빌드 중...'
                script {
                    sh """
                        ${DOCKER_COMPOSE} build web
                    """
                }
            }
        }
        
        stage('Test') {
            steps {
                echo '🧪 테스트 실행 중...'
                script {
                    try {
                        // 서비스 시작
                        sh """
                            ${DOCKER_COMPOSE} up -d db
                            sleep 10
                            ${DOCKER_COMPOSE} up -d web
                            sleep 5
                        """
                        
                        // 서버가 정상적으로 시작되었는지 확인
                        sh """
                            timeout 30 bash -c 'until curl -f http://localhost:3000 || exit 1; do sleep 2; done' || exit 1
                        """
                        
                        echo '✅ 서버가 정상적으로 시작되었습니다.'
                    } catch (Exception e) {
                        echo "❌ 테스트 실패: ${e.getMessage()}"
                        throw e
                    } finally {
                        // 테스트 후 정리
                        sh """
                            ${DOCKER_COMPOSE} down || true
                        """
                    }
                }
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                echo '🚀 배포 중...'
                script {
                    sh """
                        ${DOCKER_COMPOSE} down || true
                        ${DOCKER_COMPOSE} up -d --build
                    """
                }
            }
        }
    }
    
    post {
        always {
            echo '🧹 정리 중...'
            script {
                // 실패한 경우에도 로그 확인
                sh """
                    ${DOCKER_COMPOSE} logs --tail=50 || true
                """
            }
        }
        success {
            echo '✅ 빌드 성공!'
        }
        failure {
            echo '❌ 빌드 실패!'
        }
    }
}

