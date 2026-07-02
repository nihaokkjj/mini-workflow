import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { Dataset } from "./dataset.entity";
import { DatasetDocument } from "./dataset-document.entity";
import { DocumentSegmentIndex } from "./document-segment-index.entity";

@Entity("document_segments")
@Index(["datasetId", "documentId", "position"], { unique: true })
export class DocumentSegment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  datasetId: string;

  @Column()
  documentId: string;

  @ManyToOne(() => Dataset, { onDelete: "CASCADE" })
  @JoinColumn({ name: "datasetId" })
  dataset: Dataset;

  @ManyToOne(() => DatasetDocument, (document) => document.segments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "documentId" })
  document: DatasetDocument;

  @Column({ type: "integer" })
  position: number;

  @Column("text")
  content: string;

  @Column({ type: "integer", default: 0 })
  tokenCount: number;

  @Column()
  docHash: string;

  @Column("simple-json", { nullable: true })
  metadata: Record<string, unknown> | null;

  @Column("text")
  searchText: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => DocumentSegmentIndex, (index) => index.segment)
  indexEntries: DocumentSegmentIndex[];
}
