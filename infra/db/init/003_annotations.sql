CREATE TABLE IF NOT EXISTS annotations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id    UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  element_id   TEXT NOT NULL,
  parent_id    UUID REFERENCES annotations(id) ON DELETE CASCADE,
  author_id    UUID NOT NULL,
  message      TEXT NOT NULL,
  resolved     BOOLEAN NOT NULL DEFAULT false,
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_annotations_canvas  ON annotations(canvas_id);
CREATE INDEX IF NOT EXISTS idx_annotations_element ON annotations(canvas_id, element_id);
