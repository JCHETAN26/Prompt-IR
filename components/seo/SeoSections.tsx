/**
 * Below-the-fold landing content. Four sections targeting the SEO terms
 * called out in the README; each is genuine writing, not keyword stuffing,
 * and links into the compiler features it references.
 */
export function SeoSections() {
  return (
    <div className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-3xl flex-col gap-16 px-6 py-20">
        <SonnetCostsSection />
        <XmlTaggingSection />
        <CursorOptimizationSection />
        <PromptPerfectSection />
        <FooterLine />
      </div>
    </div>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      <a href={`#${id}`} className="hover:text-foreground">
        {children}
      </a>
    </h2>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-2 font-sans text-2xl font-medium tracking-tight text-foreground">
      {children}
    </h3>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 flex flex-col gap-4 text-[14px] leading-relaxed text-foreground/85">
      {children}
    </div>
  );
}

function SonnetCostsSection() {
  return (
    <section>
      <SectionTitle id="reduce-sonnet-costs">SEO · cost</SectionTitle>
      <SectionHeading>How to reduce Claude 3.5 Sonnet token costs</SectionHeading>
      <Prose>
        <p>
          Claude 3.5 Sonnet bills at <strong>$3 per million input tokens</strong> and{" "}
          <strong>$15 per million output tokens</strong> — five times the input rate. That ratio
          matters: <em>output tokens are where the bill actually grows</em>. A 500-token prompt that
          triggers a 2,000-token response costs $0.0015 — $0.001 of which is output. Cut the
          response in half without changing the input, and you&apos;ve saved more than you would by
          deleting most of the prompt.
        </p>
        <p>
          That makes prompt engineering for cost reduction a slightly counterintuitive exercise. The
          instinct is to compress the input — and there are real wins there (filler removal,
          restructuring). But the bigger lever is{" "}
          <strong>
            giving the model enough structure that it doesn&apos;t need to over-explain
          </strong>
          . A vague prompt produces a verbose, hedged answer. A structured one produces a focused
          one.
        </p>
        <p>Three concrete moves:</p>
        <ol className="ml-4 list-decimal space-y-2">
          <li>
            <strong>Use Anthropic&apos;s ephemeral prompt cache.</strong> Add a{" "}
            <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px]">
              cache_control: {`{ type: "ephemeral" }`}
            </code>{" "}
            marker to any prefix you reuse within five minutes. Cached input tokens cost roughly 10%
            of base — a ~90% discount on the static portion. The first call writes the cache at a
            slight premium; subsequent calls inside the TTL pay it back many times over.
          </li>
          <li>
            <strong>Structure your prompts with explicit sections.</strong> Claude&apos;s attention
            anchors on XML tags. A four-section spec (
            <code className="font-mono text-[12px]">&lt;context&gt;</code>,{" "}
            <code className="font-mono text-[12px]">&lt;constraints&gt;</code>,{" "}
            <code className="font-mono text-[12px]">&lt;rules&gt;</code>,{" "}
            <code className="font-mono text-[12px]">&lt;task&gt;</code>) gets a focused
            implementation back instead of a wandering essay. Prompt-IR&apos;s compiler emits
            exactly this structure — scroll up to see the diff panel for what gets removed and why.
          </li>
          <li>
            <strong>Drop the politeness and hedges.</strong> &ldquo;Could you maybe help me
            build...&rdquo; consumes tokens the model parses with no upside. Our{" "}
            <a
              href="https://github.com/JCHETAN26/Prompt-IR#honest-caveats"
              className="text-foreground underline decoration-muted-foreground/40 hover:decoration-foreground"
            >
              empirical matrix
            </a>{" "}
            shows filler-heavy prompts produce ~57% fewer output tokens once stripped.
          </li>
        </ol>
        <p>
          Pair these with Haiku for cheap secondary calls — judge, summarize, classify — and
          you&apos;ve cut both halves of the bill.
        </p>
      </Prose>
    </section>
  );
}

