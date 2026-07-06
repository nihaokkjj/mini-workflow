# Mini Dify 项目操作说明

本文档面向项目操作者，说明如何在当前版本的 Mini Dify 中启动项目、创建 App、搭建工作流组件，并完成参数配置与运行验证。

## 1. 项目概览

当前项目由两个主要部分组成：

- `frontend`：前端操作界面，默认地址为 `http://localhost:5173`
- `backend`：后端 API 与工作流执行引擎，默认地址为 `http://localhost:3001`

后端同时提供 Swagger 文档，默认地址为：

- `http://localhost:3001/api/docs`

## 2. 本地启动

### 2.1 环境要求

- Node.js `24.x`
- `pnpm` `9.15.4`

### 2.2 安装依赖

在项目根目录执行：

```bash
pnpm install
```

### 2.3 配置后端环境变量

参考 `backend/.env.example` 创建 `backend/.env`：

```env
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
FRONTEND_ORIGIN=http://localhost:5173
PORT=3001
```

说明：

- `OPENAI_API_KEY`：LLM 节点默认使用的 API Key
- `OPENAI_BASE_URL`：LLM 节点默认使用的 OpenAI 兼容接口地址
- `FRONTEND_ORIGIN`：允许访问后端的前端地址
- `PORT`：后端端口

### 2.4 启动项目

在项目根目录执行：

```bash
pnpm run dev
```

常用命令：

```bash
pnpm run dev
pnpm run typecheck
pnpm run test
pnpm run build
```

## 3. 页面入口

项目当前有 3 个主要页面：

- `/`：应用列表页
- `/app/:appId`：工作流编辑页
- `/app/:appId/chat`：聊天测试页

建议使用顺序：

1. 在应用列表页创建 App
2. 进入编辑页搭建工作流
3. 保存工作流
4. 在聊天页做真实对话验证

## 4. 如何创建一个 App

### 4.1 页面操作

1. 打开 `http://localhost:5173`
2. 在首页输入 App 名称
3. 点击 `Create App`
4. 系统会自动跳转到该 App 的聊天页

当前前端页面只支持填写：

- `name`

当前前端页面暂不支持直接填写：

- `description`
- `mode`

### 4.2 当前实现的真实行为

后端接口支持以下字段：

- `name`
- `description`
- `mode`

其中 `mode` 支持：

- `chat`
- `workflow`

但当前前端创建 App 时默认调用的是：

```json
{ "name": "你的应用名", "mode": "chat" }
```

因此：

- 页面上看不到模式选择
- 通过 UI 创建的 App 默认会以 `chat` 模式提交
- 即使如此，仍然可以进入工作流编辑页进行编排

### 4.3 如需通过接口创建带描述或指定模式的 App

可以直接使用 Swagger：

- `POST /api/apps`

示例请求体：

```json
{
  "name": "客服助手",
  "description": "用于客服问答",
  "mode": "workflow"
}
```

## 5. 如何创建工作流组件

本文中的“组件”指工作流节点，不是 React 组件。

### 5.1 进入工作流编辑页

有两种入口：

- 在首页点击某个 App 卡片的 `Edit`
- 直接访问 `/app/:appId`

### 5.2 左侧节点面板

当前可拖入的节点有：

- `Start`
- `LLM`
- `If/Else`
- `HTTP`
- `Code`
- `Template`
- `Knowledge`
- `End`

### 5.3 添加节点

1. 在左侧找到要使用的节点
2. 拖拽到画布中
3. 节点会自动生成 ID，例如：
   `start-1`、`llm-2`、`end-3`

### 5.4 连接节点

1. 从上游节点的输出点拖线
2. 连接到下游节点的输入点

规则说明：

- `Start` 只有输出
- `End` 只有输入
- 普通节点通常上方输入、下方输出
- `If/Else` 有两个输出分支：
  - `TRUE`
  - `FALSE`

### 5.5 保存工作流

完成节点拖拽和参数配置后，点击顶部工具栏的 `Save`。

保存后系统会：

- 为当前 App 创建工作流
- 或更新当前 App 已有工作流

注意：

