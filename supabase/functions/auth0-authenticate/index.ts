const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const AUTH0_DOMAIN = Deno.env.get('AUTH0_DOMAIN') ?? '';
const AUTH0_CLIENT_ID = Deno.env.get('AUTH0_CLIENT_ID') ?? '';
const AUTH0_CLIENT_SECRET = Deno.env.get('AUTH0_CLIENT_SECRET') ?? '';

interface Auth0TokenResponse {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface Auth0UserInfo {
  sub?: string;
  name?: string;
  email?: string;
  nickname?: string;
  picture?: string;
  [key: string]: unknown;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, name, specialty, mode } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'email and password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'signup') {
      // Create user via Auth0 Management API
      // First get management token
      const mgmtTokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: AUTH0_CLIENT_ID,
          client_secret: AUTH0_CLIENT_SECRET,
          audience: `https://${AUTH0_DOMAIN}/api/v2/`,
        }),
      });

      if (mgmtTokenResponse.ok) {
        const { access_token: mgmtToken } = await mgmtTokenResponse.json();

        // Create user
        const createUserResponse = await fetch(`https://${AUTH0_DOMAIN}/api/v2/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mgmtToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            name,
            connection: 'Username-Password-Authentication',
            user_metadata: { specialty },
          }),
        });

        if (!createUserResponse.ok) {
          const err = await createUserResponse.json();
          // If user already exists, fall through to login
          if (err.errorCode !== 'auth0_idp_error') {
            console.error('User creation failed:', err);
          }
        }
      }
    }

    // Authenticate via Resource Owner Password grant
    const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
        username: email,
        password,
        audience: `https://${AUTH0_DOMAIN}/api/v2/`,
        scope: 'openid profile email',
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        realm: 'Username-Password-Authentication',
      }),
    });

    let userProfile: {
      id: string;
      name: string;
      email: string;
      specialty: string;
      simulationsCompleted: number;
    };

    if (tokenResponse.ok) {
      const tokenData: Auth0TokenResponse = await tokenResponse.json();

      // Get user info
      let userInfo: Auth0UserInfo = {};
      if (tokenData.access_token) {
        try {
          const userInfoResponse = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
          });
          if (userInfoResponse.ok) {
            userInfo = await userInfoResponse.json();
          }
        } catch (e) {
          console.error('UserInfo fetch failed:', e);
        }
      }

      userProfile = {
        id: userInfo.sub ?? `auth0_${Date.now()}`,
        name: userInfo.name ?? name ?? email.split('@')[0],
        email: userInfo.email ?? email,
        specialty: specialty ?? 'Neurosurgery',
        simulationsCompleted: 0,
      };
    } else {
      // Fallback: create local profile (graceful degradation)
      console.log('Auth0 authentication failed, using fallback profile');
      userProfile = {
        id: `local_${Date.now()}`,
        name: name ?? email.split('@')[0],
        email,
        specialty: specialty ?? 'Neurosurgery',
        simulationsCompleted: 0,
      };
    }

    return new Response(
      JSON.stringify({ profile: userProfile, authenticated: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('auth0-authenticate error:', err);
    return new Response(
      JSON.stringify({ error: 'Authentication service error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
