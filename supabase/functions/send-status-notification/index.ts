import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      tenantEmail,
      tenantName,
      agentName,
      agentEmail,
      agentPhone,
      propertyName,
      propertyAddress,
      status, // 'approved' or 'declined'
    } = await req.json()

    if (!tenantEmail) {
      return new Response(
        JSON.stringify({ error: 'Tenant email is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const GMAIL_USER = Deno.env.get('GMAIL_USER')
    const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD')

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isApproved = status === 'approved'
    const isExpired = status === 'payment_expired'
    const statusLabel = isApproved ? 'Approved ✓' : isExpired ? 'Payment Deadline Passed' : 'Declined'
    const accentColor = isApproved ? '#10b981' : isExpired ? '#f59e0b' : '#ef4444'
    const subject = isApproved
      ? `Your application for ${propertyName} has been approved`
      : isExpired
        ? `Your application for ${propertyName} has expired — home returned to listing`
        : `Update on your application for ${propertyName}`

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" />
<style>
  body{font-family:Georgia,serif;color:#1d3d33;margin:0;padding:0;background:#f6f9f5}
  .wrapper{max-width:600px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden}
  .header{background:#173d36;padding:32px 40px}
  .header h1{color:#fff;font-size:22px;margin:0 0 6px;font-weight:400}
  .header p{color:#a9c4bb;font-size:13px;margin:0}
  .body{padding:36px 40px}
  .status-badge{display:inline-block;background:${accentColor};color:#fff;padding:8px 20px;border-radius:20px;font-size:13px;font-weight:700;margin-bottom:20px}
  .note{font-size:13px;color:#718078;line-height:1.7;margin-bottom:20px}
  .section{background:#f6f9f5;border-radius:8px;padding:18px 22px;margin-bottom:20px}
  .section h3{margin:0 0 10px;font-size:11px;font-weight:700;color:#3c5e4f;text-transform:uppercase;letter-spacing:.06em}
  table{width:100%;border-collapse:collapse;font-size:13px}
  td{padding:6px 0;border-bottom:1px solid #e7ede8;color:#7f9585}
  td:last-child{text-align:right;font-weight:700;color:#1d3d33}
  tr:last-child td{border-bottom:none}
  .agent-sig{padding:16px 20px;border-left:3px solid #173d36;background:#f6f9f5}
  .footer{background:#f6f9f5;padding:18px 40px;border-top:1px solid #e7ede8;font-size:11px;color:#9aa49e}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>${propertyName}</h1>
    <p>Habitat Housing Marketplace</p>
  </div>
  <div class="body">
    <div class="status-badge">${statusLabel}</div>
    <p class="note">Dear <strong>${tenantName}</strong>,<br><br>
      ${isApproved
        ? `Your application for <strong>${propertyName}</strong> at <strong>${propertyAddress}</strong> has been <strong>approved</strong> by the agent. Your agent will send you a rental contract shortly. Please do not make any payment until you have received and signed the contract. <strong>You must pay the security deposit within 72 hours of receiving the contract</strong>, otherwise your application will be cancelled.`
        : isExpired
          ? `Your application for <strong>${propertyName}</strong> at <strong>${propertyAddress}</strong> has been cancelled because the 72-hour deposit payment window has passed without a payment being received. The home has been returned to the available listings. If you are still interested, please submit a new application.`
          : `Thank you for your interest in <strong>${propertyName}</strong>. Unfortunately, your application has not been approved at this time. You are welcome to browse other available homes on Habitat.`
      }
    </p>
    <div class="section">
      <h3>Property</h3>
      <table>
        <tr><td>Home</td><td>${propertyName}</td></tr>
        <tr><td>Address</td><td>${propertyAddress}</td></tr>
        <tr><td>Decision</td><td style="color:${accentColor}">${statusLabel}</td></tr>
      </table>
    </div>
    ${isApproved ? `<p class="note">Your agent will contact you soon with the contract and payment details.</p>` : `<p class="note">If you have questions, feel free to contact your agent directly.</p>`}
    <div class="agent-sig">
      <strong style="display:block;color:#1d3d33;font-size:13px">${agentName}</strong>
      <span style="color:#718078;font-size:12px">${agentEmail}${agentPhone ? ' · ' + agentPhone : ''}</span>
    </div>
  </div>
  <div class="footer">
    Habitat Housing Marketplace · Sent on behalf of ${agentName}.<br>
    If you did not apply for a home on Habitat, please disregard this email.
  </div>
</div>
</body>
</html>`

    const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts')

    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    })

    await client.send({
      from: `Habitat <${GMAIL_USER}>`,
      to: tenantEmail,
      subject,
      html,
    })

    await client.close()

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('send-status-notification error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to send notification.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
