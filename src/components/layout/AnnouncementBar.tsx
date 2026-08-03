import Link from "next/link";

import type { Announcement } from "@/lib/settings";

/**
 * The strip above the header.
 *
 * Renders nothing at all when it is switched off or has no words, rather than
 * an empty bar. That matters more than it sounds: the header measures itself
 * against `--header-h` to position the hero, and a zero-height element still
 * occupying a slot in the flex column is exactly the class of bug that put a
 * 1px white line above the hero once already.
 *
 * Deliberately not dismissible. A dismiss button needs storage, a decision about
 * whether changing the text resets it, and a state to test, all so a shopper can
 * hide one line of text they will scroll past in a second. If the message is not
 * worth showing, the answer is to switch it off in Settings.
 */
export function AnnouncementBar({
  announcement,
}: {
  announcement: Announcement;
}) {
  if (!announcement.active || !announcement.text.trim()) return null;

  return (
    <Link
      href={announcement.href || "/shop"}
      className="block bg-forest-deep px-4 py-2 text-center text-xs font-medium text-paper/85 transition-colors hover:text-paper"
    >
      {announcement.text}
      <span aria-hidden className="ml-1.5 text-accent-quiet">
        &rarr;
      </span>
    </Link>
  );
}
