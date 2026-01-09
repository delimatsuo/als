import { NextRequest, NextResponse } from 'next/server';

// Twilio credentials (add to .env.local)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Escape XML special characters to prevent TwiML injection
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface EmergencyRequest {
  patientName: string;
  caregiverPhones: string[]; // Array of phone numbers to call
  message?: string;
  location?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EmergencyRequest = await request.json();
    const { patientName, caregiverPhones, message, location } = body;

    if (!caregiverPhones || caregiverPhones.length === 0) {
      return NextResponse.json(
        { error: 'No caregiver phone numbers provided' },
        { status: 400 }
      );
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return NextResponse.json(
        { error: 'Twilio not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to environment.' },
        { status: 500 }
      );
    }

    // Sanitize user inputs to prevent XML injection
    const safePatientName = escapeXml(patientName || 'the patient');
    const safeMessage = message ? escapeXml(message) : '';
    const safeLocation = location ? escapeXml(location) : '';

    const alertMessage = safeMessage || `Emergency alert from ${safePatientName}. They need help immediately.`;
    const locationInfo = safeLocation ? ` Location: ${safeLocation}` : '';

    // TwiML for the phone call - speaks the emergency message
    const twiml = `
      <Response>
        <Say voice="alice" loop="2">
          ${alertMessage}${locationInfo}
          Press any key to acknowledge this alert.
        </Say>
        <Pause length="10"/>
        <Say voice="alice">
          This is an automated emergency alert. Please check on ${safePatientName} immediately.
        </Say>
      </Response>
    `;

    const results = [];

    // Call each caregiver
    for (const phone of caregiverPhones) {
      try {
        // Make phone call via Twilio
        const callResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: phone,
              From: TWILIO_PHONE_NUMBER,
              Twiml: twiml,
              // Call twice if no answer (helps bypass iOS DND)
              MachineDetection: 'Enable',
            }),
          }
        );

        const callResult = await callResponse.json();
        
        // Also send SMS as backup
        const smsResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: phone,
              From: TWILIO_PHONE_NUMBER,
              Body: `🚨 EMERGENCY: ${alertMessage}${locationInfo}`,
            }),
          }
        );

        const smsResult = await smsResponse.json();

        results.push({
          phone,
          call: callResult.sid ? 'initiated' : 'failed',
          sms: smsResult.sid ? 'sent' : 'failed',
        });
      } catch (err) {
        console.error(`Failed to alert ${phone}:`, err);
        results.push({ phone, call: 'failed', sms: 'failed', error: String(err) });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Emergency alerts sent',
      results 
    });
  } catch (error) {
    console.error('Emergency API error:', error);
    return NextResponse.json(
      { error: 'Failed to send emergency alert' },
      { status: 500 }
    );
  }
}
