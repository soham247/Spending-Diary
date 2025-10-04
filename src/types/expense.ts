export interface Expense {
  id: string;
  amount: number;
  isSplitted: boolean;
  payers: {
    userId: string;
    amount: number;
  }[];
  tag: string;
  note: string;
  createdAt: Date;
}