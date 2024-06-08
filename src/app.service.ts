import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  ChatCompletionTool,
  ChatCompletionMessageParam,
} from 'openai/resources';
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
  private openai: OpenAI; // OpenAI client instance
  private products: Product[] = []; // Array to store product data
  private messages: ChatCompletionMessageParam[] = []; // Array to store chat messages
  private tools: ChatCompletionTool[] = []; // Array to store tool configurations

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      organization: this.configService.get<string>('OPENAI_ORG_ID'),
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    }); // Initialize OpenAI client with configuration
    this.loadProducts(); // Load products from CSV file
  }

  // Load products from a CSV file and store them in the products array
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

  // Search for products based on the query
  private async searchProducts(query: string): Promise<Product[]> {
    const relatedProducts = this.products.filter(
      (product) =>
        product.displayTitle.toLowerCase().includes(query.toLowerCase()) ||
        product.embeddingText.toLowerCase().includes(query.toLowerCase()),
    );
    return relatedProducts.slice(0, 2);
  }

  // Convert currency from one to another
  private async convertCurrency(
    amount: number,
    from: string,
    to: string,
  ): Promise<number> {
    const apiKey = this.configService.get<string>('OPENEXCHANGERATES_API_KEY');
    const response = await axios.get(
      `https://openexchangerates.org/api/latest.json?app_id=${apiKey}`,
    );
    const rates = response.data.rates;
    const convertedAmount = amount * (rates[to] / rates[from]);
    return convertedAmount;
  }

  // Handle the user's chat query
  public async handleChat(query: string): Promise<string> {
    // Initialize chat messages with system and user instructions
    this.messages = [
      {
        role: 'system',
        content: 'You are a helpful assitant',
      },
      {
        role: 'user',
        content: `${query}, when asked for products select one article in a single word to shop from the store you believe fits my requirements, when asked for converting currencies do not suggest a product`,
      },
    ];
    // Define the tools for product search and currency conversion
    this.tools = [
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
    ];
    try {
      // Request a completion from OpenAI with the tools available
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: this.messages,
        tools: this.tools,
        tool_choice: 'required',
      });

      // Extract the function name and arguments from the tool call
      const toolCall = response.choices[0]?.message?.tool_calls?.[0];
      const functionName = toolCall?.function.name;
      const args = JSON.parse(toolCall?.function.arguments || '{}');

      // Log the executed tool and its arguments
      this.messages.push({
        role: response.choices[0].message.role,
        content: `Tool excecuted was: ${functionName}, found arguments: ${toolCall?.function.arguments}`,
      });
      if (functionName === 'searchProducts') {
        const products = await this.searchProducts(args.query);
        this.messages.push({
          role: 'system',
          content: `You excecuted tool ${functionName} and found product information: ${JSON.stringify(products)}. You must choose between generating an apropiate final answer (without mentioning anything about currencies) and to excecute the convertCurrencies tool. Select between this two options acording to the user needs expressed in query: ${query}. If you are not asked to convert the price to another currency DON'T DO IT`,
        });
        // Request a completion from OpenAI with the updated messages
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: this.messages,
          tools: this.tools,
          tool_choice: 'auto',
        });

        const functionNameConvert =
          response.choices[0]?.message?.tool_calls?.[0].function.name;
        const argsConvert = JSON.parse(
          response.choices[0]?.message?.tool_calls?.[0].function.arguments ||
            '{}',
        );
        //Makes product price conversion if considered
        if (functionNameConvert === 'convertCurrencies') {
          const convertedAmount = await this.convertCurrency(
            argsConvert.amount,
            argsConvert.from,
            argsConvert.to,
          );
          this.messages.push(
            {
              role: response.choices[0].message.role,
              content: `Tool excecuted was: ${functionNameConvert}, found arguments: ${JSON.stringify(argsConvert)} `,
            },
            {
              role: 'system',
              content: `Generate an apropiate answer for user query: ${query}, with the following product information: ${JSON.stringify(products)} and with the following currency information: Product price ${argsConvert.amount}, converted from ${argsConvert.from} to ${argsConvert.to}, converted price ${convertedAmount}`,
            },
          );
          // Request a final completion with all necessary information
          const finalResponse = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: this.messages,
          });
          return finalResponse.choices[0].message.content;
        } else {
          //Returns generated message when price conversion is not required
          return response.choices[0].message.content;
        }
      } else if (functionName === 'convertCurrencies') {
        //Makes currency conversion when asked only for that
        const convertedAmount = await this.convertCurrency(
          args.amount,
          args.from,
          args.to,
        );
        this.messages.push({
          role: 'user',
          content: `Generate an apropiate answer for user query: ${query}, with the following currency information: Initial amount ${args.amount}, converted from ${args.from} to ${args.to}, converted amount ${convertedAmount}`,
        });
        // Request a final completion for currency conversion
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: this.messages,
        });
        return response.choices[0].message.content;
      } else {
        console.log('Response content:', response.choices[0].message.content);
        return response.choices[0].message.content;
      }
    } catch (error) {
      return error;
    }
  }

  // Test the OpenAI API
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
