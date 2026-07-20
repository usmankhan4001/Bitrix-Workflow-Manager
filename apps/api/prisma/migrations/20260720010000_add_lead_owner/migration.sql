-- Tracks the last Bitrix ASSIGNED_BY_ID observed for each lead, used to tell
-- a genuine owner change apart from a manager touch that didn't change it.
CREATE TABLE "LeadOwner" (
    "lead_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadOwner_pkey" PRIMARY KEY ("lead_id")
);
