const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/hoje', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sinais
       WHERE DATE(criado_em AT TIME ZONE 'America/Sao_Paulo') =
             CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo'
       ORDER BY criado_em DESC LIMIT 100`
    );
    res.json({ sinais: result.rows });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar sinais' });
  }
});

router.get('/historico', async (req, res) => {
  try {
    const { data, pagina = 1, limite = 50 } = req.query;
    const offset = (pagina - 1) * limite;
    let query, params;
    if (data) {
      query = `SELECT * FROM sinais
               WHERE DATE(criado_em AT TIME ZONE 'America/Sao_Paulo') = $1
               ORDER BY criado_em DESC LIMIT $2 OFFSET $3`;
      params = [data, limite, offset];
    } else {
      query = `SELECT * FROM sinais ORDER BY criado_em DESC LIMIT $1 OFFSET $2`;
      params = [limite, offset];
    }
    const result = await db.query(query, params);
    res.json({ sinais: result.rows, pagina: parseInt(pagina), limite: parseInt(limite) });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar histórico' });
  }
});

router.get('/resumo', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE estado='EXECUTAR' AND direcao='COMPRA') AS total_compras,
         COUNT(*) FILTER (WHERE estado='EXECUTAR' AND direcao='VENDA')  AS total_vendas,
         COUNT(*) FILTER (WHERE estado='CANCELADO') AS total_cancelados,
         COUNT(*) FILTER (WHERE estado='EXECUTAR')  AS total_operacoes
       FROM sinais`
    );
    const ultimo = await db.query(
      `SELECT * FROM sinais ORDER BY criado_em DESC LIMIT 1`
    );
    res.json({ resumo: result.rows[0], ultimo_estado: ultimo.rows[0] || null });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar resumo' });
  }
});

router.get('/ultimo', async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM sinais ORDER BY criado_em DESC LIMIT 1`);
    res.json({ sinal: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar último sinal' });
  }
});

module.exports = router;
