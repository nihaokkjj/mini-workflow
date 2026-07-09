import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { App } from "../../database/entities/app.entity";
import { AppDatasetBinding } from "../../database/entities/app-dataset-binding.entity";
import { Dataset } from "../../database/entities/dataset.entity";
import { DatasetDocument } from "../../database/entities/dataset-document.entity";
import { DocumentSegment } from "../../database/entities/document-segment.entity";
import { DocumentSegmentIndex } from "../../database/entities/document-segment-index.entity";
import { RagDatasetController } from "./controllers/rag-dataset.controller";
import { RagRetrievalController } from "./controllers/rag-retrieval.controller";
import { SqliteKeywordIndexAdapter } from "./adapters/sqlite-keyword-index.adapter";
import { SEARCH_INDEX_ADAPTER } from "./adapters/search-index.adapter";
import { CleanProcessor } from "./indexing/clean/clean-processor";
import { ExtractProcessor } from "./indexing/extract/extract-processor";
import { RagIndexingOrchestrator } from "./indexing/rag-indexing.orchestrator";
import { SplitProcessor } from "./indexing/split/split-processor";
import { DatasetSelector } from "./retrieval/dataset-selector";
import { RagRetrievalOrchestrator } from "./retrieval/rag-retrieval.orchestrator";
import { SourceHydrator } from "./retrieval/source-hydrator";
import { RagDatasetService } from "./services/rag-dataset.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      App,
      AppDatasetBinding,
      Dataset,
      DatasetDocument,
      DocumentSegment,
      DocumentSegmentIndex,
    ]),
  ],
  controllers: [RagDatasetController, RagRetrievalController],
  providers: [
    RagDatasetService,
    ExtractProcessor,
    CleanProcessor,
    SplitProcessor,
    DatasetSelector,
    SourceHydrator,
    RagIndexingOrchestrator,
    RagRetrievalOrchestrator,
    SqliteKeywordIndexAdapter,
    {
      provide: SEARCH_INDEX_ADAPTER,
      useExisting: SqliteKeywordIndexAdapter,
    },
  ],
  exports: [RagRetrievalOrchestrator, RagDatasetService],
})
export class RagModule {}
