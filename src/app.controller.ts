import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('chat')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async test() {
    return await this.appService.testAPI();
  }

  @Post()
  async handleChat(@Body('query') query: string): Promise<string> {
    return this.appService.handleChat(query);
  }
}
