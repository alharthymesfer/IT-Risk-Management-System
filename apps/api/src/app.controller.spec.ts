import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('reports API status for health checks / demo smoke-tests', () => {
      expect(appController.getStatus()).toEqual({
        name: 'IT Risk Management System API',
        status: 'ok',
      });
    });
  });
});
