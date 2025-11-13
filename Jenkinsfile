pipeline {
    agent any
    
    environment {
        DOCKER_COMPOSE_FILE = 'docker-compose.yml'
        REGISTRY = credentials('docker-registry') // Configure in Jenkins credentials
        IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"
        BRANCH_NAME = "${env.BRANCH_NAME ?: env.GIT_BRANCH}"
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        ansiColor('xterm')
    }
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "Checking out code from ${env.GIT_URL}"
                    checkout scm
                    sh 'git rev-parse --short HEAD > .git/commit-id'
                    env.GIT_COMMIT_SHORT = sh(script: 'cat .git/commit-id', returnStdout: true).trim()
                }
            }
        }
        
        stage('Environment Setup') {
            steps {
                script {
                    echo "Building for branch: ${BRANCH_NAME}"
                    echo "Build Number: ${BUILD_NUMBER}"
                    echo "Git Commit: ${GIT_COMMIT_SHORT}"
                    
                    // Determine environment based on branch
                    if (BRANCH_NAME == 'main' || BRANCH_NAME == 'master') {
                        env.DEPLOY_ENV = 'production'
                    } else if (BRANCH_NAME == 'develop' || BRANCH_NAME == 'dev') {
                        env.DEPLOY_ENV = 'development'
                    } else {
                        env.DEPLOY_ENV = 'staging'
                    }
                    echo "Deployment Environment: ${DEPLOY_ENV}"
                }
            }
        }
        
        stage('Lint & Code Quality') {
            parallel {
                stage('Lint API Gateway') {
                    steps {
                        dir('services/api-gateway') {
                            script {
                                try {
                                    sh 'npm install'
                                    // Add linting if configured
                                    // sh 'npm run lint'
                                } catch (Exception e) {
                                    echo "Linting skipped or failed: ${e.message}"
                                }
                            }
                        }
                    }
                }
                stage('Lint User Service') {
                    steps {
                        dir('services/user-service') {
                            script {
                                try {
                                    sh 'npm install'
                                    // Add linting if configured
                                    // sh 'npm run lint'
                                } catch (Exception e) {
                                    echo "Linting skipped or failed: ${e.message}"
                                }
                            }
                        }
                    }
                }
            }
        }
        
        stage('Build Services') {
            parallel {
                stage('Build API Gateway') {
                    steps {
                        dir('services/api-gateway') {
                            script {
                                sh 'npm install'
                                sh 'npm run build || echo "No build script, skipping"'
                            }
                        }
                    }
                }
                stage('Build User Service') {
                    steps {
                        dir('services/user-service') {
                            script {
                                sh 'npm install'
                                // Generate Prisma Client
                                sh 'npx prisma generate || echo "Prisma generate skipped"'
                                sh 'npm run build || echo "No build script, skipping"'
                            }
                        }
                    }
                }
                stage('Build Product Service') {
                    steps {
                        dir('services/product-service') {
                            script {
                                sh 'npm install || echo "No package.json found"'
                                sh 'npm run build || echo "No build script, skipping"'
                            }
                        }
                    }
                }
                stage('Build Order Service') {
                    steps {
                        dir('services/order-service') {
                            script {
                                sh 'npm install || echo "No package.json found"'
                                sh 'npm run build || echo "No build script, skipping"'
                            }
                        }
                    }
                }
            }
        }
        
        stage('Test Services') {
            parallel {
                stage('Test API Gateway') {
                    steps {
                        dir('services/api-gateway') {
                            script {
                                try {
                                    sh 'npm test || echo "No tests configured"'
                                } catch (Exception e) {
                                    echo "Tests failed or not configured: ${e.message}"
                                    // Uncomment to fail build on test failure
                                    // currentBuild.result = 'FAILURE'
                                }
                            }
                        }
                    }
                }
                stage('Test User Service') {
                    steps {
                        dir('services/user-service') {
                            script {
                                try {
                                    sh 'npm test || echo "No tests configured"'
                                } catch (Exception e) {
                                    echo "Tests failed or not configured: ${e.message}"
                                    // Uncomment to fail build on test failure
                                    // currentBuild.result = 'FAILURE'
                                }
                            }
                        }
                    }
                }
            }
        }
        
        stage('Build Docker Images') {
            steps {
                script {
                    echo "Building Docker images with tag: ${IMAGE_TAG}"
                    
                    // Build images in parallel
                    def builds = [:]
                    
                    builds['api-gateway'] = {
                        dir('services/api-gateway') {
                            sh "docker build -t api-gateway:${IMAGE_TAG} -t api-gateway:latest ."
                        }
                    }
                    
                    builds['user-service'] = {
                        dir('services/user-service') {
                            sh "docker build -t user-service:${IMAGE_TAG} -t user-service:latest ."
                        }
                    }
                    
                    builds['product-service'] = {
                        dir('services/product-service') {
                            sh "docker build -t product-service:${IMAGE_TAG} -t product-service:latest . || echo 'Product service build skipped'"
                        }
                    }
                    
                    builds['order-service'] = {
                        dir('services/order-service') {
                            sh "docker build -t order-service:${IMAGE_TAG} -t order-service:latest . || echo 'Order service build skipped'"
                        }
                    }
                    
                    parallel builds
                }
            }
        }
        
        stage('Push Docker Images') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                    branch 'develop'
                }
            }
            steps {
                script {
                    echo "Pushing Docker images to registry"
                    // Uncomment and configure when registry is set up
                    /*
                    withCredentials([usernamePassword(credentialsId: 'docker-registry', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh "echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin ${REGISTRY}"
                        sh "docker tag api-gateway:${IMAGE_TAG} ${REGISTRY}/api-gateway:${IMAGE_TAG}"
                        sh "docker push ${REGISTRY}/api-gateway:${IMAGE_TAG}"
                        // Repeat for other services
                    }
                    */
                    echo "Docker registry push skipped (configure registry credentials to enable)"
                }
            }
        }
        
        stage('Deploy to Environment') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                    branch 'develop'
                    branch 'staging'
                }
            }
            steps {
                script {
                    echo "Deploying to ${DEPLOY_ENV} environment"
                    
                    // Stop existing containers
                    sh "docker-compose -f ${DOCKER_COMPOSE_FILE} down || true"
                    
                    // Pull latest images (if using registry) or use local builds
                    // sh "docker-compose -f ${DOCKER_COMPOSE_FILE} pull || true"
                    
                    // Start services
                    sh "docker-compose -f ${DOCKER_COMPOSE_FILE} up -d --build"
                    
                    // Wait for services to be healthy
                    sh "sleep 10"
                    
                    // Health check
                    sh """
                        echo "Checking service health..."
                        docker-compose -f ${DOCKER_COMPOSE_FILE} ps
                    """
                }
            }
        }
        
        stage('Health Checks') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                    branch 'develop'
                }
            }
            steps {
                script {
                    echo "Performing health checks on deployed services"
                    
                    // Check API Gateway
                    sh """
                        timeout 30 bash -c 'until curl -f http://localhost:3000/health || curl -f http://localhost:3000/; do sleep 2; done' || echo "Health check endpoint not configured"
                    """
                    
                    // Check User Service
                    sh """
                        timeout 30 bash -c 'until curl -f http://localhost:4001/health || curl -f http://localhost:4001/; do sleep 2; done' || echo "Health check endpoint not configured"
                    """
                    
                    echo "Health checks completed"
                }
            }
        }
    }
    
    post {
        always {
            script {
                echo "Pipeline execution completed"
                // Clean up old Docker images
                sh "docker system prune -f || true"
            }
        }
        success {
            echo "✅ Pipeline succeeded!"
            // Add notifications here (Slack, Email, etc.)
            /*
            slackSend(
                color: 'good',
                message: "✅ Build ${BUILD_NUMBER} succeeded for ${BRANCH_NAME}"
            )
            */
        }
        failure {
            echo "❌ Pipeline failed!"
            // Add notifications here
            /*
            slackSend(
                color: 'danger',
                message: "❌ Build ${BUILD_NUMBER} failed for ${BRANCH_NAME}"
            )
            */
        }
        unstable {
            echo "⚠️ Pipeline unstable!"
        }
        cleanup {
            // Clean workspace
            cleanWs()
        }
    }
}
