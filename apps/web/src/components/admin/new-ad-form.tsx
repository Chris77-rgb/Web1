"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ImageInput } from "@/components/editor/fields";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";

export function NewAdForm() {
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  return (
    <form
      className="grid gap-4 p-5 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        setBusy(true);
        try {
          await api("/api/v1/admin/ads", { body: { name: f.get("name"), imageUrl: image, linkUrl: f.get("linkUrl"), weight: Number(f.get("weight")) || 1 } });
          toast("Anuncio creado", "success");
          form.reset();
          setImage("");
          router.refresh();
        } catch (err) {
          toast((err as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex flex-col gap-4">
        <Field label="Nombre del anunciante o campaña"><Input name="name" required minLength={2} maxLength={80} /></Field>
        <Field label="Enlace de destino"><Input name="linkUrl" type="url" required placeholder="https://" maxLength={500} /></Field>
        <Field label="Peso" hint="Los anuncios con más peso se muestran más veces."><Input name="weight" type="number" min={1} max={100} defaultValue={1} /></Field>
      </div>
      <div className="flex flex-col gap-4">
        <Field label="Imagen del banner"><ImageInput value={image} onChange={setImage} projectId="" /></Field>
        <Button type="submit" loading={busy} disabled={!image}>Crear anuncio</Button>
      </div>
    </form>
  );
}
