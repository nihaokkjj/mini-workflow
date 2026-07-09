import { useRef, useState, type DragEvent } from "react";
import { useUploadDocument } from "../../queries/datasets/useUploadDocument";
import type { DatasetDocumentDto } from "../../types";

const ALLOWED_EXTENSIONS = [".txt", ".md", ".pdf", ".docx", ".csv", ".xlsx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const inputClass =
  "mt-2 w-full rounded-xl border border-white/14 bg-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition";
const labelClass = "text-sm font-medium text-[#5e4b85]";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

interface AddDocumentDialogProps {
  datasetId: string;
  onClose: () => void;
  onUploaded?: (doc: DatasetDocumentDto) => void;
}

export function AddDocumentDialog({
  datasetId,
  onClose,
  onUploaded,
}: AddDocumentDialogProps) {
  const uploadMutation = useUploadDocument(datasetId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const validateFile = (f: File): string | null => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }
    if (f.size > MAX_FILE_SIZE) {
      return `File too large (${formatBytes(f.size)}). Maximum: ${formatBytes(MAX_FILE_SIZE)}`;
    }
    return null;
  };

  const handleFile = (f: File) => {
    setClientError(null);
    const err = validateFile(f);
    if (err) {
      setClientError(err);
      return;
    }
    setFile(f);
    if (!docName) setDocName(f.name);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      const doc = await uploadMutation.mutateAsync({
        file,
        name: docName.trim() || file.name,
      });
      onUploaded?.(doc);
      onClose();
    } catch {
      setClientError("Failed to upload document");
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-violet-200 bg-white shadow-2xl">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between border-b border-violet-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-[#2f2147]">
                Add Document
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
                <label className={labelClass}>Document Name (optional)</label>
                <input
                  className={inputClass}
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Defaults to file name"
                />
              </div>

              <div>
                <label className={labelClass}>File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_EXTENSIONS.join(",")}
                  onChange={handleChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`mt-2 w-full rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
                    isDragging
                      ? "border-accent bg-accent/8"
                      : "border-white/14 bg-white/[0.06] hover:border-white/25 hover:bg-white/[0.1]"
                  }`}
                >
                  {file ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-[#2f2147]">
                        {file.name}
                      </p>
                      <p className="text-xs text-[#7b6b9d]">
                        {formatBytes(file.size)}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          if (fileInputRef.current)
                            fileInputRef.current.value = "";
                        }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-[#5e4b85]">
                        Drop a file here or click to browse
                      </p>
                      <p className="mt-1 text-xs text-[#7b6b9d]">
                        .txt .md .pdf .docx .csv .xlsx (max 10 MB)
                      </p>
                    </>
                  )}
                </button>
              </div>

              {clientError && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {clientError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-violet-200 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm text-[#6b5a8b] transition hover:bg-violet-50 hover:text-[#2f2147]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!file || uploadMutation.isPending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(135deg, #a068ff 0%, #42dcdb 100%)",
                }}
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload & Index"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
