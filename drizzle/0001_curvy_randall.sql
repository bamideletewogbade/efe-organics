CREATE TABLE "delivery_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" varchar(80) NOT NULL,
	"fee_minor" bigint NOT NULL,
	"free_over_minor" bigint,
	"eta_label" varchar(80),
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "slug_snapshot" varchar(180);--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_rates_region_idx" ON "delivery_rates" USING btree ("region");