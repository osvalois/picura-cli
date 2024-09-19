import * as fs from 'fs-extra';
import * as path from 'path';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import { AIProvider } from '../providers/AIProvider.js';

interface EnhancedCodeSnippet {
  filePath: string;
  content: string;
  relevanceScore: number;
  contextualSummary: string;
  suggestedImprovements: string[];
}

export class AICodeAnalyzer {
  private projectPath: string;
  private fileContents: Map<string, string> = new Map();
  private aiProvider: AIProvider;

  constructor(projectPath: string, aiProvider: AIProvider) {
    this.projectPath = projectPath;
    this.aiProvider = aiProvider;
    this.initializeProjectAnalysis();
  }

  setProjectPath(projectPath: string): void {
    if (!projectPath) {
      throw new Error('Project path cannot be empty');
    }
    this.projectPath = projectPath;
    this.initializeProjectAnalysis();
  }

 private async initializeProjectAnalysis() {
    if (!this.projectPath) {
      throw new Error('Project path is not set');
    }
    await this.loadProjectFiles();
  }

  private async loadProjectFiles() {
    if (!fs.existsSync(this.projectPath)) {
      throw new Error(`Project path does not exist: ${this.projectPath}`);
    }
    const files = await this.getProjectFiles(this.projectPath);
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      this.fileContents.set(file, content);
    }
  }

  private async getProjectFiles(dir: string): Promise<string[]> {
    if (!dir) {
      throw new Error('Directory path cannot be empty');
    }
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map((entry) => {
      const res = path.resolve(dir, entry.name);
      return entry.isDirectory() ? this.getProjectFiles(res) : res;
    }));
    return files.flat().filter(file => 
      /\.(js|jsx|ts|tsx|py|java|cpp|cs|go|rb|php|swift|kt|scala|rust|html|css|sql)$/.test(file) && 
      !file.includes('node_modules') && 
      !file.includes('dist')
    );
  }

  async findRelevantFiles(query: string, numFiles: number = 5): Promise<string[]> {
    const relevanceScores = await Promise.all(
      Array.from(this.fileContents.entries()).map(async ([file, content]) => {
        const relevance = await this.calculateRelevance(query, content);
        return { file, relevance };
      })
    );

    relevanceScores.sort((a, b) => b.relevance - a.relevance);
    return relevanceScores.slice(0, numFiles).map(item => item.file);
  }

  private async calculateRelevance(query: string, content: string): Promise<number> {
    const prompt = `
    Query: ${query}
    Code:
    ${content.slice(0, 1000)}  // Limit content to avoid token limits

    On a scale of 0 to 100, how relevant is this code to the query? Provide only a number as response.
    `;

    const response = await this.aiProvider.generateContent(prompt, 10);
    const relevanceScore = parseInt(response, 10);
    return isNaN(relevanceScore) ? 0 : relevanceScore;
  }

  async extractCodeSnippet(filePath: string, context: string): Promise<EnhancedCodeSnippet> {
    const content = this.fileContents.get(filePath) || await fs.readFile(filePath, 'utf8');
    const ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
    });

    const snippets: { start: number; end: number; node: any }[] = [];

    traverse(ast, {
      enter(path) {
        if (path.isFunction() || path.isClassMethod() || path.isObjectMethod()) {
          snippets.push({
            start: path.node.loc!.start.line,
            end: path.node.loc!.end.line,
            node: path.node,
          });
        }
      },
    });

    const relevantSnippet = await this.findMostRelevantSnippet(snippets, content, context);
    const lines = content.split('\n');
    const snippetContent = lines.slice(relevantSnippet.start - 1, relevantSnippet.end).join('\n');

    const [contextualSummary, suggestedImprovements] = await Promise.all([
      this.generateContextualSummary(snippetContent, context),
      this.suggestImprovements(snippetContent),
    ]);

    return {
      filePath,
      content: snippetContent,
      relevanceScore: relevantSnippet.relevanceScore,
      contextualSummary,
      suggestedImprovements,
    };
  }

  private async findMostRelevantSnippet(snippets: any[], fileContent: string, context: string): Promise<{ start: number; end: number; relevanceScore: number }> {
    const scoredSnippets = await Promise.all(snippets.map(async (snippet) => {
      const snippetContent = fileContent.split('\n').slice(snippet.start - 1, snippet.end).join('\n');
      const relevanceScore = await this.calculateRelevance(context, snippetContent);
      return { ...snippet, relevanceScore };
    }));

    scoredSnippets.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return scoredSnippets[0];
  }

  private async generateContextualSummary(snippet: string, context: string): Promise<string> {
    const prompt = `
    Code snippet:
    ${snippet}

    Context: ${context}

    Provide a brief summary of this code snippet in the given context. Focus on its main functionality and how it relates to the context.
    `;

    return this.aiProvider.generateContent(prompt, 200);
  }

  private async suggestImprovements(snippet: string): Promise<string[]> {
    const prompt = `
    Analyze the following code snippet and suggest up to 3 improvements. Focus on code quality, performance, and best practices.

    Code:
    ${snippet}

    Provide your suggestions in a list format.
    `;

    const response = await this.aiProvider.generateContent(prompt, 500);
    const suggestions = response.split('\n').filter(line => line.trim().startsWith('-'));
    return suggestions.map(suggestion => suggestion.trim().substring(2));
  }
}