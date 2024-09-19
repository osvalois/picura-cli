import { HfInference } from '@huggingface/inference';
import { AIProvider } from './AIProvider';
import { encode } from 'gpt-3-encoder';
import * as axios from 'axios';

export class HuggingFaceProvider implements AIProvider {
  private hfInference: HfInference;
  private model: string;
  private tokenizer: any;

  constructor(apiKey: string, model: string = "01-ai/Yi-Coder-9B-Chat") {
    this.hfInference = new HfInference(apiKey);
    this.model = model;
    this.initializeTokenizer();
  }

  private async initializeTokenizer() {
    try {
      const response = await axios.default.get(`https://huggingface.co/${this.model}/raw/main/tokenizer.json`);
      this.tokenizer = new (require('tokenizers').Tokenizer).fromJson(JSON.stringify(response.data));
    } catch (error) {
      console.warn(`Failed to initialize custom tokenizer for ${this.model}. Falling back to GPT-3 tokenizer.`);
    }
  }

  async generateContent(prompt: string, maxTokens: number): Promise<string> {
    try {
      const response = await this.hfInference.textGeneration({
        model: this.model,
        inputs: prompt,
        parameters: {
          max_new_tokens: maxTokens,
          return_full_text: false,
        },
      });
      return response.generated_text.trim();
    } catch (error) {
      console.error('Error generating content with HuggingFace:', error);
      throw new Error('Failed to generate content with HuggingFace');
    }
  }

  estimateTokens(text: string): number {
    if (this.tokenizer) {
      return this.tokenizer.encode(text).length;
    } else {
      return encode(text).length;  // Fallback to GPT-3 tokenizer
    }
  }

  async getModelContext(): Promise<number> {
    try {
      const response = await axios.default.get(`https://huggingface.co/${this.model}/raw/main/config.json`);
      return response.data.max_position_embeddings || 2048;  // Default to 2048 if not found
    } catch (error) {
      console.warn(`Failed to get context length for ${this.model}. Defaulting to 2048.`);
      return 2048;
    }
  }

  setModel(model: string): void {
    this.model = model;
    this.initializeTokenizer();
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