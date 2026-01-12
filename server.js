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

const LOCAL_LOGO_DIR = path.join(__dirname, 'logo');
if (!fs.existsSync(LOCAL_LOGO_DIR)){
    fs.mkdirSync(LOCAL_LOGO_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// --- DATABASE SETUP ---
const BACKUP_DIR = '/backup';
let PERSISTENT_LOGO_DIR = './backup/logos'; 
let dbPath = './backup/finance_v2.db';

try {
    if (!fs.existsSync('./backup')) fs.mkdirSync('./backup', { recursive: true });
    if (!fs.existsSync(PERSISTENT_LOGO_DIR)) fs.mkdirSync(PERSISTENT_LOGO_DIR, { recursive: true });
} catch(e) { console.error("Backup dir error", e); }

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("ERRO DB:", err.message);
    else console.log(`DB Conectado: ${dbPath}`);
});

// --- HELPER: Snake to Camel Case ---
const toCamel = (o) => {
    if (!o || typeof o !== 'object') return o;
    if (Array.isArray(o)) return o.map(toCamel);
    
    const newO = {};
    for (const key in o) {
        const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        newO[newKey] = o[key];
    }
    return newO;
};

// --- ROTA IMAGENS ---
app.use('/logo', (req, res, next) => {
    const persistentFile = path.join(PERSISTENT_LOGO_DIR, req.path);
    if (fs.existsSync(persistentFile)) return res.sendFile(persistentFile);
    next();
});
app.use('/logo', express.static(LOCAL_LOGO_DIR));

// --- MIDDLEWARE ---
const getUserId = (req) => req.headers['user-id'] || req.query.userId;
const checkAuth = (req, res, next) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    req.userId = userId;
    next();
};

// --- DATA SEED ---
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
    { name: 'Outras Receitas Operacionais', type: 'receita' },
    
    { name: 'Compra de Mercadorias (CMV)', type: 'despesa' },
    { name: 'Fretes e Entregas', type: 'despesa' },
    { name: 'Folha de Pagamento', type: 'despesa' },
    { name: 'Pró-Labore', type: 'despesa' },
    { name: 'Encargos Trabalhistas', type: 'despesa' },
    { name: 'Aluguel e Condomínio', type: 'despesa' },
    { name: 'Energia, Água e Internet', type: 'despesa' },
    { name: 'Manutenção e Limpeza', type: 'despesa' },
    { name: 'Marketing e Publicidade', type: 'despesa' },
    { name: 'Material de Escritório', type: 'despesa' },
    { name: 'Softwares e Sistemas', type: 'despesa' },
    { name: 'Serviços Contábeis e Jurídicos', type: 'despesa' },
    { name: 'Combustível e Viagens', type: 'despesa' },
    { name: 'Impostos sobre Vendas (DAS/ICMS)', type: 'despesa' },
    { name: 'Taxas Bancárias', type: 'despesa' },
    { name: 'Juros e Multas', type: 'despesa' },
    { name: 'Retirada de Lucros', type: 'despesa' },
    { name: 'Outras Despesas', type: 'despesa' }
];

