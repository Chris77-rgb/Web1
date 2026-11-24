"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";

/** Button that calls an admin API endpoint and refreshes the server-rendered page. */
export function AdminAction({ url, method = "POST", payload, confirmText, success = "Hecho", children, ...rest }: ButtonProps & { url: string; method?: string; payload?: unknown; confirmText?: string; success?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      {...rest}
      loading={busy}
      onClick={async () => {
        if (confirmText && !confirm(confirmText)) return;
        setBusy(true);
        try {
          await api(url, { method, body: payload });
          toast(success, "success");
          router.refresh();
        } catch (e) {
          toast((e as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
    </Button>
  );
}

export function PlanSelect({ userId, value, plans }: { userId: string; value: string; plans: { code: string; name: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <select
      defaultValue={value}
      className="rounded-lg border border-line bg-card px-2 py-1 text-sm"
      aria-label="Plan"
      onChange={async (e) => {
        try {
          await api(`/api/v1/admin/users/${userId}`, { method: "PATCH", body: { planCode: e.target.value } });
          toast("Plan actualizado", "success");
          router.refresh();
        } catch (err) {
          toast((err as Error).message, "error");
        }
      }}
    >
      {plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
    </select>
  );
}
