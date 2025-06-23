/*
  Warnings:

  - You are about to drop the column `tone` on the `Chatbot` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "Chatbot" DROP COLUMN "tone";

-- AlterTable
ALTER TABLE "ChatbotDocument" ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "size" INTEGER,
ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADING';
