import * as natural from 'natural';
import * as tf from '@tensorflow/tfjs-node';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import * as fs from 'fs/promises';
import { SimilarityMetric, DocumentType } from '../types/NLProcessorTypes.js';

export class NLPProcessor {
  private tokenizer: natural.WordTokenizer;
  private porterStemmer: typeof natural.PorterStemmer;
  private lancasterStemmer: typeof natural.LancasterStemmer;
  private tfidf: natural.TfIdf;
  private sentenceEncoder!: use.UniversalSentenceEncoder;
  private referenceEmbeddings: tf.Tensor2D[];
  private logger: (message: string) => void;

  constructor(private readonly config: {
    referenceEmbeddingsPath?: string;
    logFunction?: (message: string) => void;
  } = {}) {
    this.tokenizer = new natural.WordTokenizer();
    this.porterStemmer = natural.PorterStemmer;
    this.lancasterStemmer = natural.LancasterStemmer;
    this.tfidf = new natural.TfIdf();
    this.referenceEmbeddings = [];
    this.logger = config.logFunction || console.log;
    this.initializeSentenceEncoder();
  }

  private async initializeSentenceEncoder() {
    try {
      this.sentenceEncoder = await use.load();
      this.logger('Sentence encoder loaded successfully');

      if (this.config.referenceEmbeddingsPath) {
        await this.loadReferenceEmbeddings(this.config.referenceEmbeddingsPath);
      } else {
        const referenceSentences = [
          "This is a reference sentence about technology.",
          "Another reference sentence about business.",
          "A third reference sentence about science."
        ];
        this.referenceEmbeddings = await this.generateEmbeddings(referenceSentences);
        this.logger('Default reference embeddings generated');
      }
    } catch (error) {
      this.logger(`Error initializing sentence encoder: ${error}`);
      throw error;
    }
  }

