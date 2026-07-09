import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Workflow } from "../../database/entities/workflow.entity";
import type { Graph } from "../../types";
import {
  encryptGraphSensitiveFields,
  decryptGraphSensitiveFields,
} from "../../common/crypto/graph-crypto";

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(Workflow)
    private readonly repo: Repository<Workflow>
  ) {}

  async createOrUpdate(appId: string, graph: Graph): Promise<Workflow> {
    encryptGraphSensitiveFields(graph);
    // One workflow per app in mini version — upsert via unique constraint on appId.
    // Using INSERT … ON CONFLICT avoids the read-check-write race.
    await (this.repo as any).upsert(
      { appId, graph },
      { conflictPaths: ["appId"], skipUpdateIfNoValuesChanged: false }
    );
    return this.repo.findOneByOrFail({ appId });
  }

  async findByAppId(appId: string): Promise<Workflow | null> {
    const wf = await this.repo.findOneBy({ appId });
    if (wf) decryptGraphSensitiveFields(wf.graph);
    return wf;
  }

  async findById(id: string): Promise<Workflow | null> {
    const wf = await this.repo.findOneBy({ id });
    if (wf) decryptGraphSensitiveFields(wf.graph);
    return wf;
  }
}
