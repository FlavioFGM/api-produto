pipeline {
    agent any

    stages {
        stage ('Build image locally...') {
            steps {
                script {
                    // Armazenamos a imagem em uma variável para usar depois
                    dockerapp = docker.build("flaviofgm/api-produto:latest", "-f ./src/Dockerfile ./src")
                }
            }
        }

        stage ('Send image to DEV registry') {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'cred-dockerhub') {
                        dockerapp.push('latest')
                    }
                }
            }
        }

        stage ('Scan image with Ephemeral Neuvector') {
            steps {
                script {
                    try {
                        // 1. Sobe o NeuVector All-in-One localmente
                        echo "Iniciando container temporário do NeuVector..."
                        sh """
                            docker run -d --name nv_temp_scanner \
                            -p 8443:8443 \
                            -e CLUSTER_JOIN_ADDR=127.0.0.1 \
                            -e CTRL_USER_INITIAL_ADMIN_PASSWORD=admin \
                            neuvector/allinone:latest
                        """

                        // 2. Aguarda a API do NeuVector estabilizar
                        echo "Aguardando inicialização (30s)..."
                        sleep 30

                        // 3. Executa o Scan apontando para o localhost
                        // IMPORTANTE: 'cred-neuvector-default' deve ser admin/admin no Jenkins
                        neuvector(
                            controllerApiUrl: 'https://localhost:8443',
                            credentialsId: 'cred-neuvector-default', 
                            registrySelection: 'DockerHub',
                            repository: 'flaviofgm/api-produto',
                            tag: 'latest',
                            scanLayers: true,
                            numberOfHighSeverityToFail: '1',
                            scanTimeout: 10
                        )

                    } finally {
                        // 4. Mata e remove o container, mesmo se o scan falhar ou der erro
                        echo "Limpando container do NeuVector..."
                        sh "docker rm -f nv_temp_scanner"
                    }
                }
            }
        }

        stage ('Send image to production registry') {
            // Este estágio só roda se o scan acima passar (não encontrar vulnerabilidades críticas)
            steps {
                script {
                    docker.withRegistry('https://registry.virtnet/api-produto/', 'cred-harbor') {
                        dockerapp.push('latest')
                    }
                }
            }
        }

        stage ('Deploy app in kubernetes cluster "rasp-cluster"') {
            environment {
                tag_version = "latest"
            }
            steps {
                withKubeConfig([credentialsId: 'kubeconfig']) {
                    sh 'sed -i "s/{{tag}}/$tag_version/g" ./k8s/deployment.yaml'
                    sh 'kubectl apply -f ./k8s/deployment.yaml -n ci-cd'
                }
            }
        }
    }
}
