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
                    def dockerapp = docker.build("${DOCKER_IMAGE}:${IMAGE_TAG}", "-f ./src/Dockerfile ./src")
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

        stage ('Scan image with Ephemeral Neuvector') {
            steps {
                // Usamos withCredentials para evitar o erro de 'null' na senha do DockerHub
                withCredentials([usernamePassword(credentialsId: 'cred-dockerhub', passwordVariable: 'DOCKERHUB_PWD', usernameVariable: 'DOCKERHUB_USER')]) {
                    script {
                        try {
                            echo "1. Subindo Controller temporário..."
                            sh """
                                docker run -d --name nv_controller \
                                -p 8443:8443 \
                                -e CLUSTER_JOIN_ADDR=127.0.0.1 \
                                -e CTRL_USER_INITIAL_ADMIN_PASSWORD=admin \
                                neuvector/allinone:latest
                            """

                            echo "Aguardando inicialização (45s)..."
                            sleep 45

                            echo "2. Rodando Scanner (chamando binário corretamente)..."
                            // Mudança: Adicionamos --entrypoint /usr/local/bin/scanner para aceitar os parâmetros -ctrl_ip
                            sh """
                                docker run --rm --name nv_scanner \
                                --entrypoint /usr/local/bin/scanner \
                                -v /var/run/docker.sock:/var/run/docker.sock \
                                neuvector/scanner:latest \
                                -ctrl_ip 127.0.0.1 \
                                -ctrl_port 8443 \
                                -user admin \
                                -password admin \
                                -registry https://index.docker.io/v1/ \
                                -reg_user ${DOCKERHUB_USER} \
                                -reg_password '${DOCKERHUB_PWD}' \
                                -repository ${DOCKER_IMAGE} \
                                -tag ${IMAGE_TAG} \
                                -fail_high 1
                            """

                        } finally {
                            echo "3. Limpando container do NeuVector..."
                            sh "docker rm -f nv_controller"
                        }
                    }
                }
            }
        }

        stage ('Send image to production registry') {
            steps {
                script {
                    // Verifique se o host registry.virtnet é resolvível pelo Jenkins
                    docker.withRegistry('https://registry.virtnet/api-produto/', 'cred-harbor') {
                        docker.image("${DOCKER_IMAGE}:${IMAGE_TAG}").push()
                    }
                }
            }
        }

        stage ('Deploy app in kubernetes cluster "rasp-cluster"') {
            steps {
                withKubeConfig([credentialsId: 'kubeconfig']) {
                    // Adicionamos --validate=false para evitar erros de conexão no download do schema se o DNS falhar
                    sh "sed -i 's/{{tag}}/${IMAGE_TAG}/g' ./k8s/deployment.yaml"
                    sh 'kubectl apply -f ./k8s/deployment.yaml -n ci-cd --validate=false'
                }
            }
        }
    }
}
