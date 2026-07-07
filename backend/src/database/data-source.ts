import { DataSource } from "typeorm";
import { App } from "./entities/app.entity";
import { Workflow } from "./entities/workflow.entity";
import { Conversation } from "./entities/conversation.entity";
import { Message } from "./entities/message.entity";
import { Run } from "./entities/run.entity";
import { Dataset } from "./entities/dataset.entity";
import { AppDatasetBinding } from "./entities/app-dataset-binding.entity";
import { DatasetDocument } from "./entities/dataset-document.entity";
import { DocumentSegment } from "./entities/document-segment.entity";
import { DocumentSegmentIndex } from "./entities/document-segment-index.entity";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

const dataSource = new DataSource({
  type: "better-sqlite3",
  database: path.join(process.cwd(), isDev ? "dev.db" : "prod.db"),
  synchronize: isDev, // Only auto-sync in dev; use migrations in production
  logging: false,
  entities: [
    App,
    Workflow,
    Conversation,
    Message,
    Run,
    Dataset,
    AppDatasetBinding,
    DatasetDocument,
    DocumentSegment,
    DocumentSegmentIndex,
  ],
});

export default dataSource;
