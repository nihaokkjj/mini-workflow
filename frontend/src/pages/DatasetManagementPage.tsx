import { useState } from "react";
import { Link } from "react-router-dom";
import { useDatasets } from "../queries/datasets/useDatasets";
import { useListDocuments } from "../queries/datasets/useListDocuments";
import { CreateDatasetDialog } from "../features/datasets/CreateDatasetDialog";
import { AddDocumentDialog } from "../features/datasets/AddDocumentDialog";
import { DocumentList } from "../features/datasets/DocumentList";
import type { DatasetDto } from "../types";

export default function DatasetManagementPage() {
  const { data: datasets = [], isLoading, error } = useDatasets();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<DatasetDto | null>(null);
  const [showAddDoc, setShowAddDoc] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-5xl px-6 py-8 text-[#2f2147]">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2f2147]">
              Knowledge Bases
            </h1>
            <p className="mt-1 text-sm text-[#5e4b85]">
              Manage datasets and upload documents for RAG retrieval
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-lg px-4 py-2 text-sm text-[#6b5a8b] transition hover:bg-white/70 hover:text-[#2f2147]"
            >
              ← Back to Apps
            </Link>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition"
              style={{
                background: "linear-gradient(135deg, #a068ff 0%, #42dcdb 100%)",
              }}
            >
              + Create Dataset
            </button>
          </div>
        </div>

        {/* Breadcrumb when viewing dataset detail */}
        {selected && (
          <div className="mb-6 flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-[#7b6b9d] hover:text-[#4b377f] transition"
            >
              ← All Datasets
            </button>
            <span className="text-[#c5bbdd]">/</span>
            <span className="font-medium text-[#4b377f]">{selected.name}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Failed to load datasets
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center gap-3 py-8 text-sm text-[#7b6b9d]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
            Loading datasets...
          </div>
        )}

        {/* Dataset List or Detail */}
        {!isLoading && !selected && (
          <>
            {datasets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/14 bg-white/[0.06] px-6 py-12 text-center">
                <p className="text-sm text-[#7b6b9d]">
                  No datasets yet. Create one to get started.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {datasets.map((dataset) => (
                  <button
                    key={dataset.id}
                    type="button"
                    onClick={() => setSelected(dataset)}
                    className="rounded-xl border border-white/12 bg-white/[0.06] px-5 py-4 text-left transition hover:border-white/20 hover:bg-white/[0.1]"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#2f2147]">
                        {dataset.name}
                      </h3>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[#6b46c1]">
                        {dataset.retrievalMode}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#7b6b9d]">
                      {dataset.description?.trim() || "No description"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#7b6b9d]">
                      <span className="rounded-full bg-violet-50 px-2 py-1">
                        Status: {dataset.status}
                      </span>
                      <span className="rounded-full bg-violet-50 px-2 py-1">
                        Chunk: {dataset.chunkSize}
                      </span>
                      <span className="rounded-full bg-violet-50 px-2 py-1">
                        Top K: {dataset.topK}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Dataset Detail */}
        {selected && (
          <DatasetDetail
            dataset={selected}
            onAddDocument={() => setShowAddDoc(true)}
          />
        )}

        {/* Dialogs */}
        {showCreate && (
          <CreateDatasetDialog
            onClose={() => setShowCreate(false)}
            onCreated={(ds) => {
              setShowCreate(false);
              setSelected(ds);
            }}
          />
        )}

        {showAddDoc && selected && (
          <AddDocumentDialog
            datasetId={selected.id}
            onClose={() => setShowAddDoc(false)}
          />
        )}
      </div>
    </div>
  );
}

function DatasetDetail({
  dataset,
  onAddDocument,
}: {
  dataset: DatasetDto;
  onAddDocument: () => void;
}) {
  const { data: documents = [], isLoading } = useListDocuments(dataset.id);

  return (
    <div className="space-y-6">
      {/* Dataset info card */}
      <div className="rounded-xl border border-white/12 bg-white/[0.06] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#2f2147]">
              {dataset.name}
            </h3>
            <p className="mt-1 text-sm text-[#5e4b85]">
              {dataset.description?.trim() || "No description"}
            </p>
          </div>
          <button
            type="button"
            onClick={onAddDocument}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition"
            style={{
              background: "linear-gradient(135deg, #a068ff 0%, #42dcdb 100%)",
            }}
          >
            + Add Document
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <span className="text-[#7b6b9d]">Retrieval</span>
            <p className="font-medium text-[#4b377f]">
              {dataset.retrievalMode}
            </p>
          </div>
          <div>
            <span className="text-[#7b6b9d]">Chunk Size</span>
            <p className="font-medium text-[#4b377f]">{dataset.chunkSize}</p>
          </div>
          <div>
            <span className="text-[#7b6b9d]">Overlap</span>
            <p className="font-medium text-[#4b377f]">{dataset.chunkOverlap}</p>
          </div>
          <div>
            <span className="text-[#7b6b9d]">Top K / Threshold</span>
            <p className="font-medium text-[#4b377f]">
              {dataset.topK} / {dataset.scoreThreshold}
            </p>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-[#5e4b85]">Documents</h4>
        <DocumentList documents={documents} isLoading={isLoading} />
      </div>
    </div>
  );
}
