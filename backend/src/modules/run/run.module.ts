import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Run } from "../../database/entities/run.entity";
import { Workflow } from "../../database/entities/workflow.entity";
import { RunService } from "./run.service";
import { RunController } from "./run.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Run, Workflow])],
  controllers: [RunController],
  providers: [RunService],
  exports: [RunService],
})
export class RunModule {}
