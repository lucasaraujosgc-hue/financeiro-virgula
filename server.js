import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Mock Data Imports for Seeding
// Note: In a real module system without bundler, importing json or ts directly might require adjustments. 
// We will define the seed data inline here to avoid complexity with ts-node/loaders in this specific setup.
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

const INITIAL_CATEGORIES_SEED = [
    { name: 'Vendas de Mercadorias', type: 'receita' },
    { name: 'Prestação de Serviços', type: 'receita' },
    { name: 'Receita de Aluguel', type: 'receita' },
    { name: 'Comissões Recebidas', type: 'receita' },
    { name: 'Receita Financeira', type: 'receita' },
    { name: 'Outras Receitas', type: 'receita' },
    { name: 'Compra de Mercadorias', type: 'despesa' },
    { name: 'Fretes e Transportes', type: 'despesa' },
    { name: 'Despesas com Pessoal', type: 'despesa' },
    { name: 'Serviços de Terceiros', type: 'despesa' },
    { name: 'Despesas Administrativas', type: 'despesa' },
    { name: 'Despesas Comerciais', type: 'despesa' },
    { name: 'Energia/Água/Internet', type: 'despesa' },
    { name: 'Aluguel', type: 'despesa' },
    { name: 'Impostos e Taxas', type: 'despesa' },
    { name: 'Outras Despesas', type: 'despesa' }
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Email Logic (Simulation)
const sendEmail = async (to, subject, text) => {
  console.log("==================================================");
  console.log(`[EMAIL SIMULADO] Enviando para: ${to}`);
  console.log(`[ASSUNTO]: ${subject}`);
  console.log(`[CONTEÚDO]: ${text}`);
  console.log("==================================================");
  // Returns true to simulate success to the frontend
  return true; 
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

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

const dbPath = fs.existsSync(BACKUP_DIR) ? path.join(BACKUP_DIR, 'finance.db') : './backup/finance.db';
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

  // Banks
  db.run(`CREATE TABLE IF NOT EXISTS banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    account_number TEXT,
    nickname TEXT,
    logo TEXT,
    active INTEGER,
    balance REAL
  )`, () => {
      // Seed Banks if empty
      db.get("SELECT count(*) as count FROM banks", [], (err, row) => {
          if (row && row.count === 0) {
              console.log("Seeding Banks...");
              const stmt = db.prepare("INSERT INTO banks (name, account_number, nickname, logo, active, balance) VALUES (?, ?, ?, ?, ?, ?)");
              INITIAL_BANKS_SEED.forEach(b => {
                  stmt.run(b.name, b.accountNumber, b.nickname, b.logo, b.active, b.balance);
              });
              stmt.finalize();
          }
      });
  });

  // Categories
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    type TEXT
  )`, () => {
      // Seed Categories if empty
      db.get("SELECT count(*) as count FROM categories", [], (err, row) => {
          if (row && row.count === 0) {
              console.log("Seeding Categories...");
              const stmt = db.prepare("INSERT INTO categories (name, type) VALUES (?, ?)");
              INITIAL_CATEGORIES_SEED.forEach(c => {
                  stmt.run(c.name, c.type);
              });
              stmt.finalize();
          }
      });
  });

  // OFX
  db.run(`CREATE TABLE IF NOT EXISTS ofx_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT,
    import_date TEXT,
    bank_id INTEGER,
    transaction_count INTEGER
  )`);

  // Transactions
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    description TEXT,
    value REAL,
    type TEXT,
    category_id INTEGER,
    bank_id INTEGER,
    reconciled INTEGER,
    ofx_import_id INTEGER
  )`);

  // Forecasts
  db.run(`CREATE TABLE IF NOT EXISTS forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    description TEXT,
    value REAL,
    type TEXT,
    category_id INTEGER,
    bank_id INTEGER,
    realized INTEGER,
    installment_current INTEGER,
    installment_total INTEGER,
    group_id TEXT
  )`);
});

// --- API Routes ---

// AUTH
app.post('/api/signup', (req, res) => {
  const { email, password, cnpj, razaoSocial, phone } = req.body;
  db.run(
    `INSERT INTO users (email, password, cnpj, razao_social, phone) VALUES (?, ?, ?, ?, ?)`,
    [email, password, cnpj, razaoSocial, phone],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      sendEmail(email, "Bem-vindo ao Sistema Financeiro", "Seu cadastro foi realizado com sucesso.");
      res.json({ id: this.lastID, email, razaoSocial });
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
    // Logica simples de validação se email existe
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
        if (!row) {
             // Por segurança, as vezes não se avisa que não existe, mas aqui vamos avisar para facilitar
             return res.status(404).json({error: "Email não encontrado"});
        }
        sendEmail(email, "Recuperação de Senha", "Clique aqui para redefinir: https://seu-app.com/reset");
        res.json({ message: 'Email de recuperação enviado.' });
    });
});

