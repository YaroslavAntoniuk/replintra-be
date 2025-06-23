/*
  Warnings:

  - A unique constraint covering the columns `[apiKey]` on the table `Chatbot` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `apiKey` to the `Chatbot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Chatbot" ADD COLUMN     "apiKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Chatbot_apiKey_key" ON "Chatbot"("apiKey");
