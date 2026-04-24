CREATE TABLE "revenuecat_webhook_events" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "revenuecat_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "revenuecat_webhook_events_user_id_idx"
ON "revenuecat_webhook_events"("user_id");

