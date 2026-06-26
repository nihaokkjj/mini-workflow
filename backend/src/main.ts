import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppRootModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppRootModule);

  // CORS for frontend dev server
  app.enableCors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Mini-Dify backend running on http://localhost:${port}`);
}

bootstrap();
