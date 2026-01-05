import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import nodemailer from 'nodemailer';

// Mock Data Imports for Seeding (Used per user now)
const INITIAL_BANKS_SEED = [
  { name: 'Nubank', accountNumber: '1234-5', nickname: 'Principal', logo: '/nubank.jpg', active: 0, balance: 0 },
  { name: 'Itaú', accountNumber: '9876-0', nickname: 'Reserva', logo: '/itau.png', active: 0, balance: 0 },
  { name: 'Bradesco', accountNumber: '1111-2', nickname: 'PJ', logo: '/bradesco.jpg', active: 0, balance: 0 },
  { name: 'Caixa Econômica', accountNumber: '0001-9', nickname: 'Caixa', logo: '/caixa.png', active: 0, balance: 0 },
  { name: 'Banco do Brasil', accountNumber: '4455-6', nickname: 'BB', logo: '/bb.png', active: 0, balance: 0 },
  { name: 'Santander', accountNumber: '7788-9', nickname: 'Santander', logo: '/santander.png', active: 0, balance: 0 },
  { name: 'Inter', accountNumber: '3322-1', nickname: 'Inter', logo: '/inter.png', active: 0, balance: 0 },
  { name: 'BTG Pactual', accountNumber: '5566-7', nickname: 'Investimentos', logo: '/btg_pactual.png', active: 0, balance: 0 },
  { name: 'C6 Bank', accountNumber: '9988-7', nickname: 'C6', logo: '/c6_bank.png', active: 0, balance: 0 },
  { name: 'Sicredi', accountNumber: '1212-3', nickname: 'Cooperativa', logo: '/sicredi.png', active: 0, balance: 0 },
  { name: 'Sicoob', accountNumber: '3434-5', nickname: 'Sicoob', logo: '/sicoob.png', active: 0, balance: 0 },
  { name: 'Mercado Pago', accountNumber: '0000-0', nickname: 'Vendas', logo: '/mercado_pago.png', active: 0, balance: 0 },
  { name: 'PagBank', accountNumber: '0000-0', nickname: 'Maquininha', logo: '/pagbank.png', active: 0, balance: 0 },
  { name: 'Stone', accountNumber: '0000-0', nickname: 'Stone', logo: '/stone.png', active: 0, balance: 0 },
  { name: 'Banco Safra', accountNumber: '0000-0', nickname: 'Safra', logo: '/safra.png', active: 0, balance: 0 },
  { name: 'Banco Pan', accountNumber: '0000-0', nickname: 'Pan', logo: '/banco_pan.png', active: 0, balance: 0 },
  { name: 'Banrisul', accountNumber: '0000-0', nickname: 'Sul', logo: '/banrisul.png', active: 0, balance: 0 },
  { name: 'Neon', accountNumber: '0000-0', nickname: 'Neon', logo: '/neon.png', active: 0, balance: 0 },
  { name: 'Caixa Registradora', accountNumber: '-', nickname: 'Dinheiro Físico', logo: '/caixaf.png', active: 0, balance: 0 },
];

const RECEITAS_LIST = [
    'Vendas de Mercadorias',
    'Prestação de Serviços',
    'Receita de Aluguel',
    'Comissões Recebidas',
    'Receita Financeira (juros, rendimentos, aplicações)',
    'Devoluções de Despesas',
    'Reembolsos de Clientes',
    'Transferências Internas (entre contas)',
    'Aportes de Sócios / Investimentos',
    'Outras Receitas Operacionais',
    'Receitas Não Operacionais (ex: venda de ativo imobilizado)'
];

const DESPESAS_LIST = [
    'Compra de Mercadorias / Matéria-Prima',
    'Fretes e Transportes',
    'Despesas com Pessoal (salários, pró-labore, encargos)',
    'Serviços de Terceiros (contabilidade, marketing, consultorias)',
    'Despesas Administrativas (papelaria, materiais de escritório)',
    'Despesas Comerciais (comissões, propaganda, brindes)',
    'Energia Elétrica / Água / Telefone / Internet',
    'Aluguel e Condomínio',
    'Manutenção e Limpeza',
    'Combustível e Deslocamento',
    'Seguros (veicular, empresarial, de vida, etc.)',
    'Tarifas Bancárias e Juros',
    'Impostos e Taxas (ISS, ICMS, DAS, etc.)',
    'Despesas Financeiras (juros sobre empréstimos, multas, IOF)',
    'Transferências Internas (entre contas)',
    'Distribuição de Lucros / Retirada de Sócios',
    'Outras Despesas Operacionais',
    'Despesas Não Operacionais (venda de bens, baixas contábeis)'
];

