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

// Email Configuration (Variables ready for .env usage)
const MAIL_CONFIG = {
  host: process.env.MAIL_SERVER || 'smtp.gmail.com',
  port: process.env.MAIL_PORT || 587,
  secure: process.env.MAIL_USE_TLS === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD
  }
};

// Mock Email Sender Function
const sendEmail = async (to, subject, text) => {
  console.log("---------------------------------------------------");
  console.log(`[MOCK EMAIL SENDER]`);
  console.log(`Using Config: ${MAIL_CONFIG.host}:${MAIL_CONFIG.port}`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${text}`);
  console.log("---------------------------------------------------");
  // In a real scenario, you would use nodemailer here:
  // let transporter = nodemailer.createTransport(MAIL_CONFIG);
  // await transporter.sendMail({ from: MAIL_CONFIG.auth.user, to, subject, text });
  return true; 
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Database Setup
// Garante que a pasta de backup exista
const BACKUP_DIR = '/backup';
if (!fs.existsSync(BACKUP_DIR)) {
  // Fallback para desenvolvimento local se a pasta raiz não for acessível
  if (process.platform === 'win32') {
     fs.mkdirSync('./backup', { recursive: true });
  } else {
     try {
       fs.mkdirSync(BACKUP_DIR, { recursive: true });
     } catch (e) {
       console.log("Cannot create /backup, using ./backup");
       fs.mkdirSync('./backup', { recursive: true });
     }
  }
}

const dbPath = fs.existsSync(BACKUP_DIR) ? path.join(BACKUP_DIR, 'finance.db') : './backup/finance.db';
console.log(`Using database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error opening database', err);
  else console.log('Connected to SQLite database');
});

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

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    description TEXT,
    value REAL,
    type TEXT,
    category_id INTEGER,
    bank_id INTEGER,
    reconciled INTEGER
  )`);
});

// --- API Routes ---

// 1. Auth
app.post('/api/signup', (req, res) => {
  const { email, password, cnpj, razaoSocial, phone } = req.body;
  // In production, hash password with bcrypt here
  db.run(
    `INSERT INTO users (email, password, cnpj, razao_social, phone) VALUES (?, ?, ?, ?, ?)`,
    [email, password, cnpj, razaoSocial, phone],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Email já cadastrado.' });
        }
        return res.status(500).json({ error: err.message });
      }
      
      // Send Welcome Email
      sendEmail(email, "Bem-vindo ao Sistema Financeiro", "Seu cadastro foi realizado com sucesso.");

      res.json({ id: this.lastID, email });
    }
  );
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Credenciais inválidas.' });
    
    // Return simple user object (token logic omitted for simplicity)
    res.json({ id: row.id, email: row.email, razaoSocial: row.razao_social });
  });
});

app.post('/api/recover-password', (req, res) => {
    const { email } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
        if(err) return res.status(500).json({error: err.message});
        if(!row) return res.status(404).json({error: 'Email não encontrado.'});
        
        // Simulating email sending
        sendEmail(email, "Recuperação de Senha", "Clique no link para redefinir sua senha: http://localhost:3000/reset");
        
        res.json({ message: 'Email de recuperação enviado.' });
    });
});

// 2. Transactions
app.get('/api/transactions', (req, res) => {
  db.all(`SELECT * FROM transactions ORDER BY date DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Convert DB snake_case/types to Frontend Interface
    const transactions = rows.map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      value: t.value,
      type: t.type,
      categoryId: t.category_id,
      bankId: t.bank_id,
      reconciled: Boolean(t.reconciled)
    }));
    res.json(transactions);
  });
});

app.post('/api/transactions', (req, res) => {
  const { date, description, value, type, categoryId, bankId, reconciled } = req.body;
  db.run(
    `INSERT INTO transactions (date, description, value, type, category_id, bank_id, reconciled) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [date, description, value, type, categoryId, bankId, reconciled ? 1 : 0],
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

// Serve React for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database path: ${dbPath}`);
});