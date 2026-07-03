import type {
  GuideBlock,
  GuideDocument,
} from "../content/projectOperationGuide";

function renderBlock(block: GuideBlock, key: string) {
  if (block.type === "paragraph") {
    return (
      <p key={key} className="text-sm leading-7 text-slate-600">
        {block.text}
      </p>
    );
  }

  if (block.type === "list") {
    return (
      <ul key={key} className="space-y-2 text-sm leading-7 text-slate-600">
        {block.items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-sky-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "code") {
    return (
      <pre
        key={key}
        className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-xs leading-6 text-slate-100 shadow-inner"
      >
        <code>{block.code}</code>
      </pre>
    );
  }

  const toneClass =
    block.tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-sky-200 bg-sky-50 text-sky-900";

  return (
    <div
      key={key}
      className={`rounded-2xl border px-4 py-3 text-sm leading-7 ${toneClass}`}
    >
      {block.text}
    </div>
  );
}

export function OperationGuideArticle({
  document,
}: {
  document: GuideDocument;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
            Guide
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            {document.title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {document.intro}
          </p>
          <nav className="mt-6 space-y-2">
            {document.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block rounded-xl px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </div>
      </aside>

      <div className="space-y-6">
        {document.sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {index + 1}
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                {section.title}
              </h2>
            </div>
            <div className="mt-5 space-y-4">
              {section.blocks.map((block, blockIndex) =>
                renderBlock(block, `${section.id}-${blockIndex}`)
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
