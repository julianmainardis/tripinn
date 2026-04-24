import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth(): Record<string, string> {
    return {
      status: 'healthy',
      app: 'TripInn API',
      version: '3.0.0',
    };
  }
}
