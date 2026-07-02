import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { DocumentSegment } from "./document-segment.entity";

@Entity("document_segment_indices")
@Index(["datasetId"])
@Index(["documentId"])
@Index(["segmentId"], { unique: true })
export class DocumentSegmentIndex {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  segmentId: string;

  @Column()
  datasetId: string;

  @Column()
  documentId: string;

  @ManyToOne(() => DocumentSegment, (segment) => segment.indexEntries, { onDelete: "CASCADE" })
  @JoinColumn({ name: "segmentId" })
  segment: DocumentSegment;

  @Column("text")
  content: string;
}
