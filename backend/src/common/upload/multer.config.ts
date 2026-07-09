import { diskStorage } from "multer";
import { extname } from "node:path";
import { v4 as uuidv4 } from "uuid";
import {
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
} from "./upload.config";

export function createMulterOptions() {
  return {
    storage: diskStorage({
      destination: UPLOAD_DIR,
      filename(_req, file, cb) {
        const ext = extname(file.originalname).toLowerCase();
        cb(null, `${uuidv4()}${ext}`);
      },
    }),
    fileFilter(
      _req: any,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void
    ) {
      const ext = extname(file.originalname).toLowerCase();

      if (!ALLOWED_EXTENSIONS.has(ext)) {
        cb(
          new Error(
            `Unsupported file type: ${ext}. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`
          ),
          false
        );
        return;
      }

      const expectedMime = ALLOWED_MIME_TYPES.get(ext);
      if (expectedMime && file.mimetype !== expectedMime) {
        // Some OS/browsers report different MIME types (e.g. text/plain for .csv).
        // Only reject if the mimetype is clearly wrong — allow common variations.
        const isLikelyText = ext === ".csv" || ext === ".md" || ext === ".txt";
        if (!isLikelyText || !file.mimetype.startsWith("text/")) {
          cb(
            new Error(
              `MIME type mismatch for ${ext}: expected ${expectedMime}, got ${file.mimetype}`
            ),
            false
          );
          return;
        }
      }

      cb(null, true);
    },
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
  };
}
