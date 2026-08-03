import { Card, PageHeader, Pill } from "@/components/admin/AdminUI";
import { ActionForm, SubmitButton } from "@/components/admin/Form";
import {
  saveAnnouncementAction,
  saveShopSettingsAction,
  setDeliveryRateAction,
} from "@/app/admin/actions";
import { REGIONS } from "@/lib/checkout";
import { formatPrice } from "@/lib/money";
import { getShopSettings, listDeliveryRates } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

const field =
  "w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-body focus:border-accent focus:outline-none";

/**
 * Settings.
 *
 * DELIVERY IS THE POINT OF THIS SCREEN.
 *
 * Every order currently needs someone to decide a delivery charge by hand
 * before it has a real total. Filling in even the two or three regions Efe
 * actually ships to turns that daily job into something checkout does by
 * itself, and leaves the manual quote for the long tail.
 *
 * An EMPTY fee is not free, it is unquoted. The checkout tells the customer we
 * will confirm the charge, which is honest and is also the current truth for
 * most of Ghana. Writing 0 to mean "not set up yet" would promise free
 * nationwide delivery, so the two are kept firmly apart.
 */
export default async function AdminSettingsPage() {
  const [settings, rates] = await Promise.all([
    getShopSettings(),
    listDeliveryRates(),
  ]);

  const byRegion = new Map(rates.map((rate) => [rate.region, rate]));
  const quoted = rates.length;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Delivery charges, the shop's contact details, and the banner above the header."
        meta={
          quoted > 0
            ? `${quoted} of ${REGIONS.length} regions have an agreed rate`
            : "No delivery rates set yet, so every order is quoted by hand"
        }
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        {/* ---- delivery ---- */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-strong">Delivery charges</h2>
            <Pill tone={quoted > 0 ? "good" : "warn"}>
              {quoted > 0 ? `${quoted} set` : "None set"}
            </Pill>
          </div>
          <p className="measure mt-1.5 text-sm/6 text-muted">
            Set a charge and checkout works it out for you. Leave one blank and
            we tell the customer you will confirm it by phone, which is what
            happens today for every region.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <caption className="sr-only">Delivery charge by region</caption>
              <thead>
                <tr className="border-b border-line text-left">
                  <th scope="col" className="pb-2 font-semibold text-strong">
                    Region
                  </th>
                  <th scope="col" className="pb-2 font-semibold text-strong">
                    Charge (GH₵)
                  </th>
                  <th scope="col" className="pb-2 font-semibold text-strong">
                    Free over (GH₵)
                  </th>
                  <th scope="col" className="pb-2 font-semibold text-strong">
                    Arrives in
                  </th>
                  <th scope="col" className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {REGIONS.map((region) => {
                  const rate = byRegion.get(region);
                  return (
                    <tr key={region} className="border-b border-line/60">
                      <td className="py-2 pr-3 text-strong">
                        {region}
                        {rate && (
                          <span className="stat mt-0.5 block text-xs text-muted">
                            {formatPrice(rate.feeMinor)}
                            {rate.freeOverMinor !== null &&
                              `, free over ${formatPrice(rate.freeOverMinor)}`}
                          </span>
                        )}
                      </td>
                      <td colSpan={4} className="py-2">
                        <ActionForm
                          action={setDeliveryRateAction}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <input type="hidden" name="region" value={region} />
                          <input
                            name="fee"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={
                              rate ? (rate.feeMinor / 100).toFixed(2) : ""
                            }
                            placeholder="Not set"
                            aria-label={`Delivery charge for ${region}`}
                            className={`${field} w-28`}
                          />
                          <input
                            name="freeOver"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={
                              rate?.freeOverMinor != null
                                ? (rate.freeOverMinor / 100).toFixed(2)
                                : ""
                            }
                            placeholder="No offer"
                            aria-label={`Free delivery threshold for ${region}`}
                            className={`${field} w-28`}
                          />
                          <input
                            name="etaLabel"
                            defaultValue={rate?.etaLabel ?? ""}
                            placeholder="2 to 3 days"
                            aria-label={`Delivery time for ${region}`}
                            className={`${field} w-32`}
                          />
                          <SubmitButton variant="small">Save</SubmitButton>
                        </ActionForm>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs/5 text-muted">
            Clearing the charge box and saving removes the rate, putting that
            region back to being quoted by hand.
          </p>
        </Card>

        <div className="grid gap-5 self-start">
          {/* ---- shop details ---- */}
          <Card>
            <h2 className="font-semibold text-strong">How customers reach you</h2>
            <p className="mt-1.5 text-sm/6 text-muted">
              Used by the WhatsApp buttons on orders and customers, and by the
              order handoff on checkout.
            </p>

            <ActionForm
              action={saveShopSettingsAction}
              className="mt-5 grid gap-4"
            >
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-strong">
                  WhatsApp number
                </span>
                <input
                  name="whatsappNumber"
                  defaultValue={settings.whatsappNumber}
                  placeholder="233241234567"
                  inputMode="tel"
                  className={field}
                />
                <span className="mt-1 block text-xs text-muted">
                  With the country code, no spaces or plus sign.
                </span>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-strong">
                  Order email
                </span>
                <input
                  name="orderEmail"
                  type="email"
                  defaultValue={settings.orderEmail}
                  className={field}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-strong">
                  Warn me when stock drops to
                </span>
                <input
                  name="lowStockDefault"
                  type="number"
                  min="0"
                  defaultValue={settings.lowStockDefault}
                  className={`${field} w-28`}
                />
                <span className="mt-1 block text-xs text-muted">
                  Used for new sizes. Existing ones keep their own setting.
                </span>
              </label>

              <SubmitButton className="justify-self-start">
                Save details
              </SubmitButton>
            </ActionForm>
          </Card>

          {/* ---- announcement ---- */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-strong">Banner</h2>
              <Pill tone={settings.announcement.active ? "good" : "neutral"}>
                {settings.announcement.active ? "Showing" : "Hidden"}
              </Pill>
            </div>
            <p className="mt-1.5 text-sm/6 text-muted">
              A single line above the header. Best used for one thing at a time,
              a delivery offer or a restock.
            </p>

            <ActionForm
              action={saveAnnouncementAction}
              className="mt-5 grid gap-4"
            >
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-strong">
                  What should it say?
                </span>
                <input
                  name="text"
                  maxLength={160}
                  defaultValue={settings.announcement.text}
                  placeholder="Free delivery in Accra on orders over GH₵150"
                  className={field}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-strong">
                  Where should it link to?
                </span>
                <input
                  name="href"
                  defaultValue={settings.announcement.href}
                  placeholder="/shop"
                  className={field}
                />
              </label>

              <label className="flex items-center gap-2.5 text-sm text-strong">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={settings.announcement.active}
                  className="h-4 w-4 accent-[var(--color-forest)]"
                />
                Show it on the shop
              </label>

              <SubmitButton className="justify-self-start">
                Save banner
              </SubmitButton>
            </ActionForm>
          </Card>
        </div>
      </div>
    </div>
  );
}
