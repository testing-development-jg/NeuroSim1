const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY') ?? '';

// Short coaching fallbacks
const COACHING: Record<number, string> = {
  0: 'Verify heart rate, blood pressure, SpO2, and temperature are within surgical parameters before proceeding.',
  1: 'Administer propofol 2 mg/kg IV slowly. Confirm full loss of consciousness before securing the airway.',
  2: 'Apply steady tension with the scalpel through the galea. Keep the horseshoe flap 2 cm from the sagittal midline.',
  3: 'Position each burr hole precisely at the marked corners. Irrigate with saline continuously to prevent thermal dura injury.',
  4: 'Cut dura in small deliberate strokes parallel to cortical vessels. Place tack-up sutures to prevent epidural hematoma formation.',
  5: 'Correlate ultrasound echogenicity with preoperative MRI. Glioblastomas appear hyperechoic with ill-defined margins.',
  6: 'Work centripetally from tumor center using CUSA at 60% amplitude. Maintain continuous awareness of eloquent cortex proximity.',
  7: 'Apply bipolar coagulation at 25 W in brief precise bursts. Irrigate frequently to prevent char and ensure watertight hemostasis.',
  8: 'Run a locking dural suture for watertight closure. Perform Valsalva to confirm integrity before bone flap replacement.',
  9: 'Secure titanium plates at each burr hole. Close galea with interrupted 2-0 Vicryl, then skin with mattress sutures.',
};

// One-sentence actionable hints
const HINTS: Record<number, string> = {
  0: 'Confirm all vital signs are within normal range, then click the green button.',
  1: 'Select the syringe from the toolbar and click the scalp to inject propofol.',
  2: 'Select the scalpel and click the scalp 3 times to complete the incision flap.',
  3: 'Select the drill and click around the craniotomy site 6 times for the bone flap.',
  4: 'Select the scissors and click the dura 3 times to open it carefully.',
  5: 'Select the probe and click the brain surface to locate the tumor.',
  6: 'Select the aspirator and click the tumor 5 times to resect it completely.',
  7: 'Select the forceps and click each bleeding point to stop the hemorrhage.',
  8: 'Select the suture and click the dura 4 times to close it watertight.',
  9: 'Select the suture and click the scalp 4 times to close the wound.',
};

async function callGemma(prompt: string, maxTokens = 120): Promise<string | null> {
  if (!GOOGLE_AI_API_KEY) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: maxTokens, topP: 0.85 },
        }),
      }
    );
    if (!res.ok) return null;
    const d = await res.json();
    return d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { prompt, step, action } = body;
    const stepNum = typeof step === 'number' ? step : 0;

    // ── HINT mode: one crisp actionable sentence ─────────────────────────
    if (action === 'hint') {
      const hintPrompt = `You are a neurosurgical coach. Give ONE specific, actionable hint for step ${stepNum + 1} in under 20 words. No preamble.`;
      const ai = await callGemma(hintPrompt, 40);
      const message = ai || HINTS[stepNum] || 'Click on the highlighted area to proceed.';
      return new Response(JSON.stringify({ message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── COACHING mode ─────────────────────────────────────────────────────
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'prompt required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemCtx = `You are Dr. GEMMA, expert neurosurgical AI coach. Be concise (2–3 sentences), clinically accurate, and encouraging. Use proper surgical terminology.`;
    const ai = await callGemma(`${systemCtx}\n\n${prompt}`, 150);
    const message = ai || COACHING[stepNum] || 'Maintain steady hands and proceed with precision.';

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('surgical-coach error:', err);
    return new Response(JSON.stringify({ message: COACHING[0] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
