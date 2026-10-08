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
      propertyType,
      startDate,
      endDate,
      rent,
      deposit,
      paybill,
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

    const formatKes = (n: number) => `KES ${Number(n).toLocaleString('en-KE')}`

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Georgia, serif; color: #1d3d33; margin: 0; padding: 0; background: #f6f9f5; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 10px; overflow: hidden; }
    .header { background: #173d36; padding: 32px 40px; }
    .header h1 { color: #fff; font-size: 22px; margin: 0 0 6px; font-weight: 400; }
    .header p { color: #a9c4bb; font-size: 13px; margin: 0; }
    .body { padding: 36px 40px; }
    .note { font-size: 13px; color: #718078; line-height: 1.7; margin-bottom: 24px; }
    .section { background: #f6f9f5; border-radius: 8px; padding: 20px 24px; margin-bottom: 20px; }
    .section h3 { margin: 0 0 14px; font-size: 11px; font-weight: 700; color: #3c5e4f; text-transform: uppercase; letter-spacing: .06em; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td { padding: 7px 0; border-bottom: 1px solid #e7ede8; }
    td:last-child { text-align: right; font-weight: 700; color: #1d3d33; }
    tr:last-child td { border-bottom: none; }
    .agent-sig { margin-top: 24px; padding: 16px 20px; border-left: 3px solid #173d36; background: #f6f9f5; }
    .footer { background: #f6f9f5; padding: 20px 40px; border-top: 1px solid #e7ede8; font-size: 11px; color: #9aa49e; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Rental Contract — ${propertyName}</h1>
      <p>Habitat Housing Marketplace</p>
    </div>
    <div class="body">
      <p class="note">Dear <strong>${tenantName}</strong>,<br><br>
        Your application for <strong>${propertyName}</strong> has been reviewed. 
        Below are the details of your rental agreement. Contact your agent if you have any questions.
      </p>
      <div class="section">
        <h3>Property Details</h3>
        <table>
          <tr><td style="color:#7f9585">Property</td><td>${propertyName}</td></tr>
          <tr><td style="color:#7f9585">Address</td><td>${propertyAddress}</td></tr>
          <tr><td style="color:#7f9585">Type</td><td>${propertyType}</td></tr>
        </table>
      </div>
      <div class="section">
        <h3>Lease Terms</h3>
        <table>
          <tr><td style="color:#7f9585">Start date</td><td>${startDate}</td></tr>
          <tr><td style="color:#7f9585">End date</td><td>${endDate}</td></tr>
          <tr><td style="color:#7f9585">Monthly rent</td><td>${formatKes(rent)}</td></tr>
          <tr><td style="color:#7f9585">Security deposit</td><td>${formatKes(deposit)}</td></tr>
          ${paybill && paybill !== 'N/A' ? `<tr><td style="color:#7f9585">M-Pesa Paybill</td><td>${paybill}</td></tr>` : ''}
        </table>
      </div>
      <p class="note">Please do not make any payment until you have received and signed the full contract document from your agent.</p>
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

    // Build the raw email in RFC 2822 format and send via Gmail API using OAuth2-less
    // approach: SMTP over fetch using Gmail's REST API with App Password via basic auth
    // encoded as base64 for the Gmail API sendRaw endpoint.

    // Encode credentials for basic auth
    const credentials = btoa(`${GMAIL_USER}:${GMAIL_APP_PASSWORD}`)

    // Build raw MIME message
    const boundary = `boundary_${Date.now()}`
    const rawEmail = [
      `From: Habitat <${GMAIL_USER}>`,
      `To: ${tenantEmail}`,
      `Subject: Your Rental Contract — ${propertyName}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      ``,
      `Dear ${tenantName},`,
      ``,
      `Your application for ${propertyName} at ${propertyAddress} has been reviewed.`,
      ``,
      `Lease Terms:`,
      `- Start: ${startDate}`,
      `- End: ${endDate}`,
      `- Monthly rent: ${formatKes(rent)}`,
      `- Security deposit: ${formatKes(deposit)}`,
      ``,
      `Contact: ${agentName} | ${agentEmail}${agentPhone ? ' | ' + agentPhone : ''}`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      ``,
      html,
      ``,
      `--${boundary}--`,
    ].join('\r\n')

    // Base64url encode the raw email for Gmail API
    const encodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Use Gmail REST API with App Password via OAuth — but since App Password
    // doesn't support OAuth, use the SMTP relay via fetch to smtp2go or use
    // Supabase's built-in pg_net to call Gmail SMTP.
    // Best approach without OAuth: use smtp4dev-compatible service.
    // We'll use the Gmail SMTP via nodemailer-style raw TCP — use smtp library that works.

    // Use deno-mailer which is compatible with current Deno
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
      subject: `Your Rental Contract — ${propertyName}`,
      html,
    })

    await client.close()

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('send-contract error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to send email.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
