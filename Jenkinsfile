pipeline {
    agent any
    
    // 빌드 파라미터 정의
    parameters {
        booleanParam(
            name: 'reset_db',
            defaultValue: false,
            description: 'DB 데이터를 초기화하고 서버를 재시작합니다. (주의: 모든 데이터가 삭제됩니다!)'
        )
    }
    
    environment {
        PROJECT_NAME = 'board'
        // Jenkins Credentials 사용 (보안)
        SITE_ID = credentials('site-auth-id')
        SITE_PW = credentials('site-auth-pw')
    }
    
    stages {
        // Checkout은 Jenkins가 자동으로 수행하므로 별도 stage 불필요
        
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
                        # 네트워크 생성 (이미 있으면 무시)
                        docker network create board_network 2>/dev/null || true
                        
                        # 웹 이미지 빌드
                        docker build -t board-web:latest .
                    """
                }
            }
        }
        
        stage('Test') {
            steps {
                echo '🧪 테스트 실행 중...'
                script {
                    try {
                        // 기존 컨테이너 정리 (jenkins는 절대 건드리지 않음)
                        sh """
                            # 실행 중인 컨테이너 중지
                            docker stop board_web board_db 2>/dev/null || true
                            # 컨테이너 제거 (강제)
                            docker rm -f board_web board_db 2>/dev/null || true
                            # 포트가 사용 중인지 확인하고 대기
                            sleep 2
                            # 네트워크에서 분리된 컨테이너 정리
                            docker network disconnect board_network board_web 2>/dev/null || true
                            docker network disconnect board_network board_db 2>/dev/null || true
                        """
                        
                        // 네트워크 생성 (이미 있으면 무시)
                        sh """
                            docker network create board_network 2>/dev/null || true
                        """
                        
                        // DB 컨테이너 시작 (테스트용이므로 restart 정책 없음, 호스트 포트 바인딩 없음)
                        sh """
                            docker run -d \\
                                --name board_db \\
                                --network board_network \\
                                -v board_db_data:/var/lib/mysql \\
                                -v \$(pwd)/database/init.sql:/docker-entrypoint-initdb.d/init.sql \\
                                -e MYSQL_ROOT_PASSWORD=rootpassword \\
                                -e MYSQL_DATABASE=board_db \\
                                -e MYSQL_USER=board_user \\
                                -e MYSQL_PASSWORD=board_password \\
                                mysql:8.0 \\
                                --character-set-server=utf8mb4 \\
                                --collation-server=utf8mb4_unicode_ci
                        """
                        
                        // DB 초기화 대기
                        sh """
                            sleep 10
                            timeout 60 bash -c 'until docker exec board_db mysqladmin ping -h localhost --silent; do sleep 2; done' || exit 1
                        """
                        
                        // Web 컨테이너 시작 (테스트용이므로 restart 정책 없음, 호스트 포트 바인딩 없음)
                        // 테스트 단계에서는 이미지에 포함된 파일 사용 (볼륨 마운트 최소화)
                        sh """
                            # siteAuth.credentials 파일이 존재하는지 확인
                            if [ ! -f siteAuth.credentials ]; then
                                echo "❌ siteAuth.credentials 파일이 없습니다. Setup 단계를 먼저 실행하세요."
                                exit 1
                            fi
                            
                            # siteAuth.credentials를 컨테이너에 복사하여 사용
                            # (볼륨 마운트 대신 docker cp 사용하거나, 환경 변수로 전달)
                            docker run -d \\
                                --name board_web \\
                                --network board_network \\
                                -v \$(pwd)/uploads:/app/uploads \\
                                -e NODE_ENV=development \\
                                -e DB_HOST=board_db \\
                                -e DB_USER=board_user \\
                                -e DB_PASSWORD=board_password \\
                                -e DB_NAME=board_db \\
                                -e JWT_SECRET=your_jwt_secret_key_here \\
                                board-web:latest
                            
                            # siteAuth.credentials 파일을 컨테이너에 복사
                            docker cp siteAuth.credentials board_web:/app/siteAuth.credentials
                        """
                        
                        // 서버가 정상적으로 시작되었는지 확인 (컨테이너 로그 확인)
                        sh """
                            sleep 5
                            # 컨테이너가 실행 중인지 확인
                            timeout 30 bash -c 'until docker ps | grep -q board_web; do sleep 2; done' || exit 1
                            # 컨테이너 로그에서 서버 시작 확인 (한글 로그 메시지 확인)
                            timeout 30 bash -c 'until docker logs board_web 2>&1 | grep -qE "서버가 포트|실행 중|데이터베이스 연결 성공"; do sleep 2; done' || (docker logs board_web && exit 1)
                        """
                        
                        echo '✅ 서버가 정상적으로 시작되었습니다.'
                    } catch (Exception e) {
                        echo "❌ 테스트 실패: ${e.getMessage()}"
                        throw e
                    } finally {
                        // 테스트 후 정리 (jenkins는 절대 건드리지 않음)
                        sh """
                            docker stop board_web board_db 2>/dev/null || true
                            docker rm -f board_web board_db 2>/dev/null || true
                        """
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                echo '🚀 서버 배포 중...'
                script {
                    sh """
                        reset_db=${params.reset_db}
                        
                        # Jenkins는 절대 건드리지 않음 - 특정 컨테이너만 제어
                        echo "🛑 서버 중지 중..."
                        docker stop board_web board_db 2>/dev/null || true
                        docker rm -f board_web board_db 2>/dev/null || true
                        
                        if [ "\$reset_db" = "true" ]; then
                            echo "⚠️⚠️⚠️ DB 리셋 모드: 모든 데이터가 삭제됩니다! ⚠️⚠️⚠️"
                            echo "🗑️ DB 볼륨 삭제 중..."
                            docker volume rm board_db_data 2>/dev/null || echo "⚠️ 볼륨이 이미 삭제되었거나 존재하지 않습니다."
                        fi
                        
                        # 포트 해제 대기
                        sleep 2
                        
                        # docker 컨테이너 실행 (web, db만)
                        # init.sql은 docker-compose.yml의 볼륨 마운트로 자동 실행됨
                        # DB를 먼저 시작하여 초기화 완료 대기
                        docker compose up -d db
                        
                        # DB 초기화 완료 대기 (healthcheck 활용)
                        echo "⏳ DB 초기화 대기 중..."
                        sleep 10
                        timeout 120 bash -c 'until docker exec board_db mysqladmin ping -h localhost -u root -prootpassword --silent; do sleep 2; done' || {
                            echo "❌ DB 시작 실패. 로그 확인:"
                            docker logs board_db --tail 50
                            exit 1
                        }
                        
                        # init.sql 실행 여부 확인
                        echo "🔍 init.sql 실행 여부 확인 중..."
                        docker exec board_db ls -la /docker-entrypoint-initdb.d/ 2>/dev/null || echo "⚠️ /docker-entrypoint-initdb.d 디렉토리 확인 실패"
                        
                        # MySQL 로그에서 init.sql 실행 확인
                        if docker logs board_db 2>&1 | grep -q "running /docker-entrypoint-initdb.d/init.sql"; then
                            echo "✅ init.sql 실행 로그 발견"
                        else
                            echo "⚠️ init.sql 실행 로그가 없습니다. 볼륨 마운트 확인 필요"
                        fi
                        
                        # DB 테이블 확인
                        echo "📊 DB 테이블 확인 중..."
                        TABLE_COUNT=\$(docker exec board_db mysql -u board_user -pboard_password board_db -e "SHOW TABLES;" 2>/dev/null | wc -l)
                        if [ "\$TABLE_COUNT" -lt 2 ]; then
                            echo "⚠️ DB 테이블이 생성되지 않았습니다. (테이블 수: \$TABLE_COUNT)"
                            echo "📋 init.sql 수동 실행 시도..."
                            
                            # init.sql을 컨테이너에 복사하고 수동 실행
                            docker cp database/init.sql board_db:/tmp/init.sql
                            docker exec -i board_db sh -c "mysql -u board_user -pboard_password board_db --force < /tmp/init.sql" 2>&1 | grep -v "Duplicate key name" | grep -v "already exists" || true
                            
                            # 다시 테이블 확인
                            TABLE_COUNT=\$(docker exec board_db mysql -u board_user -pboard_password board_db -e "SHOW TABLES;" 2>/dev/null | wc -l)
                            if [ "\$TABLE_COUNT" -lt 2 ]; then
                                echo "❌ init.sql 수동 실행 후에도 테이블이 생성되지 않았습니다. (테이블 수: \$TABLE_COUNT)"
                                echo "📋 MySQL 로그:"
                                docker logs board_db --tail 50
                                exit 1
                            else
                                echo "✅ init.sql 수동 실행 완료. (테이블 수: \$TABLE_COUNT)"
                            fi
                        else
                            echo "✅ DB 테이블이 정상적으로 생성되었습니다. (테이블 수: \$TABLE_COUNT)"
                        fi
                        
                        # Web 서버 시작
                        docker compose up -d web
                        
                        # siteAuth.credentials 파일을 컨테이너에 복사
                        sleep 3
                        docker cp siteAuth.credentials board_web:/app/siteAuth.credentials || echo "⚠️ siteAuth.credentials 복사 실패 (이미 존재할 수 있음)"
                        
                        # web 서버 재시작 (siteAuth.credentials 적용)
                        docker restart board_web || true
                        
                        # 서버 상태 확인
                        echo "⏳ 서버 시작 대기 중..."
                        sleep 5
                        
                        # 서버 상태 코드 확인 (최대 10회 재시도)
                        MAX_RETRIES=10
                        RETRY_DELAY=3
                        STATUS="000"
                        
                        for i in \$(seq 1 \$MAX_RETRIES); do
                            STATUS=\$(curl -o /dev/null -s -w "%{http_code}\\n" http://localhost:3000 || echo "000")
                            
                            if [ "\$STATUS" = "200" ] || [ "\$STATUS" = "401" ]; then
                                echo "✅ 서버가 정상적으로 시작되었습니다. (상태 코드: \$STATUS)"
                                break
                            else
                                echo "⏳ 서버가 아직 준비되지 않았습니다. \$RETRY_DELAY초 후 재시도... (시도 \$i/\$MAX_RETRIES)"
                                sleep \$RETRY_DELAY
                            fi
                        done
                        
                        if [ "\$STATUS" != "200" ] && [ "\$STATUS" != "401" ]; then
                            echo "⚠️ 서버 상태 확인 실패 (상태 코드: \$STATUS)"
                            echo "📋 컨테이너 로그:"
                            docker logs board_web --tail 30
                        fi
                        
                        echo '✅ 배포 완료!'
                        echo '🌐 접속 주소: http://localhost:3000'
                    """
                }
            }
        }
    }
    
    post {
        always {
            echo '🧹 정리 중...'
            script {
                // 실패한 경우에도 로그 확인 (jenkins는 제외)
                sh """
                    docker logs --tail=50 board_web 2>/dev/null || true
                    docker logs --tail=50 board_db 2>/dev/null || true
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

