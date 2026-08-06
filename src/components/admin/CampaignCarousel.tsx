"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export type CampaignArtifact = {
  id: string;
  title: string;
  category: string;
  tagline: string;
  badge: string;
  imagePrompt: string;
  videoPrompt: string; // Seedance 2 Prompt
  adCopy: string;
  hashtags: string[];
  gradient: string;
};

const CAMPAIGNS: CampaignArtifact[] = [
  {
    id: "black-soap-gold",
    title: "Pure Ghanaian Black Soap Heritage",
    category: "African Black Soap",
    tagline: "Handcrafted from Cocoa Pod Ash & Raw Shea",
    badge: "Seedance 2 Video + Social Copy",
    gradient: "from-amber-950/80 via-forest-deep to-forest",
    imagePrompt:
      "A luxury cosmetics bottle of Efe Organics Black Soap Bath 350ml standing on a raw dark cocoa pod slab, surrounded by gold palm kernel oil droplets and soft botanical moss, golden hour rim lighting, 8k product photography.",
    videoPrompt:
      "bytedance/seedance-2: Cinematic 4K macro camera slow-pan over molten golden palm kernel oil drizzling over dark textured cocoa pod ash. Seamless transition to rich hand-whipped black soap lather under warm sunlight with Ghanaian kora music audio.",
    adCopy:
      "Formulated by master soap makers using century-old West African methods. No synthetic foaming agents, no artificial fragrance—just pure saponified plant oils and cocoa pod ash.",
    hashtags: ["#AfricanBlackSoap", "#EfeOrganics", "#GhanaBeauty", "#HandcraftedSoap"],
  },
  {
    id: "shampoo-revival",
    title: "Hibiscus & Neem Scalp Care",
    category: "Hair Care",
    tagline: "Professional 1L Salon & Spa Format",
    badge: "Seedance 2 Reel Script",
    gradient: "from-rose-950/80 via-forest-deep to-forest",
    imagePrompt:
      "A 1-Litre amber salon bottle of Efe Organics Herbal Black Soap Shampoo with fresh red hibiscus flowers and neem leaves on a damp wooden surface, water drops glistening, soft studio illumination.",
    videoPrompt:
      "bytedance/seedance-2: High-speed 120fps camera capture of vibrant red hibiscus petals dropping into rich black soap shampoo, creating velvety lather bubbles. Fast cut to model massaging scalp in a sunlit Accra salon.",
    adCopy:
      "Gentle scalp cleansing without stripping natural oils. Enriched with neem leaf infusion and hibiscus for healthy roots and high shine.",
    hashtags: ["#NaturalHairCare", "#ScalpCare", "#GhanaSalons", "#BlackSoapShampoo"],
  },
  {
    id: "raw-crumble-b2b",
    title: "Quarter-Tonne Raw Soap Crumble",
    category: "Trade & Wholesale",
    tagline: "250kg Raw Unfinished Soap for Formulators",
    badge: "B2B Campaign + Video Prompt",
    gradient: "from-stone-900 via-yellow-950/80 to-forest",
    imagePrompt:
      "A 250kg quarter-tonne block of raw unrefined African Black Soap crumble sliced into rustic blocks, visible shea butter chunks, warm earth tones, authentic workshop atmosphere.",
    videoPrompt:
      "bytedance/seedance-2: Industrial workshop camera tilt-down over quarter-tonne raw soap crumble blocks being inspected by soap artisans in Ghana. Text overlay: 'Unfinished Raw Soap Crumble - 250kg Format'.",
    adCopy:
      "The exact raw black soap base used in our own range, supplied unfinished for formulators, wholesalers, and private-label makers across West Africa.",
    hashtags: ["#BulkBlackSoap", "#RawCosmetics", "#SoapMakers", "#FormulatorSupply"],
  },
  {
    id: "shea-butter-glow",
    title: "Unrefined Shea Body Nourish",
    category: "Body Care",
    tagline: "Satin Skin Moisture & Barrier Care",
    badge: "Social Drop + Image Prompt",
    gradient: "from-amber-900/80 via-forest-deep to-forest",
    imagePrompt:
      "A glass jar of Efe Organics Whipped Shea Body Butter with a wooden spoon scooping ivory cream, surrounding raw shea nuts, warm golden lighting, clean modern packaging.",
    videoPrompt:
      "bytedance/seedance-2: Slow 4K camera dolly shot moving around whipped ivory shea butter inside a carved wooden bowl, golden sunlight flare casting soft shadows on smooth skin texture.",
    adCopy:
      "Deep moisture that melts into the skin. Hand-extracted shea butter blended with cold-pressed botanical oils for round-the-clock softness.",
    hashtags: ["#SheaButterGlow", "#OrganicBodyCare", "#WestAfricanBeauty", "#SkincareRoutine"],
  },
];

