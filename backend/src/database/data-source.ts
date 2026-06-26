import { DataSource } from "typeorm";
import { App } from "./entities/app.entity";
import { Workflow } from "./entities/workflow.entity";
import { Conversation } from "./entities/conversation.entity";
import { Message } from "./entities/message.entity";
import { Run } from "./entities/run.entity";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

const dataSource = new DataSource({
  type: "better-sqlite3",
  database: path.join(process.cwd(), isDev ? "dev.db" : "prod.db"),
  synchronize: true, // Auto-create tables in dev
  logging: false,
  entities: [App, Workflow, Conversation, Message, Run],
});

export default dataSource;
