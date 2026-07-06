-- AlterTable: add sort_order to Agent for drag-and-drop priority ordering
ALTER TABLE "Agent" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
