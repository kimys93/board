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
    }
    
    stages {
        stage('Build') {
            steps {
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} build"
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    def resetDb = params.reset_db
                    
                    // Clean up existing containers
                    sh "docker stop board_web board_db 2>/dev/null || true; docker rm -f board_web board_db 2>/dev/null || true"
                    
                    if (resetDb) {
                        echo 'WARNING: DB reset mode - All data will be deleted!'
                        sh "docker compose -f ${DOCKER_COMPOSE_FILE} down -v --remove-orphans"
                    } else {
                        sh "docker compose -f ${DOCKER_COMPOSE_FILE} down --remove-orphans"
                    }
                    
                    sh "docker compose -f ${DOCKER_COMPOSE_FILE} up -d"
                    
                    // Wait for containers to start
                    sleep time: 5, unit: 'SECONDS'
                    
                    // Check server status
                    echo 'Waiting for server to start...'
                    def status = ''
                    def maxRetries = 5
                    def retryDelay = 5
                    
                    for (int i = 0; i < maxRetries; i++) {
                        try {
                            def result = sh(script: "curl -s -o /dev/null -w '%{http_code}' http://localhost:${SERVICE_PORT} 2>/dev/null || echo '000'", returnStdout: true)
                            // sh 출력에서 실제 HTTP 코드만 추출
                            status = result.trim()
                            if (!status || status.isEmpty() || status.length() != 3) {
                                status = '000'
                            }
                        } catch (Exception e) {
                            status = '000'
                        }
                        
                        echo "Status check attempt ${i + 1}/${maxRetries}: ${status}"
                        
                        if (status == '200') {
                            echo "Server started successfully. (Status code: ${status})"
                            break
                        } else {
                            if (i < maxRetries - 1) {
                                echo "Server not ready yet. Retrying in ${retryDelay} seconds..."
                                sleep time: retryDelay, unit: 'SECONDS'
                            }
                        }
                    }
                    
                    if (status != '200') {
                        echo "Server status check failed. (Status code: ${status})"
                        sh 'docker logs board_web --tail 30'
                    }
                    
                    echo 'Deployment completed!'
                    echo 'Access URL: http://localhost:3000'
                }
            }
        }
    }
    
    post {
        always {
            sh 'docker logs --tail=50 board_web 2>/dev/null || true'
            sh 'docker logs --tail=50 board_db 2>/dev/null || true'
        }
        success {
            echo 'Build successful!'
        }
        failure {
            echo 'Build failed!'
        }
    }
}
