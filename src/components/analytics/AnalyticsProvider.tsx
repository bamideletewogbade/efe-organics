"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import { installFlushHandlers, track } from "@/lib/analytics";

/**
 * Fires `page_view` on every route change and wires the flush handlers.
 *
 * `useSearchParams` forces a Suspense boundary in Next's App Router, otherwise
 * the whole tree opts out of static rendering, which would quietly turn 42
 * prerendered product pages into server-rendered ones. The boundary keeps
 * analytics dynamic and the pages static.
 *
 * The `useRef` guard exists because React 19 Strict Mode mounts effects twice in
 * development; without it every page view is double-counted locally and the
 * numbers you check against are wrong from day one.
 */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const query = searchParams.toString();
    const full = query ? `${pathname}?${query}` : pathname;
    if (lastPath.current === full) return;
    lastPath.current = full;
    track("page_view");
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsProvider() {
  useEffect(() => installFlushHandlers(), []);

  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
}
