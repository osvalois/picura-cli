import { DocumentType } from '@prisma/client';
import { LoggingService } from './LoggingService.js';
import { DocumentGenerator } from '../utils/DocumentGenerator.js';
import { AdvancedProjectAnalyzer } from '../utils/AdvancedProjectAnalyzer.js';
import { NLPProcessor } from '../utils/NLPProcessor.js';
import { CodeClassifier } from '../utils/CodeClassifier.js';
import { AICodeAnalyzer } from '../utils/AICodeAnalyzer.js';
import { HuggingFaceProvider } from '../providers/HuggingFaceProvider.js';
import { OpenAIProvider } from '../providers/OpenAIProvider.js';
import { ClaudeProvider } from '../providers/ClaudeProvider.js';
import * as fs from 'fs-extra';
import path from 'path';
import { EventEmitter } from 'events';
import ora, { Ora } from 'ora';

interface AIProvider {
  generateContent(prompt: string, maxTokens: number): Promise<string>;
  estimateTokens(text: string): number;
}

export class AIService extends EventEmitter {
  private logger: LoggingService;
  private documentGenerator: DocumentGenerator;
  private advancedProjectAnalyzer: AdvancedProjectAnalyzer;
  private nlpProcessor: NLPProcessor;
  private codeClassifier: CodeClassifier;
  private codeAnalyzer!: AICodeAnalyzer;
  private providers: Map<string, AIProvider>;
  private spinner: Ora;

  constructor(logger: LoggingService) {
    super();
    this.logger = logger;
    this.documentGenerator = new DocumentGenerator();
    this.advancedProjectAnalyzer = new AdvancedProjectAnalyzer(logger);
    this.nlpProcessor = new NLPProcessor();
    this.codeClassifier = new CodeClassifier();
    this.providers = new Map();
    this.spinner = ora();

    this.initializeProviders();
    this.initializeCodeAnalyzer();
  }

  private initializeProviders() {
    const openAIKey = process.env.OPENAI_API_KEY;
    const claudeKey = process.env.CLAUDE_API_KEY;
    const hfKey = process.env.HF_API_KEY;

    if (openAIKey) {
      this.providers.set('openai', new OpenAIProvider(openAIKey));
    }
    if (claudeKey) {
      this.providers.set('claude', new ClaudeProvider(claudeKey));
    }
    if (hfKey) {
      this.providers.set('huggingface', new HuggingFaceProvider(hfKey));
    }

    if (this.providers.size === 0) {
      throw new Error('No AI providers are configured. Please set API keys in environment variables.');
    }
  }

  private initializeCodeAnalyzer() {
    const hfKey = process.env.HF_API_KEY;
    if (!hfKey) {
      this.logger.error('HF_API_KEY is not set in environment variables');
      throw new Error('HF_API_KEY is not set in environment variables');
    }
    try {
      this.codeAnalyzer = new AICodeAnalyzer('.', new HuggingFaceProvider(hfKey));
    } catch (error) {
      this.logger.error('Failed to initialize AICodeAnalyzer', { error });
      throw new Error('Failed to initialize AICodeAnalyzer');
    }
  }

