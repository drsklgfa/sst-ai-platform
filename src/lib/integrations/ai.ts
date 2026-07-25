export type AIToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  strict?: boolean;
};

export type AIToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type AIFileInput = {
  filename: string;
  mimeType: string;
  data: Buffer;
};

export type AIRequest = {
  system: string;
  prompt: string;
  files?: AIFileInput[];
  tools?: AIToolDefinition[];
  toolChoice?: 'auto' | 'none' | 'required';
  maxOutputTokens?: number;
};

export type AIResponse = {
  text: string;
  toolCalls: AIToolCall[];
  providerResponseId?: string;
  inputTokens: number;
  outputTokens: number;
  raw: unknown;
};

export interface AIProviderClient {
  readonly provider: 'OPENAI' | 'GEMINI';
  readonly model: string;
  complete(input: AIRequest): Promise<AIResponse>;
  testConnection(): Promise<{ ok: true; provider: string; model: string }>;
}

function parseObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function parseToolArguments(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try { return parseObject(JSON.parse(value)); } catch { return {}; }
  }
  return parseObject(value);
}

async function errorMessage(response: Response): Promise<string> {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
    return parsed.error?.message ?? parsed.message ?? body.slice(0, 500);
  } catch {
    return body.slice(0, 500);
  }
}

export class OpenAIProviderClient implements AIProviderClient {
  readonly provider = 'OPENAI' as const;
  constructor(readonly model: string, private readonly apiKey: string) {
    if (!model.trim()) throw new Error('Modelo OpenAI não configurado');
    if (!apiKey.trim()) throw new Error('Chave OpenAI não configurada');
  }

  async complete(input: AIRequest): Promise<AIResponse> {
    const tools = input.tools?.map((tool) => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      strict: tool.strict ?? true,
    }));
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        store: false,
        instructions: input.system,
        input: input.files?.length ? [{
          role: 'user',
          content: [
            { type: 'input_text', text: input.prompt },
            ...input.files.map((file) => file.mimeType.startsWith('image/')
              ? { type: 'input_image', image_url: `data:${file.mimeType};base64,${file.data.toString('base64')}`, detail: 'high' }
              : { type: 'input_file', filename: file.filename, file_data: file.data.toString('base64') }),
          ],
        }] : input.prompt,
        tools: tools?.length ? tools : undefined,
        tool_choice: tools?.length ? (input.toolChoice ?? 'auto') : undefined,
        max_output_tokens: input.maxOutputTokens,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI (${response.status}): ${await errorMessage(response)}`);
    const json = await response.json() as Record<string, unknown>;
    const output = Array.isArray(json.output) ? json.output as Array<Record<string, unknown>> : [];
    const textParts: string[] = [];
    const toolCalls: AIToolCall[] = [];
    for (const item of output) {
      if (item.type === 'function_call') {
        toolCalls.push({
          id: String(item.call_id ?? item.id ?? ''),
          name: String(item.name ?? ''),
          arguments: parseToolArguments(item.arguments),
        });
      }
      if (item.type === 'message' && Array.isArray(item.content)) {
        for (const content of item.content as Array<Record<string, unknown>>) {
          if (content.type === 'output_text' && typeof content.text === 'string') textParts.push(content.text);
        }
      }
    }
    const usage = parseObject(json.usage);
    return {
      text: textParts.join('\n').trim(),
      toolCalls: toolCalls.filter((call) => call.name),
      providerResponseId: typeof json.id === 'string' ? json.id : undefined,
      inputTokens: Number(usage.input_tokens) || 0,
      outputTokens: Number(usage.output_tokens) || 0,
      raw: json,
    };
  }

  async testConnection() {
    await this.complete({ system: 'Responda apenas com OK.', prompt: 'Teste de conexão.', maxOutputTokens: 8 });
    return { ok: true as const, provider: this.provider, model: this.model };
  }
}

export class GeminiProviderClient implements AIProviderClient {
  readonly provider = 'GEMINI' as const;
  constructor(readonly model: string, private readonly apiKey: string) {
    if (!model.trim()) throw new Error('Modelo Gemini não configurado');
    if (!apiKey.trim()) throw new Error('Chave Gemini não configurada');
  }

  async complete(input: AIRequest): Promise<AIResponse> {
    const functionDeclarations = input.tools?.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': this.apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: input.system }] },
        contents: [{ role: 'user', parts: [
          { text: input.prompt },
          ...(input.files ?? []).map((file) => ({ inlineData: { mimeType: file.mimeType, data: file.data.toString('base64') } })),
        ] }],
        tools: functionDeclarations?.length ? [{ functionDeclarations }] : undefined,
        toolConfig: functionDeclarations?.length ? {
          functionCallingConfig: { mode: input.toolChoice === 'required' ? 'ANY' : input.toolChoice === 'none' ? 'NONE' : 'AUTO' },
        } : undefined,
        generationConfig: input.maxOutputTokens ? { maxOutputTokens: input.maxOutputTokens } : undefined,
      }),
    });
    if (!response.ok) throw new Error(`Gemini (${response.status}): ${await errorMessage(response)}`);
    const json = await response.json() as Record<string, unknown>;
    const candidates = Array.isArray(json.candidates) ? json.candidates as Array<Record<string, unknown>> : [];
    const textParts: string[] = [];
    const toolCalls: AIToolCall[] = [];
    for (const candidate of candidates) {
      const content = parseObject(candidate.content);
      const parts = Array.isArray(content.parts) ? content.parts as Array<Record<string, unknown>> : [];
      for (const part of parts) {
        if (typeof part.text === 'string') textParts.push(part.text);
        const call = parseObject(part.functionCall);
        if (typeof call.name === 'string') {
          toolCalls.push({
            id: typeof call.id === 'string' ? call.id : `${call.name}-${toolCalls.length + 1}`,
            name: call.name,
            arguments: parseToolArguments(call.args),
          });
        }
      }
    }
    const usage = parseObject(json.usageMetadata);
    return {
      text: textParts.join('\n').trim(),
      toolCalls,
      inputTokens: Number(usage.promptTokenCount) || 0,
      outputTokens: Number(usage.candidatesTokenCount) || 0,
      raw: json,
    };
  }

  async testConnection() {
    await this.complete({ system: 'Responda apenas com OK.', prompt: 'Teste de conexão.', maxOutputTokens: 8 });
    return { ok: true as const, provider: this.provider, model: this.model };
  }
}

export function createAIProviderClient(input: { provider: 'OPENAI' | 'GEMINI'; model: string; apiKey: string }): AIProviderClient {
  return input.provider === 'OPENAI'
    ? new OpenAIProviderClient(input.model, input.apiKey)
    : new GeminiProviderClient(input.model, input.apiKey);
}
