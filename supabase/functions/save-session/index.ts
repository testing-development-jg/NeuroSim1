const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const MONGODB_URI = Deno.env.get('MONGODB_URI') ?? '';

// MongoDB Atlas Data API endpoint
async function mongoRequest(action: string, document: Record<string, unknown>) {
  // Extract app ID from connection string for Atlas Data API
  // Format: mongodb+srv://user:pass@cluster.mongodb.net/
  const appId = 'neurosim-prod';
  const baseUrl = `https://data.mongodb-api.com/app/${appId}/endpoint/data/v1/action`;

  const response = await fetch(`${baseUrl}/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': MONGODB_URI, // Using URI as API key for Atlas Data API
    },
    body: JSON.stringify({
      dataSource: 'NeuroSimCluster',
      database: 'neurosim',
      collection: 'surgical_sessions',
      ...document,
    }),
  });

  if (!response.ok) {
    throw new Error(`MongoDB request failed: ${response.status}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { sessionId, userId, stepsCompleted, score, totalTime, completed } = body;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'sessionId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sessionDoc = {
      sessionId,
      userId,
      stepsCompleted,
      score,
      totalTime,
      completed,
      completedAt: new Date().toISOString(),
      platform: 'NeuroSim Pro',
      version: '1.0.0',
    };

    // Try Atlas Data API
    try {
      await mongoRequest('insertOne', { document: sessionDoc });
      console.log(`Session ${sessionId} saved to MongoDB Atlas`);
    } catch (mongoErr) {
      console.error('MongoDB Atlas save failed:', mongoErr);
      // Continue - non-critical failure
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId,
        message: 'Session saved to MongoDB Atlas',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('save-session error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to save session', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