const INITIAL_CATEGORIES_SEED = [
    ...RECEITAS_LIST.map(name => ({ name, type: 'receita' })),
    ...DESPESAS_LIST.map(name => ({ name, type: 'despesa' }))
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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

const sendEmail = async (to, subject, text) => {
  console.log(`[EMAIL] Iniciando envio para: ${to}`);
  
  if (!process.env.MAIL_SERVER || !process.env.MAIL_USERNAME) {
      console.warn("[EMAIL] Configurações de email não encontradas no .env. Simulando envio.");
      return true;
  }

  try {
      const info = await transporter.sendMail({
          from: `"Virgula Contábil" <${process.env.MAIL_USERNAME}>`,
          to: to,
          subject: subject,
          text: text,
          html: `<div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>${subject}</h2>
                    <p>${text}</p>
                    <hr>
                    <p style="font-size: 12px; color: #999;">Virgula Contábil</p>
                 </div>`
      });
      console.log(`[EMAIL] Sucesso! ID: ${info.messageId}`);
      return true;
  } catch (error) {
      console.error("[EMAIL] Erro FATAL ao enviar:", error);
      return false;
  }
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Middleware para validar userId
const getUserId = (req) => {
    const userId = req.headers['user-id'];
    return userId ? Number(userId) : null;
};

// Database Setup
const BACKUP_DIR = '/backup';
if (!fs.existsSync(BACKUP_DIR)) {
  if (process.platform === 'win32') {
     fs.mkdirSync('./backup', { recursive: true });
  } else {
     try {
       fs.mkdirSync(BACKUP_DIR, { recursive: true });
     } catch (e) {
       fs.mkdirSync('./backup', { recursive: true });
     }
  }
}

// Usando finance_v2.db
const dbPath = fs.existsSync(BACKUP_DIR) ? path.join(BACKUP_DIR, 'finance_v2.db') : './backup/finance_v2.db';
const db = new sqlite3.Database(dbPath);

// Initialize Tables & Seed
db.serialize(() => {
  // Users
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    cnpj TEXT,
    razao_social TEXT,
    phone TEXT
  )`);

  // Banks (Added user_id)
  db.run(`CREATE TABLE IF NOT EXISTS banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    account_number TEXT,
    nickname TEXT,
    logo TEXT,
    active INTEGER,
    balance REAL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Categories (Added user_id)
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    type TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // OFX (Added user_id)
  db.run(`CREATE TABLE IF NOT EXISTS ofx_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    file_name TEXT,
    import_date TEXT,
    bank_id INTEGER,
    transaction_count INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Transactions (Added user_id)
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

  // Forecasts (Added user_id)
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

  // Keyword Rules (NEW TABLE)
  db.run(`CREATE TABLE IF NOT EXISTS keyword_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    keyword TEXT,
    type TEXT,
    category_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});

// --- API Routes ---

// AUTH
app.post('/api/signup', (req, res) => {
  const { email, password, cnpj, razaoSocial, phone } = req.body;
  db.run(
    `INSERT INTO users (email, password, cnpj, razao_social, phone) VALUES (?, ?, ?, ?, ?)`,
    [email, password, cnpj, razaoSocial, phone],
    async function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const newUserId = this.lastID;

      // Seed Initial Data for THIS user
      const bankStmt = db.prepare("INSERT INTO banks (user_id, name, account_number, nickname, logo, active, balance) VALUES (?, ?, ?, ?, ?, ?, ?)");
      INITIAL_BANKS_SEED.forEach(b => {
          bankStmt.run(newUserId, b.name, b.accountNumber, b.nickname, b.logo, b.active, b.balance);
      });
      bankStmt.finalize();

      const catStmt = db.prepare("INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)");
      INITIAL_CATEGORIES_SEED.forEach(c => {
          catStmt.run(newUserId, c.name, c.type);
      });
      catStmt.finalize();

      await sendEmail(email, "Bem-vindo a Virgula Contábil", "Seu cadastro foi realizado com sucesso.");
      res.json({ id: newUserId, email, razaoSocial });
    }
  );
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Credenciais inválidas.' });
    res.json({ id: row.id, email: row.email, razaoSocial: row.razao_social });
  });
});

app.post('/api/recover-password', (req, res) => {
    const { email } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, row) => {
        if (!row) {
             return res.status(404).json({error: "Email não encontrado"});
        }
        await sendEmail(email, "Recuperação de Senha", "Clique aqui para redefinir: https://seu-app.com/reset");
        res.json({ message: 'Email de recuperação enviado.' });
    });
});

// GENERIC MIDDLEWARE
const checkAuth = (req, res, next) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    req.userId = userId;
    next();
};

// BANKS
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

// CATEGORIES
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

// KEYWORD RULES (NEW)
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


// TRANSACTIONS
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
    [req.userId, date, description, value, type, categoryId, bankId, reconciled ? 1 : 0, ofxImportId || null],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

