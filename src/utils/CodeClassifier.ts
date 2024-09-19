import * as fs from 'fs-extra';
import * as path from 'path';
import * as tf from '@tensorflow/tfjs-node';

export class CodeClassifier {
  private model: tf.LayersModel;
  private labelEncoder: Map<string, number>;
  private reverseLabelEncoder: Map<number, string>;

  constructor() {
    this.labelEncoder = new Map([
      ['javascript', 0],
      ['typescript', 1],
      ['python', 2],
      ['java', 3],
      ['csharp', 4],
      ['cpp', 5],
      ['php', 6],
      ['ruby', 7],
      ['go', 8],
      ['rust', 9],
      ['other', 10]
    ]);
    this.reverseLabelEncoder = new Map(Array.from(this.labelEncoder, a => [a[1], a[0]]));
    this.model = this.loadModel();
  }

  async classifyProjectCode(projectPath: string): Promise<any> {
    const files = await this.getProjectFiles(projectPath);
    const classifications = await Promise.all(files.map(file => this.classifyFile(file)));
    return this.aggregateClassifications(classifications);
  }

  private async classifyFile(filePath: string): Promise<any> {
    const content = await fs.readFile(filePath, 'utf8');
    const features = this.extractFeatures(content);
    const prediction = this.model.predict(features) as tf.Tensor;
    const classIndex = prediction.argMax(-1).dataSync()[0];
    const confidence = prediction.max().dataSync()[0];
    
    return {
      file: filePath,
      language: this.reverseLabelEncoder.get(classIndex) || 'unknown',
      confidence: confidence
    };
  }

  private extractFeatures(content: string): tf.Tensor {
    // This is a simplified feature extraction. In a real-world scenario,
    // you'd use more sophisticated techniques like word embeddings or character-level features.
    const tokens = content.toLowerCase().split(/\W+/);
    const bagOfWords = new Array(1000).fill(0); // Assuming a vocabulary size of 1000
    tokens.forEach(token => {
      const index = this.hashString(token) % 1000;
      bagOfWords[index]++;
    });
    return tf.tensor2d([bagOfWords]);
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

  private aggregateClassifications(classifications: any[]): any {
    const languageCounts: { [key: string]: number } = {};
    const fileClassifications: { [key: string]: string } = {};

    classifications.forEach(classification => {
      const { file, language, confidence } = classification;
      if (confidence > 0.5) { // Only consider classifications with high confidence
        languageCounts[language] = (languageCounts[language] || 0) + 1;
        fileClassifications[file] = language;
      }
    });

    const totalFiles = Object.values(languageCounts).reduce((a, b) => a + b, 0);
    const languagePercentages = Object.entries(languageCounts).reduce((acc, [lang, count]) => {
      acc[lang] = (count / totalFiles) * 100;
      return acc;
    }, {} as { [key: string]: number });

    return {
      languageBreakdown: languagePercentages,
      fileClassifications: fileClassifications
    };
  }

  private loadModel(): tf.LayersModel {
    // In a real-world scenario, you'd load a pre-trained model here.
    // For this example, we'll create a simple model.
    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [1000], units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 11, activation: 'softmax' })); // 11 classes (10 languages + other)
    model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
    return model;
  }

  private async getProjectFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.js', '.ts', '.py', '.java', '.cs', '.cpp', '.php', '.rb', '.go', '.rs'];

    const traverseDir = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await traverseDir(fullPath);
          }
        } else if (extensions.includes(path.extname(entry.name))) {
          files.push(fullPath);
        }
      }
    };

    await traverseDir(projectPath);
    return files;
  }
}