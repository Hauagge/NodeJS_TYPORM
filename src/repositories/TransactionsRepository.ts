import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const balance = transactions.reduce(
      (acc: Balance, transaction: Transaction) => {
        if (transaction.type === 'income') {
          acc.income += Number(transaction.value);
        } else if (transaction.type === 'outcome') {
          acc.outcome += Number(transaction.value);
        }
        acc.total = Number(acc.income - acc.outcome);
        return acc;
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );

    return balance;
  }
}

export default TransactionsRepository;
