type ApiClientConfig = {
  apiKey: string;
  baseUrl?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const vapiClient: ApiClientConfig = {
  apiKey: requireEnv("VAPI_API_KEY"),
  baseUrl: process.env.VAPI_BASE_URL,
};

export const hubspotClient: ApiClientConfig = {
  apiKey: requireEnv("HUBSPOT_API_KEY"),
  baseUrl: process.env.HUBSPOT_BASE_URL,
};

export const twilioClient: ApiClientConfig = {
  apiKey: requireEnv("TWILIO_AUTH_TOKEN"),
  baseUrl: process.env.TWILIO_BASE_URL,
};