// BANKS
app.get('/api/banks', (req, res) => {
    db.all(`SELECT * FROM banks`, [], (err, rows) => {
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

app.put('/api/banks/:id', (req, res) => {
    const { nickname, accountNumber, active } = req.body;
    db.run(
        `UPDATE banks SET nickname = ?, account_number = ?, active = ? WHERE id = ?`,
        [nickname, accountNumber, active ? 1 : 0, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// CATEGORIES
app.get('/api/categories', (req, res) => {
    db.all(`SELECT * FROM categories`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// TRANSACTIONS
app.get('/api/transactions', (req, res) => {
  db.all(`SELECT * FROM transactions ORDER BY date DESC`, [], (err, rows) => {
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

app.post('/api/transactions', (req, res) => {
  const { date, description, value, type, categoryId, bankId, reconciled, ofxImportId } = req.body;
  db.run(
    `INSERT INTO transactions (date, description, value, type, category_id, bank_id, reconciled, ofx_import_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [date, description, value, type, categoryId, bankId, reconciled ? 1 : 0, ofxImportId || null],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

// EDIT TRANSACTION
app.put('/api/transactions/:id', (req, res) => {
  const { date, description, value, type, categoryId, bankId } = req.body;
  db.run(
    `UPDATE transactions SET date = ?, description = ?, value = ?, type = ?, category_id = ?, bank_id = ? WHERE id = ?`,
    [date, description, value, type, categoryId, bankId, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/api/transactions/:id', (req, res) => {
    db.run(`DELETE FROM transactions WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

app.patch('/api/transactions/:id/reconcile', (req, res) => {
    const { reconciled } = req.body;
    db.run(`UPDATE transactions SET reconciled = ? WHERE id = ?`, [reconciled ? 1 : 0, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

// OFX IMPORTS
app.get('/api/ofx-imports', (req, res) => {
    db.all(`SELECT * FROM ofx_imports ORDER BY import_date DESC`, [], (err, rows) => {
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

app.post('/api/ofx-imports', (req, res) => {
    const { fileName, importDate, bankId, transactionCount } = req.body;
    db.run(
        `INSERT INTO ofx_imports (file_name, import_date, bank_id, transaction_count) VALUES (?, ?, ?, ?)`,
        [fileName, importDate, bankId, transactionCount],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.delete('/api/ofx-imports/:id', (req, res) => {
    const importId = req.params.id;
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run(`DELETE FROM transactions WHERE ofx_import_id = ?`, [importId]);
        db.run(`DELETE FROM ofx_imports WHERE id = ?`, [importId], function(err) {
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
app.get('/api/forecasts', (req, res) => {
    db.all(`SELECT * FROM forecasts ORDER BY date ASC`, [], (err, rows) => {
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

app.post('/api/forecasts', (req, res) => {
    const { date, description, value, type, categoryId, bankId, installmentCurrent, installmentTotal, groupId } = req.body;
    db.run(
        `INSERT INTO forecasts (date, description, value, type, category_id, bank_id, realized, installment_current, installment_total, group_id) 
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [date, description, value, type, categoryId, bankId, installmentCurrent, installmentTotal, groupId],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/forecasts/:id', (req, res) => {
    const { date, description, value, type, categoryId, bankId } = req.body;
    db.run(
        `UPDATE forecasts SET date = ?, description = ?, value = ?, type = ?, category_id = ?, bank_id = ? WHERE id = ?`,
        [date, description, value, type, categoryId, bankId, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// Advanced Delete Forecast
app.delete('/api/forecasts/:id', (req, res) => {
    const { mode } = req.query; // 'single', 'all', 'future'
    const id = req.params.id;

    if (!mode || mode === 'single') {
        db.run(`DELETE FROM forecasts WHERE id = ?`, [id], function(err) {
            if(err) return res.status(500).json({error: err.message});
            res.json({ deleted: this.changes });
        });
    } else {
        // Need to find the forecast details first to get group_id and date
        db.get(`SELECT group_id, date FROM forecasts WHERE id = ?`, [id], (err, row) => {
            if (err) return res.status(500).json({error: err.message});
            if (!row || !row.group_id) {
                // If no group_id, just delete single
                db.run(`DELETE FROM forecasts WHERE id = ?`, [id]);
                return res.json({ deleted: 1 });
            }

            if (mode === 'all') {
                db.run(`DELETE FROM forecasts WHERE group_id = ?`, [row.group_id], function(err) {
                    if(err) return res.status(500).json({error: err.message});
                    res.json({ deleted: this.changes });
                });
            } else if (mode === 'future') {
                db.run(`DELETE FROM forecasts WHERE group_id = ? AND date >= ?`, [row.group_id, row.date], function(err) {
                     if(err) return res.status(500).json({error: err.message});
                     res.json({ deleted: this.changes });
                });
            }
        });
    }
});

app.patch('/api/forecasts/:id/realize', (req, res) => {
     db.run(`UPDATE forecasts SET realized = 1 WHERE id = ?`, [req.params.id], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ updated: this.changes });
    });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`DB Path: ${dbPath}`);
});