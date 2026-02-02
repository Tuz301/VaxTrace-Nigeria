/**
 * VaxTrace Nigeria - Main Application Entry Point
 * 
 * NestJS backend application for vaccine supply chain analytics.
 * This is the main entry point that bootstraps the application.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './modules/app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // Note: Compression is handled by the platform (Express/NestJS)
  // No manual compression needed for development

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL,
    ].filter(Boolean) as string[],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Global prefix
  app.setGlobalPrefix('api', {
    exclude: ['/health', '/metrics'],
  });

  await app.listen(port);

  logger.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🇳🇬  VaxTrace Nigeria - Vaccine Supply Chain Analytics          ║
║                                                                   ║
║   🚀 Server running on: http://localhost:${port}                   ║
║   📊 API Health: http://localhost:${port}/health                  ║
║   📈 Metrics: http://localhost:${port}/metrics                    ║
║                                                                   ║
║   🏥 Powering Nigeria's Vaccine Distribution                      ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
}

bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});
