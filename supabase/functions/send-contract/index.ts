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
      pdfBase64,
      pdfFileName,
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

    // Build MIME email with PDF attachment
    const boundary = `==boundary_${Date.now()}==`
    const fileName = pdfFileName || 'rental_contract.pdf'

    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" />
<style>
  body{font-family:Georgia,serif;color:#1d3d33;margin:0;padding:0;background:#f6f9f5}
  .wrapper{max-width:600px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden}
  .header{background:#173d36;padding:32px 40px}
  .header h1{color:#fff;font-size:22px;margin:0 0 6px;font-weight:400}
  .header p{color:#a9c4bb;font-size:13px;margin:0}
  .body{padding:36px 40px}
  .note{font-size:13px;color:#718078;line-height:1.7;margin-bottom:24px}
  .section{background:#f6f9f5;border-radius:8px;padding:20px 24px;margin-bottom:20px}
  .section h3{margin:0 0 14px;font-size:11px;font-weight:700;color:#3c5e4f;text-transform:uppercase;letter-spacing:.06em}
  table{width:100%;border-collapse:collapse;font-size:13px}
  td{padding:7px 0;border-bottom:1px solid #e7ede8;color:#7f9585}
  td:last-child{text-align:right;font-weight:700;color:#1d3d33}
  tr:last-child td{border-bottom:none}
  .attach-note{background:#fff8ed;border-left:3px solid #e08b2d;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px;color:#7c5a1e;margin-bottom:20px}
  .agent-sig{margin-top:24px;padding:16px 20px;border-left:3px solid #173d36;background:#f6f9f5}
  .footer{background:#f6f9f5;padding:20px 40px;border-top:1px solid #e7ede8;font-size:11px;color:#9aa49e}
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
      Your rental contract for <strong>${propertyName}</strong> is ready.
      The full signed contract PDF is attached to this email. Please review it carefully,
      sign it, and return a copy to your agent.
    </p>
    <div class="attach-note">
      📎 <strong>${fileName}</strong> is attached to this email.
    </div>
    <div class="section">
      <h3>Property Details</h3>
      <table>
        <tr><td>Property</td><td>${propertyName}</td></tr>
        <tr><td>Address</td><td>${propertyAddress}</td></tr>
        <tr><td>Type</td><td>${propertyType}</td></tr>
      </table>
    </div>
    <div class="section">
      <h3>Lease Terms</h3>
      <table>
        <tr><td>Start date</td><td>${startDate}</td></tr>
        <tr><td>End date</td><td>${endDate}</td></tr>
        <tr><td>Monthly rent</td><td>${formatKes(rent)}</td></tr>
        <tr><td>Security deposit</td><td>${formatKes(deposit)}</td></tr>
        ${paybill && paybill !== 'N/A' ? `<tr><td>M-Pesa Paybill</td><td>${paybill}</td></tr>` : ''}
      </table>
    </div>
    <p class="note">
        This is a summary of your contract. The full signed agreement is attached to this email as a PDF.
        Review it carefully, sign it, and return a copy to your agent.<br><br>
        <strong style="color:#c0392b">⏰ Important: You must pay the security deposit of ${formatKes(deposit)} within 72 hours of receiving this contract. Failure to pay within this period will result in your application being cancelled and the home being made available to other tenants.</strong>
      </p>
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

    const textBody = `Dear ${tenantName},\n\nYour rental contract for ${propertyName} is attached to this email as a PDF.\nPlease review, sign, and return a copy to your agent.\n\nLease Terms:\n- Start: ${startDate}\n- End: ${endDate}\n- Monthly rent: ${formatKes(rent)}\n- Security deposit: ${formatKes(deposit)}\n\nAgent: ${agentName} | ${agentEmail}${agentPhone ? ' | ' + agentPhone : ''}\n\nHabitat Housing Marketplace`

    // Build RFC 2822 MIME message with attachment
    const mimeLines: string[] = [
      `From: Habitat <${GMAIL_USER}>`,
      `To: ${tenantEmail}`,
      `Subject: Your Rental Contract — ${propertyName}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: multipart/alternative; boundary="${boundary}_alt"`,
      ``,
      `--${boundary}_alt`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      ``,
      textBody,
      ``,
      `--${boundary}_alt`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      ``,
      htmlBody,
      ``,
      `--${boundary}_alt--`,
    ]

    // Add PDF attachment if provided
    if (pdfBase64) {
      mimeLines.push(
        ``,
        `--${boundary}`,
        `Content-Type: application/pdf`,
        `Content-Transfer-Encoding: base64`,
        `Content-Disposition: attachment; filename="${fileName}"`,
        ``,
        // Split base64 into 76-char lines (RFC 2045)
        pdfBase64.match(/.{1,76}/g)?.join('\r\n') || pdfBase64,
        ``,
      )
    }

    mimeLines.push(`--${boundary}--`)

    const rawEmail = mimeLines.join('\r\n')

    // Base64url encode for Gmail API
    const encodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Send via Gmail REST API using basic auth with App Password
    const authHeader = 'Basic ' + btoa(`${GMAIL_USER}:${GMAIL_APP_PASSWORD}`)

    // Gmail API requires OAuth2, so use SMTP via denomailer
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

    const attachments = pdfBase64 ? [{
      filename: fileName,
      contentType: 'application/pdf',
      encoding: 'base64',
      content: pdfBase64,
    }] : []

    await client.send({
      from: `Habitat <${GMAIL_USER}>`,
      to: tenantEmail,
      subject: `Your Rental Contract — ${propertyName}`,
      html: htmlBody,
      attachments,
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
