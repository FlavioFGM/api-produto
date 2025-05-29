pipeline {
  agent any

  environment {
    tag_version = "latest"
  }

  stages {

    stage('Construindo Imagem e armazenando internamente...') {
      steps {
        script {
          dockerapp = docker.build("flaviofgm/api-produto:${tag_version}", '--no-cache -f ./src/Dockerfile ./src')
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
        withKubeConfig([credentialsId: 'kubeconfig-rasp-cluster']) {
          sh 'sed -i "s/{{tag}}/${tag_version}/g" ./k8s/deployment.yaml'
          sh 'kubectl apply -f ./k8s/deployment.yaml -n ci-cd'
        }
      }
    }

  }
}
