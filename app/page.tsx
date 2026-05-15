"use client";

import { useCallback, useMemo, useState } from "react";

import { IROutput } from "@/components/ir-output/IROutput";
import { CommandPalette, type PaletteCommand } from "@/components/palette/CommandPalette";
import { Refinery } from "@/components/refinery/Refinery";
import { AppShell } from "@/components/shell/AppShell";
import { compileSource, modeForModel } from "@/lib/compile-client";
import { formatIR } from "@/lib/format-ir";
import { useHotkey } from "@/lib/hotkeys";
import type { ModelKey } from "@/lib/pricing";
import type { CompileResponse, CompileState } from "@/lib/types";

export default function Home() {
  const [source, setSource] = useState("");
  const [response, setResponse] = useState<CompileResponse | null>(null);
  const [model, setModel] = useState<ModelKey>("claude-sonnet");
  const [compileState, setCompileState] = useState<CompileState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const mode = modeForModel(model);
  const ir = response ? formatIR(response.ir, mode) : null;

  const handleCompile = useCallback(async () => {
    if (!source.trim() || compileState === "compiling") return;
    setCompileState("compiling");
    setErrorMessage(null);

    const result = await compileSource(source, modeForModel(model));

    if (!result.ok) {
      setErrorMessage(result.error);
      setCompileState("error");
      return;
    }

    setResponse(result.data);
    setCompileState("done");
  }, [source, model, compileState]);

  const handleCopyIR = useCallback(async () => {
    if (!ir) return;
    try {
      await navigator.clipboard.writeText(ir);
    } catch {
      // Clipboard write can fail without HTTPS / user gesture. Silent here;
      // explicit copy actions in the Export menu (Task 3.4) will surface errors.
    }
  }, [ir]);

  const togglePalette = useCallback(() => setPaletteOpen((open) => !open), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useHotkey("meta+enter", handleCompile);
  useHotkey("meta+k", togglePalette);
  useHotkey("escape", closePalette);
  useHotkey("meta+c", handleCopyIR, {
    ignoreInputs: true,
    ignoreIfSelected: true,
  });

  const commands = useMemo<PaletteCommand[]>(
    () => [{ id: "compile", label: "Compile", shortcut: "⌘↵", onSelect: handleCompile }],
    [handleCompile]
  );

  return (
    <>
      <AppShell model={model} onModelChange={setModel}>
        <div className="grid flex-1 grid-cols-2 divide-x divide-border">
          <Refinery
            value={source}
            onChange={setSource}
            model={model}
            compileState={compileState}
            onCompile={handleCompile}
          />
          <IROutput
            ir={ir}
            diff={response?.diff ?? null}
            errorMessage={errorMessage}
            model={model}
            compileState={compileState}
          />
        </div>
      </AppShell>
      <CommandPalette open={paletteOpen} onClose={closePalette} commands={commands} />
    </>
  );
}
