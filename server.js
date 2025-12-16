import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Email Configuration
const MAIL_CONFIG = {
  host: process.env.MAIL_SERVER || 'smtp.gmail.com',
  port: process.env.MAIL_PORT || 587,
  secure: process.env.MAIL_USE_TLS === 'true', 
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD
  }
};

const sendEmail = async (to, subject, text) => {
  console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
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

// Initialize Tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    cnpj TEXT,
    razao_social TEXT,
    phone TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ofx_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT,
    import_date TEXT,
    bank_id INTEGER,
    transaction_count INTEGER
  )`);

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
      sendEmail(email, "Bem-vindo", "Cadastro realizado.");
      res.json({ id: this.lastID, email });
    }
  );
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Inválido.' });
    res.json({ id: row.id, email: row.email, razaoSocial: row.razao_social });
  });
});

app.post('/api/recover-password', (req, res) => {
    sendEmail(req.body.email, "Recuperação", "Link enviado.");
    res.json({ message: 'Enviado.' });
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
    // Transaction to delete both import record and associated transactions
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

app.delete('/api/forecasts/:id', (req, res) => {
    db.run(`DELETE FROM forecasts WHERE id = ?`, [req.params.id], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ deleted: this.changes });
    });
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
});