import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { App } from "./app.entity";
import type { Graph } from "../../types";

@Entity("workflows")
export class Workflow {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  appId: string;

  @ManyToOne(() => App, (app) => app.workflows, { onDelete: "CASCADE" })
  @JoinColumn({ name: "appId" })
  app: App;

  @Column("simple-json")
  graph: Graph;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
