import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Dataset } from "./dataset.entity";
import { DocumentSegment } from "./document-segment.entity";

@Entity("dataset_documents")
export class DatasetDocument {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  datasetId: string;

  @ManyToOne(() => Dataset, (dataset) => dataset.documents, { onDelete: "CASCADE" })
  @JoinColumn({ name: "datasetId" })
  dataset: Dataset;

  @Column()
  name: string;

  @Column()
  sourceType: "text" | "markdown" | "file";

  @Column({ nullable: true })
  sourceUri: string | null;

  @Column("text")
  content: string;

  @Column({ default: "pending" })
  status: "pending" | "indexing" | "completed" | "failed";

  @Column({ nullable: true })
  errorMessage: string | null;

  @Column()
  docHash: string;

  @Column("simple-json", { nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => DocumentSegment, (segment) => segment.document)
  segments: DocumentSegment[];
}
