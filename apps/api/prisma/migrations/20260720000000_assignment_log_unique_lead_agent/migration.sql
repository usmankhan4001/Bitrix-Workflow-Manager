-- Deduplicate existing AssignmentLog rows before adding the uniqueness
-- constraint below. Production may already contain duplicate (lead_id,
-- agent_id) rows from the self-trigger reassignment bug this migration
-- helps close off. Keep the earliest row per pair (the original, correct
-- assignment); drop later ones (the erroneous re-triggers).
DELETE FROM "AssignmentLog" a
USING "AssignmentLog" b
WHERE a.lead_id = b.lead_id
  AND a.agent_id = b.agent_id
  AND a.assigned_at > b.assigned_at
  AND a.id <> b.id;

-- Tie-breaker for exact-same-timestamp duplicates — keep the lowest id.
DELETE FROM "AssignmentLog" a
USING "AssignmentLog" b
WHERE a.lead_id = b.lead_id
  AND a.agent_id = b.agent_id
  AND a.assigned_at = b.assigned_at
  AND a.id > b.id;

-- Backstop against duplicate assignment rows for the same lead+agent pair.
-- Legitimate reassignment to a different agent still gets its own row.
CREATE UNIQUE INDEX "AssignmentLog_lead_id_agent_id_key" ON "AssignmentLog"("lead_id", "agent_id");
