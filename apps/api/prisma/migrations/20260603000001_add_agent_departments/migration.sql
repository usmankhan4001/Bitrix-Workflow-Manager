-- AlterTable: add department_id and department_name to Agent
ALTER TABLE "Agent" ADD COLUMN "department_id" TEXT,
ADD COLUMN "department_name" TEXT;