// --- INIT DB ---
db.serialize(() => {
    // Users
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT, cnpj TEXT, razao_social TEXT, phone TEXT, reset_token TEXT, reset_token_expires INTEGER)`);
    // Banks
    db.run(`CREATE TABLE IF NOT EXISTS banks (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, account_number TEXT, nickname TEXT, logo TEXT, active INTEGER DEFAULT 1, balance REAL DEFAULT 0)`);
    // Categories
    db.run(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, type TEXT)`);
    // Global Banks
    db.run(`CREATE TABLE IF NOT EXISTS global_banks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, logo TEXT)`);
    
    // Transactions
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, date TEXT, description TEXT, value REAL, type TEXT, category_id INTEGER, bank_id INTEGER, reconciled INTEGER, ofx_import_id INTEGER
    )`);
    
    // Forecasts
    db.run(`CREATE TABLE IF NOT EXISTS forecasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, date TEXT, description TEXT, value REAL, type TEXT, category_id INTEGER, bank_id INTEGER, realized INTEGER DEFAULT 0, installment_current INTEGER, installment_total INTEGER, group_id TEXT
    )`);

    // Imports
    db.run(`CREATE TABLE IF NOT EXISTS ofx_imports (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, file_name TEXT, import_date TEXT, bank_id INTEGER, transaction_count INTEGER, content TEXT)`);
    
    // Rules
    db.run(`CREATE TABLE IF NOT EXISTS keyword_rules (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, keyword TEXT, type TEXT, category_id INTEGER, bank_id INTEGER)`);

    // Seed Global Banks
    db.get("SELECT COUNT(*) as count FROM global_banks", [], (err, row) => {
        if (!err && row.count === 0) {
            const stmt = db.prepare("INSERT INTO global_banks (name, logo) VALUES (?, ?)");
            INITIAL_BANKS_SEED.forEach(b => stmt.run(b.name, b.logo));
            stmt.finalize();
        }
    });
});

// --- ROUTES ---

// LOGIN / AUTH
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err) return res.status(500).json({error: err.message});
        if (!user) return res.status(400).json({error: "Usuário não encontrado"});
        
        const valid = bcrypt.compareSync(password, user.password);
        if (!valid) return res.status(400).json({error: "Senha incorreta"});

        // Auto-Seed Categories if empty for this user
        db.get(`SELECT COUNT(*) as count FROM categories WHERE user_id = ?`, [user.id], (err, row) => {
            if (!err && row.count === 0) {
                const stmt = db.prepare("INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)");
                INITIAL_CATEGORIES_SEED.forEach(c => stmt.run(user.id, c.name, c.type));
                stmt.finalize();
            }
        });

        res.json({ id: user.id, email: user.email, razaoSocial: user.razao_social, role: email === 'admin' ? 'admin' : 'user' });
    });
});

// BANKS
app.get('/api/banks', checkAuth, (req, res) => {
    db.all(`SELECT * FROM banks WHERE user_id = ?`, [req.userId], (err, rows) => {
        if(err) return res.status(500).json(err);
        res.json(toCamel(rows));
    });
});
app.post('/api/banks', checkAuth, (req, res) => {
    const { name, accountNumber, nickname, logo } = req.body;
    db.run(`INSERT INTO banks (user_id, name, account_number, nickname, logo, active, balance) VALUES (?, ?, ?, ?, ?, 1, 0)`,
        [req.userId, name, accountNumber, nickname, logo], function(err) {
            if(err) return res.status(500).json(err);
            res.json({ id: this.lastID, ...req.body, active: true, balance: 0 });
        });
});
app.put('/api/banks/:id', checkAuth, (req, res) => {
    const { name, accountNumber, nickname, logo, active } = req.body;
    db.run(`UPDATE banks SET name=?, account_number=?, nickname=?, logo=?, active=? WHERE id=? AND user_id=?`,
        [name, accountNumber, nickname, logo, active ? 1 : 0, req.params.id, req.userId], (err) => {
            if(err) return res.status(500).json(err);
            res.json({ success: true });
        });
});
app.delete('/api/banks/:id', checkAuth, (req, res) => {
    db.run(`DELETE FROM banks WHERE id=? AND user_id=?`, [req.params.id, req.userId], (err) => {
        if(err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

// CATEGORIES
app.get('/api/categories', checkAuth, (req, res) => {
    db.all(`SELECT * FROM categories WHERE user_id = ? ORDER BY name`, [req.userId], (err, rows) => {
        if(err) return res.status(500).json(err);
        res.json(toCamel(rows));
    });
});
app.post('/api/categories', checkAuth, (req, res) => {
    const { name, type } = req.body;
    db.run(`INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)`, [req.userId, name, type], function(err){
        if(err) return res.status(500).json(err);
        res.json({ id: this.lastID, name, type });
    });
});
app.delete('/api/categories/:id', checkAuth, (req, res) => {
    db.run(`DELETE FROM categories WHERE id=? AND user_id=?`, [req.params.id, req.userId], (err) => {
        if(err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

// TRANSACTIONS
app.get('/api/transactions', checkAuth, (req, res) => {
    db.all(`SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC`, [req.userId], (err, rows) => {
        if(err) return res.status(500).json(err);
        // Correcting boolean field
        const mapped = toCamel(rows).map(t => ({...t, reconciled: Boolean(t.reconciled)}));
        res.json(mapped);
    });
});
app.post('/api/transactions', checkAuth, (req, res) => {
    const { date, description, value, type, categoryId, bankId, reconciled, ofxImportId } = req.body;
    db.run(`INSERT INTO transactions (user_id, date, description, value, type, category_id, bank_id, reconciled, ofx_import_id) VALUES (?,?,?,?,?,?,?,?,?)`,
        [req.userId, date, description, value, type, categoryId, bankId, reconciled ? 1 : 0, ofxImportId], function(err) {
            if(err) return res.status(500).json(err);
            res.json({ id: this.lastID, ...req.body });
        });
});
app.put('/api/transactions/:id', checkAuth, (req, res) => {
    const { date, description, value, type, categoryId, bankId, reconciled } = req.body;
    db.run(`UPDATE transactions SET date=?, description=?, value=?, type=?, category_id=?, bank_id=?, reconciled=? WHERE id=? AND user_id=?`,
        [date, description, value, type, categoryId, bankId, reconciled ? 1 : 0, req.params.id, req.userId], (err) => {
            if(err) return res.status(500).json(err);
            res.json({ success: true });
        });
});
app.delete('/api/transactions/:id', checkAuth, (req, res) => {
    db.run(`DELETE FROM transactions WHERE id=? AND user_id=?`, [req.params.id, req.userId], (err) => {
        if(err) return res.status(500).json(err);
        res.json({ success: true });
    });
});
app.patch('/api/transactions/:id/reconcile', checkAuth, (req, res) => {
    const { reconciled } = req.body;
    db.run(`UPDATE transactions SET reconciled=? WHERE id=? AND user_id=?`, [reconciled?1:0, req.params.id, req.userId], (err) => {
        if(err) return res.status(500).json(err);
        res.json({ success: true });
    });
});
app.patch('/api/transactions/batch-update', checkAuth, (req, res) => {
    const { transactionIds, categoryId } = req.body;
    const placeholders = transactionIds.map(() => '?').join(',');
    db.run(`UPDATE transactions SET category_id=?, reconciled=1 WHERE id IN (${placeholders}) AND user_id=?`, [categoryId, ...transactionIds, req.userId], (err) => {
        if(err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

// FORECASTS
app.get('/api/forecasts', checkAuth, (req, res) => {
    db.all(`SELECT * FROM forecasts WHERE user_id = ? ORDER BY date ASC`, [req.userId], (err, rows) => {
        if(err) return res.status(500).json(err);
        // Map boolean and camelCase
        const mapped = toCamel(rows).map(f => ({...f, realized: Boolean(f.realized)}));
        res.json(mapped);
    });
});
app.post('/api/forecasts', checkAuth, (req, res) => {
    const { date, description, value, type, categoryId, bankId, installmentCurrent, installmentTotal, groupId, realized } = req.body;
    db.run(`INSERT INTO forecasts (user_id, date, description, value, type, category_id, bank_id, realized, installment_current, installment_total, group_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [req.userId, date, description, value, type, categoryId, bankId, realized?1:0, installmentCurrent, installmentTotal, groupId], function(err) {
            if(err) return res.status(500).json(err);
            res.json({ id: this.lastID });
        });
});
app.put('/api/forecasts/:id', checkAuth, (req, res) => {
    const { date, description, value, type, categoryId, bankId } = req.body;
    db.run(`UPDATE forecasts SET date=?, description=?, value=?, type=?, category_id=?, bank_id=? WHERE id=? AND user_id=?`,
        [date, description, value, type, categoryId, bankId, req.params.id, req.userId], (err) => {
            if(err) return res.status(500).json(err);
            res.json({ success: true });
        });
});
app.patch('/api/forecasts/:id/realize', checkAuth, (req, res) => {
    db.run(`UPDATE forecasts SET realized=1 WHERE id=? AND user_id=?`, [req.params.id, req.userId], (err) => {
        if(err) return res.status(500).json(err);
        res.json({ success: true });
    });
});
app.delete('/api/forecasts/:id', checkAuth, (req, res) => {
    const { mode } = req.query; 
    db.get(`SELECT group_id, date FROM forecasts WHERE id = ?`, [req.params.id], (err, forecast) => {
        if(err || !forecast) return res.status(404).json({error: "Not found"});
        
        let query = `DELETE FROM forecasts WHERE id = ?`;
        let params = [req.params.id];

        if (forecast.group_id) {
            if (mode === 'all') {
                query = `DELETE FROM forecasts WHERE group_id = ?`;
                params = [forecast.group_id];
            } else if (mode === 'future') {
                query = `DELETE FROM forecasts WHERE group_id = ? AND date >= ?`;
                params = [forecast.group_id, forecast.date];
            }
        }
        
        db.run(query + ` AND user_id = ?`, [...params, req.userId], (err) => {
            if(err) return res.status(500).json(err);
            res.json({ success: true });
        });
    });
});

