import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, OneToMany } from "typeorm";
import { App } from "./app.entity";
import { Message } from "./message.entity";

@Entity("conversations")
export class Conversation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  appId: string;

  @ManyToOne(() => App, (app) => app.conversations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "appId" })
  app: App;

  @Column({ default: "anonymous" })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Message, (m) => m.conversation)
  messages: Message[];
}
