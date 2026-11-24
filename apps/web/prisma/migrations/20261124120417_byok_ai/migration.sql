-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiApiKeyEnc" TEXT,
ADD COLUMN     "aiKeyHint" TEXT,
ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiProvider" TEXT;
