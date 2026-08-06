# Going live on efeorganics.com

Written 3 August 2026, after checking the domain's actual DNS.

## The short version

**Do not host this on AvesHost.** Keep the domain there, point it at Vercel.

AvesHost sells shared cPanel hosting, which is built for PHP. This is a Next.js
application: it renders on a Node server, uses server actions, runs middleware
(`src/proxy.ts`) on every admin request, and holds a pooled connection to
Postgres. Where cPanel offers a "Setup Node.js App" button at all, it runs
through Passenger, which does not support Next's middleware or streaming, and
you would spend more on the hours fighting it than on hosting that just works.

Vercel is made by the people who make Next.js. It is the reference deployment
target for this stack: no build configuration, automatic HTTPS, and the edge
runtime that `proxy.ts` needs.

## What the domain looks like right now

Checked with `Resolve-DnsName` on 3 August 2026:

| Record | Value | What it means |
| --- | --- | --- |
| Nameservers | `ns3.servertrove.com`, `ns4.servertrove.com` | DNS is managed at AvesHost |
| A (apex) | `104.243.37.71` | Points at an AvesHost parking page |
| CNAME `www` | `efeorganics.com` | Follows the apex |
| MX | `efeorganics.com`, priority 0 | See below. This is not working email |
| SSL | None | Vercel issues one automatically |

### There is no working email on this domain

The MX record points the domain at itself, which is the default a registrar
leaves behind, not a mailbox. Anything sent to `hello@efeorganics.com` today
goes nowhere.

That address is currently printed on every page of the site, in all four policy
pages, and in the proposal PDF. **Fix this before launch**, either with AvesHost's
email hosting, Google Workspace, or Zoho Mail (which has a free tier that suits a
business this size). It is a five minute job and an embarrassing one to discover
from a customer.

## Pointing the domain at Vercel

**Use A and CNAME records. Do not switch the nameservers.**

Vercel offers both, and the nameserver route looks simpler. It is a trap here:
moving nameservers moves DNS authority away from AvesHost, and every record that
lives there has to be recreated at Vercel, including the MX records for the email
that still needs setting up. Leaving DNS where the registrar put it means whoever
sets up email later can do it in the place they expect to.

### Done already

The Vercel project exists and both domains are attached:

- Project: `efe-organics` under `accrainnovationcenter-2319s-projects`
- `efeorganics.com` and `www.efeorganics.com` added, both awaiting DNS

### The one step left, and it can only be done in AvesHost

Vercel asked for **A records for both names**, not the per-project CNAME its
docs describe. Use exactly what it returned:

| Host | Type | Value |
| --- | --- | --- |
| `@` | A | `76.76.21.21` |
| `www` | A | `76.76.21.21` |

In AvesHost, open **DNS Management** for efeorganics.com and:

1. Change the existing `A` record for `@` from `104.243.37.71` to `76.76.21.21`.
2. Replace the `www` CNAME (currently pointing at the apex) with an `A` record
   to the same address.

Then wait. The existing records carry a 3600 second TTL, so allow up to an hour.
Vercel verifies by itself and issues the certificate, which is what turns
"No SSL Detected" into a padlock. Nothing else needs doing.

### Why the .vercel.app URL asks for a login

Deployment protection is set to `all_except_custom_domains`, which is the right
default and was left alone: the preview URLs stay private, and `efeorganics.com`
will be public the moment the DNS resolves. A shop that is live before anyone
intends it to be is a worse problem than an inconvenient preview.

## What it costs

Vercel's Hobby plan is free but its terms are non-commercial, and a shop taking
money is commercial. That means **Pro, at 20 US dollars a month**, roughly
GH₵230. This is the figure already carried in the proposal.

Worth knowing about the alternatives rather than pretending there is only one:

| Option | Roughly | Trade-off |
| --- | --- | --- |
| Vercel Pro | $20/mo | Zero configuration, everything works |
| Cloudflare Workers | $5/mo | Cheaper, needs the OpenNext adapter, more to go wrong |
| Railway or Render | $5 to $20/mo | Works well, slower cold starts |
| A VPS | $6/mo | Cheapest, and you now run a server |

The gap between the cheapest and Vercel is under GH₵200 a month. It is not worth
the hours.

## Environment variables to set in Vercel

Everything in `.env.local` except the development-only values. Set these under
**Settings → Environment Variables**, for Production.

**Required**

- `DATABASE_URL` — the Neon connection string
- `ADMIN_SESSION_SECRET` — a fresh long random string, NOT the development one
- `NEXT_PUBLIC_SITE_URL` — `https://efeorganics.com`

**Do not set `ADMIN_PASSWORD` in production** once real accounts exist. Leaving
it set keeps a shared, unattributed way in. The admin fails closed without it as
long as `DATABASE_URL` is present, which is the behaviour you want.

**Before taking money**

- `PAYSTACK_SECRET_KEY` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` — both, or checkout
  stays in reservation mode
- `OWNER_WHATSAPP` — where new orders are announced

**Optional**

- `RESEND_API_KEY`, `ORDER_NOTIFY_FROM`, `ORDER_NOTIFY_EMAIL` — needs a verified
  sending domain, so it depends on the email fix above
- `OPENROUTER_API_KEY` — turns the assistant on

## Before the first deploy

- [ ] **Rotate the Neon password.** The current one was shared in plaintext.
- [ ] Set a new `ADMIN_SESSION_SECRET`. Changing it signs everyone out, which is
      also the fastest way to revoke every session at once.
- [ ] Create a personal owner account at `/admin/settings/users`, sign in with
      it, then remove `ADMIN_PASSWORD`.
- [ ] Sort out email on the domain.
- [ ] Have the four policy pages read by someone qualified, then set
      `NEEDS_REVIEW = false` in `src/lib/legal.ts` so they leave `noindex`.
- [ ] Count the real shelf. Stock is currently a placeholder 25 per variant, set
      by `scripts/set-opening-stock.mjs`.
- [ ] Settle the product photography rights question in
      `public/products/README.md`.

## One thing worth fixing soon

`public/products` is **104MB across 67 files**, including a 5.4MB PNG. Next
optimises these on delivery, so visitors are not downloading 5MB, but every
deploy ships all of it and it will slow builds.

They are the imported reseller images and their rights are unconfirmed anyway.
When the reshoot happens, export at around 2000px on the long edge and the whole
folder should come in under 15MB.
