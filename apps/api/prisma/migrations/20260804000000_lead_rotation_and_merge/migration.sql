-- Old task-based system removed: CompletedQueue is no longer referenced anywhere.
DROP TABLE IF EXISTS "CompletedQueue";

-- Stage-based SLA tracking that replaces Bitrix tasks. One active row per lead
-- moving through the workflow.
CREATE TABLE "LeadRotation" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "current_agent_id" TEXT NOT NULL,
    "current_agent_name" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tried_agent_ids" TEXT NOT NULL,
    "lap_number" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadRotation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadRotation_lead_id_key" ON "LeadRotation"("lead_id");

-- Audit trail for leads auto-merged on a phone/email duplicate match.
CREATE TABLE "MergedLead" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "lead_name" TEXT NOT NULL,
    "merged_into_lead_id" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "matched_fields" TEXT NOT NULL,
    "merged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MergedLead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MergedLead_lead_id_key" ON "MergedLead"("lead_id");
