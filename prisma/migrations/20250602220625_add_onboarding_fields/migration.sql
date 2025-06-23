/*
  Warnings:

  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `verificationtokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "sessions";

-- DropTable
DROP TABLE "verificationtokens";
