CREATE TABLE "SpecialOpeningHour" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "label" TEXT,
    "opensAt" TEXT,
    "closesAt" TEXT,
    "closed" BOOLEAN NOT NULL DEFAULT true,
    "capacityOverride" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SpecialOpeningHour_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SpecialOpeningHour_date_key" ON "SpecialOpeningHour"("date");
