"use client";

type RefineryProps = {
  value: string;
  onChange: (next: string) => void;
};

export function Refinery({ value, onChange }: RefineryProps) {
  return (
    <section className="flex flex-col">
      <div className="flex h-10 items-center border-b border-border px-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        source
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        placeholder="Drop your messy logic, context, and requirements here..."
        className="flex-1 resize-none bg-transparent px-6 py-5 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
      />
    </section>
  );
}
