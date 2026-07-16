import { useState } from "react";
import { useCreateDataset } from "../../queries/datasets/useCreateDataset";
import type { DatasetDto } from "../../types";

const inputClass =
  "mt-2 w-full rounded-xl border border-white/14 bg-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition";
const labelClass = "text-sm font-medium text-[#5e4b85]";

interface CreateDatasetDialogProps {
  onClose: () => void;
  onCreated?: (dataset: DatasetDto) => void;
}

export function CreateDatasetDialog({
  onClose,
  onCreated,
}: CreateDatasetDialogProps) {
  const createMutation = useCreateDataset();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [retrievalMode, setRetrievalMode] = useState<
    "keyword" | "semantic" | "hybrid"
  >("keyword");
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(80);
  const [topK, setTopK] = useState(4);
  const [scoreThreshold, setScoreThreshold] = useState(0.15);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);

    try {
      const dataset = await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        retrievalMode,
        chunkSize,
        chunkOverlap,
        topK,
        scoreThreshold,
      });
      onCreated?.(dataset);
      onClose();
    } catch {
      setError("知识库创建失败");
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="关闭弹窗"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-violet-200 bg-white shadow-2xl">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between border-b border-violet-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-[#2f2147]">
                创建知识库
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-2 text-[#8b7aa9] transition hover:bg-violet-50 hover:text-[#4b377f]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 px-6 py-4">
              <div>
                <label className={labelClass}>名称</label>
                <input
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：产品帮助中心"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>描述</label>
                <input
                  className={inputClass}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="可选描述"
                />
              </div>

              <div>
                <label className={labelClass}>检索模式</label>
                <select
                  className={inputClass}
                  value={retrievalMode}
                  onChange={(e) =>
                    setRetrievalMode(
                      e.target.value as "keyword" | "semantic" | "hybrid"
                    )
                  }
                >
                  <option value="keyword">关键词</option>
                  <option value="semantic">语义</option>
                  <option value="hybrid">混合</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>分块大小</label>
                  <input
                    className={inputClass}
                    type="number"
                    min={100}
                    max={4000}
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelClass}>分块重叠</label>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    max={500}
                    value={chunkOverlap}
                    onChange={(e) => setChunkOverlap(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Top K</label>
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    max={100}
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelClass}>分数阈值</label>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={scoreThreshold}
                    onChange={(e) => setScoreThreshold(Number(e.target.value))}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-violet-200 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm text-[#6b5a8b] transition hover:bg-violet-50 hover:text-[#2f2147]"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(135deg, #a068ff 0%, #42dcdb 100%)",
                }}
              >
                {createMutation.isPending ? "创建中..." : "创建知识库"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
