type IROutputProps = {
  ir: string | null;
};

export function IROutput({ ir }: IROutputProps) {
  const isEmpty = ir === null || ir.trim().length === 0;

  return (
    <section className="flex flex-col">
      <div className="flex h-10 items-center border-b border-border px-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        ir
      </div>
      <div className="flex-1 overflow-auto px-6 py-5 font-mono text-sm leading-relaxed">
        {isEmpty ? (
          <span className="text-muted-foreground/50">Compile to see the IR.</span>
        ) : (
          <pre className="whitespace-pre-wrap text-foreground">{ir}</pre>
        )}
      </div>
    </section>
  );
}
