-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "adfreeUntil" TIMESTAMP(3),
ADD COLUMN     "publishedConfig" JSONB,
ADD COLUMN     "publishedRevision" INTEGER,
ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "HouseAd" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseAd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdDayCounter" (
    "projectId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "n" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdDayCounter_pkey" PRIMARY KEY ("projectId","day")
);

-- CreateTable
CREATE TABLE "AdVisitorDay" (
    "projectId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,

    CONSTRAINT "AdVisitorDay_pkey" PRIMARY KEY ("projectId","day","visitorId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- AddForeignKey
ALTER TABLE "AdDayCounter" ADD CONSTRAINT "AdDayCounter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdVisitorDay" ADD CONSTRAINT "AdVisitorDay_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

