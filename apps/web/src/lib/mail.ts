import "server-only";
import nodemailer from "nodemailer";
import { env } from "./env";

let transport: nodemailer.Transporter | null = null;

/** Sends an email via SMTP_URL; without SMTP configured it logs the email (dev mode). */
export async function sendMail(to: string, subject: string, text: string, actionUrl?: string, actionLabel?: string) {
  const html = `<!doctype html><div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px;color:#0f172a">
  <div style="font-size:22px;font-weight:800;color:#6d28d9;margin-bottom:16px">Forjapp</div>
  <p style="white-space:pre-line;line-height:1.6">${escapeHtml(text)}</p>
  ${actionUrl ? `<p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">${escapeHtml(actionLabel ?? "Abrir")}</a></p><p style="font-size:12px;color:#64748b">Si el botón no funciona copia este enlace: ${escapeHtml(actionUrl)}</p>` : ""}
  </div>`;

  if (!env.smtpUrl()) {
    console.info(`\n[mail:dev] Para: ${to}\n[mail:dev] Asunto: ${subject}\n[mail:dev] ${text}${actionUrl ? `\n[mail:dev] Enlace: ${actionUrl}` : ""}\n`);
    return;
  }
  transport ??= nodemailer.createTransport(env.smtpUrl());
  await transport.sendMail({ from: env.mailFrom(), to, subject, text: actionUrl ? `${text}\n\n${actionUrl}` : text, html });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
