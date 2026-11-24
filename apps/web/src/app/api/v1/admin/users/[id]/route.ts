import { z } from "zod";
import { route, body, ok, requireAdmin, ApiError } from "@/lib/api";
import { db } from "@/lib/db";

const schema = z.object({
  planCode: z.string().max(40).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  disabled: z.boolean().optional(),
  verifyEmail: z.boolean().optional(),
});

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const data = await body(req, schema);
  if (id === admin.id && (data.role === "USER" || data.disabled)) throw new ApiError(400, "No puedes quitarte permisos ni desactivar tu propia cuenta.");
  if (data.planCode && !(await db.plan.findUnique({ where: { code: data.planCode } }))) throw new ApiError(404, "Plan no encontrado");
  const user = await db.user.update({
    where: { id },
    data: { planCode: data.planCode, role: data.role, disabled: data.disabled, ...(data.verifyEmail ? { emailVerifiedAt: new Date() } : {}) },
    select: { id: true, planCode: true, role: true, disabled: true, emailVerifiedAt: true },
  });
  if (data.disabled) await db.session.deleteMany({ where: { userId: id } });
  return ok({ user });
});

export const DELETE = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  if (id === admin.id) throw new ApiError(400, "No puedes eliminar tu propia cuenta.");
  await db.user.delete({ where: { id } });
  return ok({ ok: true });
});