app.put('/api/transactions/:id', checkAuth, (req, res) => {
  const { date, description, value, type, categoryId, bankId, reconciled } = req.body;
  
  // If reconciled is provided, update it, otherwise keep existing logic (or assume app logic handles it)
  // The user asked to reconcile on edit. So we update the reconciled status if passed.
  // Standard PUT usually replaces resource.
  let query = `UPDATE transactions SET date = ?, description = ?, value = ?, type = ?, category_id = ?, bank_id = ?`;
  const params = [date, description, value, type, categoryId, bankId];
  
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
    const { transactionIds, categoryId } = req.body; // array of ids
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

// OFX IMPORTS
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
    const { fileName, importDate, bankId, transactionCount } = req.body;
    db.run(
        `INSERT INTO ofx_imports (user_id, file_name, import_date, bank_id, transaction_count) VALUES (?, ?, ?, ?, ?)`,
        [req.userId, fileName, importDate, bankId, transactionCount],
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

// FORECASTS
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
        [req.userId, date, description, value, type, categoryId, bankId, installmentCurrent, installmentTotal, groupId],
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
        [date, description, value, type, categoryId, bankId, req.params.id, req.userId],
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

// --- ADVANCED REPORTS ENDPOINTS (Ported from Python) ---

app.get('/api/reports/cash-flow', checkAuth, async (req, res) => {
    const { year, month } = req.query;
    const y = parseInt(year);
    const m = month ? parseInt(month) : null;
    const userId = req.userId;

    try {
        // 1. Calculate Period
        let startDate, endDate;
        if (m !== null) {
            startDate = new Date(y, m, 1).toISOString().split('T')[0];
            endDate = new Date(m === 11 ? y + 1 : y, m === 11 ? 0 : m + 1, 1).toISOString().split('T')[0];
        } else {
            startDate = new Date(y, 0, 1).toISOString().split('T')[0];
            endDate = new Date(y + 1, 0, 1).toISOString().split('T')[0];
        }

        // 2. Calculate Initial Balance (Sum of all tx before start date)
        // Since we don't have a SaldoInicial table, we sum everything up to startDate
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

        // 3. Get Transactions in Period
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
                
                // Group by Category
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

app.get('/api/reports/dre', checkAuth, (req, res) => {
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
            impostos: 0 // Provision (IR/CSLL) - usually calculated or explicit
        };

        // Categorization Map based on user spec
        rows.forEach(t => {
            const cat = (t.category_name || '').toLowerCase();
            const val = t.value;
            const isCredit = t.type === 'credito';
            
            // EXCLUSIONS (Do not count towards DRE)
            if (cat.includes('transferências internas') || 
                cat.includes('aportes de sócios') || 
                cat.includes('distribuição de lucros') ||
                cat.includes('retirada de sócios')) {
                return;
            }

            // 1. Receita Bruta
            if (cat.includes('vendas de mercadorias') || 
                cat.includes('prestação de serviços') || 
                cat.includes('comissões recebidas') ||
                cat.includes('receita de aluguel') ||
                cat.includes('outras receitas operacionais')) {
                 if (isCredit) dre.receitaBruta += val;
            }
            
            // 2. Deduções (Impostos sobre Venda + Devoluções)
            // Note: 'impostos e taxas' is ambiguous, but user put ICMS/ISS here. 
            // Default seed 'Impostos e Taxas (ISS...)' matches here.
            else if (cat.includes('impostos e taxas') || 
                     cat.includes('impostos sobre vendas') ||
                     cat.includes('icms') || cat.includes('iss') || cat.includes('das') ||
                     cat.includes('devoluções de vendas') ||
                     cat.includes('descontos concedidos')) {
                 if (!isCredit) dre.deducoes += val;
            }

            // 4. Custos (CMV)
            else if (cat.includes('compra de mercadorias') || 
                     cat.includes('matéria-prima') || 
                     cat.includes('fretes e transportes') || 
                     cat.includes('custos diretos')) {
                 if (!isCredit) dre.cmv += val;
            }

            // 8. Resultado Financeiro
            // Receitas (+): Receita Financeira, Devoluções de Despesas, Reembolsos
            // Despesas (-): Despesas Financeiras
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

            // 9. Resultado Não Operacional
            else if (cat.includes('receitas não operacionais') || 
                     cat.includes('venda de ativo')) {
                 if (isCredit) dre.receitaNaoOperacional += val;
            }
            else if (cat.includes('despesas não operacionais') || 
                     cat.includes('baixa de bens')) {
                 if (!isCredit) dre.despesaNaoOperacional += val;
            }

            // 11. Provisão Impostos (IR/CSLL)
            else if (cat.includes('irpj') || cat.includes('csll')) {
                 if (!isCredit) dre.impostos += val;
            }

            // 6. Despesas Operacionais (Everything else that is an expense)
            // Admin, Pessoal, Comercial, Terceiros, Tarifas Bancarias (Op), Energia...
            else if (!isCredit) {
                // If it fell through here and is an expense, it's likely OpEx
                // E.g. 'tarifas bancárias', 'energia', 'pessoal', 'aluguel'
                dre.despesasOperacionais += val;
            }
        });

        // Calculated Fields
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
    const { year, month } = req.query;
    const userId = req.userId;
    const y = parseInt(year);
    const m = month ? parseInt(month) : null;

    let query = `SELECT t.*, c.name as category_name 
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

        rows.forEach(r => {
            const catName = r.category_name || 'Outros';
            if (r.type === 'credito') {
                receitas[catName] = (receitas[catName] || 0) + r.value;
                totalReceitas += r.value;
            } else {
                despesas[catName] = (despesas[catName] || 0) + r.value;
                totalDespesas += r.value;
            }
        });

        res.json({
            receitas,
            despesas,
            totalReceitas,
            totalDespesas
        });
    });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`DB Path: ${dbPath}`);
});