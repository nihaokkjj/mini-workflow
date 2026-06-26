import { Controller, Get, Put, Param, Body } from "@nestjs/common";
import { WorkflowService } from "./workflow.service";
import { CreateWorkflowDto } from "../../types";

@Controller("api/workflows")
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}

  @Put("by-app/:appId")
  save(@Param("appId") appId: string, @Body() dto: CreateWorkflowDto) {
    return this.service.createOrUpdate(appId, dto.graph);
  }

  @Get("by-app/:appId")
  findByApp(@Param("appId") appId: string) {
    return this.service.findByAppId(appId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }
}
