-- CreateTable
CREATE TABLE "CanvasPost" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "mood" TEXT,
    "tags" TEXT[],
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CanvasPost_pkey" PRIMARY KEY ("id")
);
