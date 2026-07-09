import type { DatasetDocumentDto } from "../../types";

interface DocumentListProps {
  documents: DatasetDocumentDto[];
  isLoading: boolean;
}

const statusConfig: Record<
  DatasetDocumentDto["status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-yellow-500/15 text-yellow-400",
  },
  indexing: {
    label: "Indexing",
    className: "bg-blue-500/15 text-blue-400",
  },
  completed: {
    label: "Completed",
    className: "bg-green-500/15 text-green-400",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/15 text-red-400",
  },
};

const sourceTypeConfig: Record<DatasetDocumentDto["sourceType"], string> = {
  text: "Text",
  markdown: "Markdown",
  file: "File",
};

export function DocumentList({ documents, isLoading }: DocumentListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-4 text-sm text-[#7b6b9d]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
        Loading documents...
      </div>
    );
  }

  const hasInProgress = documents.some(
    (d) => d.status === "pending" || d.status === "indexing"
  );

  return (
    <div>
      {hasInProgress && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/8 px-3 py-2 text-sm text-accent">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Indexing in progress...
        </div>
      )}

      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-violet-200 bg-white/90 px-4 py-10 text-center text-sm text-[#7b6b9d]">
          No documents uploaded yet
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const status = statusConfig[doc.status];
            const sourceLabel = sourceTypeConfig[doc.sourceType];

            return (
              <div
                key={doc.id}
                className="rounded-xl border border-violet-200 bg-white/92 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#2f2147]">
                      {doc.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-[#7b6b9d]">
                      {sourceLabel}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}
                      title={
                        doc.status === "failed" && doc.errorMessage
                          ? doc.errorMessage
                          : undefined
                      }
                    >
                      {status.label}
                      {doc.status === "indexing" ? (
                        <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-current align-middle" />
                      ) : null}
                    </span>
                  </div>
                </div>
                {doc.status === "failed" && doc.errorMessage && (
                  <p className="mt-1 text-xs text-red-400/70 truncate">
                    {doc.errorMessage}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
