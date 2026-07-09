import { config } from "dotenv";
import { resolve } from "path";
import { mkdirSync } from "node:fs";

// Load .env from the project root
config({ path: resolve(__dirname, "..", ".env") });

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import { AppRootModule } from "./app.module";
import { UPLOAD_DIR } from "./common/upload/upload.config";

// Ensure upload directory exists before any request can write to it
mkdirSync(UPLOAD_DIR, { recursive: true });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppRootModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  // Serve uploaded files so frontend can reference them
  app.useStaticAssets(UPLOAD_DIR, { prefix: "/uploads" });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // reject requests with unknown properties
      transform: true, // auto-transform payloads to DTO instances
    })
  );

  const corsOrigins = [
    "http://localhost:5173",
    "http://localhost:4173",
    process.env.FRONTEND_ORIGIN,
    ...(process.env.CORS_ORIGINS?.split(",") ?? []),
  ]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin));

  // Render/Vercel deployment needs explicit production origins while keeping local dev simple.
  app.enableCors({
    origin: (origin, cb) => {
      if (
        !origin ||
        origin.startsWith("http://localhost:") ||
        corsOrigins.includes(origin)
      ) {
        cb(null, true);
      } else {
        cb(new Error(`CORS blocked origin: ${origin}`));
      }
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;

  const config = new DocumentBuilder()
    .setTitle("Mini-Dify API")
    .setDescription("Mini-Dify 后端接口文档")
    .setVersion("0.1.0")
    .addBearerAuth() // 如果需要 token 认证
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document); // 访问路径: /api/docs

  await app.listen(port);
  app.get(Logger).log(`Mini-Dify backend running on http://localhost:${port}`);
}

bootstrap();
