import { getRepository, getCustomRepository, In } from 'typeorm';

import fs from 'fs';
import parseCSV from 'csv-parse';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface TransactionImported {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const lines = parseCSV({
      from_line: 2,
    });

    const readStream = fs.createReadStream(filePath);

    const parsedCSV = readStream.pipe(lines);

    const transactions: TransactionImported[] = [];
    const categories: string[] = [];
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    parsedCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) {
        return;
      }
      categories.push(category);

      transactions.push({ title, type, value, category });
    });
    await new Promise(resolve => parsedCSV.on('end', resolve));

    // Verifica se as categorias importadas ja estão cadastradas no BD
    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    // Separa as categorias apenas por titulo
    const categoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    console.log(categoriesTitles);

    // Filtra as categorias importadas que ainda nao existem no BD e exclui as categorias são repetidas
    const addCategories = categories
      .filter(category => !categoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    console.log(addCategories);

    const includeCategory = categoriesRepository.create(
      addCategories.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(includeCategory);

    const finalCategories = [...includeCategory, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );
    console.log(createdTransactions);
    await transactionsRepository.save(createdTransactions);
    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
