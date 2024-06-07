import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import axios from 'axios';
import * as fs from 'fs';
import * as csv from 'csv-parser';

interface Product {
  displayTitle: string;
  embeddingText: string;
  url: string;
  imageUrl: string;
  productType: string;
  discount: string;
  price: string;
  variants: string;
  createDate: string;
}

@Injectable()
export class AppService {
  private openai: OpenAI;
  private products: Product[] = [];

  constructor(private configService: ConfigService) {
    console.log('Initializing AppService...');
    this.openai = new OpenAI({
      organization: this.configService.get<string>('OPENAI_ORG_ID'),
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    this.loadProducts();
  }
  //FUNCIONA
  private loadProducts() {
    const products: Product[] = [];
    fs.createReadStream('./products_list.csv')
      .pipe(csv())
      .on('data', (row) => {
        products.push(row);
      })
      .on('end', () => {
        this.products = products;
      });
  }
  //FUNCIONA
  private async searchProducts(query: string): Promise<Product[]> {
    console.log('Searching products with query:', query);
    const relatedProducts = this.products.filter(
      (product) =>
        product.displayTitle.toLowerCase().includes(query.toLowerCase()) ||
        product.embeddingText.toLowerCase().includes(query.toLowerCase()),
    );
    return relatedProducts.slice(0, 2);
  }
  //FUNCIONA
  private async convertCurrency(
    amount: number,
    from: string,
    to: string,
  ): Promise<number> {
    console.log(`Converting currency: ${amount} from ${from} to ${to}`);
    const apiKey = this.configService.get<string>('OPENEXCHANGERATES_API_KEY');
    const response = await axios.get(
      `https://openexchangerates.org/api/latest.json?app_id=${apiKey}`,
    );
    console.log('Concurrency response!! ', response);
    const rates = response.data.rates;
    const convertedAmount = amount * (rates[to] / rates[from]);
    console.log('Converted amount:', convertedAmount);
    return convertedAmount;
  }

  public async handleChat(query: string): Promise<string> {
    console.log('Handling chat query:', query);
    try {
      /* const functions = [
        {
          name: 'searchProducts',
          description: 'Search for products',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
            },
            required: ['query'],
          },
        },
        {
          name: 'convertCurrencies',
          description: 'Convert currency',
          parameters: {
            type: 'object',
            properties: {
              amount: { type: 'number' },
              from: { type: 'string' },
              to: { type: 'string' },
            },
            required: ['amount', 'from', 'to'],
          },
        },
      ];
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-0613',
        messages: [{ role: 'user', content: query }],
        functions: functions,
        function_call: 'auto',
      });
      console.log('OpenAI response:', response); */

      /* const functionName = response.choices[0]?.message?.function_call?.name; 
      const args = JSON.parse(
        response.choices[0]?.message?.function_call?.arguments || '{}',
      );
      console.log('Function arguments:', args);*/
      const functionName = 'convertCurrencies';
      const args = { amount: 50, from: 'USD', to: 'EUR' };
      if (functionName === 'searchProducts') {
        const products = await this.searchProducts(args.query);
        console.log('Products found:', products);
        return `Found products: ${JSON.stringify(products)}`;
      } else if (functionName === 'convertCurrencies') {
        const convertedAmount = await this.convertCurrency(
          args.amount,
          args.from,
          args.to,
        );
        console.log('Converted amount:', convertedAmount);
        return `Converted amount: ${convertedAmount} ${args.to}`;
      } /*else {
        console.log('Response content:', response.choices[0].message.content);
        return response.choices[0].message.content;
      } */
    } catch (error) {
      console.log(error);
      return error;
    }
  }
}
