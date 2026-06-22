"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/trpc";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/Loader";

export default function OnboardingPage() {
  const router = useRouter();
  const { data, isLoading } = api.onboarding.status.useQuery();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");

  const complete = api.onboarding.complete.useMutation({
    onSuccess: () => {
      toast.success("Welcome! Your workspace is ready.");
      router.replace("/dashboard");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <Loader />;
  if (data?.onboardingCompleted) {
    router.replace("/dashboard");
    return <Loader />;
  }

  return (
    <div className="motion-page mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome</h1>
        <p className="text-sm text-[var(--muted)]">
          Set up your profile and we&apos;ll seed default categories to get you started.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div>
          <label htmlFor="onboarding-name" className="mb-1 block text-sm font-medium">
            Display name
          </label>
          <input
            id="onboarding-name"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="onboarding-currency" className="mb-1 block text-sm font-medium">
            Default currency
          </label>
          <select
            id="onboarding-currency"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="PKR">PKR</option>
          </select>
        </div>
        <Button
          type="button"
          onClick={() =>
            complete.mutate({
              name: name.trim() || undefined,
              defaultCurrency: currency,
            })
          }
          disabled={complete.isPending}
        >
          {complete.isPending ? "Setting up..." : "Complete setup"}
        </Button>
      </div>
    </div>
  );
}
