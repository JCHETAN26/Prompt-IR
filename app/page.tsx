"use client";

import { useCallback, useEffect, useState } from "react";

import { IROutput } from "@/components/ir-output/IROutput";
import { Refinery } from "@/components/refinery/Refinery";
import { AppShell } from "@/components/shell/AppShell";
import type { ModelKey } from "@/lib/pricing";
import type { CompileState } from "@/lib/types";

const COMPILE_DELAY_MS = 800;

export default function Home() {
  const [source, setSource] = useState("");
  const [ir, setIR] = useState<string | null>(null);
  const [model, setModel] = useState<ModelKey>("claude-sonnet");
  const [compileState, setCompileState] = useState<CompileState>("idle");

  const handleCompile = useCallback(async () => {
    if (!source.trim() || compileState === "compiling") return;
    setCompileState("compiling");
    await new Promise((resolve) => setTimeout(resolve, COMPILE_DELAY_MS));
    setIR(`<context>\n${source.trim()}\n</context>`);
    setCompileState("done");
  }, [source, compileState]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleCompile();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleCompile]);

  return (
    <AppShell model={model} onModelChange={setModel}>
      <div className="grid flex-1 grid-cols-2 divide-x divide-border">
        <Refinery
          value={source}
          onChange={setSource}
          model={model}
          compileState={compileState}
          onCompile={handleCompile}
        />
        <IROutput ir={ir} model={model} compileState={compileState} />
      </div>
    </AppShell>
  );
}
