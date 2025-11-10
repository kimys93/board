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
                    // Create siteAuth.credentials file
                    if (!fileExists('siteAuth.credentials')) {
                        writeFile file: 'siteAuth.credentials', text: "SITE_ID=${env.SITE_ID}\nSITE_PW=${env.SITE_PW}\n"
                        echo 'siteAuth.credentials file created.'
                    } else {
                        echo 'siteAuth.credentials file already exists.'
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
                    
                    // Clean up existing containers
                    bat "@echo off & docker stop board_web board_db 2>nul & docker rm -f board_web board_db 2>nul & echo."
                    
                    if (resetDb) {
                        echo 'WARNING: DB reset mode - All data will be deleted!'
                        bat "docker compose -f ${DOCKER_COMPOSE_FILE} down -v --remove-orphans"
                    } else {
                        bat "docker compose -f ${DOCKER_COMPOSE_FILE} down --remove-orphans"
                    }
                    
                    bat "docker compose -f ${DOCKER_COMPOSE_FILE} up -d"
                    
                    // Wait for containers to start
                    sleep time: 3, unit: 'SECONDS'
                    
                    // Check server status
                    echo 'Waiting for server to start...'
                    def status = ''
                    def maxRetries = 10
                    def retryDelay = 3
                    
                    for (int i = 0; i < maxRetries; i++) {
                        try {
                            status = bat(script: "curl -o nul -s -w \"%%{http_code}\" http://localhost:${SERVICE_PORT} 2>nul", returnStdout: true).trim()
                            if (!status || status.isEmpty()) {
                                status = '000'
                            }
                        } catch (Exception e) {
                            status = '000'
                        }
                        
                        if (status == '200' || status == '401') {
                            echo "Server started successfully. (Status code: ${status})"
                            break
                        } else {
                            echo "Server not ready yet. Retrying in ${retryDelay} seconds... (Attempt ${i + 1}/${maxRetries})"
                            sleep time: retryDelay, unit: 'SECONDS'
                        }
                    }
                    
                    if (status != '200' && status != '401') {
                        echo "Server status check failed. (Status code: ${status})"
                        bat 'docker logs board_web --tail 30'
                    }
                    
                    echo 'Deployment completed!'
                    echo 'Access URL: http://localhost:3000'
                }
            }
        }
    }
    
    post {
        always {
            bat '@echo off & docker logs --tail=50 board_web 2>nul & echo.'
            bat '@echo off & docker logs --tail=50 board_db 2>nul & echo.'
        }
        success {
            echo 'Build successful!'
        }
        failure {
            echo 'Build failed!'
        }
    }
}
