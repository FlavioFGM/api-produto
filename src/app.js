const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const product = require('./routes/produto');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./swagger.yaml');
const NodeHog = require('nodehog');
const config = require('./config/system-life');
const promBundle = require("express-prom-bundle");

const metricsMiddleware = promBundle({ 
    includeMethod: true, 
    includePath: true, 
    customLabels: { project_version: '1.0' }
});

app.use(metricsMiddleware);
app.use(config.middlewares.healthMid);
app.use('/', config.routers);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const serverStatus = () => {
    return {
        state: 'up',
        dbState: mongoose.STATES[mongoose.connection.readyState]
    };
};

// ⚠️ Corrigido aqui: req e res estavam invertidos
app.get('/health', (req, res) => {
    const healthResult = serverStatus();
    if (mongoose.connection.readyState === 0) {
        res.status(500).send('down');
    } else {
        res.json(healthResult);
    }
});

app.put('/stress/:elemento/tempostress/:tempoStress/intervalo/:intervalo/ciclos/:ciclos', (req, res) => {
    const elemento = req.params.elemento;
    const tempoStress = req.params.tempoStress * 1000;
    const tempoFolga = req.params.tempoFolga * 1000;
    const ciclos = req.params.ciclos;
    new NodeHog(elemento, tempoStress, tempoFolga, ciclos).start();
    res.send("OK");
});

app.use('/api/produto', product);

// URL padrão para conexão com MongoDB
const developer_db_url = 'mongodb://mongouser:mongopwd@localhost:27017/admin';
const mongoUrl = process.env.MONGODB_URI || developer_db_url;

// Conexão com retry usando Promises
function connectWithRetry() {
    mongoose.connect(mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log('Conectado ao MongoDB com sucesso');
    })
    .catch((err) => {
        console.error('Falha ao conectar no MongoDB - tentando novamente em 5 segundos', err);
        setTimeout(connectWithRetry, 5000);
    });
}

connectWithRetry();

// Iniciar o servidor
const port = process.env.SERVER_PORT || 8080;
app.listen(port, () => {
    console.log('Mudança de Texto' + port);
});
