import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// --- CONFIGURAÇÃO DE DIRETÓRIOS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Garante que a pasta logo local exista
const LOCAL_LOGO_DIR = path.join(__dirname, 'logo');
if (!fs.existsSync(LOCAL_LOGO_DIR)){
    fs.mkdirSync(LOCAL_LOGO_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Servir arquivos do frontend (build)
app.use(express.static(path.join(__dirname, 'dist')));

// --- DATABASE & STORAGE SETUP (ROBUSTO) ---
const BACKUP_DIR = '/backup';
let PERSISTENT_LOGO_DIR = path.join(__dirname, 'backup_logos_fallback'); // Fallback local

// 1. Tenta configurar diretório de backup
try {
    if (!fs.existsSync(BACKUP_DIR)) {
        // Tenta criar na raiz (Linux/Docker/Render)
        try {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        } catch (e) {
            // Fallback para pasta local ./backup
            if (!fs.existsSync('./backup')) {
                fs.mkdirSync('./backup', { recursive: true });
            }
        }
    }
} catch (e) {
    console.error("Aviso: Erro ao configurar diretórios de backup:", e.message);
}

// 2. Configura diretório de logos persistente
// Se /backup existe e é gravável, usa /backup/logos
// Senão, usa ./backup/logos local
if (fs.existsSync(BACKUP_DIR)) {
    try {
        fs.accessSync(BACKUP_DIR, fs.constants.W_OK);
        PERSISTENT_LOGO_DIR = path.join(BACKUP_DIR, 'logos');
    } catch (e) {
        PERSISTENT_LOGO_DIR = './backup/logos';
    }
} else {
    PERSISTENT_LOGO_DIR = './backup/logos';
}

if (!fs.existsSync(PERSISTENT_LOGO_DIR)) {
    fs.mkdirSync(PERSISTENT_LOGO_DIR, { recursive: true });
}

console.log(`Logos persistentes em: ${PERSISTENT_LOGO_DIR}`);

// 3. Define caminho do banco
let dbPath = './backup/finance_v2.db'; 
if (fs.existsSync(BACKUP_DIR)) {
    try {
        fs.accessSync(BACKUP_DIR, fs.constants.W_OK);
        dbPath = path.join(BACKUP_DIR, 'finance_v2.db');
    } catch (e) {}
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("ERRO CRÍTICO AO ABRIR BANCO DE DADOS:", err.message);
    else console.log(`Banco de dados conectado em: ${dbPath}`);
});

// --- ROTA DE IMAGENS (MIDDLEWARE CUSTOMIZADO) ---
// Tenta servir do persistent primeiro, depois do local
app.use('/logo', (req, res, next) => {
    const urlPath = req.path;
    const persistentFile = path.join(PERSISTENT_LOGO_DIR, urlPath);
    
    if (fs.existsSync(persistentFile)) {
        return res.sendFile(persistentFile);
    }
    next();
});
app.use('/logo', express.static(LOCAL_LOGO_DIR));

// Middleware para validar userId e Admin
const getUserId = (req) => {
    let userId = req.headers['user-id'];
    if (!userId) {
        userId = req.query.userId || req.query['user-id'];
    }
    return userId ? String(userId).trim() : null;
};

const checkAuth = (req, res, next) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    req.userId = userId;
    next();
};

const checkAdmin = (req, res, next) => {
    const userId = getUserId(req);
    if (userId !== 'admin') return res.status(403).json({ error: "Forbidden: Admin access only" });
    next();
};

// Configuração de Email
const mailPort = Number(process.env.MAIL_PORT) || 587;
const mailSecure = mailPort === 465 ? true : false; 

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_SERVER,
    port: mailPort,
    secure: mailSecure, 
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
});

const sendEmail = async (to, subject, htmlContent) => {
  if (!process.env.MAIL_SERVER || !process.env.MAIL_USERNAME) {
      console.warn("[EMAIL] Configurações ausentes. Simulando envio.");
      return true;
  }
  try {
      const fromName = process.env.MAIL_FROM_NAME || "Virgula Contábil";
      const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME;
      const info = await transporter.sendMail({
          from: `"${fromName}" <${fromAddress}>`,
          to: to,
          subject: subject,
          html: htmlContent
      });
      console.log(`[EMAIL] Sucesso! ID: ${info.messageId}`);
      return true;
  } catch (error) {
      console.error("[EMAIL] Erro FATAL ao enviar:", error);
      return false;
  }
};

// --- DATA SEEDING --- 
const INITIAL_BANKS_SEED = [
  { name: 'Nubank', logo: '/logo/nubank.jpg' },
  { name: 'Itaú', logo: '/logo/itau.png' },
  { name: 'Bradesco', logo: '/logo/bradesco.jpg' },
  { name: 'Caixa Econômica', logo: '/logo/caixa.png' },
  { name: 'Banco do Brasil', logo: '/logo/bb.png' },
  { name: 'Santander', logo: '/logo/santander.png' },
  { name: 'Inter', logo: '/logo/inter.png' },
  { name: 'BTG Pactual', logo: '/logo/btg_pactual.png' },
  { name: 'C6 Bank', logo: '/logo/c6_bank.png' },
  { name: 'Sicredi', logo: '/logo/sicredi.png' },
  { name: 'Sicoob', logo: '/logo/sicoob.png' },
  { name: 'Mercado Pago', logo: '/logo/mercado_pago.png' },
  { name: 'PagBank', logo: '/logo/pagbank.png' },
  { name: 'Stone', logo: '/logo/stone.png' },
  { name: 'Banco Safra', logo: '/logo/safra.png' },
  { name: 'Banco Pan', logo: '/logo/banco_pan.png' },
  { name: 'Banrisul', logo: '/logo/banrisul.png' },
  { name: 'Neon', logo: '/logo/neon.png' },
  { name: 'Caixa Registradora', logo: '/logo/caixaf.png' },
];

