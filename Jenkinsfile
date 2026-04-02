pipeline {
    agent any

    environment {
        // Variáveis para facilitar a manutenção
        DOCKER_IMAGE = "flaviofgm/api-produto"
        IMAGE_TAG = "latest"
    }

    stages {
        stage ('Build image locally...') {
            steps {
                script {
                    // O 'def' resolve o aviso de WorkflowScript/memory leak
                    def dockerapp = docker.build("${DOCKER_IMAGE}:${IMAGE_TAG}", "-f ./src/Dockerfile ./src")
                    
                    // Salvando na variável global do pipeline para os próximos stages
                    env.DOCKER_APP_ID = dockerapp.id
                }
            }
        }

        stage ('Send image to DEV registry') {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'cred-dockerhub') {
                        def img = docker.image("${DOCKER_IMAGE}:${IMAGE_TAG}")
                        img.push()
                    }
                }
            }
        }

stage ('Scan image with Ephemeral Neuvector') {
    steps {
        script {
            try {
                echo "Subindo NeuVector All-in-One..."
                sh """
                    docker run -d --name nv_temp \
                    -p 8443:8443 \
                    -e CLUSTER_JOIN_ADDR=127.0.0.1 \
                    -e CTRL_USER_INITIAL_ADMIN_PASSWORD=admin \
                    neuvector/allinone:latest
                """
                
                echo "Aguardando 30s..."
                sleep 30

                echo "Executando Scan via Docker Exec (Ignorando Plugin)..."
                // Aqui usamos o binário de scan que já vem dentro do container que subimos!
                sh """
                    docker exec nv_temp /usr/local/bin/scan \
                    -ctrl_ip 127.0.0.1 \
                    -ctrl_port 8443 \
                    -user admin \
                    -password admin \
                    -repository ${DOCKER_IMAGE} \
                    -tag ${IMAGE_TAG} \
                    -registry https://index.docker.io/v1/ \
                    -reg_user flaviofgm \
                    -reg_password ${env.DOCKERHUB_PASSWORD} \
                    -fail_high 1
                """

            } finally {
                echo "Limpando..."
                sh "docker rm -f nv_temp"
            }
        }
    }
}

        stage ('Send image to production registry') {
            steps {
                script {
                    docker.withRegistry('https://registry.virtnet/api-produto/', 'cred-harbor') {
                        def img = docker.image("${DOCKER_IMAGE}:${IMAGE_TAG}")
                        img.push()
                    }
                }
            }
        }

        stage ('Deploy app in kubernetes cluster "rasp-cluster"') {
            steps {
                withKubeConfig([credentialsId: 'kubeconfig']) {
                    // Substitui a tag no YAML e aplica no cluster
                    sh "sed -i 's/{{tag}}/${IMAGE_TAG}/g' ./k8s/deployment.yaml"
                    sh 'kubectl apply -f ./k8s/deployment.yaml -n ci-cd'
                }
            }
        }
    }
}
