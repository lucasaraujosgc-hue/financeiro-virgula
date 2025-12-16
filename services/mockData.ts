import { Bank, Category, CategoryType, Transaction, TransactionType, Forecast } from '../types';

// Initial Mock Data with Local Images
// Todos iniciam como false para o usuário ativar manualmente
export const INITIAL_BANKS: Bank[] = [
  { id: 1, name: 'Nubank', accountNumber: '1234-5', nickname: 'Principal', logo: '/nubank.jpg', active: false, balance: 0 },
  { id: 2, name: 'Itaú', accountNumber: '9876-0', nickname: 'Reserva', logo: '/itau.png', active: false, balance: 0 },
  { id: 3, name: 'Bradesco', accountNumber: '1111-2', nickname: 'PJ', logo: '/bradesco.jpg', active: false, balance: 0 },
  { id: 4, name: 'Caixa Econômica', accountNumber: '0001-9', nickname: 'Caixa', logo: '/caixa.png', active: false, balance: 0 },
  { id: 5, name: 'Banco do Brasil', accountNumber: '4455-6', nickname: 'BB', logo: '/bb.png', active: false, balance: 0 },
  { id: 6, name: 'Santander', accountNumber: '7788-9', nickname: 'Santander', logo: '/santander.png', active: false, balance: 0 },
  { id: 7, name: 'Inter', accountNumber: '3322-1', nickname: 'Inter', logo: '/inter.png', active: false, balance: 0 },
  { id: 8, name: 'BTG Pactual', accountNumber: '5566-7', nickname: 'Investimentos', logo: '/btg_pactual.png', active: false, balance: 0 },
  { id: 9, name: 'C6 Bank', accountNumber: '9988-7', nickname: 'C6', logo: '/c6_bank.png', active: false, balance: 0 },
  { id: 10, name: 'Sicredi', accountNumber: '1212-3', nickname: 'Cooperativa', logo: '/sicredi.png', active: false, balance: 0 },
  { id: 11, name: 'Sicoob', accountNumber: '3434-5', nickname: 'Sicoob', logo: '/sicoob.png', active: false, balance: 0 },
  { id: 12, name: 'Mercado Pago', accountNumber: '0000-0', nickname: 'Vendas', logo: '/mercado_pago.png', active: false, balance: 0 },
  { id: 13, name: 'PagBank', accountNumber: '0000-0', nickname: 'Maquininha', logo: '/pagbank.png', active: false, balance: 0 },
  { id: 14, name: 'Stone', accountNumber: '0000-0', nickname: 'Stone', logo: '/stone.png', active: false, balance: 0 },
  { id: 15, name: 'Banco Safra', accountNumber: '0000-0', nickname: 'Safra', logo: '/safra.png', active: false, balance: 0 },
  { id: 16, name: 'Banco Pan', accountNumber: '0000-0', nickname: 'Pan', logo: '/banco_pan.png', active: false, balance: 0 },
  { id: 17, name: 'Banrisul', accountNumber: '0000-0', nickname: 'Sul', logo: '/banrisul.png', active: false, balance: 0 },
  { id: 18, name: 'Neon', accountNumber: '0000-0', nickname: 'Neon', logo: '/neon.png', active: false, balance: 0 },
  { id: 19, name: 'Caixa Registradora', accountNumber: '-', nickname: 'Dinheiro Físico', logo: '/caixaf.png', active: false, balance: 0 },
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

// Sem transações iniciais para forçar o fluxo limpo
export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_FORECASTS: Forecast[] = [
  { id: 1, date: new Date().toISOString().split('T')[0], description: 'Aluguel Futuro', value: 1500, type: TransactionType.DEBIT, realized: false },
  { id: 2, date: new Date().toISOString().split('T')[0], description: 'Venda Prevista', value: 3000, type: TransactionType.CREDIT, realized: false },
];