import { getUalaConfig } from "./config";

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
};

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;

/**
 * Obtiene (y cachea) un access token OAuth2 client-credentials de Ualá.
 * El token dura 24 h; se reutiliza hasta un minuto antes de vencer.
 * Solo debe usarse desde el servidor.
 */
export async function getUalaAccessToken(): Promise<string> {
  const config = getUalaConfig();

  if (!config.username || !config.clientId || !config.clientSecretId) {
    throw new Error(
      "UALA_USERNAME, UALA_CLIENT_ID y UALA_CLIENT_SECRET_ID no están configurados."
    );
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const response = await fetch(`${config.authBaseUrl}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: config.username,
      client_id: config.clientId,
      client_secret_id: config.clientSecretId,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Ualá auth falló (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as TokenResponse;
  if (!data.access_token) {
    throw new Error("Ualá auth no devolvió un access_token válido.");
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };

  return data.access_token;
}
