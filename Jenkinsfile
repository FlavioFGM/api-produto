pipeline {
    agent any

    stages {
        stage ('Build image locally...') {
            steps {
                script {
                    dockerapp = docker.build("flaviofgm/api-produto:latest", '-f ./src/Dockerfile ./src')
                    //dockerapp = docker.build("flaviofgm/api-produto:${env.BUILD_ID}", '-f ./src/Dockerfile ./src')
                }
            }
        }

        stage ('Send image to DEV registry') {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'cred-dockerhub') {
                        dockerapp.push('latest')
                        //dockerapp.push("${env.BUILD_ID}")
                    }
                }
            }
        }

        stage ('Scan image in the DEV registry with Neuvector') {
            steps {
                script {
                    //Analyze vulnerabilities before pushing to the production registry. If any vulnerability is found.

                    neuvector nameOfVulnerabilityToExemptFour: '', nameOfVulnerabilityToExemptOne: '', nameOfVulnerabilityToExemptThree: '', nameOfVulnerabilityToExemptTwo: '', nameOfVulnerabilityToFailFour: '', nameOfVulnerabilityToFailOne: '', nameOfVulnerabilityToFailThree: '', nameOfVulnerabilityToFailTwo: '', numberOfHighSeverityToFail: '1', numberOfMediumSeverityToFail: '', registrySelection: 'DockerHub', repository: 'flaviofgm/api-produto', scanLayers: true, scanTimeout: 10, tag: 'latest'
                }
            }
        }

        stage ('Send image to production registry') {
            steps {
                script {
                    docker.withRegistry('https://registry.virtnet/api-produto/', 'cred-harbor') {
                        dockerapp.push('latest')
                        //dockerapp.push("${env.BUILD_ID}")
                    }
                }
            }
        }

        stage ('Deploy app in kubernetes cluster "rasp-cluster"') {
            environment {
                tag_version = "latest"
                //tag_version = "${env.BUILD_ID}"
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
