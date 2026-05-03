import Anthropic from "@anthropic-ai/sdk";

// Cost per 1M tokens (input/output) — approximate as of 2025
const COST_TABLE: Record<string, { input: number; output: number }> = {
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export async function generateAnthropic(params: {
  apiKey: string;
  model: string;
  content: string;
  systemPrompt?: string;
}): Promise<{
  output: string;
  inputTokens: number;
  outputTokens: number;
  costEstimate: number;
}> {
  const client = new Anthropic({ apiKey: params.apiKey });

  const response = await client.messages.create({
    model: params.model,
    max_tokens: 4096,
    system: params.systemPrompt || undefined,
    messages: [{ role: "user", content: params.content }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const output = textBlock?.type === "text" ? textBlock.text : "";
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;

  const costs = COST_TABLE[params.model] || { input: 3, output: 15 };
  const costEstimate =
    (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;

  return { output, inputTokens, outputTokens, costEstimate };
}

export async function* generateAnthropicStream(params: {
  apiKey: string;
  model: string;
  content: string;
  systemPrompt?: string;
}): AsyncGenerator<{
  token?: string;
  done?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  costEstimate?: number;
}> {
  const client = new Anthropic({ apiKey: params.apiKey });

  const stream = client.messages.stream({
    model: params.model,
    max_tokens: 4096,
    system: params.systemPrompt || undefined,
    messages: [{ role: "user", content: params.content }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield { token: event.delta.text };
    }
  }

  const finalMessage = await stream.finalMessage();
  const inputTokens = finalMessage.usage.input_tokens;
  const outputTokens = finalMessage.usage.output_tokens;

  const costs = COST_TABLE[params.model] || { input: 3, output: 15 };
  const costEstimate =
    (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;

  yield { done: true, inputTokens, outputTokens, costEstimate };
}