function XmlTaggingSection() {
  return (
    <section>
      <SectionTitle id="xml-tagging-template">SEO · structure</SectionTitle>
      <SectionHeading>XML tagging template for LLM prompts</SectionHeading>
      <Prose>
        <p>
          Claude was trained to treat XML tags as structural anchors. The attention mechanism
          weights content inside named tags differently from free prose. The implication: if you
          want Claude to obey your instructions reliably, <strong>wrap them in tags</strong>.
        </p>
        <p>The canonical four-section template:</p>
        <pre className="overflow-x-auto rounded border border-border bg-card/40 p-4 font-mono text-[12px] leading-relaxed">
          {`<context>
What the model needs to know: domain, prior facts,
constraints not stated as rules.
</context>

<constraints>
Hard guardrails: must / never / at most / at least.
</constraints>

<rules>
Conditional logic: always/never under specific
conditions, edge cases.
</rules>

<task>
The specific output you want, in one or two sentences.
</task>`}
        </pre>
        <p>
          Why this order matters: <strong>context → constraints → rules → task</strong> mirrors how
          a human reads a spec. By the time the model gets to <code>&lt;task&gt;</code>, it has
          absorbed what the world looks like, what the boundaries are, and how to behave at the
          edges. Reverse the order and the model produces drafts that don&apos;t honor your rules.
        </p>
        <p>Three common mistakes:</p>
        <ol className="ml-4 list-decimal space-y-2">
          <li>
            <strong>Nesting tags inside tags.</strong>{" "}
            <code className="font-mono text-[12px]">
              &lt;context&gt;&lt;background&gt;...&lt;/background&gt;&lt;/context&gt;
            </code>{" "}
            is more confusing than helpful. One level of structure is enough.
          </li>
          <li>
            <strong>
              Putting code inside <code className="font-mono text-[12px]">&lt;task&gt;</code>.
            </strong>{" "}
            Code belongs in <code className="font-mono text-[12px]">&lt;context&gt;</code> —
            it&apos;s information the model uses, not instructions to execute. Reserve{" "}
            <code className="font-mono text-[12px]">&lt;task&gt;</code> for one or two sentences
            describing the requested output.
          </li>
          <li>
            <strong>
              Skipping <code className="font-mono text-[12px]">&lt;rules&gt;</code> and{" "}
              <code className="font-mono text-[12px]">&lt;constraints&gt;</code>.
            </strong>{" "}
            Treating them as the same field loses Claude&apos;s ability to distinguish{" "}
            <em>rules I follow when the conditions apply</em> from{" "}
            <em>constraints I never violate</em>.
          </li>
        </ol>
        <p>
          The OpenAI equivalent is Markdown headings (<code>## Context</code>,{" "}
          <code>## Constraints</code>, <code>## Rules</code>, <code>## Task</code>) — same logical
          structure, different surface form. Gemini handles both but parses Markdown more naturally.
          Prompt-IR enforces the canonical order automatically, and the Cache-Ready Badge in the IR
          panel confirms your output has all four sections in the right sequence before you commit
          to using it as a cached prefix.
        </p>
      </Prose>
    </section>
  );
}

function CursorOptimizationSection() {
  return (
    <section>
      <SectionTitle id="cursor-prompt-optimization">SEO · cursor</SectionTitle>
      <SectionHeading>Cursor IDE prompt optimization</SectionHeading>
      <Prose>
        <p>
          Cursor&apos;s agent runs in a loop: your prompt + retrieved context + the codebase +
          previous turns + the agent&apos;s own internal scratch. Every token you waste at the top
          compounds across the loop. A 200-token messy instruction becomes 200 wasted tokens per
          agent step — and a long task can take dozens of steps.
        </p>
        <p>The Cursor-specific moves:</p>
        <ol className="ml-4 list-decimal space-y-2">
          <li>
            <strong>Drop conversational framing.</strong> &ldquo;Can you help me refactor this
            function&rdquo; is a 5-token wrapper for &ldquo;refactor.&rdquo; Cursor&apos;s agent
            doesn&apos;t need niceties; it needs a target. Filler-laden prompts produce ~57% more
            output tokens (data in our{" "}
            <a
              href="https://github.com/JCHETAN26/Prompt-IR#honest-caveats"
              className="text-foreground underline decoration-muted-foreground/40 hover:decoration-foreground"
            >
              Honest Caveats matrix
            </a>
            ).
          </li>
          <li>
            <strong>Front-load constraints.</strong> &ldquo;Don&apos;t use external libraries. Keep
            the function signature. Inline the helpers.&rdquo; These belong in your prompt&apos;s{" "}
            <em>first lines</em>, not buried in the middle. Cursor&apos;s context window has a
            recency bias — early constraints stay attended-to longer.
          </li>
          <li>
            <strong>Use the four-section IR as a checklist.</strong> Before pasting into Cursor,
            ask:{" "}
            <em>
              does my prompt have context (the file/feature I&apos;m working on), constraints (what
              NOT to do), rules (edge cases), and a task (the specific change)?
            </em>{" "}
            If any section is missing, the agent will guess — and guessing produces verbose, hedged
            code.
          </li>
          <li>
            <strong>Export to Cursor explicitly.</strong> Prompt-IR&apos;s &ldquo;copy for
            cursor&rdquo; button (in the export strip below the IR) prefixes the IR with a framing
            comment naming the mode and instructing the agent how to read it. Paste, hit enter, and
            the agent has structure without needing to parse intent from prose.
          </li>
        </ol>
        <p>
          The empirical compounding: a properly structured prompt that saves 30% per step over 20
          steps saves more than 30% — agent loops amplify both noise and signal. Same logic applies
          to Claude Code, Aider, and any other agent that re-uses prompt prefixes turn over turn.
        </p>
      </Prose>
    </section>
  );
}

function PromptPerfectSection() {
  return (
    <section>
      <SectionTitle id="promptperfect-alternative">SEO · alternative</SectionTitle>
      <SectionHeading>Best PromptPerfect alternative 2026</SectionHeading>
      <Prose>
        <p>
          PromptPerfect sunset in 2025. Its core promise — &ldquo;make your prompts better&rdquo; —
          was always vague, and the tool optimized for prose quality rather than the structural
          signals production LLM use actually cares about. The replacements split along two axes:
        </p>
        <ul className="ml-4 list-disc space-y-2">
          <li>
            <strong>Editors</strong> rewrite your prompt into &ldquo;better&rdquo; prose. Still
            subjective; still no measurable output.
          </li>
          <li>
            <strong>Compilers</strong> (like Prompt-IR) restructure your prompt into a typed,
            schema-validated IR with quantified diffs.
          </li>
        </ul>
        <p>Why structure beats prose:</p>
        <ol className="ml-4 list-decimal space-y-2">
          <li>
            <strong>You can measure structure, not vibes.</strong> Token count, density score,
            compression ratio, cache-ready threshold — every signal in Prompt-IR is a number a
            programmer can act on. &ldquo;Better prose&rdquo; isn&apos;t.
          </li>
          <li>
            <strong>The diff explains every change.</strong> PromptPerfect rewrote your prompt and
            gave you the new one. Prompt-IR shows you which words it removed, which it restructured,
            and which it replaced — each annotated with a one-sentence &ldquo;why&rdquo; tooltip.
          </li>
          <li>
            <strong>Multi-provider in one tool.</strong> PromptPerfect treated all models the same.
            Prompt-IR routes Claude (XML), OpenAI (Markdown), and Gemini (Markdown + JSON
            enforcement) through a single dispatcher and renders the IR appropriately for each.
          </li>
          <li>
            <strong>Open about its limits.</strong> Some prompts shouldn&apos;t be compiled at all —
            tight, high-density imperatives often inflate downstream output when wrapped in IR.
            Prompt-IR shows an inline &ldquo;your prompt is already tight&rdquo; hint when density
            crosses 85%. That&apos;s not in PromptPerfect&apos;s product surface, and it should have
            been.
          </li>
        </ol>
        <p>
          Migration is one-way: paste your saved PromptPerfect prompts into Prompt-IR&apos;s Source
          panel and hit compile. The IR replaces whatever rewrite PromptPerfect had given you, with
          the diff explaining each refinement and an exportable{" "}
          <code className="font-mono text-[12px]">.md</code> /{" "}
          <code className="font-mono text-[12px]">.txt</code> output for paste-into-anywhere
          workflows.
        </p>
      </Prose>
    </section>
  );
}

function FooterLine() {
  return (
    <p className="border-t border-border pt-8 text-center font-mono text-[11px] text-muted-foreground/60">
      open source on{" "}
      <a
        href="https://github.com/JCHETAN26/Prompt-IR"
        className="underline decoration-muted-foreground/40 hover:text-foreground hover:decoration-foreground"
      >
        github.com/JCHETAN26/Prompt-IR
      </a>{" "}
      · MIT
    </p>
  );
}
