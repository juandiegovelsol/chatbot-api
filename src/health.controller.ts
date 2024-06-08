import { Controller, Get } from '@nestjs/common';
//Endpoint for checking server health
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return 'API is healthy';
  }
}
