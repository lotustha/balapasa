-- CreateTable
CREATE TABLE "category_mappings" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "external_name" TEXT NOT NULL,
    "external_id" TEXT,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_mappings_source_external_name_key" ON "category_mappings"("source", "external_name");

-- AddForeignKey
ALTER TABLE "category_mappings" ADD CONSTRAINT "category_mappings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
