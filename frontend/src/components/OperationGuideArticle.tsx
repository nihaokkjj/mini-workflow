import type {
  GuideBlock,
  GuideDocument,
} from "../content/projectOperationGuide";

function renderBlock(block: GuideBlock, key: string) {
  if (block.type === "paragraph") {
    return (
      <p key={key} className="text-sm leading-7 text-white/60">
        {block.text}
      </p>
    );
  }

  if (block.type === "list") {
    return (
      <ul key={key} className="space-y-2 text-sm leading-7 text-white/60">
        {block.items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
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
        className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0d0d14] px-4 py-4 text-xs leading-6 text-white/70"
      >
        <code>{block.code}</code>
      </pre>
    );
  }

  const toneClass =
    block.tone === "warn"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
      : "border-accent/30 bg-accent/10 text-accent";

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
        <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 backdrop-blur-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.8px] text-accent">
            Guide
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold text-white">
            {document.title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/50">
            {document.intro}
          </p>
          <nav className="mt-6 space-y-2">
            {document.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block rounded-xl px-3 py-2 text-sm text-white/50 transition hover:bg-white/5 hover:text-white"
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
            className="rounded-[28px] border border-white/8 bg-white/[0.03] p-6 backdrop-blur-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white font-mono text-sm font-semibold text-black">
                {index + 1}
              </div>
              <h2 className="text-xl font-semibold text-white">
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
