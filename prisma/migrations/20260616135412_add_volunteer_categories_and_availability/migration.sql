-- AlterTable
ALTER TABLE "Volunteer" ADD COLUMN     "availability" JSONB DEFAULT '[]';

-- CreateTable
CREATE TABLE "VolunteerCategory" (
    "volunteerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "VolunteerCategory_pkey" PRIMARY KEY ("volunteerId","categoryId")
);

-- AddForeignKey
ALTER TABLE "VolunteerCategory" ADD CONSTRAINT "VolunteerCategory_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerCategory" ADD CONSTRAINT "VolunteerCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
