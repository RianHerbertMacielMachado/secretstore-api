require('dotenv').config();
const pool = require('./connection');
const bcrypt = require('bcrypt');

async function seed() {
    try {
        console.log('[Seed] Inserindo dados iniciais...');

        // Criar admin padrão
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@secretstore.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2024!';
        const adminHash = await bcrypt.hash(adminPassword, 12);

        await pool.query(`
            INSERT INTO admins (nome, email, senha_hash)
            VALUES ($1, $2, $3)
            ON CONFLICT (email) DO NOTHING
        `, ['Administrador', adminEmail, adminHash]);

        console.log(`[Seed] Admin criado: ${adminEmail}`);

        // Criar informações de ajuda padrão
        const helpItems = [
            { titulo: 'Contato', conteudo: 'Para suporte, entre em contato pelo Discord ou WhatsApp da Secret Store.', ordem: 1 },
            { titulo: 'Como usar os módulos', conteudo: 'Selecione a pasta de origem com seus arquivos, escolha o módulo desejado e clique em Organizar. O programa criará as pastas automaticamente.', ordem: 2 },
            { titulo: 'Modo Offline', conteudo: 'O programa funciona offline por até 30 dias após o último login online. Após esse período, é necessário conectar-se à internet.', ordem: 3 }
        ];

        for (const item of helpItems) {
            await pool.query(`
                INSERT INTO help_info (titulo, conteudo, ordem)
                VALUES ($1, $2, $3)
            `, [item.titulo, item.conteudo, item.ordem]);
        }

        console.log('[Seed] Itens de ajuda criados');
        console.log('[Seed] Concluído!');

    } catch (error) {
        console.error('[Seed] Erro:', error.message);
    } finally {
        await pool.end();
    }
}

seed();
