export enum TransactionType {
  CREDIT = 'credito',
  DEBIT = 'debito'
}

export enum CategoryType {
  INCOME = 'receita',
  EXPENSE = 'despesa'
}

export interface Bank {
  id: number;
  name: string;
  accountNumber: string;
  nickname?: string;
  logo: string;
  active: boolean;
  balance: number;
}

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
}

export interface Transaction {
  id: number;
  date: string; // ISO Date YYYY-MM-DD
  description: string;
  summary?: string;
  type: TransactionType;
  value: number;
  categoryId?: number;
  bankId: number;
  reconciled: boolean;
}

export interface Forecast {
  id: number;
  date: string;
  description: string;
  value: number;
  type: TransactionType;
  realized: boolean;
}

export interface DashboardStats {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  reconciledCount: number;
  pendingCount: number;
}