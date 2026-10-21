-- Ampere system of record.
-- booking_events is the authoritative, append-only booking history; lifecycle state is derived by replay.
-- app_state holds the remaining demo document (catalogue, booking headers, quotes, payments, sessions).
-- resource_holds is a rebuildable projection that lets the database itself refuse overlapping holds.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS booking_events (
  booking_id      text        NOT NULL,
  sequence        integer     NOT NULL CHECK (sequence > 0),
  event_id        uuid        NOT NULL UNIQUE,
  event_type      text        NOT NULL,
  schema_version  integer     NOT NULL,
  actor_id        text,
  actor_role      text        NOT NULL,
  source          text        NOT NULL,
  recorded_at     timestamptz NOT NULL,
  reported_at     timestamptz,
  correlation_id  text        NOT NULL,
  idempotency_key text,
  payload         jsonb       NOT NULL,
  event           jsonb       NOT NULL, -- the exact event object, replayed byte-for-byte by clients
  inserted_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (booking_id, sequence)
);

CREATE UNIQUE INDEX IF NOT EXISTS booking_events_idempotency
  ON booking_events (booking_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Append-only: corrections are new events. TRUNCATE (demo reset only) does not fire row triggers.
CREATE OR REPLACE FUNCTION booking_events_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'booking_events is append-only (% rejected)', TG_OP USING ERRCODE = 'restrict_violation';
END $$;

DROP TRIGGER IF EXISTS booking_events_no_update ON booking_events;
CREATE TRIGGER booking_events_no_update BEFORE UPDATE OR DELETE ON booking_events
  FOR EACH ROW EXECUTE FUNCTION booking_events_append_only();

-- Each stream grows by exactly one: sequence must be the current maximum + 1.
CREATE OR REPLACE FUNCTION booking_events_contiguous() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE last integer;
BEGIN
  SELECT coalesce(max(sequence), 0) INTO last FROM booking_events WHERE booking_id = NEW.booking_id;
  IF NEW.sequence <> last + 1 THEN
    RAISE EXCEPTION 'booking % expected sequence %, got %', NEW.booking_id, last + 1, NEW.sequence USING ERRCODE = 'unique_violation';
  END IF;
  IF NEW.sequence = 1 AND NEW.event_type <> 'BookingRequested' THEN
    RAISE EXCEPTION 'booking % must begin with BookingRequested', NEW.booking_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS booking_events_sequence ON booking_events;
CREATE TRIGGER booking_events_sequence BEFORE INSERT ON booking_events
  FOR EACH ROW EXECUTE FUNCTION booking_events_contiguous();

CREATE TABLE IF NOT EXISTS app_state (
  id         integer     PRIMARY KEY CHECK (id = 1),
  doc        jsonb       NOT NULL,
  version    bigint      NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One physical charger can hold one booking at a time (start .. end + turnaround buffer).
CREATE TABLE IF NOT EXISTS resource_holds (
  booking_id  text      PRIMARY KEY,
  resource_id text      NOT NULL,
  during      tstzrange NOT NULL,
  active      boolean   NOT NULL DEFAULT true,
  CONSTRAINT resource_holds_no_overlap EXCLUDE USING gist (resource_id WITH =, during WITH &&) WHERE (active)
);

-- Keeps resource_holds in step with the event stream. Bulk restores set ampere.bulk = 'on'
-- and rebuild the projection afterwards with rebuild_resource_holds().
CREATE OR REPLACE FUNCTION booking_events_project_hold() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('ampere.bulk', true) = 'on' THEN
    RETURN NULL;
  END IF;
  IF NEW.event_type = 'BookingRequested' THEN
    INSERT INTO resource_holds (booking_id, resource_id, during)
    VALUES (NEW.booking_id, NEW.payload->>'resource_id',
            tstzrange((NEW.payload->>'start_at')::timestamptz, (NEW.payload->>'blocked_until')::timestamptz, '[)'));
  ELSIF NEW.event_type IN ('HostDeclined', 'HoldExpired', 'BookingCancelled', 'ChargingCompleted') THEN
    UPDATE resource_holds SET active = false WHERE booking_id = NEW.booking_id;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS booking_events_hold ON booking_events;
CREATE TRIGGER booking_events_hold AFTER INSERT ON booking_events
  FOR EACH ROW EXECUTE FUNCTION booking_events_project_hold();

CREATE OR REPLACE FUNCTION rebuild_resource_holds() RETURNS void LANGUAGE sql AS $$
  TRUNCATE resource_holds;
  INSERT INTO resource_holds (booking_id, resource_id, during, active)
  SELECT r.booking_id,
         r.payload->>'resource_id',
         tstzrange((r.payload->>'start_at')::timestamptz, (r.payload->>'blocked_until')::timestamptz, '[)'),
         NOT EXISTS (
           SELECT 1 FROM booking_events e
           WHERE e.booking_id = r.booking_id
             AND e.event_type IN ('HostDeclined', 'HoldExpired', 'BookingCancelled', 'ChargingCompleted'))
  FROM booking_events r
  WHERE r.event_type = 'BookingRequested';
$$;
