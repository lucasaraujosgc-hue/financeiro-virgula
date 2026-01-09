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

// Garante que a pasta logo seja servida como estática
// Isso permite acessar http://localhost:3000/logo/nubank.jpg
const LOGO_DIR = path.join(__dirname, 'logo');

// Garante que a pasta existe
if (!fs.existsSync(LOGO_DIR)){
    fs.mkdirSync(LOGO_DIR);
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
    // 1. Tenta pegar do Header (chamadas API normais)
    let userId = req.headers['user-id'];
    
    // 2. Se não tiver no header, tenta na Query String (downloads/window.open)
    // Suporta tanto 'userId' (padrão camelCase) quanto 'user-id'
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
  console.log(`[EMAIL] Iniciando envio para: ${to}`);
  
  if (!process.env.MAIL_SERVER || !process.env.MAIL_USERNAME) {
      console.warn("[EMAIL] Configurações de email não encontradas no .env. Simulando envio.");
      return true;
  }

  try {
      // Configuração do ALIAS e FROM NAME
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

// Initialize Tables & Seed
db.serialize(() => {
  // Global Banks (Master List)
  db.run(`CREATE TABLE IF NOT EXISTS global_banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    logo TEXT
  )`, (err) => {
      if (!err) {
          // Check if empty, if so, seed
          db.get("SELECT COUNT(*) as count FROM global_banks", [], (err, row) => {
              if (!err && row.count === 0) {
                  const stmt = db.prepare("INSERT INTO global_banks (name, logo) VALUES (?, ?)");
                  INITIAL_BANKS_SEED.forEach(b => {
                      stmt.run(b.name, b.logo);
                  });
                  stmt.finalize();
                  console.log("Global banks seeded.");
              }
          });
      }
  });

  // Users
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
      if (!err) {
          db.run("ALTER TABLE users ADD COLUMN reset_token TEXT", () => {});
          db.run("ALTER TABLE users ADD COLUMN reset_token_expires INTEGER", () => {});
      }
  });

  // Pending Signups
  db.run(`CREATE TABLE IF NOT EXISTS pending_signups (
    email TEXT PRIMARY KEY,
    token TEXT,
    cnpj TEXT,
    razao_social TEXT,
    phone TEXT,
    created_at INTEGER
  )`, (err) => {
      if (!err) {
          db.run("ALTER TABLE pending_signups ADD COLUMN cnpj TEXT", () => {});
          db.run("ALTER TABLE pending_signups ADD COLUMN razao_social TEXT", () => {});
          db.run("ALTER TABLE pending_signups ADD COLUMN phone TEXT", () => {});
      }
  });

  // Banks (User Specific)
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

  // Categories
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    type TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // OFX
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
      if (!err) {
          // Migration to add content column if missing
          db.run("ALTER TABLE ofx_imports ADD COLUMN content TEXT", () => {});
      }
  });

  // Transactions
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

  // Forecasts
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

  // Keyword Rules
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
        res.json(rows);
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
                const extension = matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');
                
                const fileName = `bank_${Date.now()}.${extension}`;
                const filePath = path.join(LOGO_DIR, fileName);
                
                fs.writeFileSync(filePath, buffer);
                logoPath = `/logo/${fileName}`;
            }
        } catch (e) {
            console.error("Error saving logo:", e);
            return res.status(500).json({ error: "Erro ao salvar imagem" });
        }
    } else if (logoData) {
        // Assume it might be a path string if not base64 (e.g. duplicating existing)
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

    if (!name) return res.status(400).json({ error: "Nome é obrigatório" });

    db.get('SELECT * FROM global_banks WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Banco não encontrado" });

        const oldName = row.name;
        let logoPath = row.logo;

        if (logoData && logoData.startsWith('data:image')) {
             try {
                const matches = logoData.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const extension = matches[1].includes('+') ? matches[1].split('+')[0] : matches[1]; 
                    const base64Data = matches[2];
                    const buffer = Buffer.from(base64Data, 'base64');
                    
                    const fileName = `bank_${Date.now()}.${extension}`;
                    const filePath = path.join(LOGO_DIR, fileName);
                    
                    fs.writeFileSync(filePath, buffer);
                    logoPath = `/logo/${fileName}`;
                }
            } catch (e) {
                console.error("Error saving logo:", e);
                return res.status(500).json({ error: "Erro ao salvar imagem" });
            }
        }

        // 1. Atualizar o banco global
        db.run('UPDATE global_banks SET name = ?, logo = ? WHERE id = ?', [name, logoPath, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // 2. Propagar atualização para todos os usuários que possuem esse banco
            // Atualiza o nome e o logo na tabela 'banks' dos usuários onde o nome coincide com o antigo
            db.run('UPDATE banks SET name = ?, logo = ? WHERE name = ?', [name, logoPath, oldName], (errUpdate) => {
                if (errUpdate) console.error("Erro ao propagar atualização para usuários:", errUpdate);
                res.json({ id, name, logo: logoPath });
            });
        });
    });
});

app.delete('/api/admin/banks/:id', checkAdmin, (req, res) => {
    // Optionally delete the file if it's custom, but simple delete DB row is safer for now
    db.run('DELETE FROM global_banks WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Banco removido" });
    });
});

// ... (resto do código igual)