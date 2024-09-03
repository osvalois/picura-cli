//ProjectAnalyzer.ts
import * as fs from 'fs-extra';
import * as path from 'path';
import * as parser from '@babel/parser';
import * as babelTypes from '@babel/types'; // Asegúrate de que esta importación esté presente
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ProjectAnalyzer {
  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    const fileStructure = await this.analyzeFileStructure(projectPath);
    const dependencies = await this.analyzeDependencies(projectPath);
    const codeMetrics = await this.analyzeCodeMetrics(projectPath);
    const gitInfo = await this.analyzeGitInfo(projectPath);

    return {
      fileStructure,
      dependencies,
      codeMetrics,
      gitInfo,
    };
  }

  private async analyzeFileStructure(dir: string): Promise<FileNode> {
    const stats = await fs.stat(dir);
    const name = path.basename(dir);

    if (!stats.isDirectory()) {
      return { name, type: 'file' };
    }

    const children = await Promise.all(
      (await fs.readdir(dir))
        .filter(item => !item.startsWith('.') && item !== 'node_modules')
        .map(item => this.analyzeFileStructure(path.join(dir, item)))
    );

    return { name, type: 'directory', children };
  }

  private async analyzeDependencies(projectPath: string): Promise<Dependencies> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      return {
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
      };
    }
    return { dependencies: {}, devDependencies: {} };
  }

  private async analyzeCodeMetrics(projectPath: string): Promise<CodeMetrics> {
    const metrics: CodeMetrics = {
      totalLines: 0,
      totalFiles: 0,
      languageBreakdown: {},
      totalFunctions: 0, // Asegúrate de inicializar las métricas
      totalClasses: 0,
    };

    const analyzeFile = async (filePath: string) => {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').length;
      metrics.totalLines += lines;
      metrics.totalFiles += 1;

      const ext = path.extname(filePath).slice(1);
      metrics.languageBreakdown[ext] = (metrics.languageBreakdown[ext] || 0) + lines;

      if (ext === 'js' || ext === 'ts') {
        const ast = parser.parse(content, {
          sourceType: 'module',
          plugins: ['typescript'],
        });

        this.countFunctionsAndClasses(ast, metrics); // Llama a la nueva función
      }
    };

    const walk = async (dir: string) => {
      const files = await fs.readdir(dir);
      await Promise.all(files.map(async file => {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
          await walk(filePath);
        } else if (stats.isFile()) {
          await analyzeFile(filePath);
        }
      }));
    };

    await walk(projectPath);
    return metrics;
  }

  // Nueva función para contar declaraciones de funciones y clases
  private countFunctionsAndClasses(ast: any, metrics: CodeMetrics) {
    babelTypes.traverse(ast, {
      enter(path: any) {
        if (babelTypes.isFunctionDeclaration(path.node)) {
          metrics.totalFunctions += 1;
        } else if (babelTypes.isClassDeclaration(path.node)) {
          metrics.totalClasses += 1;
        }
      }
    });
  }

  private async analyzeGitInfo(projectPath: string): Promise<GitInfo> {
    try {
      const { stdout: remoteUrl } = await execAsync('git config --get remote.origin.url', { cwd: projectPath });
      const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: projectPath });
      const { stdout: lastCommit } = await execAsync('git log -1 --format=%H', { cwd: projectPath });

      return {
        remoteUrl: remoteUrl.trim(),
        currentBranch: branch.trim(),
        lastCommitHash: lastCommit.trim(),
      };
    } catch (error) {
      console.error('Error analyzing git info:', error);
      return {
        remoteUrl: 'Unknown',
        currentBranch: 'Unknown',
        lastCommitHash: 'Unknown',
      };
    }
  }
}

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface Dependencies {
  dependencies: { [key: string]: string };
  devDependencies: { [key: string]: string };
}

interface CodeMetrics {
  totalLines: number;
  totalFiles: number;
  totalFunctions: number; // Cambia a no opcional
  totalClasses: number; // Cambia a no opcional
  languageBreakdown: { [key: string]: number };
}

interface GitInfo {
  remoteUrl: string;
  currentBranch: string;
  lastCommitHash: string;
}

interface ProjectAnalysis {
  fileStructure: FileNode;
  dependencies: Dependencies;
  codeMetrics: CodeMetrics;
  gitInfo: GitInfo;
}
