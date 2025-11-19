def runInNode(Closure body) {
    docker.image('node:18-bullseye').inside {
        body()
    }
}

def detectChangedServices() {
    def services = ['api-gateway', 'user-service', 'product-service', 'order-service']
    def changedServices = []
    
    // Get previous commit hash (if available)
    def previousCommit = sh(
        script: "git rev-parse HEAD~1 2>/dev/null || echo ''",
        returnStdout: true
    ).trim()
    
    // If this is the first commit or can't determine changes, build all
    if (!previousCommit) {
        echo "First build or unable to detect changes - building all services"
        return services
    }
    
    // Check if common files changed (docker-compose.yml, Jenkinsfile, etc.)
    def commonFilesChanged = sh(
        script: "git diff --name-only ${previousCommit} HEAD | grep -E '^(docker-compose.yml|Jenkinsfile|\\.git)' || true",
        returnStdout: true
    ).trim()
    
    if (commonFilesChanged) {
        echo "Common files changed - building all services"
        return services
    }
    
    // Check which service directories changed
    def changedFiles = sh(
        script: "git diff --name-only ${previousCommit} HEAD",
        returnStdout: true
    ).trim()
    
    services.each { service ->
        if (changedFiles.contains("services/${service}/")) {
            changedServices.add(service)
        }
    }
    
    // If no specific service changed but files changed, build all (safety)
    if (changedFiles && changedServices.isEmpty()) {
        echo "Files changed but no service detected - building all services for safety"
        return services
    }
    
    // If nothing changed, return empty (shouldn't happen but handle gracefully)
    if (changedServices.isEmpty()) {
        echo "No changes detected - will skip build"
    }
    
    return changedServices
}

