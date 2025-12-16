import { Bank, Category, CategoryType, Transaction, TransactionType, Forecast } from '../types';

// Initial Mock Data with Local Images
export const INITIAL_BANKS: Bank[] = [
  { id: 1, name: 'Nubank', accountNumber: '1234-5', nickname: 'Principal', logo: '/nubank.jpg', active: true, balance: 0 },
  { id: 2, name: 'Itaú', accountNumber: '9876-0', nickname: 'Reserva', logo: '/itau.png', active: true, balance: 0 },
  { id: 3, name: 'Bradesco', accountNumber: '1111-2', nickname: 'PJ', logo: '/bradesco.jpg', active: true, balance: 0 },
  { id: 4, name: 'Caixa Econômica', accountNumber: '0001-9', nickname: 'Caixa', logo: '/caixa.png', active: true, balance: 0 },
  { id: 5, name: 'Banco do Brasil', accountNumber: '4455-6', nickname: 'BB', logo: '/bb.png', active: true, balance: 0 },
  { id: 6, name: 'Santander', accountNumber: '7788-9', nickname: 'Santander', logo: '/santander.png', active: true, balance: 0 },
  { id: 7, name: 'Inter', accountNumber: '3322-1', nickname: 'Inter', logo: '/inter.png', active: true, balance: 0 },
  { id: 8, name: 'BTG Pactual', accountNumber: '5566-7', nickname: 'Investimentos', logo: '/btg_pactual.png', active: true, balance: 0 },
  { id: 9, name: 'C6 Bank', accountNumber: '9988-7', nickname: 'C6', logo: '/c6_bank.png', active: true, balance: 0 },
  { id: 10, name: 'Sicredi', accountNumber: '1212-3', nickname: 'Cooperativa', logo: '/sicredi.png', active: true, balance: 0 },
  { id: 11, name: 'Sicoob', accountNumber: '3434-5', nickname: 'Sicoob', logo: '/sicoob.png', active: true, balance: 0 },
  { id: 12, name: 'Mercado Pago', accountNumber: '0000-0', nickname: 'Vendas', logo: '/mercado_pago.png', active: true, balance: 0 },
  { id: 13, name: 'PagBank', accountNumber: '0000-0', nickname: 'Maquininha', logo: '/pagbank.png', active: true, balance: 0 },
  { id: 14, name: 'Stone', accountNumber: '0000-0', nickname: 'Stone', logo: '/stone.png', active: true, balance: 0 },
  { id: 15, name: 'Banco Safra', accountNumber: '0000-0', nickname: 'Safra', logo: '/safra.png', active: true, balance: 0 },
  { id: 16, name: 'Banco Pan', accountNumber: '0000-0', nickname: 'Pan', logo: '/banco_pan.png', active: true, balance: 0 },
  { id: 17, name: 'Banrisul', accountNumber: '0000-0', nickname: 'Sul', logo: '/banrisul.png', active: true, balance: 0 },
  { id: 18, name: 'Neon', accountNumber: '0000-0', nickname: 'Neon', logo: '/neon.png', active: true, balance: 0 },
  { id: 19, name: 'Caixa Registradora', accountNumber: '-', nickname: 'Dinheiro Físico', logo: '/caixaf.png', active: true, balance: 0 },
];

const INCOME_CATEGORIES = [
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

const EXPENSE_CATEGORIES = [
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

let catIdCounter = 1;

export const INITIAL_CATEGORIES: Category[] = [
  ...INCOME_CATEGORIES.map(name => ({
    id: catIdCounter++,
    name,
    type: CategoryType.INCOME
  })),
  ...EXPENSE_CATEGORIES.map(name => ({
    id: catIdCounter++,
    name,
    type: CategoryType.EXPENSE
  }))
];

const generateTransactions = (): Transaction[] => {
  const txs: Transaction[] = [];
  const now = new Date();
  
  // Generate some past transactions
  for (let i = 0; i < 15; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const type = Math.random() > 0.6 ? TransactionType.CREDIT : TransactionType.DEBIT;
    
    // Pick a random category matching the type
    const possibleCategories = INITIAL_CATEGORIES.filter(c => 
      type === TransactionType.CREDIT ? c.type === CategoryType.INCOME : c.type === CategoryType.EXPENSE
    );
    const randomCat = possibleCategories[Math.floor(Math.random() * possibleCategories.length)];

    txs.push({
      id: i + 1,
      date: date.toISOString().split('T')[0],
      description: type === TransactionType.CREDIT ? `Recebimento ${i}` : `Pagamento ${i}`,
      summary: type === TransactionType.CREDIT ? 'Cliente X' : 'Fornecedor Y',
      type: type,
      value: Math.floor(Math.random() * 500) + 50,
      categoryId: randomCat?.id || 1,
      bankId: Math.random() > 0.5 ? 1 : 2,
      reconciled: Math.random() > 0.3,
    });
  }
  return txs;
};

export const INITIAL_TRANSACTIONS: Transaction[] = generateTransactions();

export const INITIAL_FORECASTS: Forecast[] = [
  { id: 1, date: new Date().toISOString().split('T')[0], description: 'Aluguel Futuro', value: 1500, type: TransactionType.DEBIT, realized: false },
  { id: 2, date: new Date().toISOString().split('T')[0], description: 'Venda Prevista', value: 3000, type: TransactionType.CREDIT, realized: false },
];