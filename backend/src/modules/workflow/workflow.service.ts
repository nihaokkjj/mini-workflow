import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Workflow } from "../../database/entities/workflow.entity";
import type { Graph } from "../../types";

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(Workflow)
    private readonly repo: Repository<Workflow>,
  ) {}

  async createOrUpdate(appId: string, graph: Graph): Promise<Workflow> {
    // One workflow per app in mini version — upsert
    let wf = await this.repo.findOneBy({ appId });
    if (wf) {
      wf.graph = graph;
    } else {
      wf = this.repo.create({ appId, graph });
    }
    return this.repo.save(wf);
  }

  async findByAppId(appId: string): Promise<Workflow | null> {
    return this.repo.findOneBy({ appId });
  }

  async findById(id: string): Promise<Workflow | null> {
    return this.repo.findOneBy({ id });
  }
}
