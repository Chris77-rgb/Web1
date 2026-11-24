"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { api } from "@/lib/client";

function Verify() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState("");
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    api("/api/v1/auth/verify-email", { body: { token } })
      .then(() => setState("ok"))
      .catch((e: Error) => { setMsg(e.message); setState("error"); });
  }, [token]);
  return (
    <div className="text-center">
      {state === "loading" && <Loader2 className="mx-auto size-12 animate-spin text-brand-600" />}
      {state === "ok" && <><CheckCircle2 className="mx-auto size-12 text-emerald-500" /><h1 className="mt-4 text-2xl font-bold">¡Correo verificado!</h1><p className="mt-2 text-sm text-muted">Ya puedes compilar tus aplicaciones.</p></>}
      {state === "error" && <><XCircle className="mx-auto size-12 text-red-500" /><h1 className="mt-4 text-2xl font-bold">No se pudo verificar</h1><p className="mt-2 text-sm text-muted">{msg}</p></>}
      {state !== "loading" && <Link href="/dashboard" className="mt-6 inline-block font-medium text-brand-600 hover:underline">Ir al panel</Link>}
    </div>
  );
}

export default function Page() {
  return <Suspense><Verify /></Suspense>;
}
