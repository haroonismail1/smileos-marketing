// Same-origin endpoint for the founder-access form. Stores the enquiry via
// the Supabase edge function (source of truth), then emails Haroon via
// Resend. Email failure never fails the request — the row is already saved.
const EDGE_FN = "https://xqhwnkeljvgrwexpwosm.supabase.co/functions/v1/founder-access";
const NOTIFY_TO = "haroonismail87@gmail.com";

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
  const practice = field(body.practice_name, 300);
  if (!name || !practice || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: "Please fill in your name, a valid email, and your practice name." });
  }

  // 1. Store via the edge function (it validates + inserts with service role).
  let stored = false;
  try {
    const r = await fetch(EDGE_FN, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "https://www.smileos.co.uk" },
      body: JSON.stringify(body),
    });
    stored = r.ok;
  } catch (e) {
    console.error("edge store failed", e);
  }
  if (!stored) {
    return res.status(500).json({ error: "Something went wrong saving your request. Please email haroonismail87@gmail.com instead." });
  }

  // 2. Email notification. Try the smileos.co.uk sender first; if the Resend
  //    account doesn't have the domain verified, fall back to resend.dev
  //    (allowed for delivery to the account owner's own address).
  const key = process.env.RESEND_API_KEY;
  let emailed = false;
  if (key) {
    const text = [
      "New founder access request via www.smileos.co.uk",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Practice: ${practice}`,
      `Clinicians: ${field(body.clinicians, 200) || "-"}`,
      `Avg monthly consultations: ${field(body.monthly_consultations, 100) || "-"}`,
      `Plan interest: ${field(body.plan, 50) || "-"}`,
      `Page: ${field(body.source_page, 300) || "-"}`,
    ].join("\n");
    const send = (from) => fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [NOTIFY_TO], reply_to: email,
        subject: `Founder access request — ${practice}`, text,
      }),
    });
    try {
      let r = await send("SmileOS <noreply@smileos.co.uk>");
      if (!r.ok) {
        console.error("resend smileos.co.uk sender failed", r.status, await r.text());
        r = await send("SmileOS Website <onboarding@resend.dev>");
        if (!r.ok) console.error("resend fallback sender failed", r.status, await r.text());
      }
      emailed = r.ok;
    } catch (e) {
      console.error("resend error", e);
    }
  }

  return res.status(200).json({ ok: true, emailed });
}
