-- Prisma 5+ uses primary keys (rather than unique indexes) on implicit
-- many-to-many join tables. Non-destructive: the existing unique indexes
-- already guarantee there are no duplicate (A, B) pairs.

-- AlterTable
ALTER TABLE "_CategoryToImage" ADD CONSTRAINT "_CategoryToImage_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_CategoryToImage_AB_unique";

-- AlterTable
ALTER TABLE "_ImageToTag" ADD CONSTRAINT "_ImageToTag_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ImageToTag_AB_unique";

