import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('chat') // Define the route prefix for this controller
export class AppController {
  constructor(private readonly appService: AppService) {} // Inject the AppService to handle business logic

  @Get() // Handle GET requests to the /chat endpoint
  async test() {
    return await this.appService.testAPI(); // Call the testAPI method from the AppService
  }

  @Post() // Handle POST requests to the /chat endpoint
  async handleChat(@Body('query') query: string): Promise<string> {
    return this.appService.handleChat(query); // Call the handleChat method from the AppService with the user's query
  }
}
