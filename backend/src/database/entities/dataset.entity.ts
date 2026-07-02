import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { AppDatasetBinding } from "./app-dataset-binding.entity";
import { DatasetDocument } from "./dataset-document.entity";

@Entity("datasets")
export class Dataset {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string | null;

  @Column({ default: "active" })
  status: "active" | "indexing" | "error" | "archived";

  @Column({ default: "keyword" })
  retrievalMode: "keyword" | "semantic" | "hybrid";

  @Column({ default: "economy" })
  indexingMode: "economy" | "high_quality";

  @Column({ type: "integer", default: 500 })
  chunkSize: number;

  @Column({ type: "integer", default: 80 })
  chunkOverlap: number;

  @Column({ type: "integer", default: 4 })
  topK: number;

  @Column({ type: "float", default: 0.15 })
  scoreThreshold: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AppDatasetBinding, (binding) => binding.dataset)
  appBindings: AppDatasetBinding[];

  @OneToMany(() => DatasetDocument, (document) => document.dataset)
  documents: DatasetDocument[];
}
