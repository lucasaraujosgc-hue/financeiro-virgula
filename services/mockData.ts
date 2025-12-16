import { Bank, Category, CategoryType, Transaction, TransactionType, Forecast } from '../types';

// Initial Mock Data
export const INITIAL_BANKS: Bank[] = [
  { id: 1, name: 'Nubank', accountNumber: '1234-5', nickname: 'Principal', logo: 'https://logo.clearbit.com/nubank.com.br', active: true, balance: 0 },
  { id: 2, name: 'Itaú', accountNumber: '9876-0', nickname: 'Reserva', logo: 'https://logo.clearbit.com/itau.com.br', active: true, balance: 0 },
  { id: 3, name: 'Bradesco', accountNumber: '1111-2', nickname: 'PJ', logo: 'https://logo.clearbit.com/bradesco.com.br', active: true, balance: 0 },
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