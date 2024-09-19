export interface AIProvider {
    generateContent(prompt: string, maxTokens: number): Promise<string>;
  }