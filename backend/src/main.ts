/**
 * VaxTrace Nigeria - Main Application Entry Point
 *
 * NestJS backend application for vaccine supply chain analytics.
 * This is the main entry point that bootstraps the application.
 *
 * FIX #10: Database connection pool management
 * FIX #12: Graceful shutdown
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './modules/app.module';
import { initSentry } from './sentry';

async function bootstrap() {
  // Initialize Sentry for error tracking (must be first)
  initSentry();
  
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;

  // FIX #15: API Versioning Strategy
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

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

  // FIX #12: Graceful Shutdown
  setupGracefulShutdown(app, logger);

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

/**
 * FIX #12: Graceful Shutdown
 * Handles SIGTERM and SIGINT signals for clean shutdown
 */
function setupGracefulShutdown(app: any, logger: Logger): void {
  const shutdownSignals = ['SIGTERM', 'SIGINT'];
  
  shutdownSignals.forEach((signal) => {
    process.on(signal as NodeJS.Signals, async () => {
      logger.log(`Received ${signal} signal. Starting graceful shutdown...`);
      
      try {
        // Stop accepting new connections
        const server = app.getHttpServer();
        if (server) {
          server.close(() => {
            logger.log('HTTP server closed');
          });
        }
        
        // Wait for in-flight requests to complete (max 30 seconds)
        await app.close();
        
        logger.log('Application closed successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Give time for logging before exit
    setTimeout(() => process.exit(1), 1000);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit, just log
  });
}

bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});
