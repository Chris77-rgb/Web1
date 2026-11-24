"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { APP_CATEGORIES } from "@forjapp/shared";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";

export function TemplateFromProject({ projectId, defaultName }: { projectId: string; defaultName: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Crear plantilla</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Crear plantilla a partir de esta app">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            try {
              await api("/api/v1/admin/templates", { body: { projectId, name: f.get("name"), category: f.get("category"), description: f.get("description") } });
              toast("Plantilla creada", "success");
              setOpen(false);
              router.push("/admin/templates");
            } catch (err) {
              toast((err as Error).message, "error");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Nombre"><Input name="name" defaultValue={defaultName} required minLength={2} maxLength={60} /></Field>
          <Field label="Categoría"><Select name="category">{APP_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
          <Field label="Descripción"><Textarea name="description" maxLength={300} rows={3} /></Field>
          <Button type="submit" loading={busy}>Crear plantilla</Button>
        </form>
      </Modal>
    </>
  );
}
