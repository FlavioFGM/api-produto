pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "flaviofgm/api-produto"
        IMAGE_TAG = "latest"
    }

    stages {
        stage ('Build image locally...') {
            steps {
                script {
                    docker.build("${DOCKER_IMAGE}:${IMAGE_TAG}", "-f ./src/Dockerfile ./src")
                }
            }
        }

        stage ('Send image to DEV registry') {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'cred-dockerhub') {
                        docker.image("${DOCKER_IMAGE}:${IMAGE_TAG}").push()
                    }
                }
            }
        }

        stage ('Scan image with Neuvector (Standalone)') {
            steps {
                script {
                    echo "Iniciando Scan Standalone via Socket..."
                    // Usando a flag -i para escanear a imagem local via socket
                    sh """
                        docker run --rm --name nv_scanner \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        neuvector/scanner:latest \
                        -i ${DOCKER_IMAGE}:${IMAGE_TAG}
                    """
                }
            }
        }

        stage ('Send image to production registry') {
            steps {
                script {
                    docker.withRegistry('https://registry.virtnet/api-produto/', 'cred-harbor') {
                        docker.image("${DOCKER_IMAGE}:${IMAGE_TAG}").push()
                    }
                }
            }
        }

        stage ('Deploy app in kubernetes cluster') {
            steps {
                // Certifique-se de atualizar o token no Jenkins Credentials 'kubeconfig'
                withKubeConfig([credentialsId: 'kubeconfig']) {
                    sh "sed -i 's/{{tag}}/${IMAGE_TAG}/g' ./k8s/deployment.yaml"
                    sh 'kubectl apply -f ./k8s/deployment.yaml -n ci-cd --validate=false'
                }
            }
        }
    }
}
