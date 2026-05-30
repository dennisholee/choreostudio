import type { FastifyPluginAsync } from 'fastify';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // SAML 2.0 initiation — redirect to IdP
  fastify.get('/auth/saml', async (_request, reply) => {
    const idpUrl = process.env['SAML_IDP_SSO_URL'];
    if (!idpUrl) {
      return reply.status(501).send({ error: 'SAML SSO not configured (SAML_IDP_SSO_URL missing)' });
    }
    // In production: use passport-saml to generate AuthnRequest
    return reply.redirect(`${idpUrl}?SAMLRequest=placeholder&RelayState=`);
  });

  // OIDC initiation — redirect to IdP
  fastify.get('/auth/oidc', async (_request, reply) => {
    const oidcAuthUrl = process.env['OIDC_AUTHORIZATION_URL'];
    const clientId = process.env['OIDC_CLIENT_ID'];
    if (!oidcAuthUrl || !clientId) {
      return reply.status(501).send({ error: 'OIDC SSO not configured (OIDC_AUTHORIZATION_URL or OIDC_CLIENT_ID missing)' });
    }
    const redirectUri = encodeURIComponent(`${process.env['APP_BASE_URL'] ?? 'http://localhost:3000'}/api/v1/auth/callback`);
    const url = `${oidcAuthUrl}?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid+email+profile`;
    return reply.redirect(url);
  });

  // OAuth/OIDC callback handler
  fastify.get('/auth/callback', async (request, reply) => {
    const { code, SAMLResponse } = request.query as { code?: string; SAMLResponse?: string };

    if (SAMLResponse) {
      // TODO: validate SAML assertion, extract nameID, provision/lookup user, issue JWT
      return reply.status(501).send({ error: 'SAML assertion validation requires real IdP — not yet implemented in this stub' });
    }

    if (code) {
      // TODO: exchange code for tokens using OIDC_TOKEN_URL, validate id_token, issue JWT
      return reply.status(501).send({ error: 'OIDC token exchange requires real IdP — not yet implemented in this stub' });
    }

    return reply.status(400).send({ error: 'No code or SAMLResponse received in callback' });
  });

  // Logout
  fastify.post('/auth/logout', async (_request, reply) => {
    // Stateless JWT: just instruct client to discard token
    return reply.status(200).send({ message: 'Logged out. Discard your access token.' });
  });
};

export default authRoutes;
