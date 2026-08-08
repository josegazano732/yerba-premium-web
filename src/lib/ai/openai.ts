import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY no está configurada.");
    _client = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
  }
  return _client;
}
