"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { duration, easeSoft } from "@/components/motion/tokens";
import { brand } from "@/lib/brand";
import {
  labelFor,
  visibleSteps,
  type EnquiryScript,
} from "@/lib/enquiry";

/**
 * Conversational enquiry.
 *
 * One question at a time, in Efe's voice, instead of a wall of labelled boxes.
 * The reason this converts better is not novelty, it is that each screen asks
 * for one small thing, and every answer you give raises the odds you finish the
 * next one. A twelve-field form shows you the whole cost up front.
 *
 * Ordering follows that: cheap, low-commitment questions first (what do you
 * need), personal details last. Someone six answers in will happily give a phone
 * number that they would have bounced off on question one.
 *
 * Deliberate choices:
 *
 *   · **Answered questions stay visible** as a scrollback above the current one.
 *     A conversation you cannot re-read is worse than a form, you lose the
 *     sense of how much you have already invested, and of what you said.
 *   · **Any answer is editable** by clicking it. No "back" ping-pong.
 *   · **Enter advances**, Shift+Enter makes a newline in long answers. Choice
 *     steps advance on click; there is no separate "next" to hunt for.
 *   · **A plain-form escape hatch.** Some people hate this pattern and some
 *     assistive tech handles a static form far better. The toggle is not a
 *     nicety. It is the accessible baseline, and it keeps the flow honest.
 *
 * Delivery is still `mailto:`. See EnquiryForm for why (no mail provider is
 * configured, and a form that silently discards a lead is worse than one that
 * opens your mail app).
 */
