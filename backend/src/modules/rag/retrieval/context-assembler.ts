import { Injectable } from "@nestjs/common";

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
export class ContextAssembler {
  assemble(sources: Source[]): string {
    return sources
      .map(
        (source, index) =>
          `[${index + 1}] ${source.documentName} / 段落 ${source.position + 1}\n${source.content}`,
      )
      .join("\n\n");
  }
}
