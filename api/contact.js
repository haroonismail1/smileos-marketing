// Same-origin endpoint for the general contact form. Emails the enquiry via
// Resend with reply_to set to the sender, so replying goes straight back to
// them. There is no database row behind this one — email IS the delivery — so
// unlike founder-access, a send failure MUST surface as an error rather than a
// silent success, otherwise the message is lost with nobody aware.
//
// The destination address lives in the NOTIFY_TO environment variable, not in
// this file: the repository is public.
const NOTIFY_TO = process.env.NOTIFY_TO;

const field = (v, max) => String(v ?? "").trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body || {};

  // Honeypot — pretend success to bots.
  if (field(body.website, 10)) return res.status(200).json({ ok: true });

  const name = field(body.name, 200);
  const email = field(body.email, 320);
  const message = field(body.message, 5000);
  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: "Please fill in your name, a valid email, and your message." });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key || !NOTIFY_TO) {
    // Misconfiguration, not user error. Fail loudly — never swallow a message.
    console.error("contact form not configured", { hasKey: !!key, hasNotifyTo: !!NOTIFY_TO });
    return res.status(500).json({ error: "The contact form isn't available right now. Please try again shortly." });
  }

  const text = [
    "New contact enquiry via www.smileos.co.uk",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Practice: ${field(body.practice_name, 300) || "-"}`,
    `Topic: ${field(body.topic, 100) || "-"}`,
    `Page: ${field(body.source_page, 300) || "-"}`,
    "",
    "Message:",
    message,
  ].join("\n");

  // Try the smileos.co.uk sender first; if the Resend account doesn't have the
  // domain verified, fall back to resend.dev (allowed for delivery to the
  // account owner's own address).
  const send = (from) => fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [NOTIFY_TO], reply_to: email,
      subject: `Contact enquiry — ${field(body.topic, 100) || name}`, text,
    }),
  });

  try {
    let r = await send("SmileOS <noreply@smileos.co.uk>");
    if (!r.ok) {
      console.error("resend smileos.co.uk sender failed", r.status, await r.text());
      r = await send("SmileOS Website <onboarding@resend.dev>");
      if (!r.ok) {
        console.error("resend fallback sender failed", r.status, await r.text());
        return res.status(500).json({ error: "We couldn't send your message. Please try again shortly." });
      }
    }
  } catch (e) {
    console.error("resend error", e);
    return res.status(500).json({ error: "We couldn't send your message. Please try again shortly." });
  }

  return res.status(200).json({ ok: true });
}
