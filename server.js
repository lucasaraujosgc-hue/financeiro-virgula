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

// Garante que a pasta logo exista e seja servida
const LOGO_DIR = path.join(__dirname, 'logo');
try {
    if (!fs.existsSync(LOGO_DIR)){
        fs.mkdirSync(LOGO_DIR, { recursive: true });
    }
} catch (e) {
    console.error("Erro ao criar diretório de logos:", e);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Servir arquivos do frontend (build)
app.use(express.static(path.join(__dirname, 'dist')));

// Servir logos da raiz
app.use('/logo', express.static(LOGO_DIR));

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

// Database Setup
const BACKUP_DIR = '/backup';
// Tenta criar diretório de backup de forma robusta
try {
    if (!fs.existsSync(BACKUP_DIR)) {
        // Tenta criar na raiz (Linux/Docker)
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
    console.error("Erro ao configurar diretórios de backup:", e);
}

// Define caminho do banco com fallback
let dbPath = './backup/finance_v2.db';
try {
    if (fs.existsSync(path.join(BACKUP_DIR, 'finance_v2.db')) || fs.existsSync(BACKUP_DIR)) {
        // Testa permissão de escrita
        fs.accessSync(BACKUP_DIR, fs.constants.W_OK);
        dbPath = path.join(BACKUP_DIR, 'finance_v2.db');
    }
} catch (e) {
    console.log("Usando caminho local para banco de dados devido a permissões.");
    dbPath = './backup/finance_v2.db';
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("ERRO CRÍTICO AO ABRIR BANCO DE DADOS:", err.message);
    } else {
        console.log(`Banco de dados conectado em: ${dbPath}`);
    }
});

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
      await transporter.sendMail({
          from: `"${fromName}" <${fromAddress}>`,
          to: to,
          subject: subject,
          html: htmlContent
      });
      return true;
  } catch (error) {
      console.error("[EMAIL] Erro:", error);
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
                db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (err) => {
                    if(!err) console.log(`[MIGRATION] Added column ${column} to ${table}`);
                });
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
                  console.log("Global banks seeded.");
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

// --- ROUTES ---

