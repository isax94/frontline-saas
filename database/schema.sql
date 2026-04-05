CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS usuarios (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  senha_hash  VARCHAR(255) NOT NULL,
  plano       VARCHAR(20) NOT NULL DEFAULT 'trial',
  ativo       BOOLEAN NOT NULL DEFAULT true,
  assinatura_valida_ate TIMESTAMP,
  criado_em   TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sinais (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  robot       VARCHAR(50) NOT NULL DEFAULT 'Frontline',
  estado      VARCHAR(20) NOT NULL,
  direcao     VARCHAR(10) NOT NULL,
  ativo       VARCHAR(20) NOT NULL,
  preco       NUMERIC(12,2),
  mensagem    TEXT,
  resultado_diario NUMERIC(10,2) DEFAULT 0,
  operacoes_hoje   INTEGER DEFAULT 0,
  horario_mt  TIMESTAMP,
  criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sinais_criado_em ON sinais(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_sinais_estado ON sinais(estado);

CREATE TABLE IF NOT EXISTS sessoes_ws (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID REFERENCES usuarios(id),
  conectado_em   TIMESTAMP NOT NULL DEFAULT NOW(),
  desconectado_em TIMESTAMP
);

CREATE OR REPLACE VIEW sinais_hoje AS
  SELECT * FROM sinais
  WHERE DATE(criado_em) = CURRENT_DATE
  ORDER BY criado_em DESC;