  async generateDocumentContent(type: DocumentType, projectPath: string): Promise<string> {
    if (!Object.values(DocumentType).includes(type)) {
      throw new Error(`Invalid document type: ${type}`);
    }
    try {
      this.logger.info(`Starting advanced document generation for type: ${type}`);
      this.spinner.start('Initializing document generation process');

      if (!fs.existsSync(projectPath)) {
        throw new Error(`Project path does not exist: ${projectPath}`);
      }

      this.codeAnalyzer.setProjectPath(projectPath);

      const startTime = Date.now();

      this.spinner.text = 'Analyzing project structure';
      const projectAnalysis = await this.advancedProjectAnalyzer.analyzeProject(projectPath);

      this.spinner.text = 'Classifying project code';
      const codeClassification = await this.codeClassifier.classifyProjectCode(projectPath);

      this.spinner.text = 'Generating system prompt';
      const systemPrompt = this.documentGenerator.getSystemPromptForDocumentType(type);

      this.spinner.text = 'Generating user prompt';
      const userPrompt = await this.generateAdvancedUserPrompt(type, projectAnalysis, codeClassification);

      const estimatedTime = this.estimateDocumentationTime(projectAnalysis, codeClassification);
      this.logger.info(`Estimated time to generate documentation: ${estimatedTime} minutes`);
      this.emit('estimatedTime', estimatedTime);

      this.spinner.text = `Generating raw content (Est. ${estimatedTime} min)`;
      const rawContent = await this.generateContentWithFailover(systemPrompt, userPrompt);

      this.spinner.text = 'Enhancing content';
      const enhancedContent = await this.enhanceContent(rawContent, projectAnalysis, codeClassification, projectPath);

      this.spinner.text = 'Formatting content';
      const formattedContent = this.documentGenerator.formatGeneratedContent(type, enhancedContent);

      const endTime = Date.now();
      const actualTime = (endTime - startTime) / 60000; // Convert to minutes

      this.spinner.succeed(`Document generation completed in ${actualTime.toFixed(2)} minutes`);

      this.logger.info(`Advanced document content generated successfully for type: ${type}`);
      return formattedContent;
    } catch (error: any) {
      this.spinner.fail('Document generation failed');
      this.logger.error(`Failed to generate advanced document content for type: ${type}`, { 
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to generate advanced document: ${error.message}`);
    }
  }

  private estimateDocumentationTime(projectAnalysis: any, codeClassification: any): number {
    const totalFiles = Object.keys(projectAnalysis.structure).length;
    const complexityFactor = this.calculateComplexityFactor(projectAnalysis, codeClassification);
    const baseTime = 5; // Base time in minutes
    return Math.ceil(baseTime + (totalFiles * 0.5 * complexityFactor));
  }

  private calculateComplexityFactor(projectAnalysis: any, codeClassification: any): number {
    const techDiversity = projectAnalysis.mainTechnologies.length;
    const languageDiversity = Object.keys(codeClassification.languageBreakdown).length;
    return 1 + (techDiversity * 0.1) + (languageDiversity * 0.05);
  }

  private async generateContentWithFailover(systemPrompt: string, userPrompt: string): Promise<string> {
    const maxTokens = 4000;
    let fullContent = '';
    let currentPrompt = `${systemPrompt}\n\n${userPrompt}`;
    let iterationCount = 0;
    let totalTokens = 0;

    const providerIterator = this.providers.entries();
    let currentProvider = providerIterator.next();

    while (!currentProvider.done) {
      const [providerName, provider] = currentProvider.value;
      try {
        while (true) {
          iterationCount++;
          this.spinner.text = `Generating content using ${providerName} (Iteration ${iterationCount})`;
          
          const content = await provider.generateContent(currentPrompt, maxTokens);
          fullContent += content;
          totalTokens += provider.estimateTokens(content);
          
          this.emit('progress', { 
            provider: providerName, 
            iteration: iterationCount, 
            tokens: totalTokens 
          });
          
          if (content.includes('[END OF DOCUMENT]') || totalTokens >= 100000) break;
          
          currentPrompt = await this.nlpProcessor.generateContinuationPrompt(fullContent);
          
          if (iterationCount >= 10) {
            this.logger.warn(`Reached maximum iterations (10) for content generation with ${providerName}`);
            break;
          }
        }
        this.logger.info(`Content generated successfully using ${providerName}`);
        return fullContent.replace('[END OF DOCUMENT]', '');
      } catch (error) {
        this.logger.warn(`Failed to generate content with ${providerName}`, { 
          error: error instanceof Error ? error.message : String(error) 
        });
        currentProvider = providerIterator.next();
      }
    }
    throw new Error('All AI providers failed to generate content');
  }

  private async generateAdvancedUserPrompt(type: DocumentType, projectAnalysis: any, codeClassification: any): Promise<string> {
    const basePrompt = `
      Project Analysis:
      ${JSON.stringify(projectAnalysis, null, 2)}
      
      Code Classification:
      ${JSON.stringify(codeClassification, null, 2)}
    `;

    const enhancedPrompt = await this.nlpProcessor.enhancePrompt(basePrompt, type);
    return `${enhancedPrompt}\n\nGenerate a comprehensive ${type} document based on this advanced project analysis. Focus on the most relevant aspects and provide detailed explanations.`;
  }

  private async enhanceContent(content: string, projectAnalysis: any, codeClassification: any, projectPath: string): Promise<string> {
    this.spinner.text = 'Improving content quality';
    const improvedContent = await this.nlpProcessor.improveTextQuality(content);
    
    this.spinner.text = 'Adding code examples';
    const codeExamples = await this.addCodeExamples(content, projectAnalysis, codeClassification, projectPath);
    
    this.spinner.text = 'Generating technical insights';
    const technicalInsights = await this.addTechnicalInsights(content, projectAnalysis, codeClassification);

    return `${improvedContent}\n\n${codeExamples}\n\n${technicalInsights}`;
  }

  private async addCodeExamples(content: string, projectAnalysis: any, codeClassification: any, projectPath: string): Promise<string> {
    const context = this.generateContext(content, projectAnalysis, codeClassification);
    const relevantFiles = await this.codeAnalyzer.findRelevantFiles(context, 10);
    const codeSnippets = await Promise.all(relevantFiles.map(file => this.codeAnalyzer.extractCodeSnippet(path.join(projectPath, file), context)));
    
    return codeSnippets.map((snippet, index) => 
      `Example from ${relevantFiles[index]}:\n\`\`\`\n${snippet.content}\n\`\`\`\n\nContextual Summary: ${snippet.contextualSummary}\n\nSuggested Improvements:\n${snippet.suggestedImprovements.join('\n')}`
    ).join('\n\n');
  }


  private async addTechnicalInsights(content: string, projectAnalysis: any, codeClassification: any): Promise<string> {
    // Generate insights using the correct method signature
    const insights = await this.nlpProcessor.generateTechnicalInsights(projectAnalysis, codeClassification);
    
    // Use the content parameter to provide context for the insights
    const contextualizedInsights = this.contextualizeInsights(content, insights);
    
    // Combine the existing content with the new contextualized insights
    return `${content}\n\nTechnical Insights:\n${contextualizedInsights}`;
  }

  private contextualizeInsights(content: string, insights: string): string {
    // This is a placeholder implementation. In a real-world scenario,
    // you might use more sophisticated NLP techniques to relate the
    // insights to the existing content.
    const contentKeywords = this.extractKeywords(content);
    const insightLines = insights.split('\n');
    
    const contextualizedInsights = insightLines.map(line => {
      if (contentKeywords.some(keyword => line.toLowerCase().includes(keyword.toLowerCase()))) {
        return `${line} (This insight is particularly relevant to the existing content.)`;
      }
      return line;
    });

    return contextualizedInsights.join('\n');
  }

  private extractKeywords(text: string): string[] {
    // This is a simple keyword extraction. In a production environment,
    // you might use a more sophisticated NLP library or service.
    const words = text.toLowerCase().match(/\b(\w+)\b/g) || [];
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    return words.filter(word => !stopWords.has(word) && word.length > 3);
  }


  private generateContext(content: string, projectAnalysis: any, codeClassification: any): string {
    return `${content}\n\nProject Analysis: ${JSON.stringify(projectAnalysis)}\n\nCode Classification: ${JSON.stringify(codeClassification)}`;
  }

  async testAIConnections(): Promise<void> {
    for (const [providerName, provider] of this.providers) {
      try {
        this.spinner.start(`Testing connection to ${providerName}`);
        await provider.generateContent('Test connection', 10);
        this.spinner.succeed(`${providerName} connection test successful`);
        this.logger.info(`${providerName} connection test successful`);
      } catch (error: any) {
        this.spinner.fail(`${providerName} connection test failed`);
        this.logger.error(`${providerName} connection test failed`, { 
          error: error.message,
          response: error.response?.data
        });
      }
    }
    
    try {
      this.spinner.start('Testing AICodeAnalyzer connection');
      await this.codeAnalyzer.findRelevantFiles('Test connection');
      this.spinner.succeed('AICodeAnalyzer connection test successful');
      this.logger.info('AICodeAnalyzer connection test successful');
    } catch (error: any) {
      this.spinner.fail('AICodeAnalyzer connection test failed');
      this.logger.error('AICodeAnalyzer connection test failed', { 
        error: error.message,
      });
    }
  }
}