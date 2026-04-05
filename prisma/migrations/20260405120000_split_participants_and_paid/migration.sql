ALTER TABLE "ExpenseSplit"
  ADD COLUMN "name" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "isSelf" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT false;

UPDATE "ExpenseSplit" es
SET "name" = p."name"
FROM "Person" p
WHERE es."personId" = p."id";

ALTER TABLE "ExpenseSplit"
  ALTER COLUMN "personId" DROP NOT NULL;

CREATE INDEX "ExpenseSplit_personId_idx" ON "ExpenseSplit"("personId");
