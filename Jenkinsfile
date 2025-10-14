pipeline {
    agent any

    environment {
        tag_version = "latest"
    }

    stages {

        stage('Construindo Imagem e armazenando internamente...') {
            steps {
                script {
                    dockerapp = docker.build(
                        "flaviofgm/api-produto:${tag_version}",
                        '--no-cache -f ./src/Dockerfile ./src'
                    )
                }
            }
        }

        stage('Enviando imagem para registry intermediária') {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'cred-dockerhub') {
                        dockerapp.push('latest') 
                    }
                }
            }
        }

stage('Verificando imagem localmente com NeuVector') {
    steps {
        script {
            sh """
            mkdir -p ${WORKSPACE}/reports/neuvector
            docker run --rm \\
                -v /var/run/docker.sock:/var/run/docker.sock \\
                neuvector/scanner:latest \\
                -i flaviofgm/api-produto:${tag_version} \\
                | tee ${WORKSPACE}/reports/neuvector/neuvector-report.txt
            """
        }
    }
    post {
        always {
            archiveArtifacts artifacts: 'reports/neuvector/neuvector-report.txt', allowEmptyArchive: false
        }
    }
}


	stage('Enviando imagem para registry de produção') {
            steps {
                script {
                    docker.withRegistry('https://registry.virtnet', 'cred-harbor') {
                        dockerapp.push("${tag_version}")
                    }
                }
            }
        }

        stage('Deploy da aplicação no cluster "rasp-cluster"') {
            steps {
                withKubeConfig([credentialsId: 'kubeconfig']) {
                    sh 'sed -i "s/{{tag}}/${tag_version}/g" ./k8s/deployment.yaml'
                    sh 'kubectl apply -f ./k8s/deployment.yaml -n ci-cd'
                }
            }
        }

    }
}

