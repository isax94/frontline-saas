const jwt = require('jsonwebtoken');
const db = require('../database/db');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ erro: 'Token não fornecido' });

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const result = await db.query(
      `SELECT id, nome, email, plano, ativo, assinatura_valida_ate
       FROM usuarios WHERE id = $1`,
      [payload.id]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ erro: 'Usuário não encontrado' });

    const usuario = result.rows[0];
    if (!usuario.ativo)
      return res.status(403).json({ erro: 'Conta desativada' });

    if (usuario.plano !== 'trial' && usuario.assinatura_valida_ate) {
      if (new Date() > new Date(usuario.assinatura_valida_ate))
        return res.status(403).json({ erro: 'Assinatura expirada' });
    }

    req.usuario = usuario;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
      return res.status(401).json({ erro: 'Token inválido ou expirado' });
    console.error('Erro no middleware de auth:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
}

module.exports = authMiddleware;
