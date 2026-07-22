-- Duplicate-review queue: leads flagged by the guardrail are recorded here
-- instead of being escalated to the manager or assigned to anyone.
CREATE TABLE "DuplicateLead" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "lead_name" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "matched_lead_ids" TEXT NOT NULL,
    "matched_fields" TEXT NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "DuplicateLead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DuplicateLead_lead_id_key" ON "DuplicateLead"("lead_id");
