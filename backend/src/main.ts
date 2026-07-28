import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { configureTrustProxy } from './common/trust-proxy';
import { buildOpenApiDocument } from './docs/openapi';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Rate limiting tracks clients by req.ip, which is only right once Express
  // knows the proxy chain — see common/trust-proxy.ts.
  configureTrustProxy(app);

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
