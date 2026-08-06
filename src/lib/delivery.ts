import type { Region } from "./checkout";

/**
 * Ghana Delivery Zone & Rates Engine.
 *
 * All rates stored in minor integer units (pesewas).
 * 2500 = GH₵ 25.00
 */

type ZoneRate = {
  name: string;
  rateMinor: number;
};

const TOWN_RATES: Record<string, ZoneRate> = {
  // Accra Central & Prime Zones
  osu: { name: "Accra Central / Osu", rateMinor: 2500 },
  ridge: { name: "Accra Central / Ridge", rateMinor: 2500 },
  airport: { name: "Airport Residential", rateMinor: 2500 },
  cantonments: { name: "Cantonments", rateMinor: 2500 },
  labone: { name: "Labone", rateMinor: 2500 },
  "east legon": { name: "East Legon", rateMinor: 3000 },
  "legon campus": { name: "Legon Campus", rateMinor: 3000 },
  spintex: { name: "Spintex Road", rateMinor: 3500 },
  tesano: { name: "Tesano / Achimota", rateMinor: 3000 },
  danswoman: { name: "Dansoman", rateMinor: 3000 },
  madina: { name: "Madina", rateMinor: 3500 },
  adenta: { name: "Adenta", rateMinor: 4000 },
  tema: { name: "Tema Central", rateMinor: 4500 },
  kasoa: { name: "Kasoa", rateMinor: 5000 },

  // Ashanti / Kumasi
  kumasi: { name: "Kumasi Central", rateMinor: 4500 },
  knust: { name: "KNUST Campus / Ayeduase", rateMinor: 4500 },
  ahodwo: { name: "Ahodwo / Nhyiaeso", rateMinor: 4500 },

  // Western / Takoradi
  takoradi: { name: "Takoradi Central", rateMinor: 5000 },
  sekondi: { name: "Sekondi", rateMinor: 5000 },

  // Central / Cape Coast
  "cape coast": { name: "Cape Coast Central", rateMinor: 4500 },
  ucc: { name: "UCC Campus", rateMinor: 4500 },
};

const REGIONAL_DEFAULT_RATES: Record<Region, ZoneRate> = {
  "Greater Accra": { name: "Greater Accra Standard", rateMinor: 3000 },
  Ashanti: { name: "Ashanti Regional Delivery", rateMinor: 4500 },
  Western: { name: "Western Regional Delivery", rateMinor: 5000 },
  Central: { name: "Central Regional Delivery", rateMinor: 4500 },
  Eastern: { name: "Eastern Regional Delivery", rateMinor: 4000 },
  Volta: { name: "Volta Regional Delivery", rateMinor: 4500 },
  Northern: { name: "Northern Regional Delivery", rateMinor: 6000 },
  "Upper East": { name: "Upper East Regional Delivery", rateMinor: 6500 },
  "Upper West": { name: "Upper West Regional Delivery", rateMinor: 6500 },
  Bono: { name: "Bono Regional Delivery", rateMinor: 5500 },
  "Bono East": { name: "Bono East Regional Delivery", rateMinor: 5500 },
  Ahafo: { name: "Ahafo Regional Delivery", rateMinor: 5500 },
  Savannah: { name: "Savannah Regional Delivery", rateMinor: 6000 },
  "North East": { name: "North East Regional Delivery", rateMinor: 6500 },
  Oti: { name: "Oti Regional Delivery", rateMinor: 5500 },
  "Western North": { name: "Western North Delivery", rateMinor: 5500 },
  "Outside Ghana": { name: "International Express Shipping", rateMinor: 25000 },
};

export function getDeliveryQuote(
  region: string,
  town?: string,
): ZoneRate {
  if (town) {
    const normalized = town.trim().toLowerCase();
    for (const [key, zone] of Object.entries(TOWN_RATES)) {
      if (normalized.includes(key)) {
        return zone;
      }
    }
  }

  const matchedRegion = (region as Region) in REGIONAL_DEFAULT_RATES
    ? (region as Region)
    : "Greater Accra";

  return REGIONAL_DEFAULT_RATES[matchedRegion];
}
