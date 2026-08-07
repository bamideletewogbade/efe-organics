CREATE TYPE "public"."stockist_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TYPE "public"."stockist_tier" AS ENUM('bronze', 'silver', 'gold', 'vip');--> statement-breakpoint
CREATE TABLE "stockists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" varchar(240) NOT NULL,
	"contact_name" varchar(200) NOT NULL,
	"email" varchar(240) NOT NULL,
	"phone" varchar(40) NOT NULL,
	"business_type" varchar(80) DEFAULT 'retail_shop' NOT NULL,
	"tier" "stockist_tier" DEFAULT 'bronze' NOT NULL,
	"status" "stockist_status" DEFAULT 'pending' NOT NULL,
	"region" varchar(80),
	"town" varchar(120),
	"address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wholesale_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stockist_id" uuid,
	"business_name" varchar(240) NOT NULL,
	"contact_name" varchar(200) NOT NULL,
	"email" varchar(240) NOT NULL,
	"phone" varchar(40) NOT NULL,
	"interest" varchar(160) NOT NULL,
	"estimated_volume" varchar(120),
	"status" varchar(48) DEFAULT 'new' NOT NULL,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "momo_reference" varchar(120);--> statement-breakpoint
ALTER TABLE "wholesale_inquiries" ADD CONSTRAINT "wholesale_inquiries_stockist_id_stockists_id_fk" FOREIGN KEY ("stockist_id") REFERENCES "public"."stockists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stockists_email_idx" ON "stockists" USING btree ("email");--> statement-breakpoint
CREATE INDEX "stockists_status_idx" ON "stockists" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inquiries_email_idx" ON "wholesale_inquiries" USING btree ("email");