export function EnquiryConversation({
  script,
  kind,
  fallback,
  seed,
}: {
  script: EnquiryScript;
  kind: "trade" | "general";
  /** Static-form alternative, rendered when the visitor opts out. */
  fallback: React.ReactNode;
  /**
   * Answers already known from where the visitor came from.
   *
   * Someone who clicks "enquire about bulk supply" from the raw material
   * section has already told us what they want, and asking again is the kind of
   * small stupidity that makes people abandon a form. The conversation opens on
   * the first question the seed does not already answer.
   */
  seed?: Record<string, string>;
}) {
  const reduce = useReducedMotion();
  const [answers, setAnswers] = useState<Record<string, string>>(seed ?? {});
  const [index, setIndex] = useState(() => {
    if (!seed) return 0;
    const steps = visibleSteps(script, seed);
    const first = steps.findIndex((step) => !seed[step.id]);
    return first === -1 ? 0 : first;
  });
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [plainMode, setPlainMode] = useState(false);

  const steps = useMemo(() => visibleSteps(script, answers), [script, answers]);
  const step = steps[index];
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  // Focus the input as each question arrives, so typing just works.
  useEffect(() => {
    if (!step || step.kind === "choice") return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 260);
    return () => window.clearTimeout(timer);
  }, [step]);

  if (plainMode) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setPlainMode(false)}
          className="mb-4 text-sm font-semibold text-accent underline underline-offset-4"
        >
          ← Back to the guided version
        </button>
        {fallback}
      </div>
    );
  }

  function commit(value: string) {
    const trimmed = value.trim();
    if (!trimmed && !step.optional) return;

    const next = { ...answers, [step.id]: trimmed };
    setAnswers(next);
    setDraft("");

    // Recompute visibility with the new answer, a choice can reveal a step.
    const nextSteps = visibleSteps(script, next);
    const position = nextSteps.findIndex((s) => s.id === step.id);

    if (position === nextSteps.length - 1) setDone(true);
    else setIndex(position + 1);
  }

  function reopen(id: string) {
    const position = steps.findIndex((s) => s.id === id);
    if (position === -1) return;
    setEditing(id);
    setIndex(position);
    setDraft(answers[id] ?? "");
    setDone(false);
  }

  const answered = steps.slice(0, index).filter((s) => answers[s.id] !== undefined);
  const progress = Math.round(
    ((done ? steps.length : index) / Math.max(steps.length, 1)) * 100,
  );

  /* ---------------- review ---------------- */
  if (done) {
    const body = steps
      .filter((s) => answers[s.id])
      .map((s) => `${labelFor(s)}: ${answers[s.id]}`)
      .join("\n");

    const subject =
      kind === "trade"
        ? `Wholesale enquiry, ${answers.business_type ?? "trade"}`
        : `Website enquiry, ${answers.topic ?? "general"}`;

    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.slow, ease: easeSoft }}
        className="rounded-3xl border border-line bg-surface-sunken p-6 sm:p-8"
      >
        <p className="text-base/7 text-body">{script.closing}</p>

        <dl className="mt-6 divide-y divide-line border-y border-line">
          {steps
            .filter((s) => answers[s.id])
            .map((s) => (
              <div
                key={s.id}
                className="flex items-start justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <dt className="text-xs text-muted">{labelFor(s)}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-strong">
                    {answers[s.id]}
                  </dd>
                </div>
                <button
                  type="button"
                  onClick={() => reopen(s.id)}
                  className="shrink-0 text-xs text-accent underline underline-offset-4"
                >
                  Edit
                </button>
              </div>
            ))}
        </dl>

        <a
          href={`mailto:${brand.contact.email}?subject=${encodeURIComponent(
            subject,
          )}&body=${encodeURIComponent(body)}`}
          className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest px-7 py-3.5 font-semibold text-paper sm:w-auto"
        >
          Send it
          <span
            aria-hidden
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            &rarr;
          </span>
        </a>

        <p className="mt-3 text-xs/5 text-muted">
          Opens your email app with all of this filled in, so you can see exactly
          what is sent.
        </p>
      </motion.div>
    );
  }

  /* ---------------- conversation ---------------- */
  return (
    <div className="rounded-3xl border border-line bg-surface-sunken p-6 sm:p-8">
      {/* progress */}
      <div className="flex items-center gap-3">
        <div
          className="h-1 flex-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Enquiry progress"
        >
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{ width: `${progress}%` }}
            transition={{ duration: duration.base, ease: easeSoft }}
          />
        </div>
        <span className="stat shrink-0 text-xs text-muted">
          {Math.min(index + 1, steps.length)}/{steps.length}
        </span>
      </div>

      {/* greeting */}
      <p className="mt-6 text-sm/6 text-muted">{script.greeting}</p>

      {/* scrollback */}
      {answered.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {answered.map((s) => (
            <motion.li
              key={s.id}
              layout={!reduce}
              className="flex items-start justify-end gap-2"
            >
              <button
                type="button"
                onClick={() => reopen(s.id)}
                className="group max-w-[85%] rounded-2xl rounded-br-md bg-saffron/12 px-4 py-2.5 text-left text-sm text-strong transition-colors hover:bg-saffron/20"
              >
                <span className="block text-[0.65rem] text-muted">
                  {labelFor(s)}
                </span>
                {answers[s.id] || <em className="text-muted">Skipped</em>}
                <span
                  aria-hidden
                  className="ml-2 text-[0.65rem] text-accent opacity-0 transition-opacity group-hover:opacity-100"
                >
                  edit
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      {/* current question */}
      <div ref={liveRef} aria-live="polite">
        {/*
          A keyed `motion.div` rather than `AnimatePresence mode="wait"`.
          `mode="wait"` holds the next child until the previous one's EXIT
          animation reports completion, so if frames stop ticking (backgrounded
          tab, throttled rendering, an interrupted transition) the conversation
          deadlocks on the old question and the visitor is stuck. Observed
          exactly that: the step frozen at its initial style, content one answer
          behind, progress counter already advanced.

          Changing `key` remounts the node, so the entrance still animates, we
          simply give up the exit animation, which nobody was going to notice, in
          exchange for a flow that cannot jam.
        */}
        {step && (
            <motion.div
              key={step.id + (editing === step.id ? "-edit" : "")}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: duration.base, ease: easeSoft }}
              className="mt-6"
            >
              <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-surface-raised px-4 py-3 text-base/7 text-strong">
                {step.prompt}
              </p>
              {step.hint && (
                <p className="mt-2 text-xs/5 text-muted">{step.hint}</p>
              )}

              {/* answer control */}
              <div className="mt-5">
                {step.kind === "choice" ? (
                  <div className="flex flex-wrap gap-2">
                    {step.options?.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => commit(option)}
                        className="rounded-full border border-line bg-surface-raised px-4 py-2.5 text-sm text-body transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:text-strong"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    {step.kind === "long" ? (
                      <textarea
                        ref={inputRef as React.Ref<HTMLTextAreaElement>}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            commit(draft);
                          }
                        }}
                        rows={4}
                        placeholder={step.placeholder}
                        aria-label={labelFor(step)}
                        className="w-full resize-y rounded-2xl border border-line bg-surface-raised px-4 py-3 text-sm text-body placeholder:text-muted/60 focus:border-accent focus:outline-none"
                      />
                    ) : (
                      <input
                        ref={inputRef as React.Ref<HTMLInputElement>}
                        type={
                          step.kind === "email"
                            ? "email"
                            : step.kind === "tel"
                              ? "tel"
                              : "text"
                        }
                        inputMode={step.kind === "tel" ? "tel" : undefined}
                        autoComplete={
                          step.kind === "email"
                            ? "email"
                            : step.kind === "tel"
                              ? "tel"
                              : "off"
                        }
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commit(draft);
                          }
                        }}
                        placeholder={step.placeholder}
                        aria-label={labelFor(step)}
                        className="w-full rounded-full border border-line bg-surface-raised px-5 py-3 text-sm text-body placeholder:text-muted/60 focus:border-accent focus:outline-none"
                      />
                    )}

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => commit(draft)}
                        disabled={!draft.trim() && !step.optional}
                        className="rounded-full bg-forest px-6 py-3 text-sm font-semibold text-paper transition-transform active:scale-[0.98] disabled:opacity-40"
                      >
                        {index === steps.length - 1 ? "Review" : "Next"}
                      </button>
                      {step.optional && (
                        <button
                          type="button"
                          onClick={() => commit("")}
                          className="rounded-full px-4 py-3 text-sm text-muted transition-colors hover:text-strong"
                        >
                          Skip
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
        )}
      </div>

      {/* escape hatch */}
      <p className="mt-8 border-t border-line pt-5 text-xs text-muted">
        Prefer a normal form?{" "}
        <button
          type="button"
          onClick={() => setPlainMode(true)}
          className="font-semibold text-accent underline underline-offset-4"
        >
          Show all the fields at once
        </button>
        {" · "}
        or email{" "}
        <Link
          href={`mailto:${brand.contact.email}`}
          className="font-semibold text-accent underline underline-offset-4"
        >
          {brand.contact.email}
        </Link>
      </p>
    </div>
  );
}
