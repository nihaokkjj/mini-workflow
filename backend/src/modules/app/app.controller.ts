import { Controller, Get, Post, Delete, Param, Body } from "@nestjs/common";
import { AppService } from "./app.service";
import { CreateAppDto } from "../../types";

@Controller("api/apps")
export class AppController {
  constructor(private readonly service: AppService) {}

  @Post()
  create(@Body() dto: CreateAppDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