// Public - Get Global Banks
app.get('/api/global-banks', (req, res) => {
    db.all('SELECT * FROM global_banks ORDER BY name ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// ADMIN: Manage Global Banks
app.get('/api/admin/banks', checkAdmin, (req, res) => {
    db.all('SELECT * FROM global_banks ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/admin/banks', checkAdmin, async (req, res) => {
    const { name, logoData } = req.body;
    if (!name) return res.status(400).json({ error: "Nome obrigatório" });

    let logoPath = '/logo/caixaf.png'; // Fallback

    if (logoData && logoData.startsWith('data:image')) {
        try {
            const matches = logoData.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const extension = matches[1].split('+')[0]; // simple ext
                const buffer = Buffer.from(matches[2], 'base64');
                const fileName = `bank_${Date.now()}.${extension.replace('jpeg','jpg')}`;
                const filePath = path.join(LOGO_DIR, fileName);
                fs.writeFileSync(filePath, buffer);
                logoPath = `/logo/${fileName}`;
            }
        } catch (e) {
            console.error("Error saving logo:", e);
        }
    } else if (logoData && typeof logoData === 'string' && logoData.startsWith('/logo/')) {
        logoPath = logoData;
    }

    db.run('INSERT INTO global_banks (name, logo) VALUES (?, ?)', [name, logoPath], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, logo: logoPath });
    });
});

app.put('/api/admin/banks/:id', checkAdmin, (req, res) => {
    const { name, logoData } = req.body;
    const { id } = req.params;

    if (!name) return res.status(400).json({ error: "Nome obrigatório" });

    db.get('SELECT * FROM global_banks WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Banco não encontrado" });

        const oldName = row.name;
        let logoPath = row.logo;

        if (logoData && logoData.startsWith('data:image')) {
             try {
                const matches = logoData.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const extension = matches[1].split('+')[0];
                    const buffer = Buffer.from(matches[2], 'base64');
                    const fileName = `bank_${Date.now()}.${extension.replace('jpeg','jpg')}`;
                    const filePath = path.join(LOGO_DIR, fileName);
                    fs.writeFileSync(filePath, buffer);
                    logoPath = `/logo/${fileName}`;
                }
            } catch (e) {
                console.error("Error saving logo:", e);
            }
        }

        // Update Global
        db.run('UPDATE global_banks SET name = ?, logo = ? WHERE id = ?', [name, logoPath, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Propagate to Users
            db.run('UPDATE banks SET name = ?, logo = ? WHERE name = ?', [name, logoPath, oldName], (errUpdate) => {
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

// ADMIN: Outros Endpoints
app.get('/api/admin/users', checkAdmin, (req, res) => {
    db.all('SELECT id, email, cnpj, razao_social, phone FROM users', [], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.get('/api/admin/global-data', checkAdmin, (req, res) => {
    const queries = {
        users: 'SELECT COUNT(*) as count FROM users',
        transactions: 'SELECT COUNT(*) as count, SUM(value) as totalValue FROM transactions',
        imports: 'SELECT COUNT(*) as count FROM ofx_imports'
    };
    const results = {};
    let completed = 0;
    const keys = Object.keys(queries);
    keys.forEach(key => {
        db.get(queries[key], [], (err, row) => {
            results[key] = row || { count: 0 };
            completed++;
            if (completed === keys.length) res.json(results);
        });
    });
});

app.get('/api/admin/audit-transactions', checkAdmin, (req, res) => {
    const sql = `SELECT t.id, t.date, t.description, t.value, t.type, u.razao_social 
        FROM transactions t JOIN users u ON t.user_id = u.id ORDER BY t.date DESC LIMIT 50`;
    db.all(sql, [], (err, rows) => res.json(rows || []));
});

app.get('/api/admin/users/:id/full-data', checkAdmin, async (req, res) => {
    const userId = req.params.id;
    try {
        const get = (sql) => new Promise((resolve, reject) => {
            db.all(sql, [userId], (err, rows) => err ? reject(err) : resolve(rows));
        });
        const transactions = await get(`SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC`);
        const forecasts = await get(`SELECT * FROM forecasts WHERE user_id = ?`);
        const ofxImports = await get(`SELECT * FROM ofx_imports WHERE user_id = ?`);
        res.json({ transactions, forecasts, ofxImports });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/admin/users/:id', checkAdmin, (req, res) => {
    const userId = req.params.id;
    db.serialize(() => {
        db.run('DELETE FROM transactions WHERE user_id = ?', [userId]);
        db.run('DELETE FROM forecasts WHERE user_id = ?', [userId]);
        db.run('DELETE FROM banks WHERE user_id = ?', [userId]);
        db.run('DELETE FROM categories WHERE user_id = ?', [userId]);
        db.run('DELETE FROM ofx_imports WHERE user_id = ?', [userId]);
        db.run('DELETE FROM keyword_rules WHERE user_id = ?', [userId]);
        db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
            if(err) return res.status(500).json({error: err.message});
            res.json({ message: 'User deleted' });
        });
    });
});

// AUTH
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.MAIL_ADMIN && password === process.env.PASSWORD_ADMIN) {
      return res.json({ id: 'admin', email, razaoSocial: 'Admin', role: 'admin' });
  }
  db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Credenciais inválidas.' });
    res.json({ id: row.id, email: row.email, razaoSocial: row.razao_social, role: 'user' });
  });
});

app.post('/api/request-signup', (req, res) => {
    const { email, cnpj, razaoSocial, phone } = req.body;
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
        if (row) return res.status(400).json({ error: "E-mail já cadastrado." });
        const token = crypto.randomBytes(20).toString('hex');
        db.run(
            `INSERT OR REPLACE INTO pending_signups (email, token, cnpj, razao_social, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [email, token, cnpj, razaoSocial, phone, Date.now()],
            async (err) => {
                if (err) return res.status(500).json({ error: err.message });
                const link = `${req.headers.origin}/?action=finalize&token=${token}`;
                await sendEmail(email, "Ative sua conta", `Clique para definir senha: ${link}`);
                res.json({ message: "Link enviado." });
            }
        );
    });
});

app.post('/api/complete-signup', (req, res) => {
  const { token, password } = req.body;
  db.get('SELECT * FROM pending_signups WHERE token = ?', [token], (err, pendingUser) => {
      if (!pendingUser) return res.status(400).json({ error: "Token inválido." });
      
      db.run(
        `INSERT INTO users (email, password, cnpj, razao_social, phone) VALUES (?, ?, ?, ?, ?)`,
        [pendingUser.email, password, pendingUser.cnpj, pendingUser.razao_social, pendingUser.phone],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          const newUserId = this.lastID;
          db.run('DELETE FROM pending_signups WHERE email = ?', [pendingUser.email]);
          
          // Seed from Global Banks
          db.all('SELECT * FROM global_banks', [], (err, globalBanks) => {
              if (!err && globalBanks) {
                  const stmt = db.prepare("INSERT INTO banks (user_id, name, account_number, nickname, logo, active, balance) VALUES (?, ?, ?, ?, ?, 1, 0)");
                  globalBanks.forEach(b => stmt.run(newUserId, b.name, '0000', b.name, b.logo));
                  stmt.finalize();
              }
          });
          // Seed Categories
          const cStmt = db.prepare("INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)");
          INITIAL_CATEGORIES_SEED.forEach(c => cStmt.run(newUserId, c.name, c.type));
          cStmt.finalize();

          res.json({ id: newUserId });
        }
      );
  });
});

app.get('/api/validate-signup-token/:token', (req, res) => {
    db.get('SELECT email, razao_social FROM pending_signups WHERE token = ?', [req.params.token], (err, row) => {
        if (err || !row) return res.status(404).json({ valid: false });
        res.json({ valid: true, email: row.email, razaoSocial: row.razao_social });
    });
});

app.post('/api/recover-password', (req, res) => {
    const { email } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
        if (!row) return res.json({ message: 'Enviado.' });
        const token = crypto.randomBytes(20).toString('hex');
        db.run('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, Date.now() + 3600000, row.id], async () => {
            const link = `${req.headers.origin}/?action=reset&token=${token}`;
            await sendEmail(email, "Recuperação de Senha", `Clique para redefinir: ${link}`);
            res.json({ message: 'Enviado.' });
        });
    });
});

app.post('/api/reset-password-confirm', (req, res) => {
    const { token, newPassword } = req.body;
    db.get('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?', [token, Date.now()], (err, row) => {
        if (!row) return res.status(400).json({ error: "Token inválido." });
        db.run('UPDATE users SET password = ?, reset_token = NULL WHERE id = ?', [newPassword, row.id], () => {
            res.json({ message: "Senha alterada." });
        });
    });
});

// User Data Routes
app.get('/api/banks', checkAuth, (req, res) => {
    db.all(`SELECT * FROM banks WHERE user_id = ?`, [req.userId], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        // Ensure active defaults to true if column was just added and is null
        res.json(rows.map(b => ({ ...b, active: b.active !== 0 })));
    });
});

app.post('/api/banks', checkAuth, (req, res) => {
    const { name, accountNumber, nickname, logo } = req.body;
    db.run(
        `INSERT INTO banks (user_id, name, account_number, nickname, logo, active, balance) VALUES (?, ?, ?, ?, ?, 1, 0)`,
        [req.userId, name, accountNumber, nickname, logo],
        function(err) {
            if(err) return res.status(500).json({error: err.message});
            res.json({ id: this.lastID, name, logo, active: true, balance: 0 });
        }
    );
});

app.put('/api/banks/:id', checkAuth, (req, res) => {
    const { nickname, accountNumber, active } = req.body;
    db.run(
        `UPDATE banks SET nickname = ?, account_number = ?, active = ? WHERE id = ? AND user_id = ?`,
        [nickname, accountNumber, active ? 1 : 0, req.params.id, req.userId],
        function(err) {
            if(err) return res.status(500).json({error: err.message});
            res.json({ success: true });
        }
    );
});

app.delete('/api/banks/:id', checkAuth, (req, res) => {
    db.run(`DELETE FROM banks WHERE id = ? AND user_id = ?`, [req.params.id, req.userId], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ deleted: this.changes });
    });
});

app.get('/api/transactions', checkAuth, (req, res) => {
    db.all(`SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC`, [req.userId], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json(rows.map(t => ({...t, reconciled: Boolean(t.reconciled)})));
    });
});

app.post('/api/transactions', checkAuth, (req, res) => {
    const { date, description, value, type, categoryId, bankId, reconciled, ofxImportId } = req.body;
    db.run(
        `INSERT INTO transactions (user_id, date, description, value, type, category_id, bank_id, reconciled, ofx_import_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.userId, date, description, value, type, categoryId, bankId, reconciled ? 1 : 0, ofxImportId || null],
        function(err) {
            if(err) return res.status(500).json({error: err.message});
            res.json({ id: this.lastID, ...req.body });
        }
    );
});

app.put('/api/transactions/:id', checkAuth, (req, res) => {
    const { date, description, value, type, categoryId, bankId, reconciled } = req.body;
    let sql = `UPDATE transactions SET date=?, description=?, value=?, type=?, category_id=?, bank_id=?`;
    const params = [date, description, value, type, categoryId, bankId];
    if (reconciled !== undefined) {
        sql += `, reconciled=?`;
        params.push(reconciled ? 1 : 0);
    }
    sql += ` WHERE id=? AND user_id=?`;
    params.push(req.params.id, req.userId);
    db.run(sql, params, function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ success: true });
    });
});

app.delete('/api/transactions/:id', checkAuth, (req, res) => {
    db.run(`DELETE FROM transactions WHERE id=? AND user_id=?`, [req.params.id, req.userId], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ deleted: this.changes });
    });
});

