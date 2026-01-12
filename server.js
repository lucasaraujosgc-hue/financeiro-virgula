import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

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
    // Receitas
    { name: 'Vendas de Mercadorias', type: 'receita' },
    { name: 'Prestação de Serviços', type: 'receita' },
    { name: 'Receita de Aluguel', type: 'receita' },
    { name: 'Comissões Recebidas', type: 'receita' },
    { name: 'Receita Financeira (juros, rendimentos)', type: 'receita' },
    { name: 'Devoluções de Despesas', type: 'receita' },
    { name: 'Reembolsos de Clientes', type: 'receita' },
    { name: 'Transferências Internas', type: 'receita' },
    { name: 'Aportes de Sócios', type: 'receita' },
    { name: 'Outras Receitas Operacionais', type: 'receita' },
    { name: 'Receitas Não Operacionais', type: 'receita' },
    
    // Despesas
    { name: 'Compra de Mercadorias / Matéria-Prima', type: 'despesa' },
    { name: 'Fretes e Transportes', type: 'despesa' },
    { name: 'Despesas com Pessoal', type: 'despesa' },
    { name: 'Serviços de Terceiros', type: 'despesa' },
    { name: 'Despesas Administrativas', type: 'despesa' },
    { name: 'Despesas Comerciais', type: 'despesa' },
    { name: 'Energia / Água / Telecom', type: 'despesa' },
    { name: 'Aluguel e Condomínio', type: 'despesa' },
    { name: 'Manutenção e Limpeza', type: 'despesa' },
    { name: 'Combustível e Deslocamento', type: 'despesa' },
    { name: 'Seguros', type: 'despesa' },
    { name: 'Tarifas Bancárias e Juros', type: 'despesa' },
    { name: 'Impostos e Taxas', type: 'despesa' },
    { name: 'Despesas Financeiras', type: 'despesa' },
    { name: 'Transferências Internas', type: 'despesa' },
    { name: 'Distribuição de Lucros', type: 'despesa' },
    { name: 'Outras Despesas Operacionais', type: 'despesa' },
    { name: 'Despesas Não Operacionais', type: 'despesa' },
    { name: 'Pró-Labore', type: 'despesa' }
];

// Helper para garantir colunas (Migração)
const ensureColumn = (table, column, definition) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if (!err && rows) {
            const hasColumn = rows.some(r => r.name === column);
            if (!hasColumn) {
                console.log(`[MIGRATION] Adding column ${column} to table ${table}`);
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
      if(!err) {
          ensureColumn('ofx_imports', 'content', 'TEXT');
          ensureColumn('ofx_imports', 'transaction_count', 'INTEGER');
          ensureColumn('ofx_imports', 'file_name', 'TEXT');
      }
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
  )`, (err) => {
      if(!err) {
          ensureColumn('forecasts', 'installment_current', 'INTEGER');
          ensureColumn('forecasts', 'installment_total', 'INTEGER');
          ensureColumn('forecasts', 'group_id', 'TEXT');
          ensureColumn('forecasts', 'realized', 'INTEGER DEFAULT 0');
      }
  });

  // 9. Keyword Rules
  db.run(`CREATE TABLE IF NOT EXISTS keyword_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    keyword TEXT,
    type TEXT,
    category_id INTEGER,
    bank_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`, (err) => {
      if (!err) {
          ensureColumn('keyword_rules', 'bank_id', 'INTEGER');
      }
  });
});

// ... (Rest of the file remains the same until endpoints) ...

// --- PUBLIC ROUTES ---
app.get('/api/global-banks', (req, res) => {
    db.all('SELECT * FROM global_banks ORDER BY name ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// ... (Admin routes omitted for brevity, they are unchanged) ...
// ... (Auth routes omitted for brevity, they are unchanged) ...

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

// ... (Bank CRUD routes) ...

app.get('/api/categories', checkAuth, (req, res) => {
    db.all(`SELECT * FROM categories WHERE user_id = ?`, [req.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ... (Rest of the server.js content including POST/PUT/DELETE for all entities) ...
// (Ensure all POST/PUT routes for forecasts/transactions use the correct column names as defined in schemas)

app.post('/api/forecasts', checkAuth, (req, res) => {
    const { date, description, value, type, categoryId, bankId, installmentCurrent, installmentTotal, groupId } = req.body;
    db.run(
        `INSERT INTO forecasts (user_id, date, description, value, type, category_id, bank_id, realized, installment_current, installment_total, group_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [req.userId, date, description, value, type, categoryId, bankId, installmentCurrent, installmentTotal, groupId],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// ...

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Logos served from: ${LOCAL_LOGO_DIR}`);
});