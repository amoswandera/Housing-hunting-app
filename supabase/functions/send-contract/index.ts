import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
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

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const formatKes = (n: number) => `KES ${Number(n).toLocaleString('en-KE')}`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Georgia, serif; color: #1d3d33; margin: 0; padding: 0; background: #f6f9f5; }
          .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
          .header { background: #173d36; padding: 32px 40px; }
          .header h1 { color: #fff; font-size: 22px; margin: 0 0 6px; font-weight: 400; letter-spacing: -0.5px; }
          .header p { color: #a9c4bb; font-size: 13px; margin: 0; }
          .body { padding: 36px 40px; }
          .greeting { font-size: 16px; margin-bottom: 20px; }
          .section { background: #f6f9f5; border-radius: 8px; padding: 20px 24px; margin-bottom: 20px; }
          .section h3 { margin: 0 0 14px; font-size: 11px; font-weight: 700; color: #3c5e4f; text-transform: uppercase; letter-spacing: .06em; }
          .row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #e7ede8; font-size: 13px; }
          .row:last-child { border-bottom: none; }
          .row span { color: #7f9585; }
          .row strong { color: #1d3d33; }
          .note { font-size: 12px; color: #718078; line-height: 1.7; margin-bottom: 24px; }
          .footer { background: #f6f9f5; padding: 20px 40px; border-top: 1px solid #e7ede8; font-size: 11px; color: #9aa49e; }
          .agent-sig { margin-top: 24px; padding: 16px 20px; border-left: 3px solid #173d36; background: #f6f9f5; border-radius: 0 6px 6px 0; }
          .agent-sig strong { display: block; color: #1d3d33; font-size: 13px; }
          .agent-sig span { color: #718078; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1>Rental Contract — ${propertyName}</h1>
            <p>Habitat Housing Marketplace</p>
          </div>
          <div class="body">
            <p class="greeting">Dear <strong>${tenantName}</strong>,</p>
            <p class="note">
              Your application for <strong>${propertyName}</strong> has been reviewed by your agent.
              Please find the details of your rental agreement below. Review everything carefully.
              If you have any questions, contact your agent directly.
            </p>

            <div class="section">
              <h3>Property</h3>
              <div class="row"><span>Property</span><strong>${propertyName}</strong></div>
              <div class="row"><span>Address</span><strong>${propertyAddress}</strong></div>
              <div class="row"><span>Type</span><strong>${propertyType}</strong></div>
            </div>

            <div class="section">
              <h3>Lease Terms</h3>
              <div class="row"><span>Start date</span><strong>${startDate}</strong></div>
              <div class="row"><span>End date</span><strong>${endDate}</strong></div>
              <div class="row"><span>Monthly rent</span><strong>${formatKes(rent)}</strong></div>
              <div class="row"><span>Security deposit</span><strong>${formatKes(deposit)}</strong></div>
              ${paybill && paybill !== 'N/A' ? `<div class="row"><span>M-Pesa Paybill</span><strong>${paybill}</strong></div>` : ''}
            </div>

            <p class="note">
              This is a summary of your contract. The full signed agreement will be provided by your agent.
              Please do not make any payment until you have received and reviewed the complete contract document.
            </p>

            <div class="agent-sig">
              <strong>${agentName}</strong>
              <span>${agentEmail}${agentPhone ? ' · ' + agentPhone : ''}</span>
            </div>
          </div>
          <div class="footer">
            Habitat Housing Marketplace &nbsp;·&nbsp; This email was sent on behalf of ${agentName}.
            If you did not apply for a home on Habitat, please disregard this email.
          </div>
        </div>
      </body>
      </html>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Habitat <contracts@habitat-app.co.ke>',
        to: [tenantEmail],
        subject: `Your Rental Contract — ${propertyName}`,
        html,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error('Resend error:', result)
      return new Response(
        JSON.stringify({ error: result.message || 'Failed to send email.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(
      JSON.stringify({ error: 'Unexpected error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
