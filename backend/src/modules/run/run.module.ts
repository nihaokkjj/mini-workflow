import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Run } from "../../database/entities/run.entity";
import { Workflow } from "../../database/entities/workflow.entity";
import { Conversation } from "../../database/entities/conversation.entity";
import { Message } from "../../database/entities/message.entity";
import { RagModule } from "../rag/rag.module";
import { RunService } from "./run.service";
import { RunController } from "./run.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([Run, Workflow, Conversation, Message]),
    RagModule,
  ],
  controllers: [RunController],
  providers: [RunService],
  exports: [RunService],
})
export class RunModule {}
