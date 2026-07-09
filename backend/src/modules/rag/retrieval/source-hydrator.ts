import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Dataset } from "../../../database/entities/dataset.entity";
import { DatasetDocument } from "../../../database/entities/dataset-document.entity";
import { DocumentSegment } from "../../../database/entities/document-segment.entity";
import { SearchHit } from "../adapters/search-index.adapter";

export interface Source {
  title: string;
  content: string;
  datasetId: string;
  datasetName: string;
  documentId: string;
  documentName: string;
  segmentId: string;
  score: number;
  position: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SourceHydrator {
  constructor(
    @InjectRepository(DocumentSegment)
    private readonly segmentRepo: Repository<DocumentSegment>,
    @InjectRepository(DatasetDocument)
    private readonly documentRepo: Repository<DatasetDocument>,
    @InjectRepository(Dataset)
    private readonly datasetRepo: Repository<Dataset>
  ) {}

  async hydrate(hits: SearchHit[]): Promise<Source[]> {
    if (hits.length === 0) return [];

    const segments = await this.segmentRepo.find({
      where: { id: In(hits.map((hit) => hit.segmentId)) },
    });
    const segmentById = new Map(
      segments.map((segment) => [segment.id, segment])
    );

    const documents = await this.documentRepo.find({
      where: { id: In(segments.map((segment) => segment.documentId)) },
    });
    const documentById = new Map(
      documents.map((document) => [document.id, document])
    );

    const datasets = await this.datasetRepo.find({
      where: { id: In(segments.map((segment) => segment.datasetId)) },
    });
    const datasetById = new Map(
      datasets.map((dataset) => [dataset.id, dataset])
    );

    return hits.flatMap((hit) => {
      const segment = segmentById.get(hit.segmentId);
      if (!segment) return [];

      const document = documentById.get(segment.documentId);
      const dataset = datasetById.get(segment.datasetId);
      if (!document || !dataset) return [];

      return [
        {
          title: `${document.name} / 段落 ${segment.position + 1}`,
          content: segment.content,
          datasetId: dataset.id,
          datasetName: dataset.name,
          documentId: document.id,
          documentName: document.name,
          segmentId: segment.id,
          score: hit.score,
          position: segment.position,
          metadata: segment.metadata ?? undefined,
        },
      ];
    });
  }
}
