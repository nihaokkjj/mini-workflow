import { Injectable } from "@nestjs/common";

export interface DocumentPayload {
  content: string;
}

export interface DatasetDocumentInput {
  sourceType: "text" | "markdown" | "file";
  content: string;
}

@Injectable()
export class ExtractProcessor {
  async extract(input: DatasetDocumentInput): Promise<DocumentPayload[]> {
    if (input.sourceType === "file") {
      throw new Error("File extraction is not supported yet in Phase 1");
    }

    return [{ content: input.content }];
  }
}
