import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Conversation } from "../../database/entities/conversation.entity";
import { Message } from "../../database/entities/message.entity";
import type { PaginatedResponse } from "../../types";

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>
  ) {}

  async create(appId: string): Promise<Conversation> {
    const conv = this.convRepo.create({ appId });
    return this.convRepo.save(conv);
  }

  async findOne(id: string): Promise<Conversation | null> {
    return this.convRepo.findOneBy({ id });
  }

  async findByApp(
    appId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResponse<Conversation>> {
    const [items, total] = await this.convRepo.findAndCount({
      where: { appId },
      order: { createdAt: "DESC" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async delete(id: string): Promise<void> {
    await this.convRepo.delete(id);
  }

  async findMessages(
    conversationId: string,
    page = 1,
    pageSize = 50
  ): Promise<PaginatedResponse<Message>> {
    const [items, total] = await this.msgRepo.findAndCount({
      where: { conversationId },
      order: { createdAt: "ASC" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async saveMessage(
    conversationId: string,
    role: "user" | "assistant" | "system",
    content: string,
    nodeId?: string
  ): Promise<Message> {
    const msg = this.msgRepo.create({ conversationId, role, content, nodeId });
    return this.msgRepo.save(msg);
  }
}
