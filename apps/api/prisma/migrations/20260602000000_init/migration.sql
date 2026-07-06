-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "bitrix_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "team" TEXT NOT NULL DEFAULT 'Sales Executives',
    "whatsapp_phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssignmentLog" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wa_notified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AssignmentLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompletedQueue" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompletedQueue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkflowSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LateLead" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    CONSTRAINT "LateLead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Agent_bitrix_user_id_key" ON "Agent"("bitrix_user_id");
CREATE UNIQUE INDEX "WorkflowSetting_key_key" ON "WorkflowSetting"("key");
CREATE UNIQUE INDEX "LateLead_lead_id_key" ON "LateLead"("lead_id");
