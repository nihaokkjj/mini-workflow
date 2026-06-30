import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Conversation } from "../../database/entities/conversation.entity";
import { Message } from "../../database/entities/message.entity";
import { Run } from "../../database/entities/run.entity";
import { Workflow } from "../../database/entities/workflow.entity";
import { RunModule } from "../run/run.module";
import { ConversationService } from "./conversation.service";
import { ConversationController } from "./conversation.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, Run, Workflow]),
    RunModule,
  ],
  controllers: [ConversationController],
  providers: [ConversationService],
})
export class ConversationModule {}