const INITIAL_CATEGORIES_SEED = [
    { name: 'Vendas de Mercadorias', type: 'receita' },
    { name: 'Prestação de Serviços', type: 'receita' },
    { name: 'Receita de Aluguel', type: 'receita' },
    { name: 'Comissões Recebidas', type: 'receita' },
    { name: 'Receita Financeira', type: 'receita' },
    { name: 'Outras Receitas', type: 'receita' },
    { name: 'Compra de Mercadorias', type: 'despesa' },
    { name: 'Despesas com Pessoal', type: 'despesa' },
    { name: 'Despesas Administrativas', type: 'despesa' },
    { name: 'Impostos e Taxas', type: 'despesa' },
    { name: 'Despesas Financeiras', type: 'despesa' },
    { name: 'Pró-Labore', type: 'despesa' }
];

// Helper para garantir colunas (Migração)
const ensureColumn = (table, column, definition) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if (!err && rows) {
            const hasColumn = rows.some(r => r.name === column);
            if (!hasColumn) {
                db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
            }
        }
    });
};

// Initialize Tables & Seed
db.serialize(() => {
  // 1. Global Banks
  db.run(`CREATE TABLE IF NOT EXISTS global_banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    logo TEXT
  )`, (err) => {
      if (!err) {
          db.get("SELECT COUNT(*) as count FROM global_banks", [], (err, row) => {
              if (!err && row && row.count === 0) {
                  const stmt = db.prepare("INSERT INTO global_banks (name, logo) VALUES (?, ?)");
                  INITIAL_BANKS_SEED.forEach(b => stmt.run(b.name, b.logo));
                  stmt.finalize();
              }
          });
      }
  });

  // 2. Users
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    cnpj TEXT,
    razao_social TEXT,
    phone TEXT,
    reset_token TEXT,
    reset_token_expires INTEGER
  )`, (err) => {
      if(!err) {
          ensureColumn('users', 'reset_token', 'TEXT');
          ensureColumn('users', 'reset_token_expires', 'INTEGER');
      }
  });

  // 3. Pending Signups
  db.run(`CREATE TABLE IF NOT EXISTS pending_signups (
    email TEXT PRIMARY KEY,
    token TEXT,
    cnpj TEXT,
    razao_social TEXT,
    phone TEXT,
    created_at INTEGER
  )`);

  // 4. Banks (User Specific)
  db.run(`CREATE TABLE IF NOT EXISTS banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    account_number TEXT,
    nickname TEXT,
    logo TEXT,
    active INTEGER DEFAULT 1,
    balance REAL DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`, (err) => {
      if (!err) {
          ensureColumn('banks', 'active', 'INTEGER DEFAULT 1');
          ensureColumn('banks', 'balance', 'REAL DEFAULT 0');
      }
  });

  // 5. Categories
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    type TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // 6. OFX
  db.run(`CREATE TABLE IF NOT EXISTS ofx_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    file_name TEXT,
    import_date TEXT,
    bank_id INTEGER,
    transaction_count INTEGER,
    content TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`, (err) => {
      if(!err) ensureColumn('ofx_imports', 'content', 'TEXT');
  });

  // 7. Transactions
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT,
    description TEXT,
    value REAL,
    type TEXT,
    category_id INTEGER,
    bank_id INTEGER,
    reconciled INTEGER,
    ofx_import_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // 8. Forecasts
  db.run(`CREATE TABLE IF NOT EXISTS forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT,
    description TEXT,
    value REAL,
    type TEXT,
    category_id INTEGER,
    bank_id INTEGER,
    realized INTEGER,
    installment_current INTEGER,
    installment_total INTEGER,
    group_id TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // 9. Keyword Rules
  db.run(`CREATE TABLE IF NOT EXISTS keyword_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    keyword TEXT,
    type TEXT,
    category_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});

// --- PUBLIC ROUTES (For Frontend Selection) ---
app.get('/api/global-banks', (req, res) => {
    db.all('SELECT * FROM global_banks ORDER BY name ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// --- ADMIN ROUTES ---

// 0. Manage Global Banks
app.get('/api/admin/banks', checkAdmin, (req, res) => {
    db.all('SELECT * FROM global_banks ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/admin/banks', checkAdmin, async (req, res) => {
    const { name, logoData } = req.body; // logoData should be base64 string
    
    if (!name) return res.status(400).json({ error: "Nome é obrigatório" });

    let logoPath = '/logo/caixaf.png'; // Default fallback

    if (logoData && logoData.startsWith('data:image')) {
        try {
            // Extract extension and data
            const matches = logoData.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const extension = matches[1].includes('+') ? matches[1].split('+')[0] : matches[1]; 
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');
                
                const fileName = `bank_${Date.now()}.${extension.replace('jpeg','jpg')}`;
                
                // SALVAR NO PERSISTENTE
                const filePath = path.join(PERSISTENT_LOGO_DIR, fileName);
                fs.writeFileSync(filePath, buffer);
                
                logoPath = `/logo/${fileName}`;
            }
        } catch (e) {
            console.error("Error saving logo:", e);
            return res.status(500).json({ error: "Erro ao salvar imagem" });
        }
    } else if (logoData && typeof logoData === 'string' && logoData.startsWith('/logo/')) {
        logoPath = logoData;
    }

    db.run('INSERT INTO global_banks (name, logo) VALUES (?, ?)', [name, logoPath], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, logo: logoPath });
    });
});

// ATUALIZAÇÃO COM PERSISTÊNCIA E PROPAGAÇÃO
app.put('/api/admin/banks/:id', checkAdmin, (req, res) => {
    const { name, logoData } = req.body;
    const { id } = req.params;

    if (!name) return res.status(400).json({ error: "Nome é obrigatório" });

    db.get('SELECT * FROM global_banks WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Banco não encontrado" });

        const oldName = row.name;
        let logoPath = row.logo;

        // Se nova imagem foi enviada
        if (logoData && logoData.startsWith('data:image')) {
             try {
                const matches = logoData.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const extension = matches[1].includes('+') ? matches[1].split('+')[0] : matches[1]; 
                    const base64Data = matches[2];
                    const buffer = Buffer.from(base64Data, 'base64');
                    
                    const fileName = `bank_${Date.now()}.${extension.replace('jpeg','jpg')}`;
                    
                    // SALVAR NO PERSISTENTE
                    const filePath = path.join(PERSISTENT_LOGO_DIR, fileName);
                    fs.writeFileSync(filePath, buffer);
                    
                    logoPath = `/logo/${fileName}`;
                }
            } catch (e) {
                console.error("Error saving logo:", e);
                return res.status(500).json({ error: "Erro ao salvar imagem" });
            }
        }

        // 1. Atualiza Banco Global
        db.run('UPDATE global_banks SET name = ?, logo = ? WHERE id = ?', [name, logoPath, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // 2. Propaga atualização para TODOS os usuários
            // Atualiza a tabela 'banks' onde o nome coincidia com o antigo
            db.run('UPDATE banks SET name = ?, logo = ? WHERE name = ?', [name, logoPath, oldName], (errUpdate) => {
                if(errUpdate) console.error("Erro na propagação:", errUpdate);
                res.json({ id, name, logo: logoPath });
            });
        });
    });
});

app.delete('/api/admin/banks/:id', checkAdmin, (req, res) => {
    db.run('DELETE FROM global_banks WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Banco removido" });
    });
});

// 1. Get All Users
app.get('/api/admin/users', checkAdmin, (req, res) => {
    db.all('SELECT id, email, cnpj, razao_social, phone FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 2. Get Single User Full Data (For Admin Dashboard)
app.get('/api/admin/users/:id/full-data', checkAdmin, async (req, res) => {
    const userId = req.params.id;
    try {
        const transactions = await new Promise((resolve, reject) => {
            db.all(`SELECT t.*, c.name as category_name, b.name as bank_name 
                    FROM transactions t 
                    LEFT JOIN categories c ON t.category_id = c.id 
                    LEFT JOIN banks b ON t.bank_id = b.id
                    WHERE t.user_id = ? ORDER BY t.date DESC`, [userId], (err, rows) => {
                if (err) reject(err); else resolve(rows);
            });
        });

        const forecasts = await new Promise((resolve, reject) => {
            db.all(`SELECT f.*, c.name as category_name, b.name as bank_name 
                    FROM forecasts f
                    LEFT JOIN categories c ON f.category_id = c.id
                    LEFT JOIN banks b ON f.bank_id = b.id
                    WHERE f.user_id = ? ORDER BY f.date ASC`, [userId], (err, rows) => {
                if (err) reject(err); else resolve(rows);
            });
        });

        const ofxImports = await new Promise((resolve, reject) => {
            db.all(`SELECT o.id, o.file_name, o.import_date, o.transaction_count, b.name as bank_name 
                    FROM ofx_imports o
                    LEFT JOIN banks b ON o.bank_id = b.id
                    WHERE o.user_id = ? ORDER BY o.import_date DESC`, [userId], (err, rows) => {
                if (err) reject(err); else resolve(rows);
            });
        });

        res.json({ transactions, forecasts, ofxImports });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Download OFX Content
app.get('/api/admin/ofx-download/:id', checkAdmin, (req, res) => {
    db.get('SELECT file_name, content FROM ofx_imports WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row || !row.content) return res.status(404).json({ error: "Arquivo não encontrado ou sem conteúdo" });
        
        res.setHeader('Content-Disposition', `attachment; filename="${row.file_name}"`);
        res.setHeader('Content-Type', 'application/x-ofx');
        res.send(row.content);
    });
});

// 4. Delete User & All Data
app.delete('/api/admin/users/:id', checkAdmin, (req, res) => {
    const userId = req.params.id;
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('DELETE FROM transactions WHERE user_id = ?', [userId]);
        db.run('DELETE FROM forecasts WHERE user_id = ?', [userId]);
        db.run('DELETE FROM banks WHERE user_id = ?', [userId]);
        db.run('DELETE FROM categories WHERE user_id = ?', [userId]);
        db.run('DELETE FROM ofx_imports WHERE user_id = ?', [userId]);
        db.run('DELETE FROM keyword_rules WHERE user_id = ?', [userId]);
        db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }
            db.run('COMMIT');
            res.json({ message: 'User and all data deleted' });
        });
    });
});

// 5. Get Global Data Stats
app.get('/api/admin/global-data', checkAdmin, (req, res) => {
    const queries = {
        users: 'SELECT COUNT(*) as count FROM users',
        transactions: 'SELECT COUNT(*) as count, SUM(value) as totalValue FROM transactions',
        forecasts: 'SELECT COUNT(*) as count FROM forecasts',
        imports: 'SELECT COUNT(*) as count FROM ofx_imports'
    };

    const results = {};
    let completed = 0;
    const total = Object.keys(queries).length;

    Object.keys(queries).forEach(key => {
        db.get(queries[key], [], (err, row) => {
            if (err) return res.status(500).json({error: err.message});
            results[key] = row;
            completed++;
            if (completed === total) res.json(results);
        });
    });
});

// 6. Get Global Transactions (For Audit)
app.get('/api/admin/audit-transactions', checkAdmin, (req, res) => {
    const sql = `
        SELECT t.id, t.date, t.description, t.value, t.type, u.razao_social 
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        ORDER BY t.date DESC
        LIMIT 500
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});


