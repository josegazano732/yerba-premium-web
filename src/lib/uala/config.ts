export type UalaEnvironment = "test" | "production";

const DEFAULT_BASE_URLS: Record<
  UalaEnvironment,
  { auth: string; checkout: string }
> = {
  test: {
    auth: "https://auth.stage.developers.ar.ua.la/v2/api",
    checkout: "https://checkout.stage.developers.ar.ua.la/v2/api",
  },
  production: {
    auth: "https://auth.developers.ar.ua.la/v2/api",
    checkout: "https://checkout.developers.ar.ua.la/v2/api",
  },
};

export type UalaConfig = {
  username: string;
  clientId: string;
  clientSecretId: string;
  authBaseUrl: string;
  checkoutBaseUrl: string;
  environment: UalaEnvironment;
};

/**
 * Configuración de Ualá (API Cobros Online v2), solo servidor.
 *
 * UALA_API_ENV: "test" (stage) o "production". Por defecto "production".
 * UALA_AUTH_BASE_URL / UALA_CHECKOUT_BASE_URL: opcionales, permiten apuntar a
 * URLs custom sin cambiar el entorno.
 */
export function getUalaConfig(): UalaConfig {
  const rawEnv = (process.env.UALA_API_ENV ?? "production").trim().toLowerCase();
  const environment: UalaEnvironment = rawEnv === "test" ? "test" : "production";
  const defaults = DEFAULT_BASE_URLS[environment];

  return {
    username: process.env.UALA_USERNAME?.trim() ?? "",
    clientId: process.env.UALA_CLIENT_ID?.trim() ?? "",
    clientSecretId: process.env.UALA_CLIENT_SECRET_ID?.trim() ?? "",
    authBaseUrl: (process.env.UALA_AUTH_BASE_URL ?? defaults.auth).replace(/\/+$/, ""),
    checkoutBaseUrl: (process.env.UALA_CHECKOUT_BASE_URL ?? defaults.checkout).replace(/\/+$/, ""),
    environment,
  };
}
