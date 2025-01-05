-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE
  "users" DROP COLUMN "hashedAt",
ADD
  COLUMN "status" "Status" NOT NULL DEFAULT 'ACTIVE';