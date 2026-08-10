require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Log de requisições (simples)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ─── ROTAS ────────────────────────────────────────────────────────────────────
app.use('/', require('./routes/health'));
app.use('/api/auth/client', require('./routes/clientAuth'));
app.use('/api/auth/admin', require('./routes/adminAuth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/help', require('./routes/help'));

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Rota não encontrada.' });
});

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
});

// ─── INICIAR ──────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n╔══════════════════════════════════════════════════╗`);
    console.log(`║  SecretStore API rodando na porta ${PORT}           ║`);
    console.log(`╚══════════════════════════════════════════════════╝\n`);
});
