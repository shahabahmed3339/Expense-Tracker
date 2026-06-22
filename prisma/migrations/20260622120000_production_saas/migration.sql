-- Production SaaS schema: Decimal amounts, user preferences, audit log, recurring expenses

-- User preferences
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultCurrency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'en-US';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Convert Float to Decimal(12,2)
ALTER TABLE "Budget" ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING ROUND("amount"::numeric, 2);
ALTER TABLE "Expense" ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING ROUND("amount"::numeric, 2);
ALTER TABLE "ExpenseSplit" ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING ROUND("amount"::numeric, 2);
ALTER TABLE "Loan" ALTER COLUMN "totalAmount" TYPE DECIMAL(12,2) USING ROUND("totalAmount"::numeric, 2);
ALTER TABLE "LoanTransaction" ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING ROUND("amount"::numeric, 2);

-- AuditLog
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RecurringExpense
CREATE TYPE "RecurringCadence" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

CREATE TABLE IF NOT EXISTS "RecurringExpense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "cadence" "RecurringCadence" NOT NULL,
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RecurringExpense_userId_isActive_nextRunDate_idx" ON "RecurringExpense"("userId", "isActive", "nextRunDate");
ALTER TABLE "RecurringExpense" DROP CONSTRAINT IF EXISTS "RecurringExpense_userId_fkey";
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringExpense" DROP CONSTRAINT IF EXISTS "RecurringExpense_categoryId_fkey";
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
