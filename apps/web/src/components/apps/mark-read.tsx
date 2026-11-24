"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client";

export function MarkRead({ projectId, ids }: { projectId: string; ids: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button variant="outline" loading={busy} onClick={async () => { setBusy(true); await api(`/api/v1/projects/${projectId}/submissions`, { method: "PATCH", body: { ids } }).catch(() => {}); router.refresh(); setBusy(false); }}>
      <CheckCheck className="size-4" />Marcar todo como leído
    </Button>
  );
}
