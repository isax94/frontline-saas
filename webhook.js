const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { transmiteSinal, clientesConectados } = require('../websocket/wsManager');

router.post('/sinal', async (req, res) => {
  try {
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.WEBHOOK_SECRET)
      return res.status(401).json({ erro: 'Não autorizado' });

    const { robot, estado, direcao, ativo, preco, mensagem,
            resultado_diario, operacoes_hoje, horario } = req.body;

    if (!estado || !direcao || !ativo)
      return res.status(400).json({ erro: 'Campos obrigatórios: estado, direcao, ativo' });

    const estadosValidos = ['AGUARDANDO','ATENCAO','EXECUTAR','CANCELADO','DIA_ENCERRADO'];
    if (!estadosValidos.includes(estado))
      return res.status(400).json({ erro: 'Estado inválido: ' + estado });

    const result = await db.query(
      `INSERT INTO sinais (robot,estado,direcao,ativo,preco,mensagem,
        resultado_diario,operacoes_hoje,horario_mt)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [robot||'Frontline', estado, direcao, ativo, preco||null,
       mensagem||'', resultado_diario||0, operacoes_hoje||0,
       horario ? new Date(horario) : new Date()]
    );

    const sinal = result.rows[0];
    sinal.visual = geraVisual(estado, direcao);
    const enviados = transmiteSinal(sinal);

    res.json({ sucesso: true, sinal_id: sinal.id, clientes_notificados: enviados });
  } catch (err) {
    console.error('Erro webhook:', err);
    res.json({ recebido: true, aviso: 'Erro interno' });
  }
});

router.get('/status', (req, res) => {
  res.json({ online: true, clientes_conectados: clientesConectados(),
             horario_servidor: new Date().toISOString() });
});

function geraVisual(estado, direcao) {
  const v = {
    AGUARDANDO:    { cor:'#6B7280', icone:'⏳', label:'Aguardando' },
    ATENCAO:       { cor:'#F59E0B', icone:'⚠️', label:'Atenção — '+direcao },
    EXECUTAR:      { cor: direcao==='COMPRA'?'#10B981':'#EF4444',
                     icone: direcao==='COMPRA'?'🟢':'🔴',
                     label: direcao+' A MERCADO' },
    CANCELADO:     { cor:'#6B7280', icone:'❌', label:'Cancelado' },
    DIA_ENCERRADO: { cor:'#8B5CF6', icone:'🏁', label:'Dia Encerrado' }
  };
  return v[estado] || v['AGUARDANDO'];
}

module.exports = router;
