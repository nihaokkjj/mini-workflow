import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Conversation } from "../../database/entities/conversation.entity";
import { Message } from "../../database/entities/message.entity";

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
  ) {}

  async create(appId: string): Promise<Conversation> {
    const conv = this.convRepo.create({ appId });
    return this.convRepo.save(conv);
  }

  async findOne(id: string): Promise<Conversation | null> {
    return this.convRepo.findOneBy({ id });
  }

  async findByApp(appId: string): Promise<Conversation[]> {
    return this.convRepo.find({ where: { appId }, order: { createdAt: "DESC" } });
  }

  async delete(id: string): Promise<void> {
    await this.convRepo.delete(id);
  }

  async findMessages(conversationId: string): Promise<Message[]> {
    return this.msgRepo.find({ where: { conversationId }, order: { createdAt: "ASC" } });
  }

  async saveMessage(
    conversationId: string,
    role: "user" | "assistant" | "system",
    content: string,
    nodeId?: string,
  ): Promise<Message> {
    const msg = this.msgRepo.create({ conversationId, role, content, nodeId });
    return this.msgRepo.save(msg);
  }
}
