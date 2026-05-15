"use client";

import { useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { Refinery } from "@/components/refinery/Refinery";
import { IROutput } from "@/components/ir-output/IROutput";

export default function Home() {
  const [source, setSource] = useState("");
  const [ir] = useState<string | null>(null);

  return (
    <AppShell>
      <div className="grid flex-1 grid-cols-2 divide-x divide-border">
        <Refinery value={source} onChange={setSource} />
        <IROutput ir={ir} />
      </div>
    </AppShell>
  );
}
