import "server-only";
import { issueToken } from "./auth";
import { sendMail } from "./mail";
import { env } from "./env";

export async function sendVerificationEmail(user: { id: string; email: string; name: string }) {
  const token = await issueToken(user.id, "EMAIL_VERIFY", 60 * 24);
  await sendMail(
    user.email,
    "Verifica tu correo en Forjapp",
    `Hola ${user.name},\n\nGracias por registrarte en Forjapp. Confirma tu correo para empezar a compilar tus apps.`,
    `${env.appUrl}/verify-email?token=${token}`,
    "Verificar correo",
  );
}

export async function sendResetEmail(user: { id: string; email: string; name: string }) {
  const token = await issueToken(user.id, "PASSWORD_RESET", 60);
  await sendMail(
    user.email,
    "Restablece tu contraseña de Forjapp",
    `Hola ${user.name},\n\nHemos recibido una solicitud para cambiar tu contraseña. El enlace caduca en 1 hora. Si no fuiste tú, ignora este mensaje.`,
    `${env.appUrl}/reset-password?token=${token}`,
    "Cambiar contraseña",
  );
}
