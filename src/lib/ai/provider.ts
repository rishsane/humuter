import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

type LLMProvider = 'anthropic' | 'openai';

function getDefaultProvider(): LLMProvider {
  const env = process.env.LLM_PROVIDER;
  if (env === 'openai') return 'openai';
  return 'anthropic';
}

export async function generateResponse(
  systemPrompt: string,
  userMessage: string,
  options?: { provider?: LLMProvider }
): Promise<string> {
  const provider = options?.provider ?? getDefaultProvider();

  if (provider === 'openai') {
    return generateOpenAI(systemPrompt, userMessage);
  }
  return generateAnthropic(systemPrompt, userMessage);
}

async function generateAnthropic(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const block = response.content[0];
  if (block.type === 'text') {
    return block.text;
  }
  return '';
}

async function generateOpenAI(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 1024,
  });

  return response.choices[0]?.message?.content ?? '';
}
