"use client";

import { useState } from "react";

import { IROutput } from "@/components/ir-output/IROutput";
import { Refinery } from "@/components/refinery/Refinery";
import { AppShell } from "@/components/shell/AppShell";
import type { ModelKey } from "@/lib/pricing";

export default function Home() {
  const [source, setSource] = useState("");
  const [ir] = useState<string | null>(null);
  const [model, setModel] = useState<ModelKey>("claude-sonnet");

  return (
    <AppShell model={model} onModelChange={setModel}>
      <div className="grid flex-1 grid-cols-2 divide-x divide-border">
        <Refinery value={source} onChange={setSource} model={model} />
        <IROutput ir={ir} model={model} />
      </div>
    </AppShell>
  );
}
