-- CreateEnum
CREATE TYPE "BodySystem" AS ENUM ('skeletal', 'muscular', 'cardiovascular', 'nervous', 'lymphatic', 'digestive', 'respiratory', 'urinary', 'reproductive', 'endocrine', 'integumentary');

-- CreateEnum
CREATE TYPE "BodyRegion" AS ENUM ('head', 'neck', 'thorax', 'abdomen', 'pelvis', 'back', 'upper_limb', 'lower_limb');

-- CreateEnum
CREATE TYPE "Laterality" AS ENUM ('left', 'right', 'midline');

-- CreateTable
CREATE TABLE "Structure" (
    "id" TEXT NOT NULL,
    "termKey" TEXT NOT NULL,
    "ta2Id" INTEGER,
    "meshId" TEXT,
    "nameLa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "system" "BodySystem" NOT NULL,
    "subsystem" TEXT,
    "region" "BodyRegion",
    "laterality" "Laterality" NOT NULL DEFAULT 'midline',
    "description" TEXT,
    "parentId" TEXT,
    "assetId" TEXT,
    "boundsMin" DOUBLE PRECISION[],
    "boundsMax" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Structure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetBundle" (
    "id" TEXT NOT NULL,
    "system" "BodySystem" NOT NULL,
    "url" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "meshCount" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetBundle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Structure_meshId_key" ON "Structure"("meshId");

-- CreateIndex
CREATE INDEX "Structure_system_idx" ON "Structure"("system");

-- CreateIndex
CREATE INDEX "Structure_region_idx" ON "Structure"("region");

-- CreateIndex
CREATE INDEX "Structure_parentId_idx" ON "Structure"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Structure_termKey_laterality_key" ON "Structure"("termKey", "laterality");

-- AddForeignKey
ALTER TABLE "Structure" ADD CONSTRAINT "Structure_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Structure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Structure" ADD CONSTRAINT "Structure_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "AssetBundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
