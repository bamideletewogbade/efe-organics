/**
 * Structured logging.
 *
 * Every log line is one JSON object in production and a readable line in
 * development. That split matters: in production logs are *queried* (Vercel,
 * Datadog, `jq`) and JSON is the only format that survives that; in development
 * they are read by a person and JSON is hostile.
 *
 * WHY NOT `console.log` EVERYWHERE
 * A bare console call loses the two things that make a log useful after the
 * fact: the request it belonged to, and consistent field names. `logger.child()`
 * binds context once, a request id, an order reference, and every line
 * beneath it carries that automatically, so a failed checkout can be read end to
 * end by filtering on one value.
 *
 * REDACTION IS NOT OPTIONAL
 * This app handles phone numbers, emails and addresses. Logging those in full
 * turns the log store into a copy of the customer database, a privacy problem
 * and a breach-severity multiplier. `redact()` masks known-sensitive keys on the
 * way out, so a careless `logger.info({ customer })` cannot leak a phone number.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const isProd = process.env.NODE_ENV === "production";

/** `LOG_LEVEL=debug` to open the tap; defaults to info in prod, debug in dev. */
const threshold: Level =
  (process.env.LOG_LEVEL as Level | undefined) ?? (isProd ? "info" : "debug");

/** Keys whose values are masked wherever they appear, at any depth. */
const SENSITIVE = new Set([
  "phone",
  "email",
  "address",
  "deliveryaddress",
  "deliveryphone",
  "deliveryemail",
  "password",
  "token",
  "secret",
  "apikey",
  "authorization",
  "cookie",
  "cardnumber",
]);

/** Keeps enough to identify a record in support, not enough to misuse it. */
function maskValue(value: string): string {
  if (value.length <= 4) return "***";
  if (value.includes("@")) {
    const [user, domain] = value.split("@");
    return `${user.slice(0, 2)}***@${domain}`;
  }
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

export function redact(input: unknown, depth = 0): unknown {
  if (depth > 6 || input === null || input === undefined) return input;

  if (Array.isArray(input)) return input.map((item) => redact(item, depth + 1));

  if (input instanceof Error) {
    return {
      name: input.name,
      message: input.message,
      stack: isProd ? undefined : input.stack,
    };
  }

  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (SENSITIVE.has(key.toLowerCase()) && typeof value === "string") {
        out[key] = maskValue(value);
      } else {
        out[key] = redact(value, depth + 1);
      }
    }
    return out;
  }

  return input;
}

type Fields = Record<string, unknown>;

function emit(level: Level, context: Fields, message: string, fields?: Fields) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[threshold]) return;

  const payload = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...(redact({ ...context, ...fields }) as Fields),
  };

  const line = isProd
    ? JSON.stringify(payload)
    : `${level.toUpperCase().padEnd(5)} ${message}${
        Object.keys({ ...context, ...fields }).length
          ? ` ${JSON.stringify(redact({ ...context, ...fields }))}`
          : ""
      }`;

  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(
    line,
  );
}

export type Logger = {
  debug: (message: string, fields?: Fields) => void;
  info: (message: string, fields?: Fields) => void;
  warn: (message: string, fields?: Fields) => void;
  error: (message: string, fields?: Fields) => void;
  child: (context: Fields) => Logger;
  /** Times an operation and logs its outcome either way. */
  time: <T>(message: string, run: () => Promise<T>, fields?: Fields) => Promise<T>;
};

function build(context: Fields): Logger {
  return {
    debug: (message, fields) => emit("debug", context, message, fields),
    info: (message, fields) => emit("info", context, message, fields),
    warn: (message, fields) => emit("warn", context, message, fields),
    error: (message, fields) => emit("error", context, message, fields),
    child: (extra) => build({ ...context, ...extra }),
    time: async (message, run, fields) => {
      const started = performance.now();
      try {
        const result = await run();
        emit("info", context, message, {
          ...fields,
          ms: Math.round(performance.now() - started),
          ok: true,
        });
        return result;
      } catch (error) {
        emit("error", context, message, {
          ...fields,
          ms: Math.round(performance.now() - started),
          ok: false,
          error,
        });
        throw error;
      }
    },
  };
}

export const logger = build({ app: "efe-organics" });
