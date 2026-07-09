import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LoggerModule } from "nestjs-pino";
import dataSource from "./database/data-source";
import { createLoggerOptions } from "./common/logger/logger.config";
import { AppModule } from "./modules/app/app.module";
import { WorkflowModule } from "./modules/workflow/workflow.module";
import { RunModule } from "./modules/run/run.module";
import { ConversationModule } from "./modules/conversation/conversation.module";
import { ModelModule } from "./modules/model/model.module";
import { RagModule } from "./modules/rag/rag.module";

@Module({
  imports: [
    LoggerModule.forRoot(createLoggerOptions()),
    TypeOrmModule.forRootAsync({
      useFactory: () => dataSource.options,
    }),
    AppModule, //应用管理
    WorkflowModule, //工作流CRUD
    RunModule, //工作流执行 + SSE流式输出
    ConversationModule, //对话管理
    ModelModule, //模型列表
    RagModule, //知识库检索（RAG）
  ],
})
export class AppRootModule {}
