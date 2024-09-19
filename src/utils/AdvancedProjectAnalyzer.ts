import * as fs from 'fs-extra';
import * as path from 'path';
import * as tf from '@tensorflow/tfjs-node';
import * as natural from 'natural';
import { glob } from 'glob';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import TypeScript from 'tree-sitter-typescript';
import Python from 'tree-sitter-python';
import Java from 'tree-sitter-java';
import CSharp from 'tree-sitter-c-sharp';
import Cpp from 'tree-sitter-cpp';
import Php from 'tree-sitter-php';
import Ruby from 'tree-sitter-ruby';
import Go from 'tree-sitter-go';
import Rust from 'tree-sitter-rust';
import { LoggingService } from '../services/LoggingService.js';

export interface ClassificationResult {
  file: string;
  language: string;
  confidence: number;
}

export interface AggregatedClassification {
  languageBreakdown: { [key: string]: number };
  fileClassifications: { [key: string]: string };
  topKeywords: { [key: string]: string[] };
}

export interface ExtendedTfIdf extends Omit<natural.TfIdf, 'documents'> {
  documents: { [key: string]: number }[];
}

export class AdvancedProjectAnalyzer {
  private model: tf.LayersModel;
  private labelEncoder: Map<string, number>;
  private reverseLabelEncoder: Map<number, string>;
  private vocabularySize: number = 5000;
  private maxSequenceLength: number = 500;
  private tfIdf: ExtendedTfIdf;
  private logger: LoggingService;
  private parsers: Map<string, Parser>;
  private languageDocumentIndices: Map<string, number>;
  private maxTfIdfDocuments: number = 1000;

  constructor(logger: LoggingService) {
    this.logger = logger;
    this.labelEncoder = new Map([
      ['javascript', 0], ['typescript', 1], ['python', 2],
      ['java', 3], ['csharp', 4], ['cpp', 5],
      ['php', 6], ['ruby', 7], ['go', 8],
      ['rust', 9], ['other', 10]
    ]);
    this.reverseLabelEncoder = new Map(Array.from(this.labelEncoder, a => [a[1], a[0]]));
    this.tfIdf = new natural.TfIdf() as unknown as ExtendedTfIdf;
    this.tfIdf.documents = [];
    this.model = this.loadModel();
    this.parsers = new Map();
    this.languageDocumentIndices = new Map();
    this.initializeParsers();
  }

  private initializeParsers(): void {
    const languages = [
      { name: 'javascript', parser: JavaScript },
      { name: 'typescript', parser: TypeScript.typescript },
      { name: 'python', parser: Python },
      { name: 'java', parser: Java },
      { name: 'csharp', parser: CSharp },
      { name: 'cpp', parser: Cpp },
      { name: 'php', parser: Php },
      { name: 'ruby', parser: Ruby },
      { name: 'go', parser: Go },
      { name: 'rust', parser: Rust }
    ];

    languages.forEach(({ name, parser }) => {
      const parserInstance = new Parser();
      parserInstance.setLanguage(parser);
      this.parsers.set(name, parserInstance);
    });
  }

  async analyzeProject(projectPath: string): Promise<AggregatedClassification> {
    this.logger.info(`Starting project analysis for: ${projectPath}`);
    this.resetAnalysis();
    const files = await this.getProjectFiles(projectPath);
    const classifications = await Promise.all(files.map(file => this.classifyFile(file)));
    const aggregatedResult = this.aggregateClassifications(classifications);
    this.logger.info(`Project analysis completed for: ${projectPath}`);
    return aggregatedResult;
  }

  private resetAnalysis(): void {
    this.tfIdf = new natural.TfIdf() as unknown as ExtendedTfIdf;
    this.tfIdf.documents = [];
    this.languageDocumentIndices.clear();
  }

