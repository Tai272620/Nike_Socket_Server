import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const server = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
  });
  console.log(`localhost:${process.env.PORT}`)
  await server.listen(process.env.PORT);
}
bootstrap();
