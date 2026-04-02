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
                withCredentials([usernamePassword(credentialsId: 'cred-dockerhub', passwordVariable: 'DOCKERHUB_PWD', usernameVariable: 'DOCKERHUB_USER')]) {
                    script {
                        echo "Iniciando Scan Standalone (Sem Controller)..."
                        // Usamos as flags que o seu log confirmou: -registry, -repository, -tag
                        // O -u aponta para o socket do docker para o scanner funcionar
                        sh """
                            docker run --rm --name nv_scanner \
                            -v /var/run/docker.sock:/var/run/docker.sock \
                            neuvector/scanner:latest \
                            -registry https://index.docker.io/v1/ \
                            -reg_user ${DOCKERHUB_USER} \
                            -reg_password '${DOCKERHUB_PWD}' \
                            -repository ${DOCKER_IMAGE} \
                            -tag ${IMAGE_TAG} \
                            -scan_layers
                        """
                    }
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
                withKubeConfig([credentialsId: 'kubeconfig']) {
                    sh "sed -i 's/{{tag}}/${IMAGE_TAG}/g' ./k8s/deployment.yaml"
                    // --validate=false ignora o erro de DNS ao baixar o schema do k8s
                    sh 'kubectl apply -f ./k8s/deployment.yaml -n ci-cd --validate=false'
                }
            }
        }
    }
}
