import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppDatasetBinding } from "../../../database/entities/app-dataset-binding.entity";

@Injectable()
export class DatasetSelector {
  constructor(
    @InjectRepository(AppDatasetBinding)
    private readonly bindingRepo: Repository<AppDatasetBinding>,
  ) {}

  async select(appId: string, explicitDatasetIds?: string[]): Promise<string[]> {
    if (explicitDatasetIds && explicitDatasetIds.length > 0) {
      return explicitDatasetIds;
    }

    const bindings = await this.bindingRepo.find({ where: { appId } });
    return bindings.map((binding) => binding.datasetId);
  }
}
