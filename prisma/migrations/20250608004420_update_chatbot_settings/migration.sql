-- AlterTable
ALTER TABLE "ChatbotSettings" ADD COLUMN     "memorySize" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "responseLanguage" TEXT DEFAULT 'en';
