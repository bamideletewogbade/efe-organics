"use client";

import { motion, useReducedMotion } from "motion/react";

import { duration, easeSoft, riseVariants } from "./tokens";

/**
 * Headline reveal: each word sits behind its own clip mask and rises into place.
 *
 * Word-level rather than letter-level on purpose, letter-by-letter reads as a
 * tech demo and makes a sentence harder to parse. Words keep the line readable
 * while the motion still registers.
 *
 * The whole string stays in the DOM as real text, so it is selectable and
 * screen readers get one uninterrupted sentence rather than a pile of spans.
 */
export function RevealWords({
  text,
  className = "",
  delay = 0,
  stagger = 0.055,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");

  if (reduce) {
    return <span className={className}>{text}</span>;
  }

  return (
    <motion.span
      className={className}
      initial="hidden"
      animate="visible"
      aria-label={text}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
    >
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          aria-hidden
          // `pb-[0.08em]` gives descenders room so the mask does not clip a
          // 'g' or 'y' once the word has settled.
          className="inline-flex overflow-hidden pb-[0.08em] align-bottom"
        >
          <motion.span
            className="inline-block"
            variants={riseVariants}
            transition={{ duration: duration.slow, ease: easeSoft }}
          >
            {word}
          </motion.span>
          {index < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </motion.span>
  );
}
