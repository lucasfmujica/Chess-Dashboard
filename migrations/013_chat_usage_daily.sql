-- Daily request counter for the diagnostic chat (api/prep.ts, resource=diagnostic-chat).
-- One row per day; the API upserts on `day` and refuses past the daily limit.
-- Not applied automatically: run it against the database before using the chat,
-- otherwise the endpoint answers 503.
-- Numbered 012 so it does not collide with 010/011 on the parallel sync/OTB branch.
CREATE TABLE IF NOT EXISTS chat_usage_daily (
  day DATE PRIMARY KEY,
  call_count INTEGER NOT NULL DEFAULT 0 CHECK (call_count >= 0)
);
