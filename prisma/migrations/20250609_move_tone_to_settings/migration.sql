-- Remove tone from Chatbot model
ALTER TABLE "Chatbot" DROP COLUMN IF EXISTS "tone";

-- Add tone to ChatbotSettings model
ALTER TABLE "ChatbotSettings" ADD COLUMN IF NOT EXISTS "tone" TEXT;
