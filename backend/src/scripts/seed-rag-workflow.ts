/**
 * Seed: RAG Workflow with Knowledge Retrieval pipeline
 *
 * Creates a complete RAG-enabled app with dataset, sample documents,
 * and a workflow graph that demonstrates the full RAG pipeline:
 *
 *   Start → Knowledge Retrieval (hybrid) → LLM → End
 *
 * The workflow uses the Phase 2 multi-channel retrieval seam.
 * Every hit in retrieval results carries a channel provenance field
 * (keyword | semantic) for traceability.
 *
 * Run:
 *   cd backend
 *   node --require ts-node/register src/scripts/seed-rag-workflow.ts
 *
 * Clean before re-run:
 *   rm -f backend/dev.db
 */

import "reflect-metadata";
import dataSource from "../database/data-source";
import { App } from "../database/entities/app.entity";
import { Dataset } from "../database/entities/dataset.entity";
import { AppDatasetBinding } from "../database/entities/app-dataset-binding.entity";
import { DatasetDocument } from "../database/entities/dataset-document.entity";
import { DocumentSegment } from "../database/entities/document-segment.entity";
import { DocumentSegmentIndex } from "../database/entities/document-segment-index.entity";
import { Workflow } from "../database/entities/workflow.entity";
import { Graph } from "../types";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Sample help-center content (Chinese)
// ---------------------------------------------------------------------------

const HELP_DOCUMENTS: Array<{
  name: string;
  content: string;
}> = [
  {
    name: "退款政策",
    content: `# 退款政策

## 退款条件
用户可以在购买后 7 天内申请全额退款。退款将原路返回支付账户。

## 退款流程
1. 登录您的账户
2. 找到需要退款的订单
3. 点击"申请退款"按钮
4. 填写退款原因并提交
5. 客服将在 1-2 个工作日内审核

## 注意事项
- 虚拟商品购买后不支持退款
- 已使用的优惠券不予退还
- 退款金额将在 3-7 个工作日到账`,
  },
  {
    name: "配送说明",
    content: `# 配送说明

## 标准配送
标准配送时间为 3-5 个工作日，全国范围内送达。

## 加急配送
加急配送可次日送达，需额外支付 15 元加急费用。

## 免邮政策
单笔订单满 99 元即可享受免邮服务。

## 物流查询
在"我的订单"页面点击"查看物流"即可实时追踪包裹状态。

## 配送范围
目前覆盖全国 300+ 城市，偏远地区配送时间可能延长 1-2 天。`,
  },
  {
    name: "支付方式",
    content: `# 支付方式

## 支持的支付方式
- 微信支付
- 支付宝
- 银联卡
- 信用卡（Visa、MasterCard）

## 支付安全
所有支付均采用 SSL 加密传输，您的支付信息不会存储在平台服务器。

## 支付确认
订单支付成功后即刻到账，您将收到支付成功的短信和站内通知。

## 发票开具
支持电子发票和纸质发票，请在订单完成后在"发票管理"页面申请。`,
  },
];

// ---------------------------------------------------------------------------
// Build the RAG workflow graph
// ---------------------------------------------------------------------------

