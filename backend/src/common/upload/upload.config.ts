import { resolve } from "node:path";

export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? "./uploads");

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".pdf",
  ".docx",
  ".csv",
  ".xlsx",
]);

export const ALLOWED_MIME_TYPES: ReadonlyMap<string, string> = new Map([
  [".txt", "text/plain"],
  [".md", "text/markdown"],
  [".pdf", "application/pdf"],
  [
    ".docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  [".csv", "text/csv"],
  [
    ".xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
]);