app.patch('/api/transactions/:id/reconcile', checkAuth, (req, res) => {
    const { reconciled } = req.body;
    db.run(`UPDATE transactions SET reconciled=? WHERE id=? AND user_id=?`, [reconciled ? 1 : 0, req.params.id, req.userId], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ updated: this.changes });
    });
});

app.patch('/api/transactions/batch-update', checkAuth, (req, res) => {
    const { transactionIds, categoryId } = req.body;
    if (!transactionIds?.length) return res.status(400).json({ error: "No IDs" });
    const holders = transactionIds.map(() => '?').join(',');
    db.run(
        `UPDATE transactions SET category_id = ?, reconciled = 1 WHERE id IN (${holders}) AND user_id = ?`,
        [categoryId, ...transactionIds, req.userId],
        function(err) {
            if(err) return res.status(500).json({error: err.message});
            res.json({ updated: this.changes });
        }
    );
});

app.get('/api/forecasts', checkAuth, (req, res) => {
    db.all(`SELECT * FROM forecasts WHERE user_id = ? ORDER BY date ASC`, [req.userId], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json(rows.map(f => ({...f, realized: Boolean(f.realized)})));
    });
});

app.post('/api/forecasts', checkAuth, (req, res) => {
    const { date, description, value, type, categoryId, bankId, installmentCurrent, installmentTotal, groupId } = req.body;
    db.run(
        `INSERT INTO forecasts (user_id, date, description, value, type, category_id, bank_id, realized, installment_current, installment_total, group_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [req.userId, date, description, value, type, categoryId, bankId, installmentCurrent, installmentTotal, groupId],
        function(err) {
            if(err) return res.status(500).json({error: err.message});
            res.json({ id: this.lastID });
        }
    );
});

app.patch('/api/forecasts/:id/realize', checkAuth, (req, res) => {
    db.run(`UPDATE forecasts SET realized=1 WHERE id=? AND user_id=?`, [req.params.id, req.userId], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ updated: this.changes });
    });
});

app.delete('/api/forecasts/:id', checkAuth, (req, res) => {
    const { mode } = req.query;
    const { id } = req.params;
    
    if (!mode || mode === 'single') {
        db.run(`DELETE FROM forecasts WHERE id=? AND user_id=?`, [id, req.userId], function(err) {
            if(err) return res.status(500).json({error: err.message});
            res.json({ deleted: this.changes });
        });
    } else {
        db.get(`SELECT group_id, date FROM forecasts WHERE id=? AND user_id=?`, [id, req.userId], (err, row) => {
            if(err || !row || !row.group_id) {
                db.run(`DELETE FROM forecasts WHERE id=? AND user_id=?`, [id, req.userId]);
                return res.json({ deleted: 1 });
            }
            if (mode === 'all') {
                db.run(`DELETE FROM forecasts WHERE group_id=? AND user_id=?`, [row.group_id, req.userId], function(err) {
                    if(err) return res.status(500).json({error: err.message});
                    res.json({ deleted: this.changes });
                });
            } else if (mode === 'future') {
                db.run(`DELETE FROM forecasts WHERE group_id=? AND date>=? AND user_id=?`, [row.group_id, row.date, req.userId], function(err) {
                    if(err) return res.status(500).json({error: err.message});
                    res.json({ deleted: this.changes });
                });
            }
        });
    }
});

app.put('/api/forecasts/:id', checkAuth, (req, res) => {
    const { date, description, value, type, categoryId, bankId } = req.body;
    db.run(
        `UPDATE forecasts SET date=?, description=?, value=?, type=?, category_id=?, bank_id=? WHERE id=? AND user_id=?`,
        [date, description, value, type, categoryId, bankId, req.params.id, req.userId],
        function(err) {
            if(err) return res.status(500).json({error: err.message});
            res.json({ success: true });
        }
    );
});

app.get('/api/categories', checkAuth, (req, res) => {
    db.all(`SELECT * FROM categories WHERE user_id=?`, [req.userId], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.post('/api/categories', checkAuth, (req, res) => {
    const { name, type } = req.body;
    db.run(`INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)`, [req.userId, name, type], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ id: this.lastID, name, type });
    });
});

app.delete('/api/categories/:id', checkAuth, (req, res) => {
    db.run(`DELETE FROM categories WHERE id=? AND user_id=?`, [req.params.id, req.userId], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ deleted: this.changes });
    });
});

app.get('/api/keyword-rules', checkAuth, (req, res) => {
    db.all(`SELECT * FROM keyword_rules WHERE user_id=?`, [req.userId], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.post('/api/keyword-rules', checkAuth, (req, res) => {
    const { keyword, type, categoryId } = req.body;
    db.run(`INSERT INTO keyword_rules (user_id, keyword, type, category_id) VALUES (?, ?, ?, ?)`, 
        [req.userId, keyword, type, categoryId], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ id: this.lastID, keyword, type, categoryId });
    });
});

app.delete('/api/keyword-rules/:id', checkAuth, (req, res) => {
    db.run(`DELETE FROM keyword_rules WHERE id=? AND user_id=?`, [req.params.id, req.userId], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ deleted: this.changes });
    });
});

app.get('/api/ofx-imports', checkAuth, (req, res) => {
    db.all(`SELECT * FROM ofx_imports WHERE user_id=? ORDER BY import_date DESC`, [req.userId], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json(rows.map(r => ({...r, transactionCount: r.transaction_count, importDate: r.import_date, fileName: r.file_name})));
    });
});

app.post('/api/ofx-imports', checkAuth, (req, res) => {
    const { fileName, importDate, bankId, transactionCount, content } = req.body;
    db.run(
        `INSERT INTO ofx_imports (user_id, file_name, import_date, bank_id, transaction_count, content) VALUES (?, ?, ?, ?, ?, ?)`,
        [req.userId, fileName, importDate, bankId, transactionCount, content || ''],
        function(err) {
            if(err) return res.status(500).json({error: err.message});
            res.json({ id: this.lastID });
        }
    );
});

app.delete('/api/ofx-imports/:id', checkAuth, (req, res) => {
    const importId = req.params.id;
    db.serialize(() => {
        db.run('BEGIN');
        db.run(`DELETE FROM transactions WHERE ofx_import_id=? AND user_id=?`, [importId, req.userId]);
        db.run(`DELETE FROM ofx_imports WHERE id=? AND user_id=?`, [importId, req.userId], function(err) {
            if(err) {
                db.run('ROLLBACK');
                return res.status(500).json({error: err.message});
            }
            db.run('COMMIT');
            res.json({ message: 'Deleted' });
        });
    });
});

// REPORTS (Simplified for space, assuming similar logic to previous turn)
app.get('/api/reports/cash-flow', checkAuth, async (req, res) => {
    const { year, month } = req.query;
    const userId = req.userId;
    const y = parseInt(year);
    const m = month ? parseInt(month) : null;
    
    let startDate, endDate;
    if (m !== null) {
        startDate = new Date(y, m, 1).toISOString().split('T')[0];
        endDate = new Date(m === 11 ? y + 1 : y, m === 11 ? 0 : m + 1, 1).toISOString().split('T')[0];
    } else {
        startDate = new Date(y, 0, 1).toISOString().split('T')[0];
        endDate = new Date(y + 1, 0, 1).toISOString().split('T')[0];
    }

    try {
        const balRow = await new Promise((resolve) => {
            db.get(`SELECT SUM(CASE WHEN type='credito' THEN value ELSE -value END) as b FROM transactions WHERE user_id=? AND date < ?`, [userId, startDate], (err, r) => resolve(r));
        });
        const startBalance = balRow ? (balRow.b || 0) : 0;

        db.all(
            `SELECT t.*, c.name as cname FROM transactions t LEFT JOIN categories c ON t.category_id=c.id WHERE t.user_id=? AND t.date >= ? AND t.date < ?`,
            [userId, startDate, endDate],
            (err, rows) => {
                if(err) return res.status(500).json({error: err.message});
                let rec = 0, desp = 0;
                const recCat = {}, despCat = {};
                rows.forEach(r => {
                    const cname = r.cname || 'Sem Categoria';
                    if(r.type === 'credito') { rec += r.value; recCat[cname] = (recCat[cname]||0)+r.value; }
                    else { desp += r.value; despCat[cname] = (despCat[cname]||0)+r.value; }
                });
                res.json({
                    startBalance,
                    totalReceitas: rec,
                    totalDespesas: desp,
                    endBalance: startBalance + rec - desp,
                    receitasByCategory: Object.entries(recCat).map(([name, value]) => ({name, value})),
                    despesasByCategory: Object.entries(despCat).map(([name, value]) => ({name, value}))
                });
            }
        );
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.get('/api/reports/daily-flow', checkAuth, (req, res) => {
    const { startDate, endDate } = req.query;
    db.all(
        `SELECT date, type, SUM(value) as total FROM transactions WHERE user_id=? AND date BETWEEN ? AND ? GROUP BY date, type ORDER BY date ASC`,
        [req.userId, startDate, endDate],
        (err, rows) => {
            if(err) return res.status(500).json({error: err.message});
            const grp = {};
            rows.forEach(r => {
                if(!grp[r.date]) grp[r.date] = {date: r.date, income:0, expense:0, net:0};
                if(r.type==='credito') grp[r.date].income += r.total;
                else grp[r.date].expense += r.total;
                grp[r.date].net = grp[r.date].income - grp[r.date].expense;
            });
            res.json(Object.values(grp));
        }
    );
});

// Fallback for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Generic Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Erro interno no servidor' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});