// --- AUTH ROUTES ---
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.MAIL_ADMIN && password === process.env.PASSWORD_ADMIN) {
      return res.json({ 
          id: 'admin', 
          email: process.env.MAIL_ADMIN, 
          razaoSocial: 'Administrador Global',
          role: 'admin'
      });
  }
  db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Credenciais inválidas.' });
    res.json({ id: row.id, email: row.email, razaoSocial: row.razao_social, role: 'user' });
  });
});

app.post('/api/request-signup', (req, res) => {
    const { email, cnpj, razaoSocial, phone } = req.body;
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
        if (row) return res.status(400).json({ error: "E-mail já cadastrado." });
        const token = crypto.randomBytes(20).toString('hex');
        const createdAt = Date.now();
        db.run(
            `INSERT OR REPLACE INTO pending_signups (email, token, cnpj, razao_social, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [email, token, cnpj, razaoSocial, phone, createdAt],
            async function(err) {
                if (err) return res.status(500).json({ error: err.message });
                const origin = req.headers.origin || 'https://seu-app.com';
                const link = `${origin}/?action=finalize&token=${token}`;
                const html = `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px; border-radius: 8px;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
                        <h1 style="color: #10b981; margin: 0 0 20px 0;">Definir Senha de Acesso</h1>
                        <p style="color: #334155; font-size: 16px; margin-bottom: 30px;">
                            Olá, <strong>${razaoSocial}</strong>. Seus dados foram recebidos.
                            <br>Clique no botão abaixo para definir sua senha e ativar sua conta.
                        </p>
                        <a href="${link}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                            Definir Minha Senha
                        </a>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">
                            Link válido por 24 horas.
                        </p>
                    </div>
                </div>
                `;
                await sendEmail(email, "Ative sua conta - Virgula Contábil", html);
                res.json({ message: "Link de cadastro enviado." });
            }
        );
    });
});

app.post('/api/complete-signup', (req, res) => {
  const { token, password } = req.body;
  db.get('SELECT * FROM pending_signups WHERE token = ?', [token], (err, pendingUser) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!pendingUser) return res.status(400).json({ error: "Token inválido ou expirado." });
      
      db.run(
        `INSERT INTO users (email, password, cnpj, razao_social, phone) VALUES (?, ?, ?, ?, ?)`,
        [pendingUser.email, password, pendingUser.cnpj, pendingUser.razao_social, pendingUser.phone],
        async function(err) {
          if (err) return res.status(500).json({ error: err.message });
          const newUserId = this.lastID;
          db.run('DELETE FROM pending_signups WHERE email = ?', [pendingUser.email]);
          
          // SEED FROM GLOBAL BANKS
          db.all('SELECT * FROM global_banks', [], (err, globalBanks) => {
              if (!err && globalBanks.length > 0) {
                  const bankStmt = db.prepare("INSERT INTO banks (user_id, name, account_number, nickname, logo, active, balance) VALUES (?, ?, ?, ?, ?, ?, ?)");
                  globalBanks.forEach(b => {
                      // Default values for new user copy
                      bankStmt.run(newUserId, b.name, '0000-0', b.name, b.logo, 0, 0);
                  });
                  bankStmt.finalize();
              }
          });

          const catStmt = db.prepare("INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)");
          INITIAL_CATEGORIES_SEED.forEach(c => {
              catStmt.run(newUserId, c.name, c.type);
          });
          catStmt.finalize();
          res.json({ id: newUserId, email: pendingUser.email, razaoSocial: pendingUser.razao_social });
        }
      );
  });
});

app.post('/api/recover-password', (req, res) => {
    const { email } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, row) => {
        if (!row) return res.json({ message: 'Se o email existir, as instruções foram enviadas.' });
        const token = crypto.randomBytes(20).toString('hex');
        const expires = Date.now() + 3600000;
        db.run('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expires, row.id], async (err) => {
            if (err) return res.status(500).json({error: err.message});
            const origin = req.headers.origin || 'https://seu-app.com';
            const link = `${origin}/?action=reset&token=${token}`;
            const resetHtml = `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px; border-radius: 8px;">
            <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
                <h1 style="color: #10b981; margin: 0 0 20px 0;">Recuperação de Senha</h1>
                <p style="color: #334155; font-size: 16px; margin-bottom: 30px;">
                    Recebemos uma solicitação para redefinir a senha.
                </p>
                <a href="${link}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Redefinir Minha Senha
                </a>
            </div>
            </div>
            `;
            await sendEmail(email, "Recuperação de Senha - Virgula Contábil", resetHtml);
            res.json({ message: 'Email de recuperação enviado.' });
        });
    });
});

app.post('/api/reset-password-confirm', (req, res) => {
    const { token, newPassword } = req.body;
    db.get('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?', [token, Date.now()], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(400).json({ error: "Link de recuperação inválido ou expirado." });
        db.run('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [newPassword, row.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Senha alterada com sucesso." });
        });
    });
});

app.get('/api/validate-signup-token/:token', (req, res) => {
    db.get('SELECT email, razao_social FROM pending_signups WHERE token = ?', [req.params.token], (err, row) => {
        if (err || !row) return res.status(404).json({ valid: false });
        res.json({ valid: true, email: row.email, razaoSocial: row.razao_social });
    });
});

// GENERIC USER MIDDLEWARE (Mantidos)
app.get('/api/banks', checkAuth, (req, res) => {
    db.all(`SELECT * FROM banks WHERE user_id = ?`, [req.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(b => ({
            id: b.id,
            name: b.name,
            accountNumber: b.account_number,
            nickname: b.nickname,
            logo: b.logo,
            active: Boolean(b.active),
            balance: b.balance
        })));
    });
});

app.post('/api/banks', checkAuth, (req, res) => {
    const { name, accountNumber, nickname, logo } = req.body;
    db.run(
        `INSERT INTO banks (user_id, name, account_number, nickname, logo, active, balance) VALUES (?, ?, ?, ?, ?, 1, 0)`,
        [req.userId, name, accountNumber, nickname, logo],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, name, accountNumber, nickname, logo, active: true, balance: 0 });
        }
    );
});

app.put('/api/banks/:id', checkAuth, (req, res) => {
    const { nickname, accountNumber, active } = req.body;
    db.run(
        `UPDATE banks SET nickname = ?, account_number = ?, active = ? WHERE id = ? AND user_id = ?`,
        [nickname, accountNumber, active ? 1 : 0, req.params.id, req.userId],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/banks/:id', checkAuth, (req, res) => {
    db.run(`DELETE FROM banks WHERE id = ? AND user_id = ?`, [req.params.id, req.userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

app.get('/api/categories', checkAuth, (req, res) => {
    db.all(`SELECT * FROM categories WHERE user_id = ?`, [req.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/categories', checkAuth, (req, res) => {
    const { name, type } = req.body;
    db.run(
        `INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)`,
        [req.userId, name, type],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, name, type });
        }
    );
});

app.delete('/api/categories/:id', checkAuth, (req, res) => {
    db.run(`DELETE FROM categories WHERE id = ? AND user_id = ?`, [req.params.id, req.userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

app.get('/api/keyword-rules', checkAuth, (req, res) => {
    db.all(`SELECT * FROM keyword_rules WHERE user_id = ?`, [req.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
            id: r.id,
            keyword: r.keyword,
            type: r.type,
            categoryId: r.category_id
        })));
    });
});

app.post('/api/keyword-rules', checkAuth, (req, res) => {
    const { keyword, type, categoryId } = req.body;
    db.run(
        `INSERT INTO keyword_rules (user_id, keyword, type, category_id) VALUES (?, ?, ?, ?)`,
        [req.userId, keyword, type, categoryId],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, keyword, type, categoryId });
        }
    );
});

app.delete('/api/keyword-rules/:id', checkAuth, (req, res) => {
    db.run(`DELETE FROM keyword_rules WHERE id = ? AND user_id = ?`, [req.params.id, req.userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

app.get('/api/transactions', checkAuth, (req, res) => {
  db.all(`SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC`, [req.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const transactions = rows.map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      value: t.value,
      type: t.type,
      categoryId: t.category_id,
      bankId: t.bank_id,
      reconciled: Boolean(t.reconciled),
      ofxImportId: t.ofx_import_id
    }));
    res.json(transactions);
  });
});

app.post('/api/transactions', checkAuth, (req, res) => {
  const { date, description, value, type, categoryId, bankId, reconciled, ofxImportId } = req.body;
  db.run(
    `INSERT INTO transactions (user_id, date, description, value, type, category_id, bank_id, reconciled, ofx_import_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.userId, date, description, value, type, category_id, bankId, reconciled ? 1 : 0, ofxImportId || null],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

app.put('/api/transactions/:id', checkAuth, (req, res) => {
  const { date, description, value, type, categoryId, bankId, reconciled } = req.body;
  let query = `UPDATE transactions SET date = ?, description = ?, value = ?, type = ?, category_id = ?, bank_id = ?`;
  const params = [date, description, value, type, category_id, bankId];
  if (reconciled !== undefined) {
      query += `, reconciled = ?`;
      params.push(reconciled ? 1 : 0);
  }
  query += ` WHERE id = ? AND user_id = ?`;
  params.push(req.params.id, req.userId);
  db.run(query, params, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/api/transactions/:id', checkAuth, (req, res) => {
    db.run(`DELETE FROM transactions WHERE id = ? AND user_id = ?`, [req.params.id, req.userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

app.patch('/api/transactions/:id/reconcile', checkAuth, (req, res) => {
    const { reconciled } = req.body;
    db.run(`UPDATE transactions SET reconciled = ? WHERE id = ? AND user_id = ?`, [reconciled ? 1 : 0, req.params.id, req.userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

app.patch('/api/transactions/batch-update', checkAuth, (req, res) => {
    const { transactionIds, categoryId } = req.body;
    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
        return res.status(400).json({ error: "Invalid transaction IDs" });
    }
    const placeholders = transactionIds.map(() => '?').join(',');
    const sql = `UPDATE transactions SET category_id = ?, reconciled = 1 WHERE id IN (${placeholders}) AND user_id = ?`;
    const params = [categoryId, ...transactionIds, req.userId];
    db.run(sql, params, function(err) {
        if(err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

app.get('/api/ofx-imports', checkAuth, (req, res) => {
    db.all(`SELECT * FROM ofx_imports WHERE user_id = ? ORDER BY import_date DESC`, [req.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
            id: r.id,
            fileName: r.file_name,
            importDate: r.import_date,
            bankId: r.bank_id,
            transactionCount: r.transaction_count
        })));
    });
});

app.post('/api/ofx-imports', checkAuth, (req, res) => {
    const { fileName, importDate, bankId, transactionCount, content } = req.body;
    db.run(
        `INSERT INTO ofx_imports (user_id, file_name, import_date, bank_id, transaction_count, content) VALUES (?, ?, ?, ?, ?, ?)`,
        [req.userId, fileName, importDate, bankId, transactionCount, content || ''],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.delete('/api/ofx-imports/:id', checkAuth, (req, res) => {
    const importId = req.params.id;
    const userId = req.userId;
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run(`DELETE FROM transactions WHERE ofx_import_id = ? AND user_id = ?`, [importId, userId]);
        db.run(`DELETE FROM ofx_imports WHERE id = ? AND user_id = ?`, [importId, userId], function(err) {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }
            db.run('COMMIT');
            res.json({ message: 'Import and transactions deleted' });
        });
    });
});

app.get('/api/forecasts', checkAuth, (req, res) => {
    db.all(`SELECT * FROM forecasts WHERE user_id = ? ORDER BY date ASC`, [req.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(f => ({
            id: f.id,
            date: f.date,
            description: f.description,
            value: f.value,
            type: f.type,
            categoryId: f.category_id,
            bankId: f.bank_id,
            realized: Boolean(f.realized),
            installmentCurrent: f.installment_current,
            installmentTotal: f.installment_total,
            groupId: f.group_id
        })));
    });
});

app.post('/api/forecasts', checkAuth, (req, res) => {
    const { date, description, value, type, categoryId, bankId, installmentCurrent, installmentTotal, groupId } = req.body;
    db.run(
        `INSERT INTO forecasts (user_id, date, description, value, type, category_id, bank_id, realized, installment_current, installment_total, group_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [req.userId, date, description, value, type, category_id, bankId, installmentCurrent, installmentTotal, groupId],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/forecasts/:id', checkAuth, (req, res) => {
    const { date, description, value, type, categoryId, bankId } = req.body;
    db.run(
        `UPDATE forecasts SET date = ?, description = ?, value = ?, type = ?, category_id = ?, bank_id = ? WHERE id = ? AND user_id = ?`,
        [date, description, value, type, category_id, bankId, req.params.id, req.userId],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/forecasts/:id', checkAuth, (req, res) => {
    const { mode } = req.query; 
    const id = req.params.id;
    const userId = req.userId;

    if (!mode || mode === 'single') {
        db.run(`DELETE FROM forecasts WHERE id = ? AND user_id = ?`, [id, userId], function(err) {
            if(err) return res.status(500).json({error: err.message});
            res.json({ deleted: this.changes });
        });
    } else {
        db.get(`SELECT group_id, date FROM forecasts WHERE id = ? AND user_id = ?`, [id, userId], (err, row) => {
            if (err) return res.status(500).json({error: err.message});
            if (!row || !row.group_id) {
                db.run(`DELETE FROM forecasts WHERE id = ? AND user_id = ?`, [id, userId]);
                return res.json({ deleted: 1 });
            }

            if (mode === 'all') {
                db.run(`DELETE FROM forecasts WHERE group_id = ? AND user_id = ?`, [row.group_id, userId], function(err) {
                    if(err) return res.status(500).json({error: err.message});
                    res.json({ deleted: this.changes });
                });
            } else if (mode === 'future') {
                db.run(`DELETE FROM forecasts WHERE group_id = ? AND date >= ? AND user_id = ?`, [row.group_id, row.date, userId], function(err) {
                     if(err) return res.status(500).json({error: err.message});
                     res.json({ deleted: this.changes });
                });
            }
        });
    }
});

app.patch('/api/forecasts/:id/realize', checkAuth, (req, res) => {
     db.run(`UPDATE forecasts SET realized = 1 WHERE id = ? AND user_id = ?`, [req.params.id, req.userId], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ updated: this.changes });
    });
});

// Reporting routes follow...
app.get('/api/reports/cash-flow', checkAuth, async (req, res) => {
    // ... existing report logic ...
    const { year, month } = req.query;
    const y = parseInt(year);
    const m = month ? parseInt(month) : null;
    const userId = req.userId;

    try {
        let startDate, endDate;
        if (m !== null) {
            startDate = new Date(y, m, 1).toISOString().split('T')[0];
            endDate = new Date(m === 11 ? y + 1 : y, m === 11 ? 0 : m + 1, 1).toISOString().split('T')[0];
        } else {
            startDate = new Date(y, 0, 1).toISOString().split('T')[0];
            endDate = new Date(y + 1, 0, 1).toISOString().split('T')[0];
        }

        const balancePromise = new Promise((resolve, reject) => {
            db.get(
                `SELECT SUM(CASE WHEN type = 'credito' THEN value ELSE -value END) as balance 
                 FROM transactions WHERE user_id = ? AND date < ?`,
                [userId, startDate],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row?.balance || 0);
                }
            );
        });

        const startBalance = await balancePromise;

        db.all(
            `SELECT t.*, c.name as category_name, c.type as category_type
             FROM transactions t
             LEFT JOIN categories c ON t.category_id = c.id
             WHERE t.user_id = ? AND t.date >= ? AND t.date < ?`,
            [userId, startDate, endDate],
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });

                const totalReceitas = rows.filter(r => r.type === 'credito').reduce((sum, r) => sum + r.value, 0);
                const totalDespesas = rows.filter(r => r.type === 'debito').reduce((sum, r) => sum + r.value, 0);
                
                const receitasCat = {};
                const despesasCat = {};

                rows.forEach(r => {
                    const catName = r.category_name || 'Sem Categoria';
                    if (r.type === 'credito') {
                        receitasCat[catName] = (receitasCat[catName] || 0) + r.value;
                    } else {
                        despesasCat[catName] = (despesasCat[catName] || 0) + r.value;
                    }
                });

                res.json({
                    startBalance,
                    totalReceitas,
                    totalDespesas,
                    endBalance: startBalance + totalReceitas - totalDespesas,
                    receitasByCategory: Object.entries(receitasCat).map(([name, value]) => ({ name, value })),
                    despesasByCategory: Object.entries(despesasCat).map(([name, value]) => ({ name, value }))
                });
            }
        );

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/reports/daily-flow', checkAuth, (req, res) => {
    const { startDate, endDate } = req.query;
    const userId = req.userId;

    if (!startDate || !endDate) return res.status(400).json({ error: 'Start and End date required' });

    db.all(
        `SELECT date, type, SUM(value) as total 
         FROM transactions 
         WHERE user_id = ? AND date BETWEEN ? AND ? 
         GROUP BY date, type 
         ORDER BY date ASC`,
        [userId, startDate, endDate],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Format for chart: [{ date: '...', income: 100, expense: 50, net: 50 }, ...]
            const grouped = {};
            rows.forEach(row => {
                if (!grouped[row.date]) grouped[row.date] = { date: row.date, income: 0, expense: 0, net: 0 };
                if (row.type === 'credito') grouped[row.date].income += row.total;
                else grouped[row.date].expense += row.total;
                grouped[row.date].net = grouped[row.date].income - grouped[row.date].expense;
            });
            
            res.json(Object.values(grouped));
        }
    );
});

app.get('/api/reports/dre', checkAuth, (req, res) => {
    // ... existing report logic ...
    const { year, month } = req.query;
    const userId = req.userId;
    const y = parseInt(year);
    const m = month ? parseInt(month) : null;

    let query = `SELECT t.*, c.name as category_name, c.type as category_type 
                 FROM transactions t 
                 LEFT JOIN categories c ON t.category_id = c.id 
                 WHERE t.user_id = ? AND strftime('%Y', t.date) = ?`;
    
    const params = [userId, String(y)];

    if (m !== null) {
        query += ` AND strftime('%m', t.date) = ?`;
        params.push(String(m + 1).padStart(2, '0'));
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        let dre = {
            receitaBruta: 0,
            deducoes: 0,
            cmv: 0,
            despesasOperacionais: 0,
            resultadoFinanceiro: 0,
            receitaNaoOperacional: 0,
            despesaNaoOperacional: 0,
            impostos: 0 
        };

        rows.forEach(t => {
            const cat = (t.category_name || '').toLowerCase();
            const val = t.value;
            const isCredit = t.type === 'credito';
            
            if (cat.includes('transferências internas') || 
                cat.includes('aportes de sócios') || 
                cat.includes('distribuição de lucros') ||
                cat.includes('retirada de sócios')) {
                return;
            }

            if (cat.includes('vendas de mercadorias') || 
                cat.includes('prestação de serviços') || 
                cat.includes('comissões recebidas') ||
                cat.includes('receita de aluguel') ||
                cat.includes('outras receitas operacionais')) {
                 if (isCredit) dre.receitaBruta += val;
            }
            else if (cat.includes('impostos e taxas') || 
                     cat.includes('impostos sobre vendas') ||
                     cat.includes('icms') || cat.includes('iss') || cat.includes('das') ||
                     cat.includes('devoluções de vendas') ||
                     cat.includes('descontos concedidos')) {
                 if (!isCredit) dre.deducoes += val;
            }
            else if (cat.includes('compra de mercadorias') || 
                     cat.includes('matéria-prima') || 
                     cat.includes('fretes e transportes') || 
                     cat.includes('custos diretos')) {
                 if (!isCredit) dre.cmv += val;
            }
            else if (cat.includes('receita financeira') || 
                     cat.includes('devoluções de despesas') || 
                     cat.includes('reembolsos de clientes')) {
                 if (isCredit) dre.resultadoFinanceiro += val;
            }
            else if (cat.includes('despesas financeiras') || 
                     cat.includes('juros sobre empréstimos') || 
                     cat.includes('multas') || 
                     cat.includes('iof')) {
                 if (!isCredit) dre.resultadoFinanceiro -= val;
            }
            else if (cat.includes('receitas não operacionais') || 
                     cat.includes('venda de ativo')) {
                 if (isCredit) dre.receitaNaoOperacional += val;
            }
            else if (cat.includes('despesas não operacionais') || 
                     cat.includes('baixa de bens')) {
                 if (!isCredit) dre.despesaNaoOperacional += val;
            }
            else if (cat.includes('irpj') || cat.includes('csll')) {
                 if (!isCredit) dre.impostos += val;
            }
            else if (!isCredit) {
                dre.despesasOperacionais += val;
            }
        });

        const receitaLiquida = dre.receitaBruta - dre.deducoes;
        const resultadoBruto = receitaLiquida - dre.cmv;
        const resultadoOperacional = resultadoBruto - dre.despesasOperacionais;
        const resultadoNaoOperacionalTotal = dre.receitaNaoOperacional - dre.despesaNaoOperacional;
        const resultadoAntesImpostos = resultadoOperacional + dre.resultadoFinanceiro + resultadoNaoOperacionalTotal;
        const lucroLiquido = resultadoAntesImpostos - dre.impostos;

        res.json({
            receitaBruta: dre.receitaBruta,
            deducoes: dre.deducoes,
            receitaLiquida,
            cmv: dre.cmv,
            resultadoBruto,
            despesasOperacionais: dre.despesasOperacionais,
            resultadoOperacional,
            resultadoFinanceiro: dre.resultadoFinanceiro,
            resultadoNaoOperacional: resultadoNaoOperacionalTotal,
            impostos: dre.impostos,
            lucroLiquido,
            resultadoAntesImpostos
        });
    });
});

app.get('/api/reports/analysis', checkAuth, (req, res) => {
    // ... existing report logic ...
    const { year, month } = req.query;
    const userId = req.userId;
    const y = parseInt(year);
    const m = month ? parseInt(month) : null;

    let query = `SELECT t.*, c.name as category_name, c.type as category_type 
                 FROM transactions t 
                 LEFT JOIN categories c ON t.category_id = c.id 
                 WHERE t.user_id = ? AND strftime('%Y', t.date) = ?`;
    
    const params = [userId, String(y)];

    if (m !== null) {
        query += ` AND strftime('%m', t.date) = ?`;
        params.push(String(m + 1).padStart(2, '0'));
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const receitas = {};
        const despesas = {};
        let totalReceitas = 0;
        let totalDespesas = 0;

        // DRE Logic to calculate KPIs
        let dre = {
            receitaBruta: 0,
            deducoes: 0,
            cmv: 0,
            despesasOperacionais: 0,
            resultadoFinanceiro: 0,
            receitaNaoOperacional: 0,
            despesaNaoOperacional: 0,
            impostos: 0 
        };

        rows.forEach(r => {
            const catName = r.category_name || 'Outros';
            if (r.type === 'credito') {
                receitas[catName] = (receitas[catName] || 0) + r.value;
                totalReceitas += r.value;
            } else {
                despesas[catName] = (despesas[catName] || 0) + r.value;
                totalDespesas += r.value;
            }

            // DRE Categorization
            const cat = (r.category_name || '').toLowerCase();
            const val = r.value;
            const isCredit = r.type === 'credito';

            if (cat.includes('transferências internas') || cat.includes('aportes de sócios') || cat.includes('distribuição de lucros')) return;

            if (cat.includes('vendas de mercadorias') || cat.includes('prestação de serviços') || cat.includes('comissões recebidas') || cat.includes('receita de aluguel')) {
                 if (isCredit) dre.receitaBruta += val;
            }
            else if (cat.includes('impostos e taxas') || cat.includes('icms') || cat.includes('iss') || cat.includes('das') || cat.includes('devoluções')) {
                 if (!isCredit) dre.deducoes += val;
            }
            else if (cat.includes('compra de mercadorias') || cat.includes('matéria-prima') || cat.includes('fretes') || cat.includes('custos diretos')) {
                 if (!isCredit) dre.cmv += val;
            }
            else if (cat.includes('receita financeira')) {
                 if (isCredit) dre.resultadoFinanceiro += val;
            }
            else if (cat.includes('despesas financeiras') || cat.includes('juros')) {
                 if (!isCredit) dre.resultadoFinanceiro -= val;
            }
            else if (cat.includes('receitas não operacionais')) {
                 if (isCredit) dre.receitaNaoOperacional += val;
            }
            else if (cat.includes('despesas não operacionais')) {
                 if (!isCredit) dre.despesaNaoOperacional += val;
            }
            else if (cat.includes('irpj') || cat.includes('csll')) {
                 if (!isCredit) dre.impostos += val;
            }
            else if (!isCredit) {
                dre.despesasOperacionais += val;
            }
        });

        // KPI Calculations
        const receitaLiquida = dre.receitaBruta - dre.deducoes;
        const resultadoBruto = receitaLiquida - dre.cmv;
        const resultadoOperacional = resultadoBruto - dre.despesasOperacionais;
        const resultadoNaoOperacionalTotal = dre.receitaNaoOperacional - dre.despesaNaoOperacional;
        const resultadoAntesImpostos = resultadoOperacional + dre.resultadoFinanceiro + resultadoNaoOperacionalTotal;
        const lucroLiquido = resultadoAntesImpostos - dre.impostos;

        // Percentages
        const margemContribuicaoVal = receitaLiquida - dre.cmv;
        const margemContribuicaoPct = receitaLiquida > 0 ? (margemContribuicaoVal / receitaLiquida) * 100 : 0;
        const resultadoOperacionalPct = receitaLiquida > 0 ? (resultadoOperacional / receitaLiquida) * 100 : 0;
        const resultadoLiquidoPct = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;

        res.json({
            receitas,
            despesas,
            totalReceitas,
            totalDespesas,
            kpis: {
                margemContribuicaoPct,
                resultadoOperacionalPct,
                resultadoLiquidoPct
            }
        });
    });
});

// NOVO ENDPOINT: RELATÓRIO DE PREVISÕES
app.get('/api/reports/forecasts', checkAuth, (req, res) => {
    const { year, month } = req.query;
    const userId = req.userId;
    const y = parseInt(year);
    const m = month ? parseInt(month) : null;

    let query = `SELECT f.*, c.name as category_name 
                 FROM forecasts f
                 LEFT JOIN categories c ON f.category_id = c.id
                 WHERE f.user_id = ? AND strftime('%Y', f.date) = ?`;
    
    const params = [userId, String(y)];

    if (m !== null) {
        query += ` AND strftime('%m', f.date) = ?`;
        params.push(String(m + 1).padStart(2, '0'));
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        let summary = {
            predictedIncome: 0,
            predictedExpense: 0,
            realizedIncome: 0,
            realizedExpense: 0,
            pendingIncome: 0,
            pendingExpense: 0
        };

        const items = rows.map(r => {
            const val = r.value;
            const isCredit = r.type === 'credito';
            const isRealized = Boolean(r.realized);

            // Total Predicted
            if (isCredit) summary.predictedIncome += val;
            else summary.predictedExpense += val;

            // Realized vs Pending
            if (isRealized) {
                if (isCredit) summary.realizedIncome += val;
                else summary.realizedExpense += val;
            } else {
                if (isCredit) summary.pendingIncome += val;
                else summary.pendingExpense += val;
            }

            return {
                ...r,
                realized: isRealized
            };
        });

        res.json({ summary, items });
    });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`DB Path: ${dbPath}`);
  console.log(`Logos served from: ${LOGO_DIR}`);
});