export function buildRagWorkflowGraph(datasetId: string): Graph {
  return {
    nodes: [
      {
        id: "start-1",
        type: "start",
        title: "用户提问",
        position: { x: 80, y: 210 },
        width: 220,
        height: 120,
        data: {
          inputs: [
            {
              variable: "query",
              label: "问题",
              type: "text-input" as const,
              required: true,
              default: "如何申请退款？",
            },
          ],
        },
      },
      {
        id: "knowledge-retrieval-1",
        type: "knowledge-retrieval",
        title: "知识库检索 (混合模式)",
        position: { x: 380, y: 210 },
        width: 260,
        height: 140,
        data: {
          queryTemplate: "{{start-1.query}}",
          datasetIds: [datasetId],
          retrievalMode: "hybrid" as const,
          topK: 5,
          scoreThreshold: 0.15,
        },
      },
      {
        id: "llm-1",
        type: "llm",
        title: "AI 生成回答",
        position: { x: 720, y: 210 },
        width: 260,
        height: 140,
        data: {
          model: "gpt-4o-mini",
          baseURL: "https://api.openai.com/v1",
          systemPrompt: [
            "你是一个专业的客服助手。",
            "请严格基于知识库检索结果回答用户问题。",
            "如果知识库中没有相关信息，请如实告知用户。",
          ].join("\n"),
          userPrompt: [
            "",
            "## 知识库检索结果",
            "{{knowledge-retrieval-1.context}}",
            "",
            "## 用户问题",
            "{{start-1.query}}",
            "",
            "## 回答要求",
            "1. 简洁准确，用中文回答",
            "2. 如果涉及流程，请分步骤说明",
            "3. 如果涉及时间或金额，请明确标注",
          ].join("\n"),
          temperature: 0.3,
          maxTokens: 2048,
        },
      },
      {
        id: "end-1",
        type: "end",
        title: "输出结果",
        position: { x: 1060, y: 210 },
        width: 220,
        height: 120,
        data: {
          outputs: {
            answer: "llm-1.text",
          },
        },
      },
    ],
    edges: [
      {
        id: "e-start-to-retrieval",
        source: "start-1",
        target: "knowledge-retrieval-1",
      },
      {
        id: "e-retrieval-to-llm",
        source: "knowledge-retrieval-1",
        target: "llm-1",
      },
      {
        id: "e-llm-to-end",
        source: "llm-1",
        target: "end-1",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Main seed logic
// ---------------------------------------------------------------------------

export async function seed() {
  await dataSource.initialize();
  console.log("✓ 数据库已连接\n");

  // --- App ---
  const appRepo = dataSource.getRepository(App);
  let app = await appRepo.findOneBy({ name: "RAG 智能问答" });
  if (!app) {
    app = appRepo.create({
      name: "RAG 智能问答",
      description:
        "基于知识库检索增强生成的智能问答助手（支持 keyword / semantic / hybrid 三种检索模式）",
      mode: "workflow",
    });
    app = await appRepo.save(app);
    console.log(`✓ 创建 App: ${app.name} (id=${app.id})`);
  } else {
    console.log(`→ App 已存在: ${app.name} (id=${app.id})`);
  }

  // --- Dataset ---
  const datasetRepo = dataSource.getRepository(Dataset);
  let dataset = await datasetRepo.findOneBy({ name: "产品帮助中心" });
  if (!dataset) {
    dataset = datasetRepo.create({
      name: "产品帮助中心",
      description: "包含退款政策、配送说明、支付方式等常见问题",
      status: "active",
      retrievalMode: "hybrid",
      indexingMode: "economy",
      chunkSize: 500,
      chunkOverlap: 80,
      topK: 5,
      scoreThreshold: 0.15,
    });
    dataset = await datasetRepo.save(dataset);
    console.log(
      `✓ 创建 Dataset: ${dataset.name} (id=${dataset.id}, mode=${dataset.retrievalMode})`
    );
  } else {
    console.log(
      `→ Dataset 已存在: ${dataset.name} (id=${dataset.id}, mode=${dataset.retrievalMode})`
    );
  }

  // --- AppDatasetBinding ---
  const bindingRepo = dataSource.getRepository(AppDatasetBinding);
  let binding = await bindingRepo.findOneBy({
    appId: app.id,
    datasetId: dataset.id,
  });
  if (!binding) {
    binding = bindingRepo.create({ appId: app.id, datasetId: dataset.id });
    await bindingRepo.save(binding);
    console.log(`✓ 绑定 App ↔ Dataset`);
  } else {
    console.log(`→ 绑定已存在`);
  }

  // --- Documents + Segments + Keyword Indexes ---
  const docRepo = dataSource.getRepository(DatasetDocument);
  const segRepo = dataSource.getRepository(DocumentSegment);
  const indexRepo = dataSource.getRepository(DocumentSegmentIndex);

  for (const docDef of HELP_DOCUMENTS) {
    let doc = await docRepo.findOneBy({
      datasetId: dataset.id,
      name: docDef.name,
    });
    if (!doc) {
      const docHash = crypto
        .createHash("sha256")
        .update(docDef.content)
        .digest("hex");

      doc = docRepo.create({
        datasetId: dataset.id,
        name: docDef.name,
        sourceType: "markdown",
        content: docDef.content,
        status: "completed",
        docHash,
      });
      doc = await docRepo.save(doc);
      console.log(`✓ 创建 Document: ${doc.name} (id=${doc.id})`);

      // Create segments (one per section for demo simplicity)
      const paragraphs = docDef.content
        .split(/\n\n+/)
        .filter((p) => p.trim() && !/^# .*/.test(p.trim())); // skip main title only
      for (let i = 0; i < paragraphs.length; i++) {
        const content = paragraphs[i]
          .split("\n")
          .filter((line) => !line.startsWith("#"))
          .join("\n")
          .trim();
        if (!content) continue;

        const segHash = crypto
          .createHash("sha256")
          .update(content)
          .digest("hex");

        const segment = segRepo.create({
          datasetId: dataset.id,
          documentId: doc.id,
          position: i,
          content,
          tokenCount: content.length,
          docHash: segHash,
          metadata: null,
          searchText: content,
        });
        const savedSeg = await segRepo.save(segment);

        // Also create keyword index entry for immediate retrieval
        const idxEntry = indexRepo.create({
          segmentId: savedSeg.id,
          datasetId: dataset.id,
          documentId: doc.id,
          content,
        });
        await indexRepo.save(idxEntry);
      }
      console.log(`  → ${paragraphs.length} 个段落已索引`);
    } else {
      console.log(`→ Document 已存在: ${doc.name}`);
    }
  }

  // --- Workflow ---
  const wfRepo = dataSource.getRepository(Workflow);
  let wf = await wfRepo.findOneBy({ appId: app.id });
  const graph = buildRagWorkflowGraph(dataset.id);
  if (!wf) {
    wf = wfRepo.create({ appId: app.id, graph });
    wf = await wfRepo.save(wf);
    console.log(`\n✓ 创建 Workflow (id=${wf.id})`);
  } else {
    wf.graph = graph;
    wf = await wfRepo.save(wf);
    console.log(`\n→ Workflow 已更新 (id=${wf.id})`);
  }

  // --- Summary ---
  console.log("\n═══════════════════════════════════════════");
  console.log("  RAG Workflow 创建完成");
  console.log("═══════════════════════════════════════════");
  console.log(`  App:       ${app.name}`);
  console.log(`  Dataset:   ${dataset.name} (mode: ${dataset.retrievalMode})`);
  console.log(`  Documents: ${HELP_DOCUMENTS.length} 篇`);
  console.log(`  Workflow:  4 个节点 (start → retrieval → llm → end)`);
  console.log(`  检索模式:  hybrid (keyword + semantic)`);
  console.log(`\n  Workflow 图数据 (JSON):`);
  console.log(JSON.stringify(graph, null, 2));

  await dataSource.destroy();
  console.log("\n✓ 完成");
}

if (require.main === module) {
  seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
