import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { Injectable } from "@nestjs/common";
import pdfParse from "pdf-parse";
import * as mammoth from "mammoth";
import * as xlsx from "xlsx";

export interface DocumentPayload {
  content: string;
}

export interface DatasetDocumentInput {
  sourceType: "text" | "markdown" | "file";
  content: string;
  sourceUri?: string | null;
}

@Injectable()
export class ExtractProcessor {
  async extract(input: DatasetDocumentInput): Promise<DocumentPayload[]> {
    if (input.sourceType === "file") {
      if (!input.sourceUri) {
        throw new Error("sourceUri is required for file sourceType");
      }
      const ext = extname(input.sourceUri).toLowerCase();
      const content = await this.extractByExtension(input.sourceUri, ext);
      return [{ content }];
    }

    // text and markdown are passed through as-is
    return [{ content: input.content }];
  }

  private async extractByExtension(
    filePath: string,
    ext: string
  ): Promise<string> {
    try {
      switch (ext) {
        case ".txt":
        case ".md":
        case ".csv":
          return readFileSync(filePath, "utf-8");

        case ".pdf": {
          const buffer = readFileSync(filePath);
          const result = await pdfParse(buffer);
          return result.text;
        }

        case ".docx": {
          const buffer = readFileSync(filePath);
          const result = await mammoth.extractRawText({ buffer });
          return result.value;
        }

        case ".xlsx": {
          const workbook = xlsx.readFile(filePath);
          return workbook.SheetNames.map((name) =>
            xlsx.utils.sheet_to_csv(workbook.Sheets[name])
          ).join("\n\n");
        }

        default:
          throw new Error(`Unsupported file type: ${ext}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Unsupported"))
        throw err;
      throw new Error(
        `Failed to extract file (${ext}): ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }
}
