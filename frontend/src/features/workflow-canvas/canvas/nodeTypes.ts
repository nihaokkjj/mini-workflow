import StartNodeComponent from "../nodes/StartNodeComponent";
import EndNodeComponent from "../nodes/EndNodeComponent";
import LLMNodeComponent from "../nodes/LLMNodeComponent";
import IfElseNodeComponent from "../nodes/IfElseNodeComponent";
import HttpNodeComponent from "../nodes/HttpNodeComponent";
import CodeNodeComponent from "../nodes/CodeNodeComponent";
import TemplateNodeComponent from "../nodes/TemplateNodeComponent";
import KnowledgeRetrievalNodeComponent from "../nodes/KnowledgeRetrievalNodeComponent";

export const nodeTypes = {
  start: StartNodeComponent,
  end: EndNodeComponent,
  llm: LLMNodeComponent,
  "if-else": IfElseNodeComponent,
  http: HttpNodeComponent,
  code: CodeNodeComponent,
  template: TemplateNodeComponent,
  "knowledge-retrieval": KnowledgeRetrievalNodeComponent,
};
