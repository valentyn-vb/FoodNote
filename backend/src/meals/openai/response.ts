import type OpenAI from 'openai';
import type { ParsedModelResponse } from './model-schema';

/** Empty until a response exists, so failed requests log no token counts. */
export function usageOf(response: ParsedModelResponse | undefined) {
  return response
    ? {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        openaiRequestId: response.id,
      }
    : {};
}

/**
 * A refusal is a nested content part and arrives with `output_parsed: null`, so
 * it has to be checked before the decoding backstop.
 */
export function findRefusal(
  output: OpenAI.Responses.Response['output'],
): string | null {
  for (const item of output) {
    if (item.type !== 'message') continue;
    for (const part of item.content) {
      if (part.type === 'refusal') return part.refusal;
    }
  }
  return null;
}
