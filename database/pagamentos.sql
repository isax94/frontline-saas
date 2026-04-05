CREATE TABLE IF NOT EXISTS pagamentos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email               VARCHAR(150) NOT NULL,
  plano               VARCHAR(20)  NOT NULL,
  valor               NUMERIC(10,2) DEFAULT 0,
  moeda               VARCHAR(10)  DEFAULT 'BRL',
  hotmart_transaction VARCHAR(100) UNIQUE,
  evento              VARCHAR(50),
  criado_em           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_email     ON pagamentos(email);
CREATE INDEX IF NOT EXISTS idx_pagamentos_criado_em ON pagamentos(criado_em DESC);
