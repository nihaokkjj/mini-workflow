import { Controller, Post, Get, Body, Param, Res } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Response } from "express";
import { RunService } from "./run.service";
import { Run } from "../../database/entities/run.entity";
import { RunWorkflowDto } from "../../types";

@Controller("api/runs")
export class RunController {
  constructor(
    private readonly service: RunService,
    @InjectRepository(Run)
    private readonly runRepo: Repository<Run>,
  ) {}

  @Post()
  async startRun(@Body() dto: RunWorkflowDto) {
    const run = await this.service.createRun(dto.workflowId, dto.inputs);
    return { runId: run.id };
  }

  @Get(":runId/stream")
  async stream(@Param("runId") runId: string, @Res() res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const run = await this.runRepo.findOne({ where: { id: runId } });
    if (!run) {
      res.write(`event: error\ndata: ${JSON.stringify({ event: "error", nodeId: null, error: "Run not found", timestamp: Date.now() })}\n\n`);
      res.end();
      return;
    }

    try {
      for await (const event of this.service.executeRun(
        run.workflowId,
        (run.inputs as Record<string, unknown>) ?? {},
        runId,
      )) {
        res.write(`event: ${event.event}\ndata: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown execution error";
      res.write(`event: error\ndata: ${JSON.stringify({ event: "error", nodeId: null, error: message, timestamp: Date.now() })}\n\n`);
    } finally {
      res.end();
    }
  }
}
