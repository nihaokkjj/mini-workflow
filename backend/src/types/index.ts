import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// ==================== Node & Graph Types ====================

/** All supported node types */
export type NodeType =
  | "start"
  | "end"
  | "llm"
  | "if-else"
  | "code"
  | "http"
  | "template"
  | "iteration"
  | "knowledge-retrieval";

/** Configuration for a single node */
export interface NodeConfig {
  id: string;
  type: NodeType;
  title: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  width?: number;
  height?: number;
}

/** An edge connecting two nodes */
export interface EdgeConfig {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/** Complete workflow graph definition */
export interface Graph {
  nodes: NodeConfig[];
  edges: EdgeConfig[];
}

// ==================== Execution Types ====================

export interface ExecutionContext {
  tenantId: string;
  appId: string;
  workflowId: string;
  userId: string;
  abortSignal?: AbortSignal;
  ragRuntime?: {
    retrieve(input: {
      appId: string;
      query: string;
      datasetIds?: string[];
      topK?: number;
      scoreThreshold?: number;
      retrievalMode?: "keyword" | "semantic" | "hybrid";
    }): Promise<{
      query: string;
      context: string;
      sourceCount: number;
      sources: Array<{
        title: string;
        content: string;
        datasetId: string;
        datasetName: string;
        documentId: string;
        documentName: string;
        segmentId: string;
        score: number;
        position: number;
        metadata?: Record<string, unknown>;
      }>;
      hits: Array<{
        segmentId: string;
        score: number;
      }>;
      trace: {
        requestedDatasetIds: string[];
        availableDatasetIds: string[];
        selectedDatasetIds: string[];
        usedExplicitSelection: boolean;
        plan: {
          retrievalMode: "keyword" | "semantic" | "hybrid";
          topK: number;
          scoreThreshold: number;
          candidateK: number;
          contextBudgetTokens: number;
          enableQueryRewrite: boolean;
        };
        rawHits: Array<{
          segmentId: string;
          score: number;
        }>;
        filteredHits: Array<{
          segmentId: string;
          score: number;
        }>;
        droppedHits: Array<{
          segmentId: string;
          score: number;
          reason: "score_below_threshold";
        }>;
      };
    }>;
  };
}

// ==================== SSE Event Types ====================

export type GraphEngineEvent =
  | {
      event: "node_start";
      nodeId: string;
      nodeType: NodeType;
      timestamp: number;
    }
  | { event: "node_chunk"; nodeId: string; text: string; timestamp: number }
  | {
      event: "node_end";
      nodeId: string;
      outputs: Record<string, unknown>;
      timestamp: number;
    }
  | { event: "node_skipped"; nodeId: string; reason: string; timestamp: number }
  | { event: "graph_end"; outputs: Record<string, unknown>; timestamp: number }
  | {
      event: "error";
      nodeId: string | null;
      nodeType: NodeType | null;
      message: string;
      timestamp: number;
    };

// ==================== DTOs ====================

export class CreateWorkflowDto {
  @ApiProperty({
    description: "所属应用的 ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  appId: string;

  @ApiProperty({
    description: "工作流的图结构定义（包含节点和边）",
    example: {
      nodes: [
        {
          id: "start-1",
          type: "start",
          title: "开始",
          position: { x: 100, y: 100 },
          data: {},
        },
        {
          id: "llm-1",
          type: "llm",
          title: "AI 对话",
          position: { x: 300, y: 100 },
          data: { model: "kimi-latest", prompt: "你好，请回答问题：{{query}}" },
        },
        {
          id: "end-1",
          type: "end",
          title: "结束",
          position: { x: 500, y: 100 },
          data: {},
        },
      ],
      edges: [
        { id: "e1", source: "start-1", target: "llm-1" },
        { id: "e2", source: "llm-1", target: "end-1" },
      ],
    },
  })
  graph: Graph;
}

export class RunWorkflowDto {
  @ApiProperty({
    description: "要执行的工作流 ID",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  workflowId: string;

  @ApiProperty({
    description: "执行工作流的输入变量（键值对）",
    example: { query: "什么是人工智能？" },
  })
  inputs: Record<string, unknown>;
}

export class CreateAppDto {
  @ApiProperty({
    description: "应用名称",
    example: "我的 AI 助手",
  })
  name: string;

  @ApiPropertyOptional({
    description: "应用描述",
    example: "一个智能问答机器人",
  })
  description?: string;

  @ApiPropertyOptional({
    description: "应用模式：chat（聊天模式）或 workflow（工作流模式）",
    example: "workflow",
    enum: ["chat", "workflow"],
    default: "workflow",
  })
  mode?: "chat" | "workflow";
}

export class CreateConversationDto {
  @ApiProperty({
    description: "所属应用的 ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  appId: string;
}

export class ChatRunDto {
  @ApiProperty({
    description: "要执行的工作流 ID",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  workflowId: string;

  @ApiProperty({
    description: "用户输入（键值对，通常包含 query 字段）",
    example: { query: "帮我写一首关于春天的诗" },
  })
  inputs: Record<string, unknown>;
}
