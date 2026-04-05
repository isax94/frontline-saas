require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { inicializaWebSocket } = require('./websocket/wsManager');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/webhook', require('./routes/webhook'));
app.use('/api/sinais',  require('./routes/sinais'));
app.use('/api/hotmart', require('./routes/hotmart'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    servico: 'Frontline SaaS Backend',
    horario: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ erro: 'Erro interno no servidor' });
});

inicializaWebSocket(server);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('Frontline SaaS Backend rodando na porta ' + PORT);
});

module.exports = { app, server };
