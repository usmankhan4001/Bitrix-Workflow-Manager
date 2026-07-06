import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    'https://manageworkflow-bitrix24.premierchoiceint.online',
    'https://pcicrm.bitrix24.com',
    'http://localhost:5173',
    'http://localhost:8080',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Bitrix24 webhooks, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith('.bitrix24.com')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
