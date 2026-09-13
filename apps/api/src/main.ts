import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sets baseline security headers (X-Content-Type-Options, X-Frame-Options,
  // hides X-Powered-By, etc.) — this is a JSON API with no server-rendered HTML,
  // so helmet's default CSP is left off rather than configuring rules for markup
  // this app never serves.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Frontend and API are served from the same origin in production, so no CORS
  // configuration is needed for browser traffic — see docs/security.md.
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
