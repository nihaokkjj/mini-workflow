import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Conversation } from "../../database/entities/conversation.entity";
import { Message } from "../../database/entities/message.entity";
import { RunModule } from "../run/run.module";
import { ConversationService } from "./conversation.service";
import { ConversationController } from "./conversation.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), RunModule],
  controllers: [ConversationController],
  providers: [ConversationService],
})
export class ConversationModule {}
