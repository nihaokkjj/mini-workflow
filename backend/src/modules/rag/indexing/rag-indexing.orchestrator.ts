import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Dataset } from "../../../database/entities/dataset.entity";
import { DatasetDocument } from "../../../database/entities/dataset-document.entity";
import { DocumentSegment } from "../../../database/entities/document-segment.entity";
import { SEARCH_INDEX_ADAPTER, SearchIndexAdapter } from "../adapters/search-index.adapter";
import { CleanProcessor } from "./clean/clean-processor";
import { ExtractProcessor } from "./extract/extract-processor";
import { SplitProcessor } from "./split/split-processor";

@Injectable()
export class RagIndexingOrchestrator {
  constructor(
    @InjectRepository(DocumentSegment)
    private readonly segmentRepo: Repository<DocumentSegment>,
    private readonly extractProcessor: ExtractProcessor,
    private readonly cleanProcessor: CleanProcessor,
    private readonly splitProcessor: SplitProcessor,
    @Inject(SEARCH_INDEX_ADAPTER)
    private readonly searchIndex: SearchIndexAdapter,
  ) {}

  async indexDocument(dataset: Dataset, document: DatasetDocument): Promise<void> {
    const payloads = await this.extractProcessor.extract({
      sourceType: document.sourceType,
      content: document.content,
    });

    const normalizedContent = payloads
      .map((payload) => this.cleanProcessor.clean(payload.content))
      .filter(Boolean)
      .join("\n\n");

    const chunks = this.splitProcessor.split(normalizedContent, {
      chunkSize: dataset.chunkSize,
      chunkOverlap: dataset.chunkOverlap,
    });

    await this.segmentRepo.delete({ documentId: document.id });
    await this.searchIndex.deleteByDocument(document.id);

    if (chunks.length === 0) {
      return;
    }

    const segments = await this.segmentRepo.save(
      chunks.map((chunk) =>
        this.segmentRepo.create({
          datasetId: dataset.id,
          documentId: document.id,
          position: chunk.position,
          content: chunk.content,
          tokenCount: chunk.tokenCount,
          docHash: this.hashChunk(chunk.content),
          metadata: document.metadata ?? null,
          searchText: chunk.content.toLowerCase(),
        }),
      ),
    );

    await this.searchIndex.upsertSegments(
      segments.map((segment) => ({
        segmentId: segment.id,
        datasetId: segment.datasetId,
        documentId: segment.documentId,
        content: segment.searchText,
      })),
    );
  }

  private hashChunk(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }
}