// IMPORTS
app.get('/api/ofx-imports', checkAuth, (req, res) => {
    db.all(`SELECT id, file_name, import_date, bank_id, transaction_count FROM ofx_imports WHERE user_id = ? ORDER BY import_date DESC`, [req.userId], (err, rows) => {
        if(err) return res.status(500).json(err);
        res.json(toCamel(rows));
    });
});
app.post('/api/ofx-imports', checkAuth, (req, res) => {
    const { fileName, importDate, bankId, transactionCount, content } = req.body;
    db.run(`INSERT INTO ofx_imports (user_id, file_name, import_date, bank_id, transaction_count, content) VALUES (?,?,?,?,?,?)`,
        [req.userId, fileName, importDate, bankId, transactionCount, content], function(err) {
            if(err) return res.status(500).json(err);
            res.json({ id: this.lastID });
        });
});
app.delete('/api/ofx-imports/:id', checkAuth, (req, res) => {
    // Delete import and its transactions
    db.serialize(() => {
        db.run(`DELETE FROM transactions WHERE ofx_import_id = ? AND user_id = ?`, [req.params.id, req.userId]);
        db.run(`DELETE FROM ofx_imports WHERE id = ? AND user_id = ?`, [req.params.id, req.userId], (err) => {
            if(err) return res.status(500).json(err);
            res.json({ success: true });
        });
    });
});

