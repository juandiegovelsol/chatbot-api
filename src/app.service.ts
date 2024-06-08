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
      project: this.configService.get<string>('OPENAI_PRY_ID'),
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
      /* const tools = [
        {
          type: 'function',
          function: {
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
        },
        {
          type: 'function',
          function: {
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
        },
      ]; */

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-0613',
        messages: [{ role: 'user', content: query }],
        tools: [
          {
            type: 'function',
            function: {
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
          },
          {
            type: 'function',
            function: {
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
          },
        ],
        tool_choice: 'auto',
      });
      console.log('GPT response', response);
      const toolCall = response.choices[0]?.message?.tool_calls?.[0];
      const functionName = toolCall?.function.name;
      const args = JSON.parse(toolCall.function.arguments || '{}');
      console.log('Function arguments:', args);
      /* const functionName = 'convertCurrencies';
      const args = { amount: 50, from: 'USD', to: 'COP' }; */
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
      } else {
        console.log('Response content:', response.choices[0].message.content);
        return response.choices[0].message.content;
      }
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  public async testAPI() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OpenAI API key is not set');
    }

    const data = {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say this is a test!' }],
      temperature: 0.7,
    };

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error(
        'Error making OpenAI API request:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }
}