export function CampaignCarousel({
  onSelectPrompt,
}: {
  onSelectPrompt?: (prompt: string) => void;
}) {
  const [index, setIndex] = useState(0);

  const next = () => setIndex((prev) => (prev + 1) % CAMPAIGNS.length);
  const prev = () => setIndex((prev) => (prev - 1 + CAMPAIGNS.length) % CAMPAIGNS.length);

  const current = CAMPAIGNS[index];

  return (
    <div className="space-y-4">
      {/* Carousel Top Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-strong text-sm">
            AI Campaign & Seedance 2 Video Showcase
          </h3>
          <p className="text-xs text-muted">
            Pre-engineered prompts and multi-channel campaign packages for Efe Organics drops.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface-raised text-strong transition-colors hover:bg-surface-sunken"
            aria-label="Previous campaign"
          >
            ‹
          </button>
          <span className="text-xs text-muted font-medium">
            {index + 1} / {CAMPAIGNS.length}
          </span>
          <button
            type="button"
            onClick={next}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface-raised text-strong transition-colors hover:bg-surface-sunken"
            aria-label="Next campaign"
          >
            ›
          </button>
        </div>
      </div>

      {/* 3D-Curved Interactive Card */}
      <div className="relative overflow-hidden rounded-3xl border border-line/80 shadow-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.96, rotateY: 6 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.96, rotateY: -6 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`bg-gradient-to-br ${current.gradient} p-6 sm:p-8 text-paper space-y-5`}
          >
            {/* Header badges */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-paper/15 px-3 py-1 text-[0.68rem] font-semibold tracking-wider uppercase text-gold">
                {current.category}
              </span>
              <span className="rounded-full bg-gold/20 border border-gold/30 px-3 py-1 text-[0.68rem] font-semibold text-gold">
                ✨ {current.badge}
              </span>
            </div>

            {/* Campaign Title */}
            <div>
              <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-paper">
                {current.title}
              </h4>
              <p className="mt-1 text-xs sm:text-sm text-paper/80 font-medium">
                {current.tagline}
              </p>
            </div>

            {/* Content Tabs: Seedance 2 Video Prompt & Social Copy */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Left Column: Seedance 2 Video Model Prompt */}
              <div className="rounded-2xl border border-paper/15 bg-paper/5 p-4 space-y-2 backdrop-blur-xs">
                <div className="flex items-center justify-between text-[0.68rem] font-semibold uppercase tracking-wider text-gold">
                  <span>🎥 Seedance 2 Video Prompt</span>
                  <span>OpenRouter</span>
                </div>
                <p className="text-xs text-paper/90 leading-relaxed font-mono">
                  {current.videoPrompt}
                </p>
              </div>

              {/* Right Column: Grounded Social Copy */}
              <div className="rounded-2xl border border-paper/15 bg-paper/5 p-4 space-y-2 backdrop-blur-xs">
                <div className="flex items-center justify-between text-[0.68rem] font-semibold uppercase tracking-wider text-gold">
                  <span>📢 Grounded Ad Copy</span>
                  <span>Brand Voice</span>
                </div>
                <p className="text-xs text-paper/90 leading-relaxed">
                  {current.adCopy}
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {current.hashtags.map((h) => (
                    <span key={h} className="text-[0.65rem] text-gold/90 font-medium">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-paper/15 pt-4">
              <p className="text-xs text-paper/70">
                Generate video prompts, ad copy, and media assets in 1-click.
              </p>

              <button
                type="button"
                onClick={() => onSelectPrompt?.(current.videoPrompt)}
                className="rounded-full bg-gold px-5 py-2.5 text-xs font-bold text-forest-deep transition-transform active:scale-95 hover:bg-gold/90"
              >
                Use Seedance 2 Prompt &rarr;
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
