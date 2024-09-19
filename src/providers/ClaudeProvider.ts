import axios from "axios";
import { AIProvider } from './AIProvider';
import { encode } from 'gpt-3-encoder';

export class ClaudeProvider implements AIProvider {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-sonnet-20240229') {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.anthropic.com/v1/messages';
    this.model = model;
  }

  async generateContent(prompt: string, maxTokens: number): Promise<string> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          },
        }
      );
      return response.data.content[0].text;
    } catch (error) {
      console.error('Error generating content with Claude:', error);
      throw new Error('Failed to generate content with Claude');
    }
  }

  estimateTokens(text: string): number {
    // Claude uses a similar tokenization to GPT models, so we can use the GPT-3 encoder as an approximation
    return encode(text).length;
  }

  async getModelContext(): Promise<number> {
    const modelContexts: { [key: string]: number } = {
      'claude-2': 100000,
      'claude-instant-1': 100000,
      'claude-3-sonnet-20240229': 200000,
      'claude-3-opus-20240229': 200000
    };
    return modelContexts[this.model] || 100000;  // Default to 100000 if model not found
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