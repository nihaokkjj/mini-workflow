import { createHash } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { App } from "../../../database/entities/app.entity";
import { AppDatasetBinding } from "../../../database/entities/app-dataset-binding.entity";
import { Dataset } from "../../../database/entities/dataset.entity";
import { DatasetDocument } from "../../../database/entities/dataset-document.entity";
import { CreateDatasetDto } from "../dto/create-dataset.dto";
import { CreateDocumentDto } from "../dto/create-document.dto";
import { RagIndexingOrchestrator } from "../indexing/rag-indexing.orchestrator";

@Injectable()
export class RagDatasetService {
  constructor(
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
    @InjectRepository(Dataset)
    private readonly datasetRepo: Repository<Dataset>,
    @InjectRepository(AppDatasetBinding)
    private readonly bindingRepo: Repository<AppDatasetBinding>,
    @InjectRepository(DatasetDocument)
    private readonly documentRepo: Repository<DatasetDocument>,
    private readonly ragIndexing: RagIndexingOrchestrator
  ) {}

  async createDataset(dto: CreateDatasetDto): Promise<Dataset> {
    const dataset = this.datasetRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      status: "active",
      retrievalMode: dto.retrievalMode ?? "keyword",
      indexingMode: dto.indexingMode ?? "economy",
      chunkSize: dto.chunkSize ?? 500,
      chunkOverlap: dto.chunkOverlap ?? 80,
      topK: dto.topK ?? 4,
      scoreThreshold: dto.scoreThreshold ?? 0.15,
    });
    return this.datasetRepo.save(dataset);
  }

  listDatasets(): Promise<Dataset[]> {
    return this.datasetRepo.find({ order: { createdAt: "DESC" } });
  }

  async getDataset(id: string): Promise<Dataset> {
    const dataset = await this.datasetRepo.findOneBy({ id });
    if (!dataset) throw new NotFoundException("Dataset not found");
    return dataset;
  }

  async createDocument(
    datasetId: string,
    dto: CreateDocumentDto
  ): Promise<DatasetDocument> {
    const dataset = await this.getDataset(datasetId);

    const document = await this.documentRepo.save(
      this.documentRepo.create({
        datasetId,
        name: dto.name,
        sourceType: dto.sourceType,
        sourceUri: dto.sourceUri ?? null,
        content: dto.content,
        status: "indexing",
        errorMessage: null,
        docHash: createHash("sha256").update(dto.content).digest("hex"),
        metadata: dto.metadata ?? null,
      })
    );

    try {
      await this.ragIndexing.indexDocument(dataset, document);
      document.status = "completed";
      document.errorMessage = null;
    } catch (error) {
      document.status = "failed";
      document.errorMessage =
        error instanceof Error ? error.message : "Unknown indexing error";
    }

    return this.documentRepo.save(document);
  }

  async uploadDocument(
    datasetId: string,
    name: string | undefined,
    file: Express.Multer.File
  ): Promise<DatasetDocument> {
    const dataset = await this.getDataset(datasetId);

    const document = await this.documentRepo.save(
      this.documentRepo.create({
        datasetId,
        name: name || file.originalname,
        sourceType: "file",
        sourceUri: file.path,
        content: "",
        status: "pending",
        errorMessage: null,
        docHash: "",
        metadata: null,
      })
    );

    // Fire-and-forget async indexing — don't block the upload response
    this.indexDocumentAsync(document, dataset);

    return document;
  }

  private async indexDocumentAsync(
    document: DatasetDocument,
    dataset: Dataset
  ): Promise<void> {
    try {
      document.status = "indexing";
      await this.documentRepo.save(document);

      await this.ragIndexing.indexDocument(dataset, document);

      document.status = "completed";
      document.errorMessage = null;
    } catch (error) {
      document.status = "failed";
      document.errorMessage =
        error instanceof Error ? error.message : "Unknown indexing error";
    } finally {
      await this.documentRepo.save(document);
    }
  }

  listDocuments(datasetId: string): Promise<DatasetDocument[]> {
    return this.documentRepo.find({
      where: { datasetId },
      order: { createdAt: "DESC" },
    });
  }

  async bindDataset(
    appId: string,
    datasetId: string
  ): Promise<AppDatasetBinding> {
    const app = await this.appRepo.findOneBy({ id: appId });
    if (!app) throw new NotFoundException("App not found");

    const dataset = await this.getDataset(datasetId);

    const existing = await this.bindingRepo.findOneBy({ appId, datasetId });
    if (existing) return existing;

    return this.bindingRepo.save(
      this.bindingRepo.create({
        appId: app.id,
        datasetId: dataset.id,
      })
    );
  }

  async unbindDataset(appId: string, datasetId: string): Promise<void> {
    await this.bindingRepo.delete({ appId, datasetId });
  }

  listAppBindings(appId: string): Promise<AppDatasetBinding[]> {
    return this.bindingRepo.find({
      where: { appId },
      relations: { dataset: true },
      order: { createdAt: "DESC" },
    });
  }
}
