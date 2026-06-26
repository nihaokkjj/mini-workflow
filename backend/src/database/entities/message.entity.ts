import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Conversation } from "./conversation.entity";

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  conversationId: string;

  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversationId" })
  conversation: Conversation;

  @Column()
  role: "user" | "assistant" | "system";

  @Column("text")
  content: string;

  @Column({ nullable: true })
  nodeId: string;

  @CreateDateColumn()
  createdAt: Date;
}
