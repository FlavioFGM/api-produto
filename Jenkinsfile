pipeline {
    agent any

    stages {
        stage ('Construindo Imagem e armazenando internamente...') {
            steps {
                script {
                    dockerapp = docker.build("gabriellins/api-produto:latest", '-f ./src/Dockerfile ./src')
                    //dockerapp = docker.build("gabriellins/api-produto:${env.BUILD_ID}", '-f ./src/Dockerfile ./src') 
                }                
            }
        }

        stage ('Enviando imagem para registry intermediária') {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'cred-dockerhub') {
                        dockerapp.push('latest')
                        //dockerapp.push("${env.BUILD_ID}")
                    }
                }
            }
        }

        stage ('Verificando imagem na registry temporaria com Neuvector') {
            steps {
                script {      
                    //Analisar vulnerabilidades antes de mandar para registry de produção
                    //neuvector nameOfVulnerabilityToExemptFour: '', nameOfVulnerabilityToExemptOne: '', nameOfVulnerabilityToExemptThree: '', nameOfVulnerabilityToExemptTwo: '', nameOfVulnerabilityToFailFour: '', nameOfVulnerabilityToFailOne: '', nameOfVulnerabilityToFailThree: '', nameOfVulnerabilityToFailTwo: '', numberOfHighSeverityToFail: '1', numberOfMediumSeverityToFail: '', registrySelection: 'DockerHub', repository: 'gabriellins/api-produto', scanLayers: true, scanTimeout: 10, tag: 'latest'
                    
                    //Ignorar vulnerabilidades
                    neuvector nameOfVulnerabilityToExemptFour: '', nameOfVulnerabilityToExemptOne: '', nameOfVulnerabilityToExemptThree: '', nameOfVulnerabilityToExemptTwo: '', nameOfVulnerabilityToFailFour: '', nameOfVulnerabilityToFailOne: '', nameOfVulnerabilityToFailThree: '', nameOfVulnerabilityToFailTwo: '', numberOfHighSeverityToFail: '', numberOfMediumSeverityToFail: '', registrySelection: 'DockerHub', repository: 'gabriellins/api-produto', scanLayers: true, scanTimeout: 10, tag: 'latest'
                }
            }
        }

        stage ('Enviando imagem para registry de produção') {
            steps {
                script {
                    docker.withRegistry('https://harbor.geekoworld.com/pipeline-images/', 'cred-harbor') {
                        dockerapp.push('latest')
                        //dockerapp.push("${env.BUILD_ID}")
                    }
                }
            }
        }

        stage ('Deploy da aplicação no cluster "geeko-dev"') {
            environment {
                tag_version = "latest"
                //tag_version = "${env.BUILD_ID}"
            }
            steps {
                withKubeConfig([credentialsId: 'kubeconfig-geeko-dev']) {
                    sh 'sed -i "s/{{tag}}/$tag_version/g" ./k8s/deployment.yaml'
                    sh 'kubectl apply -f ./k8s/deployment.yaml -n ci-cd' 
                }
            }
        }
    }
}
