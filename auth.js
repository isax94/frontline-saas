const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');

router.post('/registro', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha)
      return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
    if (senha.length < 6)
      return res.status(400).json({ erro: 'Senha deve ter pelo menos 6 caracteres' });
    const existe = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0)
      return res.status(409).json({ erro: 'Email já cadastrado' });
    const senhaHash = await bcrypt.hash(senha, 12);
    const trialAte = new Date();
    trialAte.setDate(trialAte.getDate() + 7);
    const result = await db.query(
      `INSERT INTO usuarios (id, nome, email, senha_hash, plano, assinatura_valida_ate)
       VALUES ($1, $2, $3, $4, 'trial', $5)
       RETURNING id, nome, email, plano`,
      [uuidv4(), nome, email, senhaHash, trialAte]
    );
    const usuario = result.rows[0];
    const token = geraToken(usuario);
    res.status(201).json({ mensagem: 'Conta criada!', token, usuario });
  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha)
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    const result = await db.query(
      `SELECT id, nome, email, senha_hash, plano, ativo, assinatura_valida_ate
       FROM usuarios WHERE email = $1`, [email]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    const usuario = result.rows[0];
    if (!usuario.ativo)
      return res.status(403).json({ erro: 'Conta desativada.' });
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida)
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    const token = geraToken(usuario);
    res.json({ token, usuario });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  res.json({ usuario: req.usuario });
});

function geraToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, plano: usuario.plano },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = router;