- 当前 App 只能关联 1 份工作流
- 没有先保存，就不会拿到 `workflowId`
- 没有 `workflowId`，`Run` 无法正常执行

## 6. 如何配置组件参数

点击任意节点后，右侧会出现配置面板。

一个重要规则：

- 变量引用必须写实际节点 ID
- 不要只写节点类型名

例如应写：

- `{{start-1.query}}`
- `{{llm-2.text}}`

不要写：

- `{{start.query}}`
- `{{llm.text}}`

如果忘记节点 ID，可以看右侧配置面板底部的 `Node ID`。

### 6.1 Start 节点

配置项：

- `Input Fields (JSON)`

作用：

- 用于约定这个工作流希望接收哪些输入字段
- 便于操作者记录后续节点准备引用哪些变量

常用示例：

```json
[
  {
    "variable": "query",
    "label": "用户问题",
    "type": "text-input",
    "required": true
  }
]
```

说明：

- 当前实现里，运行时真正进入工作流的是外部传入的 `inputs`
- 执行前，后端会把这份 `inputs` 直接注入 `Start` 节点输出
- 因此下游节点实际能否取到值，取决于运行请求里有没有这个字段
- 聊天页默认传入的是 `query`
- 编辑页 `Run` 当前默认传入的是 `input`

### 6.2 LLM 节点

配置项：

- `Model`
- `API Key`
- `Base URL`
- `System Prompt`
- `User Prompt`

说明：

- `API Key` 留空时，会回退到后端环境变量 `OPENAI_API_KEY`
- `Base URL` 留空时，会回退到后端环境变量 `OPENAI_BASE_URL`
- `User Prompt` 支持模板变量引用
- 如果希望聊天页输入真正参与生成，建议明确填写 `User Prompt`，例如 `{{start-1.query}}`

常用示例：

```text
请回答这个问题：{{start-1.query}}
```

输出字段：

- `text`
- `model`

因此在后续节点中可引用：

- `{{llm-2.text}}`

### 6.3 If/Else 节点

配置项：

- `Condition Expression`

支持操作符：

- `==`
- `!=`
- `>`
- `<`
- `>=`
- `<=`
- `contains`

示例：

```text
{{llm-2.text}} contains "退款"
```

说明：

- 该节点根据条件结果走 `TRUE` 或 `FALSE` 分支
- 输出字段中会包含 `branch`

### 6.4 HTTP 节点

配置项：

- `Method`
- `URL`
- `Headers (JSON)`
- `Body`
- `Timeout (ms)`

示例：

```text
URL: https://api.example.com/search?q={{start-1.query}}
```

```json
{
  "Authorization": "Bearer {{llm-2.text}}"
}
```

输出字段通常包括：

- `status`
- `body`
- `headers`
- `json`

### 6.5 Code 节点

配置项：

- `JavaScript Code`

规则：

- 通过 `$inputs` 访问输入变量
- 代码运行在隔离沙箱中

示例：

```javascript
return $inputs.query.toUpperCase();
```

输出字段：

- `result`

说明：

- `Code` 节点的输入来自 `config.data.inputs` 映射
- 当前前端配置面板还没有暴露 `inputs` 映射编辑能力
- 因此只在页面里填写代码时，`$inputs` 大概率是空对象
- 如果要让 `Code` 节点读取输入，通常需要通过接口或种子数据提前写入 `inputs` 映射

### 6.6 Template 节点

配置项：

- `Template`

示例：

```text
用户问题是：{{start-1.query}}
模型回答是：{{llm-2.text}}
```

输出字段：

- `text`

### 6.7 Knowledge 节点

配置项：

- `Query Template`
- `Retrieval Mode`
- `Dataset IDs`
- `Top K`
- `Score Threshold`

说明：

- `Dataset IDs` 可留空
- 留空时，系统会自动使用当前 App 已绑定的全部知识库

推荐示例：

```text
{{start-1.query}}
```

重要前提：

- 当前前端没有“知识库管理/绑定”页面
- 如果要使用 `Knowledge` 节点，需要先通过后端接口创建知识库并绑定到 App

可用接口：

