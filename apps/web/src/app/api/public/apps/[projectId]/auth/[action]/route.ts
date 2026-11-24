import { z } from "zod";
import { route, body, ok, ApiError, withCors, corsPreflight, rateLimit, ipOf } from "@/lib/api";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getPublicProject, appUserToken } from "@/lib/public-app";
import { emailSchema, passwordSchema } from "@/lib/validators";

/** Registration/login for end-users of a generated app (module "auth"). */
export const POST = route<{ params: Promise<{ projectId: string; action: string }> }>(async (req, { params }) => {
  const { projectId, action } = await params;
  rateLimit(`appauth:${ipOf(req)}`, 30, 15 * 60_000);
  const project = await getPublicProject(projectId);
  {
    if (action === "register") {
      const d = await body(req, z.object({ name: z.string().trim().min(1).max(80), email: emailSchema, password: passwordSchema }));
      if (await db.appUser.findUnique({ where: { projectId_email: { projectId: project.id, email: d.email } } })) throw new ApiError(409, "Ya existe una cuenta con este email");
      const u = await db.appUser.create({ data: { projectId: project.id, name: d.name, email: d.email, passwordHash: await hashPassword(d.password) } });
      return withCors(ok({ token: appUserToken(u.id), user: { id: u.id, name: u.name, email: u.email } }, 201));
    }
    if (action === "login") {
      const d = await body(req, z.object({ email: emailSchema, password: z.string().max(200) }));
      const u = await db.appUser.findUnique({ where: { projectId_email: { projectId: project.id, email: d.email } } });
      if (!u || !(await verifyPassword(d.password, u.passwordHash))) throw new ApiError(401, "Email o contraseña incorrectos");
      return withCors(ok({ token: appUserToken(u.id), user: { id: u.id, name: u.name, email: u.email } }));
    }
    throw new ApiError(404, "Acción no válida");
  }
});
export const OPTIONS = corsPreflight;
