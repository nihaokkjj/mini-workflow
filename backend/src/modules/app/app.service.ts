import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { App } from "../../database/entities/app.entity";

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(App)
    private readonly repo: Repository<App>,
  ) {}

  async create(data: { name: string; description?: string }): Promise<App> {
    const app = this.repo.create(data);
    return this.repo.save(app);
  }

  async findAll(): Promise<App[]> {
    return this.repo.find({ order: { createdAt: "DESC" } });
  }

  async findById(id: string): Promise<App | null> {
    return this.repo.findOneBy({ id });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