  private async loadReferenceEmbeddings(filePath: string) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const embeddingsData = JSON.parse(data);
      this.referenceEmbeddings = embeddingsData.map((embedding: number[]) => tf.tensor2d([embedding]));
      this.logger(`Reference embeddings loaded from ${filePath}`);
    } catch (error) {
      this.logger(`Error loading reference embeddings: ${error}`);
      throw error;
    }
  }

  async saveReferenceEmbeddings(filePath: string) {
    try {
      const embeddingsData = this.referenceEmbeddings.map(embedding => Array.from(embedding.dataSync()));
      await fs.writeFile(filePath, JSON.stringify(embeddingsData));
      this.logger(`Reference embeddings saved to ${filePath}`);
    } catch (error) {
      this.logger(`Error saving reference embeddings: ${error}`);
      throw error;
    }
  }

  async updateReferenceEmbeddings(newSentences: string[]) {
    const newEmbeddings = await this.generateEmbeddings(newSentences);
    this.referenceEmbeddings = [...this.referenceEmbeddings, ...newEmbeddings];
    this.logger(`Reference embeddings updated with ${newSentences.length} new sentences`);
  }
  private async generateEmbeddings(sentences: string[]): Promise<tf.Tensor2D[]> {
    const embeddings = await this.sentenceEncoder.embed(sentences);
    const unstackedEmbeddings = tf.unstack(embeddings as unknown as tf.Tensor);  // Forzar a un Tensor genérico
    return unstackedEmbeddings.map(embedding => embedding as tf.Tensor2D);
  }
  

  async enhancePrompt(prompt: string, documentType: DocumentType, stemmerType: 'porter' | 'lancaster' = 'porter'): Promise<string> {
    const tokens = this.tokenizer.tokenize(prompt);
    if (tokens === null) {
      return prompt; // Return original prompt if tokenization fails
    }
    const stems = this.stemTokens(tokens, stemmerType);
    const tfidfScores = this.calculateTfidf(stems);
    const enhancedTokens = this.enhanceTokens(tokens, tfidfScores);
    const contextualPrompt = this.addContextFromDocumentType(enhancedTokens.join(' '), documentType);
    return this.restructurePrompt(contextualPrompt);
  }

  async improveTextQuality(text: string): Promise<string> {
    const sentences = text.split(/[.!?]+/);
    const improvedSentences = await Promise.all(sentences.map(async (sentence: string) => {
      const embedding = await this.getSentenceEmbedding(sentence);
      return this.improveSentence(sentence, embedding);
    }));
    return improvedSentences.join(' ');
  }

  async generateContinuationPrompt(content: string): Promise<string> {
    const lastParagraph = this.getLastParagraph(content);
    const keyPhrases = this.extractKeyPhrases(lastParagraph);
    const embedding = await this.getSentenceEmbedding(lastParagraph);
    return this.formulateContinuationPrompt(keyPhrases, embedding);
  }

  async generateTechnicalInsights(projectAnalysis: any, codeClassification: any): Promise<string> {
    const analysisText = JSON.stringify(projectAnalysis) + JSON.stringify(codeClassification);
    const keyPhrases = this.extractKeyPhrases(analysisText);
    const insights = await this.generateInsightsFromPhrases(keyPhrases);
    return this.formatInsights(insights);
  }

  async stemTextFile(filePath: string, stemmerType: 'porter' | 'lancaster' = 'porter'): Promise<string> {
    try {
      const text = await fs.readFile(filePath, 'utf8');
      const tokens = this.tokenizer.tokenize(text);
      if (tokens === null) {
        return text; // Return original text if tokenization fails
      }
      const stems = this.stemTokens(tokens, stemmerType);
      return stems.join(' ');
    } catch (error) {
      this.logger(`Error stemming text file: ${error}`);
      throw error;
    }
  }

  private stemTokens(tokens: string[], stemmerType: 'porter' | 'lancaster'): string[] {
    const stemmer = stemmerType === 'porter' ? this.porterStemmer : this.lancasterStemmer;
    return tokens.map(token => stemmer.stem(token));
  }

  private calculateTfidf(stems: string[]): number[] {
    this.tfidf.addDocument(stems);
    return stems.map(stem => this.tfidf.tfidf(stem, 0));
  }

  private enhanceTokens(tokens: string[], tfidfScores: number[]): string[] {
    return tokens.map((token, index) => {
      if (tfidfScores[index] > 0.1) {
        return token.toUpperCase();
      }
      return token;
    });
  }

  private addContextFromDocumentType(prompt: string, documentType: DocumentType): string {
    const contextMap: { [key in DocumentType]: string } = {
      'ARCHITECTURE': 'Focus on system design, components, and their interactions.',
      'DATA_SCHEMA': 'Emphasize data structures, relationships, and database design.',
      'API_SPECIFICATION': 'Detail endpoints, request/response formats, and API patterns.',
      'USER_MANUAL': 'Prioritize user-friendly explanations and step-by-step instructions.',
      'DEPLOYMENT': 'Concentrate on deployment procedures, environments, and DevOps practices.'
    };
    return `${prompt}\n\nContext: ${contextMap[documentType] || 'Provide comprehensive documentation.'}`;
  }

  private restructurePrompt(prompt: string): string {
    const sentences = prompt.split(/[.!?]+/);
    const restructured = sentences.sort((a, b) => b.length - a.length);
    return restructured.join(' ');
  }

  private async getSentenceEmbedding(sentence: string): Promise<tf.Tensor2D | null> {
    try {
      const embedding = await this.sentenceEncoder.embed([sentence]);
      if (embedding.rank === 2) {
        return embedding as unknown as tf.Tensor2D;
      } else {
        this.logger('The embedding is not a rank 2 tensor');
        return null;
      }
    } catch (error) {
      this.logger(`Error generating embedding: ${error}`);
      return null;
    }
  }

  private async improveSentence(sentence: string, embedding: tf.Tensor2D | null): Promise<string> {
    if (!embedding) {
      return sentence.charAt(0).toUpperCase() + sentence.slice(1);
    }
    // Here you could implement more sophisticated sentence improvement logic using the embedding
    // For now, we'll just capitalize the first letter
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
  }

  private getLastParagraph(content: string): string {
    const paragraphs = content.split('\n\n');
    return paragraphs[paragraphs.length - 1];
  }

  private extractKeyPhrases(text: string): string[] {
    const tokens = this.tokenizer.tokenize(text);
    if (tokens === null) {
      return []; // Return empty array if tokenization fails
    }
    const stems = this.stemTokens(tokens, 'porter');
    const tfidfScores = this.calculateTfidf(stems);
    return tokens.filter((_, index) => tfidfScores[index] > 0.1);
  }

  private async formulateContinuationPrompt(keyPhrases: string[], embedding: tf.Tensor2D | null): Promise<string> {
    const basePrompt = `Continue the document, focusing on these key concepts: ${keyPhrases.join(', ')}. `;
    
    if (embedding) {
      const similarityScore = await this.calculateSimilarity(embedding);
      const contextualPrompt = this.generateContextualPrompt(similarityScore);
      return basePrompt + contextualPrompt + " Maintain the current style and depth of technical detail.";
    } else {
      return basePrompt + "Maintain the current style and depth of technical detail.";
    }
  }

  async calculateSimilarity(embedding: tf.Tensor2D, metric: SimilarityMetric = 'cosine'): Promise<number> {
    if (this.referenceEmbeddings.length === 0) {
      throw new Error("Reference embeddings are not initialized.");
    }

    let similarities: number[];
    switch (metric) {
      case 'cosine':
        similarities = this.referenceEmbeddings.map(refEmbedding => 
          this.cosineSimilarity(embedding, refEmbedding)
        );
        break;
      case 'euclidean':
        similarities = this.referenceEmbeddings.map(refEmbedding => 
          this.euclideanSimilarity(embedding, refEmbedding)
        );
        break;
      default:
        throw new Error(`Unsupported similarity metric: ${metric}`);
    }

    return Math.max(...similarities);
  }

  private cosineSimilarity(a: tf.Tensor2D, b: tf.Tensor2D): number {
    const dotProduct = tf.sum(tf.mul(a, b));
    const normA = tf.norm(a);
    const normB = tf.norm(b);
    const similarity = tf.div(dotProduct, tf.mul(normA, normB));
    
    return similarity.dataSync()[0];
  }

  private euclideanSimilarity(a: tf.Tensor2D, b: tf.Tensor2D): number {
    const squaredDifference = tf.sum(tf.square(tf.sub(a, b)));
    const distance = tf.sqrt(squaredDifference);
    // Convert distance to similarity (1 / (1 + distance))
    const similarity = tf.div(1, tf.add(1, distance));
    
    return similarity.dataSync()[0];
  }

  private generateContextualPrompt(similarityScore: number): string {
    if (similarityScore > 0.8) {
      return "The content is highly similar to previous sections. Consider introducing new perspectives or examples.";
    } else if (similarityScore > 0.5) {
      return "The content has moderate similarity. Expand on unique aspects while maintaining consistency.";
    } else {
      return "The content appears to be introducing new ideas. Ensure smooth transition and clear explanations.";
    }
  }

  private async generateInsightsFromPhrases(phrases: string[]): Promise<string[]> {
    // This is a placeholder for more advanced insight generation
    // In a real-world scenario, you might use more sophisticated NLP techniques here
    return phrases.map(phrase => `Consider optimizing or focusing on "${phrase}"`);
  }

  private formatInsights(insights: string[]): string {
    return insights.map((insight, index) => `${index + 1}. ${insight}`).join('\n');
  }

  compareStemmers(words: string[]): void {
    console.log("Word                Porter Stemmer     Lancaster Stemmer");
    console.log("----                --------------     ------------------");
    for (const word of words) {
      console.log(
        `${word.padEnd(20)}${this.porterStemmer.stem(word).padEnd(20)}${this.lancasterStemmer.stem(word)}`
      );
    }
  }
}