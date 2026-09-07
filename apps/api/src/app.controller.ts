import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import type { ApiStatus } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getStatus(): ApiStatus {
    return this.appService.getStatus();
  }
}
