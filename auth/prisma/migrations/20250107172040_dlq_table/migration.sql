-- CreateTable
CREATE TABLE "dlqs" (
    "id" SERIAL NOT NULL,
    "value" JSONB NOT NULL,
    "topic" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dlqs_pkey" PRIMARY KEY ("id")
);
