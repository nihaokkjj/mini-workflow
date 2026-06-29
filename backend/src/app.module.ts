import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import dataSource from "./database/data-source";
import { AppModule } from "./modules/app/app.module";
import { WorkflowModule } from "./modules/workflow/workflow.module";
import { RunModule } from "./modules/run/run.module";
import { ModelModule } from "./modules/model/model.module";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => dataSource.options,
    }),
    AppModule,
    WorkflowModule,
    RunModule,
    ModelModule,
  ],
})
export class AppRootModule {}
