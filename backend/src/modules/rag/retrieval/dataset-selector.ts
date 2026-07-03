import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppDatasetBinding } from "../../../database/entities/app-dataset-binding.entity";

export interface DatasetSelection {
  datasetIds: string[];
  availableDatasetIds: string[];
  usedExplicitSelection: boolean;
}

@Injectable()
export class DatasetSelector {
  constructor(
    @InjectRepository(AppDatasetBinding)
    private readonly bindingRepo: Repository<AppDatasetBinding>
  ) {}

  async select(
    appId: string,
    explicitDatasetIds?: string[]
  ): Promise<DatasetSelection> {
    const bindings = await this.bindingRepo.find({ where: { appId } });
    const availableDatasetIds = Array.from(
      new Set(bindings.map((binding) => binding.datasetId))
    );

    if (explicitDatasetIds && explicitDatasetIds.length > 0) {
      const datasetIds = Array.from(new Set(explicitDatasetIds));
      const allowedDatasetIds = new Set(availableDatasetIds);
      const unauthorizedDatasetIds = datasetIds.filter(
        (datasetId) => !allowedDatasetIds.has(datasetId)
      );
      if (unauthorizedDatasetIds.length > 0) {
        throw new ForbiddenException(
          `Datasets are not bound to app ${appId}: ${unauthorizedDatasetIds.join(", ")}`
        );
      }

      return {
        datasetIds,
        availableDatasetIds,
        usedExplicitSelection: true,
      };
    }

    return {
      datasetIds: availableDatasetIds,
      availableDatasetIds,
      usedExplicitSelection: false,
    };
  }
}
