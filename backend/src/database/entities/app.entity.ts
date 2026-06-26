import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from "typeorm";
import { Workflow } from "./workflow.entity";
import { Conversation } from "./conversation.entity";

@Entity("apps")
export class App {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: "workflow" })
  mode: "chat" | "workflow";

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Workflow, (w) => w.app)
  workflows: Workflow[];

  @OneToMany(() => Conversation, (c) => c.app)
  conversations: Conversation[];
}
