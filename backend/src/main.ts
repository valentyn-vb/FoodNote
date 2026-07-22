import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { buildOpenApiDocument } from './docs/openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  // Swagger UI at /api/docs, raw spec at /api/openapi.json — generated from
  // the shared Zod schemas (see docs/openapi.ts).
  SwaggerModule.setup('api/docs', app, buildOpenApiDocument(), {
    jsonDocumentUrl: 'api/openapi.json',
  });
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
