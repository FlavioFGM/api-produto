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
        // Usamos withCredentials para pegar a senha do DockerHub com segurança
        withCredentials([usernamePassword(credentialsId: 'cred-dockerhub', passwordVariable: 'DOCKERHUB_PWD', usernameVariable: 'DOCKERHUB_USER')]) {
            script {
                try {
                    echo "1. Subindo o 'Cérebro' do NeuVector (Controller)..."
                    sh """
                        docker run -d --name nv_controller \
                        -p 8443:8443 \
                        -e CLUSTER_JOIN_ADDR=127.0.0.1 \
                        -e CTRL_USER_INITIAL_ADMIN_PASSWORD=admin \
                        neuvector/allinone:latest
                    """

                    echo "Aguardando inicialização (40s)..."
                    sleep 40

                    echo "2. Rodando o Scanner dedicado..."
                    // Aqui usamos a imagem neuvector/scanner, que é feita para CLI
                    sh """
                        docker run --rm --name nv_scanner \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        neuvector/scanner:latest \
                        -ctrl_ip 127.0.0.1 \
                        -ctrl_port 8443 \
                        -user admin \
                        -password admin \
                        -registry https://index.docker.io/v1/ \
                        -reg_user ${DOCKERHUB_USER} \
                        -reg_password ${DOCKERHUB_PWD} \
                        -repository flaviofgm/api-produto \
                        -tag latest \
                        -fail_high 1
                    """

                } finally {
                    echo "3. Limpando ambiente..."
                    sh "docker rm -f nv_controller"
                }
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
