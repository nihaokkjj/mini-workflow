import { Injectable } from "@nestjs/common";

export interface SplitChunk {
  content: string;
  position: number;
  tokenCount: number;
}

@Injectable()
export class SplitProcessor {
  split(text: string, opts: { chunkSize: number; chunkOverlap: number }): SplitChunk[] {
    if (!text.trim()) return [];

    const paragraphs = text.split(/\n\s*\n/g).map((paragraph) => paragraph.trim()).filter(Boolean);
    const chunks: SplitChunk[] = [];
    let current = "";
    let position = 0;

    const pushChunk = (content: string) => {
      const normalized = content.trim();
      if (!normalized) return;
      chunks.push({
        content: normalized,
        position: position++,
        tokenCount: Math.ceil(normalized.length / 4),
      });
    };

    for (const paragraph of paragraphs) {
      const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
      if (candidate.length <= opts.chunkSize) {
        current = candidate;
        continue;
      }

      if (current) {
        pushChunk(current);
        const overlapSeed = current.slice(Math.max(0, current.length - opts.chunkOverlap)).trim();
        current = overlapSeed ? `${overlapSeed}\n\n${paragraph}` : paragraph;
      } else {
        let start = 0;
        while (start < paragraph.length) {
          const end = Math.min(start + opts.chunkSize, paragraph.length);
          pushChunk(paragraph.slice(start, end));
          if (end === paragraph.length) break;
          start = Math.max(end - opts.chunkOverlap, start + 1);
        }
        current = "";
      }
    }

    pushChunk(current);
    return chunks;
  }
}
