ALTER TABLE "users"
ADD COLUMN "revenuecat_last_event_at" TIMESTAMP(3);

ALTER TABLE "revenuecat_webhook_events"
ADD COLUMN "event_timestamp_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "revenuecat_webhook_events_user_id_event_timestamp_at_idx"
ON "revenuecat_webhook_events"("user_id", "event_timestamp_at" DESC);

