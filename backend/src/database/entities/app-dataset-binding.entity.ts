import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from "typeorm";
import { App } from "./app.entity";
import { Dataset } from "./dataset.entity";

@Entity("app_dataset_bindings")
@Unique(["appId", "datasetId"])
export class AppDatasetBinding {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  appId: string;

  @Column()
  datasetId: string;

  @ManyToOne(() => App, { onDelete: "CASCADE" })
  @JoinColumn({ name: "appId" })
  app: App;

  @ManyToOne(() => Dataset, (dataset) => dataset.appBindings, { onDelete: "CASCADE" })
  @JoinColumn({ name: "datasetId" })
  dataset: Dataset;

  @CreateDateColumn()
  createdAt: Date;
}
