CREATE TABLE IF NOT EXISTS telemetry_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name   TEXT NOT NULL,
  user_id      UUID,
  canvas_id    UUID,
  workspace_id UUID,
  properties   JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_telemetry_event   ON telemetry_events(event_name);
CREATE INDEX IF NOT EXISTS idx_telemetry_created ON telemetry_events(created_at);
