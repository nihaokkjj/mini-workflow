export type GuideBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; language: string; code: string }
  | { type: "note"; tone: "info" | "warn"; text: string };

export interface GuideSection {
  id: string;
  title: string;
  blocks: GuideBlock[];
}

export interface GuideDocument {
  title: string;
  intro: string;
  sections: GuideSection[];
}

export const projectOperationGuide: GuideDocument = {
  title: "项目操作说明",
  intro:
    "这份说明聚焦当前 Mini Dify 的真实操作流，帮助你在项目里完成 App 创建、工作流节点搭建和参数配置。",
  sections: [
    {
      id: "start",
      title: "启动项目",
      blocks: [
        {
          type: "paragraph",
          text: "先在项目根目录安装依赖，再同时启动前后端。前端默认在 http://localhost:5173，后端默认在 http://localhost:3001，接口文档在 http://localhost:3001/api/docs。",
        },
        {
          type: "code",
          language: "bash",
          code: "pnpm install\npnpm run dev",
        },
        {
          type: "note",
          tone: "info",
          text: "后端至少需要配置 OPENAI_API_KEY、OPENAI_BASE_URL、FRONTEND_ORIGIN 和 PORT。",
        },
      ],
    },
    {
      id: "create-app",
      title: "创建一个 App",
      blocks: [
        {
          type: "list",
          items: [
            "进入首页 /",
            "在输入框填写 App 名称",
            "点击 Create App",
            "系统会跳转到这个 App 的工作流编辑页",
          ],
        },
        {
          type: "paragraph",
          text: "当前首页只暴露 name 字段。后端接口实际还支持 description 和 mode，但这两个参数目前需要通过 Swagger 或接口请求单独传入。",
        },
        {
          type: "code",
          language: "json",
          code: '{\n  "name": "客服助手",\n  "description": "用于问答与流程验证",\n  "mode": "workflow"\n}',
        },
        {
          type: "paragraph",
          text: "当前前端创建 App 时默认提交 workflow 模式，并直接进入工作流编辑页继续编排。",
        },
      ],
    },
    {
      id: "build-workflow",
      title: "创建工作流节点",
      blocks: [
        {
          type: "paragraph",
          text: "进入 /app/:appId 后，左侧是节点面板，中间是画布，右侧是选中节点的配置区。当前可拖入的节点包括 Start、LLM、If/Else、HTTP、Code、Template、Knowledge 和 End。",
        },
        {
          type: "list",
          items: [
            "从左侧拖一个 Start 到画布",
            "继续拖入业务节点，例如 LLM 或 HTTP",
            "最后拖入 End",
            "从上游节点的输出点连到下游节点的输入点",
            "配置完成后点击顶部 Save",
          ],
        },
        {
          type: "note",
          tone: "warn",
          text: "工作流必须且只能有一个 Start，至少要有一个 End，除 Start 外其他节点都必须有入边。",
        },
      ],
    },
    {
      id: "node-ids",
      title: "参数引用规则",
      blocks: [
        {
          type: "paragraph",
          text: "节点拖到画布后会自动生成真实节点 ID，例如 start-1、llm-2、end-3。配置参数时必须引用真实节点 ID，不能只写节点类型名。",
        },
        {
          type: "code",
          language: "text",
          code: "正确: {{start-1.query}}\n正确: {{llm-2.text}}\n错误: {{start.query}}\n错误: {{llm.text}}",
        },
        {
          type: "note",
          tone: "info",
          text: "如果忘了节点 ID，可以点击节点，在右侧配置面板底部查看 Node ID。",
        },
      ],
    },
    {
      id: "configure-start",
      title: "配置 Start 节点",
      blocks: [
        {
          type: "paragraph",
          text: "Start 节点的 Input Fields(JSON) 更像输入约定，而不是实际的值来源。运行时，后端会把外部传入的 inputs 直接注入 Start 节点输出。",
        },
        {
          type: "code",
          language: "json",
          code: '[\n  {\n    "variable": "query",\n    "label": "用户问题",\n    "type": "text-input",\n    "required": true\n  }\n]',
        },
        {
          type: "list",
          items: [
            '聊天页发送消息时，默认传入的是 { query: "用户输入" }',
            '编辑页点击 Run 时，当前默认传入的是 { input: "Hello" }',
            "下游节点能否取到值，取决于真实传入的 inputs 里有没有这个字段",
          ],
        },
      ],
    },
    {
      id: "configure-common",
      title: "常用节点怎么配",
      blocks: [
        {
          type: "paragraph",
          text: "LLM 节点通常至少要填 User Prompt；如果要让聊天输入真正参与生成，建议明确写 {{start-1.query}}。API Key 和 Base URL 留空时，会回退到后端环境变量。",
        },
        {
          type: "code",
          language: "text",
          code: "请根据用户问题进行回答: {{start-1.query}}",
        },
        {
          type: "paragraph",
          text: "Template 节点适合做字符串拼接，HTTP 节点适合请求外部接口，If/Else 节点适合按表达式走 TRUE/FALSE 分支。",
        },
        {
          type: "code",
          language: "text",
          code: 'If/Else 示例: {{llm-2.text}} contains "退款"',
        },
        {
          type: "paragraph",
          text: "Code 节点在实现上通过 $inputs 取值，但当前前端面板没有暴露 inputs 映射配置，所以只在页面里填代码时，$inputs 大概率是空对象。",
        },
        {
          type: "note",
          tone: "warn",
          text: "如果你要用 Code 节点读取输入，通常需要通过接口或种子数据先写入 inputs 映射，而不是只靠前端表单。",
        },
      ],
    },
    {
      id: "configure-end",
      title: "配置 End 节点",
      blocks: [
        {
          type: "paragraph",
          text: "End 节点决定整个工作流的最终输出。聊天页会优先读取 answer 字段，如果没有 answer，再退回读取 result。",
        },
        {
          type: "code",
          language: "json",
          code: '{\n  "answer": "llm-2.text"\n}',
        },
      ],
    },
    {
      id: "knowledge",
      title: "知识库节点前置条件",
      blocks: [
        {
          type: "paragraph",
          text: "Knowledge 节点支持 Query Template、Retrieval Mode、Dataset 选择、Top K 和 Score Threshold。留空时，会自动使用当前 App 已绑定的全部知识库。",
        },
        {
          type: "paragraph",
          text: "应用编辑页右上角的 Datasets 面板可以查看和管理当前 App 绑定的知识库。先绑定，再到 Knowledge 节点里选择特定知识库；如果不选，则默认使用全部绑定知识库。",
        },
        {
          type: "list",
          items: [
            "POST /api/rag/datasets",
            "POST /api/rag/datasets/:id/documents",
            "POST /api/apps/:appId/datasets/:datasetId",
            "GET /api/apps/:appId/datasets",
          ],
        },
      ],
    },
    {
      id: "minimal-flow",
      title: "推荐的最小可运行流程",
      blocks: [
        {
          type: "paragraph",
          text: "如果只是想先验证项目能工作，建议先搭一条最短路径：Start -> LLM -> End。",
        },
        {
          type: "code",
          language: "text",
          code: "Start -> LLM -> End",
        },
        {
          type: "code",
          language: "json",
          code: '{\n  "answer": "llm-2.text"\n}',
        },
        {
          type: "note",
          tone: "info",
          text: "保存工作流后，优先去聊天页验证真实输入输出。编辑页 Run 更适合快速验证执行链路，不适合代替真实聊天场景。",
        },
      ],
    },
  ],
};
