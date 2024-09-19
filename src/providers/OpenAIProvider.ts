import { Configuration, OpenAIApi } from "openai";
import { AIProvider } from './AIProvider';
import { encode } from 'gpt-3-encoder';

export class OpenAIProvider implements AIProvider {
  private openai: OpenAIApi;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4') {
    const configuration = new Configuration({ apiKey });
    this.openai = new OpenAIApi(configuration);
    this.model = model;
  }

  async generateContent(prompt: string, maxTokens: number): Promise<string> {
    const response = await this.openai.createChatCompletion({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    return response.data.choices[0].message?.content || '';
  }

  estimateTokens(text: string): number {
    return encode(text).length;
  }

  async getModelContext(): Promise<number> {
    const modelData: { [key: string]: number } = {
      'gpt-3.5-turbo': 4096,
      'gpt-4': 8192,
      'gpt-4-32k': 32768
    };
    return modelData[this.model] || 4096;  // Default to 4096 if model not found
  }

  setModel(model: string): void {
    this.model = model;
  }

  async getTokenUsage(prompt: string, response: string): Promise<{ promptTokens: number; responseTokens: number; totalTokens: number }> {
    const promptTokens = this.estimateTokens(prompt);
    const responseTokens = this.estimateTokens(response);
    return {
      promptTokens,
      responseTokens,
      totalTokens: promptTokens + responseTokens
    };
  }
}