// KEYWORD RULES
app.get('/api/keyword-rules', checkAuth, (req, res) => {
    db.all(`SELECT * FROM keyword_rules WHERE user_id = ?`, [req.userId], (err, rows) => {
        if(err) return res.status(500).json(err);
        res.json(toCamel(rows));
    });
});
app.post('/api/keyword-rules', checkAuth, (req, res) => {
    const { keyword, type, categoryId, bankId } = req.body;
    db.run(`INSERT INTO keyword_rules (user_id, keyword, type, category_id, bank_id) VALUES (?,?,?,?,?)`,
        [req.userId, keyword, type, categoryId, bankId], function(err) {
            if(err) return res.status(500).json(err);
            res.json({ id: this.lastID, ...req.body });
        });
});
app.delete('/api/keyword-rules/:id', checkAuth, (req, res) => {
    db.run(`DELETE FROM keyword_rules WHERE id = ? AND user_id = ?`, [req.params.id, req.userId], (err) => {
        if(err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

// GLOBAL BANKS (Public)
app.get('/api/global-banks', (req, res) => {
    db.all('SELECT * FROM global_banks ORDER BY name ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- REPORTS (DRE, CASH FLOW) ---

app.get('/api/reports/cash-flow', checkAuth, (req, res) => {
    const { year, month } = req.query;
    const startStr = `${year}-${String(Number(month)+1).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(Number(month)+1).padStart(2, '0')}-31`;

    db.serialize(() => {
        // 1. Saldo Inicial (Before this month)
        let startBalance = 0;
        db.get(`
            SELECT SUM(CASE WHEN type LIKE '%credit%' OR type LIKE '%receita%' THEN value ELSE -value END) as total 
            FROM transactions 
            WHERE user_id = ? AND date < ? AND reconciled = 1
        `, [req.userId, startStr], (err, row) => {
            if (row && row.total) startBalance = row.total;

            // 2. Transactions in Month
            db.all(`
                SELECT t.value, t.type, c.name as category_name, t.date
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = ? AND t.date >= ? AND t.date <= ? AND t.reconciled = 1
            `, [req.userId, startStr, endStr], (err, rows) => {
                
                let totalReceitas = 0;
                let totalDespesas = 0;
                const receitasByCategory = {};
                const despesasByCategory = {};

                rows.forEach(r => {
                    const isCredit = r.type.includes('credit') || r.type === 'receita';
                    const val = r.value;
                    const cat = r.category_name || 'Outros';

                    if (isCredit) {
                        totalReceitas += val;
                        receitasByCategory[cat] = (receitasByCategory[cat] || 0) + val;
                    } else {
                        totalDespesas += val;
                        despesasByCategory[cat] = (despesasByCategory[cat] || 0) + val;
                    }
                });

                const endBalance = startBalance + totalReceitas - totalDespesas;

                res.json({
                    startBalance,
                    totalReceitas,
                    totalDespesas,
                    endBalance,
                    receitasByCategory: Object.entries(receitasByCategory).map(([name, value]) => ({name, value})),
                    despesasByCategory: Object.entries(despesasByCategory).map(([name, value]) => ({name, value}))
                });
            });
        });
    });
});

app.get('/api/reports/dre', checkAuth, (req, res) => {
    const { year, month } = req.query;
    const startStr = `${year}-${String(Number(month)+1).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(Number(month)+1).padStart(2, '0')}-31`;

    db.all(`
        SELECT t.value, t.type, c.name as cat_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ? AND t.date >= ? AND t.date <= ? AND t.reconciled = 1
    `, [req.userId, startStr, endStr], (err, rows) => {
        if(err) return res.status(500).json(err);

        let receitaBruta = 0;
        let deducoes = 0;
        let cmv = 0;
        let despesasOperacionais = 0;
        let impostos = 0;
        let resultadoFinanceiro = 0;
        let resultadoNaoOperacional = 0;

        rows.forEach(r => {
            const val = r.value;
            const cat = (r.cat_name || '').toLowerCase();
            const isCredit = r.type.includes('credit') || r.type === 'receita';

            if (isCredit) {
                if (cat.includes('não operacional') || cat.includes('investimento')) {
                    resultadoNaoOperacional += val;
                } else if (cat.includes('financeira') || cat.includes('juros')) {
                    resultadoFinanceiro += val;
                } else {
                    receitaBruta += val;
                }
            } else {
                // Despesas
                if (cat.includes('imposto') || cat.includes('taxa') || cat.includes('das') || cat.includes('icms')) {
                    impostos += val; // Impostos sobre venda ou lucro
                } else if (cat.includes('devolução') || cat.includes('cancelamento')) {
                    deducoes += val;
                } else if (cat.includes('mercadoria') || cat.includes('matéria') || cat.includes('fornecedor') || cat.includes('frete')) {
                    cmv += val;
                } else if (cat.includes('financeira') || cat.includes('bancária') || cat.includes('juros')) {
                    resultadoFinanceiro -= val;
                } else if (cat.includes('não operacional') || cat.includes('investimento')) {
                    resultadoNaoOperacional -= val;
                } else {
                    despesasOperacionais += val;
                }
            }
        });

        const receitaLiquida = receitaBruta - deducoes;
        const resultadoBruto = receitaLiquida - cmv;
        const resultadoOperacional = resultadoBruto - despesasOperacionais;
        const resultadoAntesImpostos = resultadoOperacional + resultadoFinanceiro + resultadoNaoOperacional;
        const lucroLiquido = resultadoAntesImpostos - impostos;

        res.json({
            receitaBruta,
            deducoes,
            receitaLiquida,
            cmv,
            resultadoBruto,
            despesasOperacionais,
            resultadoOperacional,
            resultadoFinanceiro,
            resultadoNaoOperacional,
            resultadoAntesImpostos,
            impostos,
            lucroLiquido
        });
    });
});

app.get('/api/reports/forecasts', checkAuth, (req, res) => {
    const { year, month } = req.query;
    const startStr = `${year}-${String(Number(month)+1).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(Number(month)+1).padStart(2, '0')}-31`;

    // Get Forecasts + Realized Transactions
    // 1. Forecasts (Pending)
    db.all(`SELECT * FROM forecasts WHERE user_id = ? AND date >= ? AND date <= ? AND realized = 0`, [req.userId, startStr, endStr], (err, pending) => {
        // 2. Transactions (Realized)
        db.all(`SELECT * FROM transactions WHERE user_id = ? AND date >= ? AND date <= ?`, [req.userId, startStr, endStr], (err, realized) => {
            
            const pendingIncome = pending.filter(i => i.type.includes('credit')).reduce((a,b) => a+b.value, 0);
            const pendingExpense = pending.filter(i => i.type.includes('debit')).reduce((a,b) => a+b.value, 0);

            const realizedIncome = realized.filter(i => i.type.includes('credit')).reduce((a,b) => a+b.value, 0);
            const realizedExpense = realized.filter(i => i.type.includes('debit')).reduce((a,b) => a+b.value, 0);

            res.json({
                summary: {
                    predictedIncome: realizedIncome + pendingIncome,
                    realizedIncome,
                    pendingIncome,
                    predictedExpense: realizedExpense + pendingExpense,
                    realizedExpense,
                    pendingExpense
                },
                items: [
                    ...toCamel(pending).map(p => ({...p, source: 'forecast', realized: false})),
                    ...toCamel(realized).map(r => ({...r, source: 'transaction', realized: true}))
                ].sort((a,b) => new Date(a.date) - new Date(b.date))
            });
        });
    });
});

app.get('/api/reports/daily-flow', checkAuth, (req, res) => {
    const { startDate, endDate } = req.query;
    db.all(`
        SELECT date, type, SUM(value) as val 
        FROM transactions 
        WHERE user_id = ? AND date >= ? AND date <= ? AND reconciled = 1
        GROUP BY date, type
        ORDER BY date ASC
    `, [req.userId, startDate, endDate], (err, rows) => {
        if(err) return res.status(500).json(err);
        
        const map = {};
        rows.forEach(r => {
            if(!map[r.date]) map[r.date] = { date: r.date, income: 0, expense: 0, net: 0 };
            const isCredit = r.type.includes('credit') || r.type === 'receita';
            if(isCredit) map[r.date].income += r.val;
            else map[r.date].expense += r.val;
            map[r.date].net = map[r.date].income - map[r.date].expense;
        });
        res.json(Object.values(map));
    });
});

app.get('/api/reports/analysis', checkAuth, (req, res) => {
    const { year, month } = req.query;
    const startStr = `${year}-${String(Number(month)+1).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(Number(month)+1).padStart(2, '0')}-31`;

    db.all(`
        SELECT t.value, t.type, c.name as cat_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ? AND t.date >= ? AND t.date <= ? AND t.reconciled = 1
    `, [req.userId, startStr, endStr], (err, rows) => {
        const receitas = {};
        const despesas = {};
        let totalReceitas = 0;
        let totalDespesas = 0;
        let custoVariavel = 0; // CMV + Impostos + Fretes
        
        rows.forEach(r => {
            const cat = r.cat_name || 'Outros';
            const val = r.value;
            const isCredit = r.type.includes('credit') || r.type === 'receita';
            
            if(isCredit) {
                receitas[cat] = (receitas[cat] || 0) + val;
                totalReceitas += val;
            } else {
                despesas[cat] = (despesas[cat] || 0) + val;
                totalDespesas += val;
                
                const catLower = cat.toLowerCase();
                if (catLower.includes('mercadoria') || catLower.includes('matéria') || catLower.includes('imposto') || catLower.includes('venda')) {
                    custoVariavel += val;
                }
            }
        });

        const margemContribuicao = totalReceitas - custoVariavel;
        const lucro = totalReceitas - totalDespesas;

        res.json({
            receitas,
            despesas,
            totalReceitas,
            totalDespesas,
            kpis: {
                margemContribuicaoPct: totalReceitas ? (margemContribuicao / totalReceitas) * 100 : 0,
                resultadoOperacionalPct: totalReceitas ? (lucro / totalReceitas) * 100 : 0, // Simplificado
                resultadoLiquidoPct: totalReceitas ? (lucro / totalReceitas) * 100 : 0
            }
        });
    });
});

// --- ADMIN / SIGNUP ROUTES (Simplified for brevity but required) ---
app.post('/api/request-signup', (req, res) => {
    // Mock
    const token = crypto.randomBytes(20).toString('hex');
    const { email, razaoSocial } = req.body;
    db.run(`INSERT OR REPLACE INTO pending_signups (email, token, cnpj, razao_social, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [email, token, req.body.cnpj, razaoSocial, req.body.phone, Date.now()], (err) => {
        if(err) return res.status(500).json({error: err.message});
        // In production, send email here.
        console.log(`[EMAIL MOCK] Signup Token for ${email}: ${token}`);
        res.json({ success: true });
    });
});
app.get('/api/validate-signup-token/:token', (req, res) => {
    db.get(`SELECT * FROM pending_signups WHERE token = ?`, [req.params.token], (err, row) => {
        if(!row) return res.status(400).json({error: "Token invalid"});
        res.json({ email: row.email, razaoSocial: row.razao_social });
    });
});
app.post('/api/complete-signup', (req, res) => {
    const { token, password } = req.body;
    db.get(`SELECT * FROM pending_signups WHERE token = ?`, [token], (err, pending) => {
        if(!pending) return res.status(400).json({error: "Token invalid"});
        const hash = bcrypt.hashSync(password, 8);
        db.run(`INSERT INTO users (email, password, cnpj, razao_social, phone) VALUES (?,?,?,?,?)`,
            [pending.email, hash, pending.cnpj, pending.razao_social, pending.phone], function(err) {
                if(err) return res.status(500).json(err);
                const userId = this.lastID;
                // Init Categories
                const stmt = db.prepare("INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)");
                INITIAL_CATEGORIES_SEED.forEach(c => stmt.run(userId, c.name, c.type));
                stmt.finalize();
                // Clean up
                db.run(`DELETE FROM pending_signups WHERE token = ?`, [token]);
                res.json({ success: true });
            });
    });
});

app.post('/api/recover-password', (req, res) => {
    // Mock
    const token = crypto.randomBytes(20).toString('hex');
    db.run(`UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?`, 
    [token, Date.now() + 3600000, req.body.email], (err) => {
        if(!err) console.log(`[EMAIL MOCK] Reset Token: ${token}`);
        res.json({ success: true });
    });
});
app.post('/api/reset-password-confirm', (req, res) => {
    const { token, newPassword } = req.body;
    db.get(`SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?`, [token, Date.now()], (err, user) => {
        if(!user) return res.status(400).json({error: "Token invalid or expired"});
        const hash = bcrypt.hashSync(newPassword, 8);
        db.run(`UPDATE users SET password = ?, reset_token = NULL WHERE id = ?`, [hash, user.id], (err) => {
            res.json({ success: true });
        });
    });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});