- `POST /api/rag/datasets`
- `POST /api/rag/datasets/:id/documents`
- `POST /api/apps/:appId/datasets/:datasetId`
- `GET /api/apps/:appId/datasets`

### 6.8 End 节点

配置项：

- `Output Mappings (JSON)`

作用：

- 定义整个工作流最终返回什么字段

示例：

```json
{
  "answer": "llm-2.text",
  "context": "knowledge-retrieval-3.context"
}
```

说明：

- `End` 节点会把映射结果作为最终输出
- 聊天页优先读取 `answer`
- 如果没有 `answer`，会退回读取 `result`

## 7. 推荐的最小可运行流程

如果你想先搭一个最简单的问答 App，建议按下面的结构：

1. `Start`
2. `LLM`
3. `End`

连接关系：

```text
Start -> LLM -> End
```

推荐配置：

### 7.1 Start

```json
[
  {
    "variable": "query",
    "label": "用户问题",
    "type": "text-input",
    "required": true
  }
]
```

### 7.2 LLM

- `Model`：任选一个可用模型
- `API Key`：填写可用密钥，或依赖后端环境变量
- `User Prompt`：

```text
请根据用户问题进行回答：{{start-1.query}}
```

### 7.3 End

```json
{
  "answer": "llm-2.text"
}
```

注意：

- 示例中的 `start-1`、`llm-2` 只是示例
- 请以你画布上真实生成的节点 ID 为准

## 8. 如何运行和验证

### 8.1 编辑页 Run 按钮

编辑页顶部有 `Run` 按钮，可以直接执行当前工作流。

但当前实现有一个限制：

- 编辑页运行时传入的是固定值 `{ "input": "Hello" }`

这意味着：

- 如果你的提示词引用的是 `{{start-1.query}}`
- 那么编辑页的 `Run` 不一定能覆盖真实聊天输入场景

因此建议：

- 快速调试执行链路时，可以先用编辑页 `Run`
- 如果要在编辑页验证输入变量，可临时按 `{{start-1.input}}` 这一类字段来写测试流程
- 验证真实问答效果时，优先使用聊天页

### 8.2 聊天页验证

进入 `/app/:appId/chat` 后：

1. 输入用户消息
2. 点击 `Send`
3. 系统会把输入作为：

```json
{ "query": "用户输入内容" }
```

传入工作流

这也是当前最接近真实业务的验证方式。

## 9. 当前版本的关键约束

为了避免误操作，建议在使用前先理解以下限制：

- 工作流必须且只能有 1 个 `Start` 节点
- 工作流至少要有 1 个 `End` 节点
- 除 `Start` 外，其余节点都必须有入边
- 工作流不能有环
- 变量引用必须使用真实节点 ID
- `Knowledge` 节点依赖 App 与知识库先完成绑定
- 编辑页 `Run` 使用固定输入，不等同于聊天页真实输入
- 当前前端创建 App 只支持填名称，不支持直接填描述和模式

## 10. 常见问题排查

### 10.1 Run 没反应

优先检查：

- 是否已经点过 `Save`
- 当前工作流是否已经生成 `workflowId`
- 是否缺少 `Start` 或 `End`
- 是否存在未连接的孤立节点

### 10.2 变量没有解析成功

优先检查：

- 是否写成了 `{{start.query}}` 这种占位形式
- 是否应该改成真实节点 ID，例如 `{{start-1.query}}`
- 上游节点是否真的输出了这个字段

### 10.3 LLM 节点报错

优先检查：

- `API Key` 是否有效
- `Base URL` 是否正确
- 所选模型是否受当前服务商支持

### 10.4 Knowledge 节点无结果

优先检查：

- App 是否已经绑定知识库
- `Dataset IDs` 是否填错
- `Query Template` 是否为空
- 知识库文档是否已经创建并完成索引

## 11. 建议的使用顺序

对于日常操作，推荐按下面顺序进行：

1. 启动前后端
2. 创建 App
3. 进入 `Edit`
4. 拖入 `Start / 业务节点 / End`
5. 配置每个节点参数
6. 点击 `Save`
7. 用聊天页验证真实输入输出
8. 如需知识库能力，再补充知识库创建、文档导入和 App 绑定
