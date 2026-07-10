import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { ValidationPipe } from "@nestjs/common";
import { SaveWorkflowDto } from "../../types";

test("SaveWorkflowDto accepts workflow payload without appId in body", async () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  const result = await pipe.transform(
    {
      graph: {
        nodes: [],
        edges: [],
      },
    },
    { type: "body", metatype: SaveWorkflowDto }
  );

  assert.ok(result instanceof SaveWorkflowDto);
  assert.deepEqual(result.graph, {
    nodes: [],
    edges: [],
  });
});
