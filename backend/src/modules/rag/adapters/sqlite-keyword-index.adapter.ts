import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { DocumentSegmentIndex } from "../../../database/entities/document-segment-index.entity";
import {
  IndexedSegment,
  SearchHit,
  SearchIndexAdapter,
  SearchQuery,
} from "./search-index.adapter";

@Injectable()
export class SqliteKeywordIndexAdapter implements SearchIndexAdapter {
  constructor(
    @InjectRepository(DocumentSegmentIndex)
    private readonly indexRepo: Repository<DocumentSegmentIndex>,
  ) {}

  async upsertSegments(segments: IndexedSegment[]): Promise<void> {
    if (segments.length === 0) return;

    await this.indexRepo.delete({ segmentId: In(segments.map((segment) => segment.segmentId)) });
    await this.indexRepo.save(
      segments.map((segment) =>
        this.indexRepo.create({
          segmentId: segment.segmentId,
          datasetId: segment.datasetId,
          documentId: segment.documentId,
          content: segment.content,
        }),
      ),
    );
  }

  async deleteByDocument(documentId: string): Promise<void> {
    await this.indexRepo.delete({ documentId });
  }

  async search(input: SearchQuery): Promise<SearchHit[]> {
    if (input.datasetIds.length === 0) return [];

    const rows = await this.indexRepo.find({
      where: { datasetId: In(input.datasetIds) },
    });

    const query = input.query.trim().toLowerCase();
    const terms = Array.from(new Set(query.split(/\s+/g).filter(Boolean)));

    const scored = rows
      .map((row) => ({
        segmentId: row.segmentId,
        score: this.scoreContent(row.content, query, terms),
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, input.topK);

    return scored;
  }

  // Phase 1 keeps ranking local and deterministic so the retrieval seam is in
  // place before adding embeddings or external indexes.
  private scoreContent(content: string, query: string, terms: string[]): number {
    const normalized = content.toLowerCase();
    if (!normalized) return 0;

    let score = 0;
    if (query && normalized.includes(query)) {
      score += 1;
    }

    for (const term of terms) {
      if (!term) continue;
      const occurrences = normalized.split(term).length - 1;
      if (occurrences > 0) {
        score += Math.min(occurrences, 4) / Math.max(terms.length, 1);
      }
    }

    return Number(score.toFixed(4));
  }
}
