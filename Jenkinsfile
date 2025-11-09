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
            // 서버 상태 확인 후 선택적 배포
            steps {
                echo '🚀 서버 배포 중...'
                script {
                    // reset_db 파라미터 확인
                    if (params.reset_db) {
                        echo '⚠️⚠️⚠️ DB 리셋 모드: 모든 데이터가 삭제됩니다! ⚠️⚠️⚠️'
                        sh """
                            # 모든 서버 중지 및 제거 (Jenkins는 절대 건드리지 않음)
                            echo '🛑 서버 중지 중...'
                            # docker-compose down은 Jenkins까지 중지하므로 사용하지 않음
                            docker stop board_web board_db 2>/dev/null || true
                            docker rm -f board_web board_db 2>/dev/null || true
                            
                            # 네트워크에서 분리 (Jenkins는 제외)
                            docker network disconnect board_network board_web 2>/dev/null || true
                            docker network disconnect board_network board_db 2>/dev/null || true
                            
                            # DB 볼륨 삭제 (데이터 초기화)
                            echo '🗑️ DB 볼륨 삭제 중...'
                            docker volume rm board_db_data 2>/dev/null || echo "⚠️ 볼륨이 이미 삭제되었거나 존재하지 않습니다."
                            
                            # 포트 해제 대기
                            sleep 3
                            
                            # 서버 재시작 (새로운 DB로, init.sql 포함)
                            echo '🔄 서버 재시작 중...'
                            # docker-compose 대신 docker run을 사용하여 init.sql을 확실히 마운트
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
                                --collation-server=utf8mb4_unicode_ci || {
                                echo "⚠️ 첫 번째 시도 실패, 잠시 대기 후 재시도..."
                                sleep 5
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
                            }
                            
                            # DB 초기화 대기
                            echo '⏳ DB 초기화 대기 중...'
                            sleep 10
                            timeout 60 bash -c 'until docker exec board_db mysqladmin ping -h localhost --silent; do sleep 2; done' || exit 1
                            
                            # Web 서버 시작 (docker-compose 대신 docker run 사용, DB는 이미 실행 중)
                            docker run -d \\
                                --name board_web \\
                                --network board_network \\
                                -p 0.0.0.0:3000:3000 \\
                                -v \$(pwd)/uploads:/app/uploads \\
                                -e NODE_ENV=development \\
                                -e DB_HOST=board_db \\
                                -e DB_USER=board_user \\
                                -e DB_PASSWORD=board_password \\
                                -e DB_NAME=board_db \\
                                -e JWT_SECRET=your_jwt_secret_key_here \\
                                board-web:latest || {
                                echo "⚠️ 첫 번째 시도 실패, 잠시 대기 후 재시도..."
                                sleep 5
                                docker run -d \\
                                    --name board_web \\
                                    --network board_network \\
                                    -p 0.0.0.0:3000:3000 \\
                                    -v \$(pwd)/uploads:/app/uploads \\
                                    -e NODE_ENV=development \\
                                    -e DB_HOST=board_db \\
                                    -e DB_USER=board_user \\
                                    -e DB_PASSWORD=board_password \\
                                    -e DB_NAME=board_db \\
                                    -e JWT_SECRET=your_jwt_secret_key_here \\
                                    board-web:latest
                            }
                            
                            # siteAuth.credentials 파일을 컨테이너에 복사
                            sleep 3
                            docker cp siteAuth.credentials board_web:/app/siteAuth.credentials || echo "⚠️ siteAuth.credentials 복사 실패 (이미 존재할 수 있음)"
                            
                            # web 서버 재시작 (siteAuth.credentials 적용)
                            docker restart board_web || true
                            
                            echo '✅ DB가 초기화되고 서버가 재시작되었습니다!'
                            echo '🌐 접속 주소: http://localhost:3000'
                        """
                    } else {
                        // 일반 배포 로직
                        sh """
                            # 서버가 이미 실행 중인지 확인
                            if docker ps --format '{{.Names}}' | grep -q '^board_web\$'; then
                            echo 'ℹ️ 서버가 이미 실행 중입니다. 빌드만 완료되었습니다.'
                            echo '💡 새 이미지를 적용하려면 수동으로 서버를 재시작하세요:'
                            echo '   docker restart board_web'
                            echo '✅ 빌드 완료! (서버는 재시작하지 않음)'
                        else
                            echo '📦 서버가 실행 중이 아니므로 서버를 시작합니다...'
                            
                            # DB가 실행 중인지 확인
                            if ! docker ps --format '{{.Names}}' | grep -q '^board_db\$'; then
                                echo '📦 DB 서버 시작 중...'
                                
                                # DB 볼륨이 비어있는지 확인 (테이블이 있는지 확인)
                                DB_VOLUME_EXISTS=\$(docker volume inspect board_db_data 2>/dev/null | grep -q "board_db_data" && echo "true" || echo "false")
                                
                                if [ "\$DB_VOLUME_EXISTS" = "false" ]; then
                                    echo '📦 새로운 DB 볼륨 생성 및 초기화...'
                                    # docker run으로 DB 생성 (init.sql 실행)
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
                                        --collation-server=utf8mb4_unicode_ci || {
                                        echo "⚠️ 첫 번째 시도 실패, 잠시 대기 후 재시도..."
                                        sleep 5
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
                                    }
                                    sleep 10
                                    timeout 60 bash -c 'until docker exec board_db mysqladmin ping -h localhost --silent; do sleep 2; done' || exit 1
                                else
                                    echo '📦 기존 DB 볼륨 사용...'
                                    # 기존 볼륨이 있으면 docker-compose 사용
                                    docker-compose up -d db || {
                                        echo "⚠️ 첫 번째 시도 실패, 잠시 대기 후 재시도..."
                                        sleep 5
                                        docker-compose up -d db
                                    }
                                    sleep 5
                                    
                                    # DB가 준비될 때까지 대기
                                    timeout 60 bash -c 'until docker exec board_db mysqladmin ping -h localhost --silent; do sleep 2; done' || exit 1
                                    
                                    # 테이블이 있는지 확인
                                    TABLE_COUNT=\$(docker exec board_db mysql -u board_user -pboard_password board_db -e "SHOW TABLES;" 2>/dev/null | wc -l)
                                    if [ "\$TABLE_COUNT" -lt 2 ]; then
                                        echo '⚠️ DB 테이블이 없습니다. init.sql을 수동으로 실행합니다...'
                                        docker exec -i board_db mysql -u board_user -pboard_password board_db < \$(pwd)/database/init.sql || {
                                            echo "⚠️ init.sql 실행 실패, 컨테이너 내부에서 직접 실행 시도..."
                                            docker cp \$(pwd)/database/init.sql board_db:/tmp/init.sql
                                            docker exec board_db mysql -u board_user -pboard_password board_db < /tmp/init.sql || echo "❌ init.sql 실행 실패"
                                        }
                                    } else {
                                        echo "✅ DB 테이블이 이미 존재합니다."
                                    }
                                fi
                            else
                                echo 'ℹ️ DB 서버가 이미 실행 중입니다.'
                                # 실행 중이어도 테이블이 있는지 확인
                                TABLE_COUNT=\$(docker exec board_db mysql -u board_user -pboard_password board_db -e "SHOW TABLES;" 2>/dev/null | wc -l)
                                if [ "\$TABLE_COUNT" -lt 2 ]; then
                                    echo '⚠️ DB 테이블이 없습니다. init.sql을 수동으로 실행합니다...'
                                    docker exec -i board_db mysql -u board_user -pboard_password board_db < \$(pwd)/database/init.sql || {
                                        echo "⚠️ init.sql 실행 실패, 컨테이너 내부에서 직접 실행 시도..."
                                        docker cp \$(pwd)/database/init.sql board_db:/tmp/init.sql
                                        docker exec board_db mysql -u board_user -pboard_password board_db < /tmp/init.sql || echo "❌ init.sql 실행 실패"
                                    }
                                fi
                            fi
                            
                            # Web 서버 시작
                            echo '📦 Web 서버 시작 중...'
                            docker-compose up -d web || {
                                echo "⚠️ 첫 번째 시도 실패, 잠시 대기 후 재시도..."
                                sleep 5
                                docker-compose up -d web
                            }
                            
                            # siteAuth.credentials 파일을 컨테이너에 복사
                            sleep 3
                            docker cp siteAuth.credentials board_web:/app/siteAuth.credentials || echo "⚠️ siteAuth.credentials 복사 실패 (이미 존재할 수 있음)"
                            
                            # web 서버 재시작 (siteAuth.credentials 적용)
                            docker restart board_web || true
                            
                            echo '✅ 서버가 배포되었습니다!'
                            echo '🌐 접속 주소: http://localhost:3000'
                        fi
                        """
                    }
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

