const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const db      = require('../database/db');

const PLANOS_HOTMART = {
  'OFERTA_MENSAL':    { plano: 'mensal',    dias: 30  },
  'OFERTA_SEMESTRAL': { plano: 'semestral', dias: 180 },
  'OFERTA_ANUAL':     { plano: 'anual',     dias: 365 },
};

function validaAssinatura(req) {
  const secret    = process.env.HOTMART_WEBHOOK_SECRET;
  const signature = req.headers['x-hotmart-hottok'];
  if (!secret || !signature) return false;
  const hmac   = crypto.createHmac('sha1', secret);
  const digest = hmac.update(JSON.stringify(req.body)).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(digest, 'hex'), Buffer.from(signature, 'hex')
  );
}

router.post('/webhook', async (req, res) => {
  if (!validaAssinatura(req))
    return res.status(401).json({ erro: 'Assinatura inválida' });
  const tipo = req.body?.event;
  try {
    if (['PURCHASE_APPROVED','PURCHASE_COMPLETE'].includes(tipo))
      await handleCompra(req.body);
    else if (['SUBSCRIPTION_CANCELLATION'].includes(tipo))
      await handleCancelamento(req.body);
    else if (['PURCHASE_REFUNDED','PURCHASE_CHARGEBACK'].includes(tipo))
      await handleReembolso(req.body);
    res.json({ recebido: true });
  } catch (err) {
    console.error('Hotmart erro:', err);
    res.json({ recebido: true });
  }
});

async function handleCompra(evento) {
  const email  = evento.data?.buyer?.email?.toLowerCase().trim();
  const oferta = evento.data?.purchase?.offer?.code || '';
  const config = PLANOS_HOTMART[oferta] || { plano: 'mensal', dias: 30 };
  const validade = new Date();
  validade.setDate(validade.getDate() + config.dias);
  if (!email) return;
  const existe = await db.query('SELECT id FROM usuarios WHERE email=$1', [email]);
  if (existe.rows.length > 0) {
    await db.query(
      `UPDATE usuarios SET plano=$1, assinatura_valida_ate=$2, ativo=true,
        atualizado_em=NOW() WHERE email=$3`,
      [config.plano, validade, email]
    );
  } else {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const nome = evento.data?.buyer?.name || 'Assinante';
    const senhaHash = await bcrypt.hash(Math.random().toString(36).slice(-8), 12);
    await db.query(
      `INSERT INTO usuarios (id,nome,email,senha_hash,plano,ativo,assinatura_valida_ate)
       VALUES ($1,$2,$3,$4,$5,true,$6)`,
      [uuidv4(), nome, email, senhaHash, config.plano, validade]
    );
  }
}

async function handleCancelamento(evento) {
  const email = evento.data?.buyer?.email?.toLowerCase().trim();
  if (!email) return;
  await db.query('UPDATE usuarios SET ativo=false, atualizado_em=NOW() WHERE email=$1', [email]);
}

async function handleReembolso(evento) {
  const email = evento.data?.buyer?.email?.toLowerCase().trim();
  if (!email) return;
  await db.query(
    'UPDATE usuarios SET ativo=false, assinatura_valida_ate=NOW() WHERE email=$1', [email]
  );
}

router.get('/status', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ erro: 'Email obrigatório' });
  const result = await db.query(
    'SELECT plano, ativo, assinatura_valida_ate FROM usuarios WHERE email=$1',
    [email.toLowerCase().trim()]
  );
  if (result.rows.length === 0) return res.json({ encontrado: false, ativo: false });
  const u = result.rows[0];
  const valido = u.ativo && (!u.assinatura_valida_ate || new Date(u.assinatura_valida_ate) > new Date());
  res.json({ encontrado: true, ativo: valido, plano: u.plano, validade: u.assinatura_valida_ate });
});

module.exports = router;
