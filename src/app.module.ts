import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { HealthModule } from './health.module';
import { AppService } from './app.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule], // Import ConfigModule for configuration management and HealthModule for health checks
  controllers: [AppController], // Specify the controller that handles incoming requests
  providers: [AppService], // Specify the service that provides business logic
})
export class AppModule {} // Main application module
