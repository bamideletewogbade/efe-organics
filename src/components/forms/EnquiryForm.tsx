"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { duration, easeSoft } from "@/components/motion/tokens";
import { brand } from "@/lib/brand";

/**
 * Enquiry form, trade and general.
 *
 * **This does not submit anywhere yet.** There is no mail provider wired
 * (`capabilities.hasEmail` is false without RESEND_API_KEY), so rather than
 * POST into a void and show a fake "thanks, we'll be in touch", the form
 * composes the enquiry into a `mailto:` and hands it to the visitor's mail app.
 *
 * That is a deliberate choice over a dead form: nothing is silently lost, it
 * works today with zero backend, and the visitor can see exactly what is being
 * sent. When Resend is configured this becomes a server action and the mailto
 * stays as the no-JavaScript fallback.
 *
 * Validation is the browser's own (`required`, `type="email"`), which is
 * accessible and needs no JavaScript.
 */
export function EnquiryForm({
  kind = "general",
  subjects,
}: {
  kind?: "trade" | "general";
  subjects: string[];
}) {
  const reduce = useReducedMotion();
  const [subject, setSubject] = useState(subjects[0]);

  const field =
    "w-full rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm text-body transition-colors placeholder:text-muted/60 focus:border-accent focus:outline-none";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const lines = [
      `Name: ${data.get("name")}`,
      `Business: ${data.get("business") || "-"}`,
      `Email: ${data.get("email")}`,
      `Phone: ${data.get("phone") || "-"}`,
      `Location: ${data.get("location") || "-"}`,
      `Enquiry: ${data.get("subject")}`,
      "",
      String(data.get("message") ?? ""),
    ];

    const href =
      `mailto:${brand.contact.email}` +
      `?subject=${encodeURIComponent(
        `${kind === "trade" ? "Wholesale" : "Website"} enquiry. ${data.get("subject")}`,
      )}` +
      `&body=${encodeURIComponent(lines.join("\n"))}`;

    window.location.href = href;
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: duration.slow, ease: easeSoft }}
      className="rounded-3xl border border-line bg-surface-sunken p-6 sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-strong">
            Your name
          </span>
          <input name="name" required autoComplete="name" className={field} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-strong">
            Business {kind === "trade" ? "" : "(optional)"}
          </span>
          <input
            name="business"
            required={kind === "trade"}
            autoComplete="organization"
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-strong">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-strong">
            Phone / WhatsApp
          </span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            className={field}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold text-strong">
            Where are you based?
          </span>
          <input
            name="location"
            placeholder="e.g. Accra, Kumasi, outside Ghana"
            className={field}
          />
        </label>
      </div>

      {/* Subject as chips. Faster to answer on a phone than a select, and it
          shows the range of what we actually supply. */}
      <fieldset className="mt-6">
        <legend className="mb-2.5 text-xs font-semibold text-strong">
          What is this about?
        </legend>
        <div className="flex flex-wrap gap-2">
          {subjects.map((option) => (
            <label key={option} className="cursor-pointer">
              <input
                type="radio"
                name="subject"
                value={option}
                checked={subject === option}
                onChange={() => setSubject(option)}
                className="peer sr-only"
              />
              <span className="block rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors peer-checked:border-accent peer-checked:bg-saffron/12 peer-checked:font-semibold peer-checked:text-strong peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold">
                {option}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-6 block">
        <span className="mb-1.5 block text-xs font-semibold text-strong">
          Details
        </span>
        <textarea
          name="message"
          rows={5}
          required
          placeholder={
            kind === "trade"
              ? "Which products, roughly what quantity, and how often?"
              : "How can we help?"
          }
          className={`${field} resize-y`}
        />
      </label>

      <button
        type="submit"
        className="group mt-6 w-full rounded-full bg-forest px-7 py-3.5 font-semibold text-paper transition-transform active:scale-[0.99] sm:w-auto"
      >
        Send enquiry
        <span
          aria-hidden
          className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1"
        >
          &rarr;
        </span>
      </button>

      <p className="mt-3 text-xs/5 text-muted">
        This opens your email app with the details filled in, so you can see
        exactly what is sent.
      </p>
    </motion.form>
  );
}
