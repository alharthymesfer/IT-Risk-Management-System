import { Injectable } from '@nestjs/common';

export interface ApiStatus {
  name: string;
  status: 'ok';
}

@Injectable()
export class AppService {
  getStatus(): ApiStatus {
    return {
      name: 'IT Risk Management System API',
      status: 'ok',
    };
  }
}
