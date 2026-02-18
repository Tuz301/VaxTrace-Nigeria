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
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './modules/app.module';
import { initSentry } from './sentry';

async function bootstrap() {
  // Initialize Sentry for error tracking (must be first)
  initSentry();
  
  const logger = new Logger('Bootstrap');
  logger.log('Starting VaxTrace Nigeria backend...');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;
  logger.log(`Configuration loaded. Port: ${port}, NODE_ENV: ${configService.get('NODE_ENV')}`);

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
  app.setGlobalPrefix('api');

  // FIX #15: API Versioning Strategy
  // Note: Versioning is applied AFTER global prefix, so routes become /api/v1/...
  // Health endpoints are excluded from versioning in the controller itself
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Swagger API Documentation
  setupSwagger(app, configService);

  // FIX #12: Graceful Shutdown
  setupGracefulShutdown(app, logger);

  logger.log(`About to listen on port ${port}...`);
  await app.listen(port);
  logger.log(`Successfully listening on port ${port}`);

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

/**
 * Setup Swagger API Documentation
 * Provides interactive API documentation at /api/docs
 */
function setupSwagger(app: any, configService: ConfigService): void {
  const isProduction = configService.get('NODE_ENV') === 'production';
  
  // Skip Swagger in production for security (can be enabled if needed)
  if (isProduction && !configService.get('ENABLE_SWAGGER_IN_PRODUCTION')) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('VaxTrace Nigeria API')
    .setDescription(`
      ## VaxTrace Nigeria - Vaccine Supply Chain Analytics API
      
      ### Overview
      VaxTrace is a high-level analytics dashboard for Nigeria's vaccine supply chain,
      built on top of OpenLMIS infrastructure.
      
      ### Authentication
      Most endpoints require JWT authentication. Include the token in the Authorization header:
      \`Bearer YOUR_JWT_TOKEN\`
      
      ### Rate Limiting
      API requests are rate-limited to 100 requests per minute per IP.
      
      ### Versioning
      The API is versioned using URI versioning (e.g., \`/api/v1/...\`).
      
      ### Support
      For API support, contact: api@vaxtrace.ng
    `)
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name must match the one used in @ApiBearerAuth() decorator
    )
    .addTag('health', 'Health check and monitoring endpoints')
    .addTag('auth', 'Authentication and user management')
    .addTag('openlmis', 'OpenLMIS integration endpoints')
    .addTag('stock', 'Vaccine stock data and analytics')
    .addTag('facilities', 'Healthcare facility management')
    .addTag('alerts', 'Stockout alerts and notifications')
    .addTag('delivery', 'Vaccine delivery tracking')
    .addTag('lmd', 'Last Mile Delivery optimization')
    .addTag('predictions', 'ML-based stock predictions')
    .addTag('webhook', 'Webhook management for real-time sync')
    .setContact('VaxTrace Team', 'https://vaxtrace.ng', 'api@vaxtrace.ng')
    .setLicense('MIT', 'https://github.com/vaxtrace/vaxtrace-nigeria/blob/main/LICENSE')
    .addServer('http://localhost:8000', 'Development')
    .addServer('https://api.vaxtrace.ng', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'VaxTrace API Docs',
  });

  const logger = new Logger('Swagger');
  logger.log(`Swagger documentation available at: http://localhost:${configService.get('PORT')}/api/docs`);
}

bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});
 
