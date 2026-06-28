import { config } from "dotenv";
import { resolve } from "path";

// Load .env from the project root
config({ path: resolve(__dirname, "..", ".env") });

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppRootModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppRootModule);

  // CORS for frontend dev server — allow any localhost port in dev
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || origin.startsWith("http://localhost:")) {
        cb(null, true);
      } else {
        cb(new Error(`CORS blocked origin: ${origin}`));
      }
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Mini-Dify backend running on http://localhost:${port}`);
}

bootstrap();
