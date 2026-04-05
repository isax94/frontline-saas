const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

let wss = null;
const clientes = new Map();

function inicializaWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    ws.autenticado = false;
    ws.userId = null;

    const timeoutAuth = setTimeout(() => {
      if (!ws.autenticado) ws.terminate();
    }, 10000);

    ws.on('message', (msg) => {
      try {
        const dados = JSON.parse(msg);
        if (dados.tipo === 'auth') {
          try {
            const payload = jwt.verify(dados.token, process.env.JWT_SECRET);
            ws.autenticado = true;
            ws.userId = payload.id;
            clearTimeout(timeoutAuth);
            if (!clientes.has(ws.userId)) clientes.set(ws.userId, new Set());
            clientes.get(ws.userId).add(ws);
            ws.send(JSON.stringify({ tipo: 'auth_ok', mensagem: 'Conectado!' }));
          } catch {
            ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Token inválido' }));
            ws.terminate();
          }
        }
        if (dados.tipo === 'ping') ws.send(JSON.stringify({ tipo: 'pong' }));
      } catch {}
    });

    ws.on('close', () => {
      if (ws.userId && clientes.has(ws.userId)) {
        clientes.get(ws.userId).delete(ws);
        if (clientes.get(ws.userId).size === 0) clientes.delete(ws.userId);
      }
    });
  });
}

function transmiteSinal(sinal) {
  if (!wss) return 0;
  const payload = JSON.stringify({ tipo: 'sinal', dados: sinal });
  let total = 0;
  clientes.forEach((conexoes) => {
    conexoes.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN && ws.autenticado) {
        ws.send(payload);
        total++;
      }
    });
  });
  return total;
}

function clientesConectados() {
  let total = 0;
  clientes.forEach((conexoes) => {
    conexoes.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) total++;
    });
  });
  return total;
}

module.exports = { inicializaWebSocket, transmiteSinal, clientesConectados };
