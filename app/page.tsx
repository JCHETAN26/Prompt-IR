"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { IROutput } from "@/components/ir-output/IROutput";
import { CommandPalette, type PaletteCommand } from "@/components/palette/CommandPalette";
import { Refinery } from "@/components/refinery/Refinery";
import { AppShell } from "@/components/shell/AppShell";
import { compileSource, modeForModel } from "@/lib/compile-client";
import { formatIR } from "@/lib/format-ir";
import { useHotkey } from "@/lib/hotkeys";
import { MODELS, type ModelKey } from "@/lib/pricing";
import type { CompileResponse, CompileState } from "@/lib/types";

const MODEL_STORAGE_KEY = "prompt-ir.model";

function isModelKey(value: unknown): value is ModelKey {
  return typeof value === "string" && (MODELS as readonly string[]).includes(value);
}

export default function Home() {
  const [source, setSource] = useState("");
  const [response, setResponse] = useState<CompileResponse | null>(null);
  const [model, setModel] = useState<ModelKey>("claude-sonnet");
  // Tracks the model used for the most recent successful compile. Lets us
  // surface a "Recompile to apply" hint when the active toggle drifts away
  // from what actually produced the IR on screen.
  const [compiledWithModel, setCompiledWithModel] = useState<ModelKey | null>(null);
  const [compileState, setCompileState] = useState<CompileState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Hydrate the toggle from localStorage post-mount. We can't read it in
  // initial state without a hydration mismatch — the server has no
  // localStorage, so SSR renders "claude-sonnet" and the client switches
  // to whatever's saved on the first effect tick. The set-state-in-effect
  // lint is suppressed: this is the canonical "load saved preference on
  // mount" pattern, the extra render is one-off, and the cleaner
  // useSyncExternalStore path is overkill for a single string preference.
  const hydrated = useRef(false);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(MODEL_STORAGE_KEY);
      if (isModelKey(saved)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setModel(saved);
      }
    } catch {
      // localStorage can be disabled / blocked. Silently fall back to default.
    }
    hydrated.current = true;
  }, []);

  // Persist on change, but only after hydration — otherwise the initial
  // "claude-sonnet" default would clobber a saved "gpt-4o" before the
  // hydrate effect fires.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(MODEL_STORAGE_KEY, model);
    } catch {
      // ignore quota / private-mode failures
    }
  }, [model]);

  const mode = modeForModel(model);
  const ir = response ? formatIR(response.ir, mode) : null;
  const isStale = ir !== null && compiledWithModel !== null && compiledWithModel !== model;

  const handleCompile = useCallback(async () => {
    if (!source.trim() || compileState === "compiling") return;
    setCompileState("compiling");
    setErrorMessage(null);
    setErrorDetails(null);

    const result = await compileSource(source, modeForModel(model));

    if (!result.ok) {
      setErrorMessage(result.error);
      setErrorDetails(result.details ?? null);
      setCompileState("error");
      return;
    }

    setResponse(result.data);
    setCompiledWithModel(model);
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
            errorDetails={errorDetails}
            model={model}
            compileState={compileState}
            isStale={isStale}
          />
        </div>
      </AppShell>
      <CommandPalette open={paletteOpen} onClose={closePalette} commands={commands} />
    </>
  );
}