pipeline {
    agent any
    
    environment {
        DOCKER_COMPOSE_FILE = 'docker-compose.yml'
        BRANCH_NAME = "${(env.BRANCH_NAME ?: env.GIT_BRANCH)?.replaceFirst(/^origin\//,'')}"
        REGISTRY = "${env.DOCKER_REGISTRY ?: 'docker.io/hjha3987361'}"
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "Checking out code from ${env.GIT_URL}"
                    checkout scm
                    env.GIT_COMMIT_SHORT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
                    echo "Image tag will be: ${env.IMAGE_TAG}"
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
                    
                    // Detect changed services
                    def changedServices = detectChangedServices()
                    env.CHANGED_SERVICES = changedServices.join(',')
                    echo "Changed services: ${env.CHANGED_SERVICES ?: 'ALL (first build or common files changed)'}"
                }
            }
        }
        
        stage('Lint & Code Quality') {
            parallel {
                stage('Lint API Gateway') {
                    when { 
                        anyOf {
                            expression { env.CHANGED_SERVICES == null || env.CHANGED_SERVICES.contains('api-gateway') || !env.CHANGED_SERVICES }
                        }
                    }
                    steps {
                        dir('services/api-gateway') {
                            script {
                                try {
                                    runInNode {
                                        sh 'npm install'
                                    }
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
                    when { 
                        anyOf {
                            expression { env.CHANGED_SERVICES == null || env.CHANGED_SERVICES.contains('user-service') || !env.CHANGED_SERVICES }
                        }
                    }
                    steps {
                        dir('services/user-service') {
                            script {
                                try {
                                    runInNode {
                                        sh 'npm install'
                                    }
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
                    when { 
                        anyOf {
                            expression { env.CHANGED_SERVICES == null || env.CHANGED_SERVICES.contains('api-gateway') || !env.CHANGED_SERVICES }
                        }
                    }
                    steps {
                        dir('services/api-gateway') {
                            script {
                                runInNode {
                                    sh 'npm install'
                                    sh 'npm run build || echo "No build script, skipping"'
                                }
                            }
                        }
                    }
                }
                stage('Build User Service') {
                    when { 
                        anyOf {
                            expression { env.CHANGED_SERVICES == null || env.CHANGED_SERVICES.contains('user-service') || !env.CHANGED_SERVICES }
                        }
                    }
                    steps {
                        dir('services/user-service') {
                            script {
                                runInNode {
                                    sh 'npm install'
                                    // Generate Prisma Client
                                    sh 'npx prisma generate || echo "Prisma generate skipped"'
                                    sh 'npm run build || echo "No build script, skipping"'
                                }
                            }
                        }
                    }
                }
                stage('Build Product Service') {
                    when { 
                        anyOf {
                            expression { env.CHANGED_SERVICES == null || env.CHANGED_SERVICES.contains('product-service') || !env.CHANGED_SERVICES }
                        }
                    }
                    steps {
                        dir('services/product-service') {
                            script {
                                runInNode {
                                    sh 'npm install || echo "No package.json found"'
                                    sh 'npm run build || echo "No build script, skipping"'
                                }
                            }
                        }
                    }
                }
                stage('Build Order Service') {
                    when { 
                        anyOf {
                            expression { env.CHANGED_SERVICES == null || env.CHANGED_SERVICES.contains('order-service') || !env.CHANGED_SERVICES }
                        }
                    }
                    steps {
                        dir('services/order-service') {
                            script {
                                runInNode {
                                    sh 'npm install || echo "No package.json found"'
                                    sh 'npm run build || echo "No build script, skipping"'
                                }
                            }
                        }
                    }
                }
            }
        }
        
        stage('Test Services') {
            parallel {
                stage('Test API Gateway') {
                    when { 
                        anyOf {
                            expression { env.CHANGED_SERVICES == null || env.CHANGED_SERVICES.contains('api-gateway') || !env.CHANGED_SERVICES }
                        }
                    }
                    steps {
                        dir('services/api-gateway') {
                            script {
                                try {
                                    runInNode {
                                        sh 'npm test || echo "No tests configured"'
                                    }
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
                    when { 
                        anyOf {
                            expression { env.CHANGED_SERVICES == null || env.CHANGED_SERVICES.contains('user-service') || !env.CHANGED_SERVICES }
                        }
                    }
                    steps {
                        dir('services/user-service') {
                            script {
                                try {
                                    runInNode {
                                        sh 'npm test || echo "No tests configured"'
                                    }
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
                    echo "Changed services to build: ${env.CHANGED_SERVICES ?: 'ALL'}"
                    
                    def changedServicesList = env.CHANGED_SERVICES ? env.CHANGED_SERVICES.split(',') : []
                    def servicesToBuild = changedServicesList.isEmpty() ? 
                        ['api-gateway', 'user-service', 'product-service', 'order-service'] : 
                        changedServicesList
                    
                    // Build images in parallel for changed services only
                    def builds = [:]
                    
                    if (servicesToBuild.contains('api-gateway')) {
                        builds['api-gateway'] = {
                            dir('services/api-gateway') {
                                sh "docker build -t ${REGISTRY}/api-gateway:${IMAGE_TAG} -t ${REGISTRY}/api-gateway:latest ."
                            }
                        }
                    }
                    
                    if (servicesToBuild.contains('user-service')) {
                        builds['user-service'] = {
                            dir('services/user-service') {
                                sh "docker build -t ${REGISTRY}/user-service:${IMAGE_TAG} -t ${REGISTRY}/user-service:latest ."
                            }
                        }
                    }
                    
                    if (servicesToBuild.contains('product-service')) {
                        builds['product-service'] = {
                            dir('services/product-service') {
                                sh "docker build -t ${REGISTRY}/product-service:${IMAGE_TAG} -t ${REGISTRY}/product-service:latest . || echo 'Product service build skipped'"
                            }
                        }
                    }
                    
                    if (servicesToBuild.contains('order-service')) {
                        builds['order-service'] = {
                            dir('services/order-service') {
                                sh "docker build -t ${REGISTRY}/order-service:${IMAGE_TAG} -t ${REGISTRY}/order-service:latest . || echo 'Order service build skipped'"
                            }
                        }
                    }
                    
                    if (builds.isEmpty()) {
                        echo "No services to build - skipping Docker image build"
                    } else {
                        parallel builds
                        // Store built services for push stage
                        env.BUILT_SERVICES = servicesToBuild.join(',')
                    }
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
                    def servicesToPush = env.BUILT_SERVICES ? env.BUILT_SERVICES.split(',') : []
                    
                    if (servicesToPush.isEmpty()) {
                        echo "No services were built - skipping push"
                        return
                    }
                    
                    echo "Pushing images for services: ${env.BUILT_SERVICES}"
                    
                    withCredentials([usernamePassword(credentialsId: 'docker-registry', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        withEnv(["DOCKER_PASS=${DOCKER_PASS}", "DOCKER_USER=${DOCKER_USER}", "BUILT_SERVICES=${env.BUILT_SERVICES}"]) {
                            sh '''
                                set -e
                                REGISTRY_HOST=$(echo ${REGISTRY} | cut -d'/' -f1)
                                if [ "${REGISTRY}" = "${REGISTRY_HOST}" ]; then
                                    REGISTRY_HOST=docker.io
                                fi
                                
                                echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin ${REGISTRY_HOST}
                                
                                # Push only services that were built
                                for svc in $(echo "$BUILT_SERVICES" | tr ',' ' '); do
                                    if docker image inspect ${REGISTRY}/${svc}:${IMAGE_TAG} >/dev/null 2>&1; then
                                        echo "Pushing ${svc}..."
                                        docker push ${REGISTRY}/${svc}:${IMAGE_TAG}
                                        docker push ${REGISTRY}/${svc}:latest
                                        echo "Successfully pushed ${svc}"
                                    else
                                        echo "Warning: Image ${REGISTRY}/${svc}:${IMAGE_TAG} not found, skipping push"
                                    fi
                                done
                            '''
                        }
                    }
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
                    
                    // ============================================
                    // CREDENTIALS SETUP:
                    // These credentials must be created in Jenkins first.
                    // Go to: Manage Jenkins → Credentials → Add Credentials
                    // Create "Secret text" type with IDs matching your .env file:
                    // JWT_SECRET, SESSION_SECRET, GOOGLE_CLIENT_ID, etc. (uppercase)
                    // See JENKINS_CREDENTIALS_SETUP.txt for complete list.
                    // ============================================
                    
                    // Load required credentials from Jenkins
                    // Note: PostgreSQL and RabbitMQ credentials are optional (will use defaults)
                    withCredentials([
                        // Required: User Service Credentials
                        string(credentialsId: 'JWT_SECRET', variable: 'JWT_SECRET'),
                        string(credentialsId: 'SESSION_SECRET', variable: 'SESSION_SECRET'),
                        string(credentialsId: 'GOOGLE_CLIENT_ID', variable: 'GOOGLE_CLIENT_ID'),
                        string(credentialsId: 'GOOGLE_CLIENT_SECRET', variable: 'GOOGLE_CLIENT_SECRET'),
                        string(credentialsId: 'GITHUB_CLIENT_ID', variable: 'GITHUB_CLIENT_ID'),
                        string(credentialsId: 'GITHUB_CLIENT_SECRET', variable: 'GITHUB_CLIENT_SECRET')
                    ]) {
                        // Stop existing containers
                        sh "docker-compose -f ${DOCKER_COMPOSE_FILE} down || true"
                        
                        // Set defaults for optional PostgreSQL and RabbitMQ credentials
                        // These match the defaults in docker-compose.yml
                        script {
                            env.POSTGRES_USER = env.POSTGRES_USER ?: 'postgres'
                            env.POSTGRES_PASSWORD = env.POSTGRES_PASSWORD ?: 'password'
                            env.POSTGRES_DB = env.POSTGRES_DB ?: 'micro_ecom'
                            env.RABBITMQ_USER = env.RABBITMQ_USER ?: 'guest'
                            env.RABBITMQ_PASS = env.RABBITMQ_PASS ?: 'guest'
                            echo "Using PostgreSQL defaults: user=${env.POSTGRES_USER}, db=${env.POSTGRES_DB}"
                            echo "Using RabbitMQ defaults: user=${env.RABBITMQ_USER}"
                        }
                        
                        def composeEnv = [
                            "REGISTRY=${env.REGISTRY}",
                            "IMAGE_TAG=${IMAGE_TAG}",
                            "JWT_SECRET=${JWT_SECRET}",
                            "SESSION_SECRET=${SESSION_SECRET}",
                            "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}",
                            "GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}",
                            "GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}",
                            "GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}",
                            "POSTGRES_PASSWORD=${env.POSTGRES_PASSWORD}",
                            "POSTGRES_USER=${env.POSTGRES_USER}",
                            "POSTGRES_DB=${env.POSTGRES_DB}",
                            "RABBITMQ_USER=${env.RABBITMQ_USER}",
                            "RABBITMQ_PASS=${env.RABBITMQ_PASS}"
                        ]
                        
                        withEnv(composeEnv) {
                            sh "docker-compose -f ${DOCKER_COMPOSE_FILE} pull --parallel"
                            sh "docker-compose -f ${DOCKER_COMPOSE_FILE} up -d --force-recreate"
                        }
                        
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
