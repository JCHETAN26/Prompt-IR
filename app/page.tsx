import { AppShell } from "@/components/shell/AppShell";

export default function Home() {
  return (
    <AppShell>
      <div className="flex flex-1 items-center justify-center font-mono text-sm text-muted-foreground">
        Compile to see the IR.
      </div>
    </AppShell>
  );
}