  private async classifyFile(filePath: string): Promise<ClassificationResult> {
    this.logger.debug(`Classifying file: ${filePath}`);
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      this.logger.error(`Error reading file ${filePath}: ${(error as Error).message}`);
      return { file: filePath, language: 'unknown', confidence: 0 };
    }

    const features = await this.extractFeatures(content, filePath);
    const prediction = this.model.predict(features) as tf.Tensor;
    const classIndex = prediction.argMax(-1).dataSync()[0];
    const confidence = prediction.max().dataSync()[0];
    
    const result = {
      file: filePath,
      language: this.reverseLabelEncoder.get(classIndex) || 'unknown',
      confidence: confidence
    };
    this.logger.debug(`Classification result for ${filePath}: ${JSON.stringify(result)}`);
    return result;
  }

  private async extractFeatures(content: string, filePath: string): Promise<tf.Tensor> {
    const tokens = await this.tokenizeCode(content, filePath);
    const tokenIds = this.vectorizeTokens(tokens);
    const paddedTokenIds = this.padSequence(tokenIds);
    return tf.tensor2d([paddedTokenIds]);
  }

  private async tokenizeCode(content: string, filePath: string): Promise<string[]> {
    const extension = path.extname(filePath).toLowerCase();
    const language = this.getLanguageFromExtension(extension);
    let tokens: string[] = [];

    try {
      const parser = this.parsers.get(language);
      if (parser) {
        const tree = parser.parse(content);
        tokens = this.extractTokensFromTree(tree.rootNode);
      } else {
        tokens = this.fallbackTokenization(content);
      }
    } catch (error) {
      this.logger.warn(`Error tokenizing file ${filePath}: ${(error as Error).message}`);
      tokens = this.fallbackTokenization(content);
    }

    return tokens;
  }

  private fallbackTokenization(content: string): string[] {
    return content.split(/\W+/).filter(token => token.length > 0);
  }

  private getLanguageFromExtension(extension: string): string {
    const extensionMap: { [key: string]: string } = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.hpp': 'cpp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust'
    };
    return extensionMap[extension] || 'other';
  }

  private extractTokensFromTree(node: Parser.SyntaxNode): string[] {
    let tokens: string[] = [];
    if (node.type === 'identifier' || node.type === 'string' || node.type === 'number') {
      tokens.push(node.text);
    }
    for (let child of node.children) {
      tokens = tokens.concat(this.extractTokensFromTree(child));
    }
    return tokens;
  }

  private vectorizeTokens(tokens: string[]): number[] {
    return tokens.map(token => {
      const hash = this.hashString(token);
      return hash % this.vocabularySize;
    });
  }

  private padSequence(sequence: number[]): number[] {
    if (sequence.length > this.maxSequenceLength) {
      return sequence.slice(0, this.maxSequenceLength);
    }
    return [...sequence, ...new Array(this.maxSequenceLength - sequence.length).fill(0)];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private aggregateClassifications(classifications: ClassificationResult[]): AggregatedClassification {
    const languageCounts: { [key: string]: number } = {};
    const fileClassifications: { [key: string]: string } = {};

    classifications.forEach(classification => {
      const { file, language, confidence } = classification;
      if (confidence > 0.7) {
        languageCounts[language] = (languageCounts[language] || 0) + 1;
        fileClassifications[file] = language;
        
        this.updateTfIdf(file, language);
      }
    });

    const totalFiles = Object.values(languageCounts).reduce((a, b) => a + b, 0);
    const languagePercentages = Object.entries(languageCounts).reduce((acc, [lang, count]) => {
      acc[lang] = parseFloat(((count / totalFiles) * 100).toFixed(2));
      return acc;
    }, {} as { [key: string]: number });

    const topKeywords: { [key: string]: string[] } = {};
    Object.keys(languageCounts).forEach(language => {
      topKeywords[language] = this.getTopKeywords(language, 10);
    });

    return {
      languageBreakdown: languagePercentages,
      fileClassifications: fileClassifications,
      topKeywords: topKeywords
    };
  }

  private updateTfIdf(file: string, language: string): void {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const tokens = content.toLowerCase().split(/\W+/).filter(token => token.length > 1);
      if (!this.languageDocumentIndices.has(language)) {
        if (this.tfIdf.documents.length >= this.maxTfIdfDocuments) {
          this.logger.warn(`Maximum TF-IDF documents reached. Skipping TF-IDF update for ${file}`);
          return;
        }
        const newIndex = this.tfIdf.documents.length;
        this.languageDocumentIndices.set(language, newIndex);
        this.tfIdf.addDocument(tokens);
      } else {
        const index = this.languageDocumentIndices.get(language)!;
        this.tfIdf.addDocument(tokens, index.toString());
      }
    } catch (error) {
      this.logger.warn(`Error updating TF-IDF for file ${file}: ${(error as Error).message}`);
    }
  }

  private getTopKeywords(language: string, n: number): string[] {
    const index = this.languageDocumentIndices.get(language);
    if (index === undefined) {
      this.logger.warn(`No TF-IDF data for language: ${language}`);
      return [];
    }
    const terms = this.tfIdf.listTerms(index);
    return terms.slice(0, n).map(term => term.term);
  }

  private loadModel(): tf.LayersModel {
    const model = tf.sequential();
    model.add(tf.layers.embedding({ inputDim: this.vocabularySize, outputDim: 128, inputLength: this.maxSequenceLength }));
    model.add(tf.layers.globalAveragePooling1d());
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.5 }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 11, activation: 'softmax' }));
    model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
    return model;
  }

  private async getProjectFiles(projectPath: string): Promise<string[]> {
    const extensions = ['.js', '.ts', '.py', '.java', '.cs', '.cpp', '.php', '.rb', '.go', '.rs'];
    const pattern = `${projectPath}/**/*+(${extensions.join('|')})`;
    const options = {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
    };

    try {
      const files = await glob(pattern, options);
      this.logger.info(`Found ${files.length} files to analyze in ${projectPath}`);
      return files;
    } catch (error) {
      this.logger.error(`Error finding project files: ${(error as Error).message}`);
      return [];
    }
  }

  async trainModel(trainingData: { content: string, language: string }[]): Promise<void> {
    this.logger.info('Starting model training');
    const { features, labels } = await this.prepareTrainingData(trainingData);
    
    const epochs = 50;
    const batchSize = 32;

    await this.model.fit(features, labels, {
      epochs,
      batchSize,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          this.logger.debug(`Epoch ${epoch + 1}: loss = ${logs?.loss}, accuracy = ${logs?.acc}`);
        }
      }
    });

    this.logger.info('Model training completed');
  }

  private async prepareTrainingData(trainingData: { content: string, language: string }[]): Promise<{ features: tf.Tensor, labels: tf.Tensor }> {
    const features: number[][] = [];
    const labels: number[] = [];

    for (const { content, language } of trainingData) {
      const tokens = await this.tokenizeCode(content, `dummy.${language}`);
      const tokenIds = this.vectorizeTokens(tokens);
      const paddedTokenIds = this.padSequence(tokenIds);
      features.push(paddedTokenIds);
      labels.push(this.labelEncoder.get(language) || 10);
    }

    return {
      features: tf.tensor2d(features),
      labels: tf.oneHot(tf.tensor1d(labels, 'int32'), 11)
    };
  }

  async saveModel(path: string): Promise<void> {
    try {
      await this.model.save(`file://${path}`);
      this.logger.info(`Model saved to ${path}`);
    } catch (error) {
      this.logger.error(`Error saving model: ${(error as Error).message}`);
    }
  }

  async loadTrainedModel(path: string): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(`file://${path}`);
      this.logger.info(`Model loaded from ${path}`);
    } catch (error) {
      this.logger.error(`Error loading model: ${(error as Error).message}`);
      throw new Error(`Failed to load model: ${(error as Error).message}`);
    }
  }

  async analyzeFile(filePath: string): Promise<ClassificationResult> {
    this.logger.info(`Analyzing individual file: ${filePath}`);
    return this.classifyFile(filePath);
  }

  async batchAnalyze(filePaths: string[]): Promise<ClassificationResult[]> {
    this.logger.info(`Starting batch analysis of ${filePaths.length} files`);
    const results = await Promise.all(filePaths.map(file => this.classifyFile(file)));
    this.logger.info('Batch analysis completed');
    return results;
  }

  getLanguageStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    this.languageDocumentIndices.forEach((index, language) => {
      const terms = this.tfIdf.listTerms(index);
      stats[language] = terms.reduce((sum, term) => sum + term.tfidf, 0);
    });
    return stats;
  }

  async exportResults(outputPath: string, results: AggregatedClassification): Promise<void> {
    try {
      await fs.writeJson(outputPath, results, { spaces: 2 });
      this.logger.info(`Results exported to ${outputPath}`);
    } catch (error) {
      this.logger.error(`Error exporting results: ${(error as Error).message}`);
      throw new Error(`Failed to export results: ${(error as Error).message}`);
    }
  }

  private optimizeMemoryUsage(): void {
    if (this.tfIdf.documents.length > this.maxTfIdfDocuments) {
      this.logger.warn('TF-IDF document limit reached. Pruning old documents.');
      this.tfIdf.documents = this.tfIdf.documents.slice(-this.maxTfIdfDocuments);
      this.updateLanguageDocumentIndices();
    }
  }

  private updateLanguageDocumentIndices(): void {
    this.languageDocumentIndices.clear();
    this.tfIdf.documents.forEach((doc, index) => {
      const language = Object.keys(doc)[0];
      this.languageDocumentIndices.set(language, index);
    });
  }

  async analyzeProjectStructure(projectPath: string): Promise<object> {
    if (!fs.existsSync(projectPath)) {
      this.logger.error(`Project path does not exist: ${projectPath}`);
      throw new Error(`Project path does not exist: ${projectPath}`);
    }
    this.logger.info(`Analyzing project structure for: ${projectPath}`);
    const structure: any = {};

    const buildStructure = async (currentPath: string, currentObject: any) => {
      const items = await fs.readdir(currentPath);
      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stats = await fs.stat(itemPath);
        if (stats.isDirectory()) {
          currentObject[item] = {};
          await buildStructure(itemPath, currentObject[item]);
        } else {
          currentObject[item] = path.extname(item);
        }
      }
    };

    await buildStructure(projectPath, structure);
    this.logger.info('Project structure analysis completed');
    return structure;
  }

  async generateProjectReport(projectPath: string): Promise<string> {
    const analysis = await this.analyzeProject(projectPath);
    const structure = await this.analyzeProjectStructure(projectPath);
    
    let report = `Project Analysis Report\n`;
    report += `=========================\n\n`;
    report += `Project Path: ${projectPath}\n\n`;
    
    report += `Language Breakdown:\n`;
    Object.entries(analysis.languageBreakdown).forEach(([lang, percentage]) => {
      report += `  ${lang}: ${percentage.toFixed(2)}%\n`;
    });
    
    report += `\nTop Keywords by Language:\n`;
    Object.entries(analysis.topKeywords).forEach(([lang, keywords]) => {
      report += `  ${lang}: ${keywords.join(', ')}\n`;
    });
    
    report += `\nProject Structure:\n`;
    report += JSON.stringify(structure, null, 2);
    
    return report;
  }

  setMaxTfIdfDocuments(max: number): void {
    this.maxTfIdfDocuments = max;
    this.optimizeMemoryUsage();
  }

  clearCache(): void {
    this.resetAnalysis();
    this.logger.info('Analysis cache cleared');
  }
}