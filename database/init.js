require('dotenv').config();
const pool = require('./connection');

const initSQL = `
-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECRETSTORE — Esquema do Banco de Dados                    ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Tabela de administradores (painel admin)
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'ativo',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de clientes (usuários do programa desktop)
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'ativo',
    modulos_permitidos TEXT[] DEFAULT ARRAY['mapas', 'veiculos', 'roupas', 'peds', 'weapons'],
    is_senha_temporaria BOOLEAN DEFAULT FALSE,
    device_id VARCHAR(255),
    ultimo_login TIMESTAMP,
    reset_solicitado BOOLEAN DEFAULT FALSE,
    reset_aprovado BOOLEAN DEFAULT FALSE,
    notas TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de sessões ativas (opcional, para controle)
CREATE TABLE IF NOT EXISTS sessoes (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_id VARCHAR(255),
    ip_address VARCHAR(50),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expira_em TIMESTAMP NOT NULL
);

-- Tabela de logs de acesso
CREATE TABLE IF NOT EXISTS logs_acesso (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    email VARCHAR(255),
    acao VARCHAR(50) NOT NULL,
    detalhes TEXT,
    ip_address VARCHAR(50),
    device_id VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de informações de ajuda (exibidas no programa)
CREATE TABLE IF NOT EXISTS help_info (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    conteudo TEXT NOT NULL,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes(status);
CREATE INDEX IF NOT EXISTS idx_sessoes_cliente_id ON sessoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_logs_cliente_id ON logs_acesso(cliente_id);
CREATE INDEX IF NOT EXISTS idx_logs_criado_em ON logs_acesso(criado_em);
`;

async function initDatabase() {
    try {
        console.log('[DB] Inicializando banco de dados...');
        await pool.query(initSQL);
        console.log('[DB] Tabelas criadas com sucesso!');
        console.log('[DB] Tabelas: admins, clientes, sessoes, logs_acesso, help_info');
    } catch (error) {
        console.error('[DB] Erro ao inicializar:', error.message);
    } finally {
        await pool.end();
    }
}

initDatabase();
