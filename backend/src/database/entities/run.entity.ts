import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Workflow } from "./workflow.entity";

@Entity("runs")
export class Run {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  workflowId: string;

  @ManyToOne(() => Workflow, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workflowId" })
  workflow: Workflow;

  @Column({ default: "pending" })
  status: "pending" | "running" | "completed" | "failed" | "canceled" | "timeout";

  @Column("simple-json", { nullable: true })
  inputs: Record<string, unknown>;

  @Column("simple-json", { nullable: true })
  outputs: Record<string, unknown>;

  @Column({ nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  finishedAt: Date;
}
