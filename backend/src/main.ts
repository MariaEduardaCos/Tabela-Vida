import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters/GlobalExceptionFilter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  console.log(`[NestJS] API ativa em http://localhost:${port}/api`);
}

bootstrap().catch((error) => {
  console.error('[NestJS] Falha crítica ao inicializar:', error);
  process.exit(1);
});
