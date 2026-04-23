import { env } from "../config/env";

export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendOwnerEmail(payload: MailPayload): Promise<{ ok: boolean; mode: "resend" | "log" }> {
  if (!env.resendApiKey) {
    console.info("[mail:log]", payload.to, payload.subject, payload.text.slice(0, 500));
    return { ok: true, mode: "log" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[mail:resend]", res.status, err);
    return { ok: false, mode: "resend" };
  }

  return { ok: true, mode: "resend" };
}

const BRAND = {
  primary: "#b42348",
  primaryDark: "#8f1c3a",
  bgSoft: "#fdf2f4",
  border: "#e8d5da",
  text: "#2a181c",
  muted: "#6b5a5e",
} as const;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type OrderEmailCustomer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  registeredAccount: boolean;
};

export type OrderEmailLineItem = { name: string; qty: number };

export function formatOrderEmailBody(
  items: OrderEmailLineItem[],
  notes: string | undefined,
  customer: OrderEmailCustomer,
  meta: { orderId: string; expiresAt: Date },
): string {
  const lines = items.map((i) => `- ${i.name} x ${i.qty}`).join("\n");
  return [
    "Nuevo pedido desde la web — 3D Mbarete",
    "",
    "=== Quién pide ===",
    `Nombre: ${customer.name}`,
    `Email: ${customer.email}`,
    `Teléfono: ${customer.phone}`,
    `Entrega / dirección: ${customer.address}`,
    customer.registeredAccount ? "Cuenta: cliente registrado (sesión iniciada)" : "Cuenta: invitado",
    "",
    "=== Productos ===",
    lines,
    notes ? `\nNotas del cliente:\n${notes}` : "",
    "",
    `Pedido ID: ${meta.orderId}`,
    `Seguimiento interno (pendiente hasta): ${meta.expiresAt.toLocaleString("es-PY")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildOrderEmailHtml(
  items: OrderEmailLineItem[],
  notes: string | undefined,
  customer: OrderEmailCustomer,
  meta: { orderId: string; expiresAt: Date },
): string {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:10px 12px;border-bottom:1px solid ${BRAND.border};color:${BRAND.text};">${escapeHtml(i.name)}</td>` +
        `<td style="padding:10px 12px;border-bottom:1px solid ${BRAND.border};text-align:right;font-weight:600;color:${BRAND.primary};">${i.qty}</td></tr>`,
    )
    .join("");

  const notesBlock = notes?.trim()
    ? `<div style="margin-top:20px;padding:14px 16px;background:${BRAND.bgSoft};border-radius:8px;border:1px solid ${BRAND.border};">
         <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${BRAND.primary};text-transform:uppercase;letter-spacing:0.06em;">Notas del cliente</p>
         <p style="margin:0;font-size:14px;line-height:1.5;color:${BRAND.text};white-space:pre-wrap;">${escapeHtml(notes.trim())}</p>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f6f4f5;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(42,24,28,0.08);border:1px solid ${BRAND.border};">
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND.primary} 0%,${BRAND.primaryDark} 100%);padding:20px 24px;">
              <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.85);">3D Mbarete</p>
              <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.25;">Nuevo pedido web</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px;">
              <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:${BRAND.primary};text-transform:uppercase;letter-spacing:0.05em;">Datos de quien pide</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.6;color:${BRAND.text};">
                <tr><td style="padding:4px 0;color:${BRAND.muted};width:120px;">Nombre</td><td style="padding:4px 0;">${escapeHtml(customer.name)}</td></tr>
                <tr><td style="padding:4px 0;color:${BRAND.muted};">Email</td><td style="padding:4px 0;"><a href="mailto:${encodeURIComponent(customer.email)}" style="color:${BRAND.primary};">${escapeHtml(customer.email)}</a></td></tr>
                <tr><td style="padding:4px 0;color:${BRAND.muted};">Teléfono</td><td style="padding:4px 0;">${escapeHtml(customer.phone)}</td></tr>
                <tr><td style="padding:4px 0;color:${BRAND.muted};vertical-align:top;">Entrega</td><td style="padding:4px 0;white-space:pre-wrap;">${escapeHtml(customer.address)}</td></tr>
                <tr><td style="padding:4px 0;color:${BRAND.muted};">Cuenta</td><td style="padding:4px 0;">${customer.registeredAccount ? "Registrada (sesión iniciada)" : "Invitado"}</td></tr>
              </table>
              <p style="margin:20px 0 10px;font-size:13px;font-weight:600;color:${BRAND.primary};text-transform:uppercase;letter-spacing:0.05em;">Productos</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${BRAND.border};border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:${BRAND.bgSoft};">
                    <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${BRAND.muted};">Producto</th>
                    <th align="right" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${BRAND.muted};">Cant.</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
              ${notesBlock}
              <div style="margin-top:22px;padding-top:18px;border-top:1px solid ${BRAND.border};font-size:13px;color:${BRAND.muted};">
                <p style="margin:0 0 6px;"><strong style="color:${BRAND.text};">Pedido ID:</strong> <code style="background:${BRAND.bgSoft};padding:2px 6px;border-radius:4px;font-size:12px;">${escapeHtml(meta.orderId)}</code></p>
                <p style="margin:0;"><strong style="color:${BRAND.text};">Seguimiento interno (pendiente hasta):</strong> ${escapeHtml(meta.expiresAt.toLocaleString("es-PY"))}</p>
              </div>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:${BRAND.muted};text-align:center;">Correo automático desde la tienda 3D Mbarete</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const CONTACT_TYPE_LABELS: Record<string, string> = {
  presupuesto: "Presupuesto",
  soporte: "Soporte",
  otro: "Otro",
};

export type ContactEmailData = {
  name: string;
  email: string;
  phone?: string;
  type: string;
  message: string;
  requestId?: string;
};

export function contactTypeLabel(type: string): string {
  return CONTACT_TYPE_LABELS[type] ?? type;
}

export function formatContactEmailBody(data: ContactEmailData): string {
  const tipo = contactTypeLabel(data.type);
  const tel = data.phone?.trim() ? data.phone.trim() : "—";
  return [
    "Nuevo mensaje de contacto — 3D Mbarete",
    "",
    "=== Tipo de consulta ===",
    tipo,
    "",
    "=== Quién escribe ===",
    `Nombre: ${data.name}`,
    `Email: ${data.email}`,
    `Teléfono: ${tel}`,
    "",
    "=== Mensaje ===",
    data.message.trim(),
    data.requestId ? `\n\nSolicitud ID: ${data.requestId}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildContactEmailHtml(data: ContactEmailData): string {
  const tipo = contactTypeLabel(data.type);
  const tel = data.phone?.trim() ? escapeHtml(data.phone.trim()) : "—";
  const messageBlock = `<div style="margin-top:4px;padding:14px 16px;background:${BRAND.bgSoft};border-radius:8px;border:1px solid ${BRAND.border};">
    <p style="margin:0;font-size:14px;line-height:1.55;color:${BRAND.text};white-space:pre-wrap;">${escapeHtml(data.message.trim())}</p>
  </div>`;

  const footerId = data.requestId
    ? `<div style="margin-top:22px;padding-top:18px;border-top:1px solid ${BRAND.border};font-size:13px;color:${BRAND.muted};">
         <p style="margin:0;"><strong style="color:${BRAND.text};">Solicitud ID:</strong> <code style="background:${BRAND.bgSoft};padding:2px 6px;border-radius:4px;font-size:12px;">${escapeHtml(data.requestId)}</code></p>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f6f4f5;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(42,24,28,0.08);border:1px solid ${BRAND.border};">
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND.primary} 0%,${BRAND.primaryDark} 100%);padding:20px 24px;">
              <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.85);">3D Mbarete</p>
              <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.25;">Nuevo contacto desde la web</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px;">
              <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:${BRAND.primary};text-transform:uppercase;letter-spacing:0.05em;">Tipo de consulta</p>
              <p style="margin:0 0 20px;font-size:15px;font-weight:600;color:${BRAND.text};">${escapeHtml(tipo)}</p>
              <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:${BRAND.primary};text-transform:uppercase;letter-spacing:0.05em;">Datos de quien escribe</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.6;color:${BRAND.text};">
                <tr><td style="padding:4px 0;color:${BRAND.muted};width:120px;">Nombre</td><td style="padding:4px 0;">${escapeHtml(data.name)}</td></tr>
                <tr><td style="padding:4px 0;color:${BRAND.muted};">Email</td><td style="padding:4px 0;"><a href="mailto:${encodeURIComponent(data.email)}" style="color:${BRAND.primary};">${escapeHtml(data.email)}</a></td></tr>
                <tr><td style="padding:4px 0;color:${BRAND.muted};">Teléfono</td><td style="padding:4px 0;">${tel}</td></tr>
              </table>
              <p style="margin:20px 0 10px;font-size:13px;font-weight:600;color:${BRAND.primary};text-transform:uppercase;letter-spacing:0.05em;">Mensaje</p>
              ${messageBlock}
              ${footerId}
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:${BRAND.muted};text-align:center;">Correo automático desde la tienda 3D Mbarete</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
