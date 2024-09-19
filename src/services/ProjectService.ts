import { PrismaClient, Project } from '@prisma/client';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { LoggingService } from './LoggingService.js';

export class ProjectService {
  private prisma: PrismaClient;
  private logger: LoggingService;

  constructor(logger: LoggingService) {
    this.prisma = new PrismaClient();
    this.logger = logger;
  }

  async createProject(data: {
    name: string;
    description?: string;
    repoUrl: string;
    path: string;
  }): Promise<Project> {
    try {
      this.logger.info(`Creating new project: ${data.name}`);
      const project = await this.prisma.project.create({
        data: {
          ...data,
          externalOwnerId: process.env.USER || 'unknown',
          externalCompanyId: process.env.COMPANY_ID || 'unknown',
          secretKey: this.generateSecretKey(),
        },
      });
      this.logger.info(`Project created successfully`, { projectId: project.id });
      return project;
    } catch (error) {
      this.logger.error(`Failed to create project: ${data.name}`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    try {
      this.logger.info(`Fetching project by ID: ${id}`);
      const project = await this.prisma.project.findUnique({ where: { id } });
      if (project) {
        this.logger.info(`Project found`, { projectId: project.id });
      } else {
        this.logger.warn(`Project not found for ID: ${id}`);
      }
      return project;
    } catch (error) {
      this.logger.error(`Failed to fetch project by ID: ${id}`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async getProjectIdFromCurrentDirectory(): Promise<string | null> {
    try {
      const configPath = path.join(process.cwd(), '.picura', 'config.json');
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath);
        this.logger.info(`Project ID found in current directory`, { projectId: config.projectId });
        return config.projectId;
      }
      this.logger.warn(`No project configuration found in current directory`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to get project ID from current directory`, { error: error instanceof Error ? error.message : String(error) });
      throw error;}
    }
  
    async analyzeProjectStructure(projectPath: string): Promise<string> {
      try {
        this.logger.info(`Analyzing project structure: ${projectPath}`);
        const tree = await this.generateDirectoryTree(projectPath);
        const dependencies = await this.analyzeDependencies(projectPath);
        const techStack = await this.analyzeTechStack(projectPath);
  
        const analysis = JSON.stringify({
          structure: tree,
          dependencies,
          techStack,
        }, null, 2);
  
        this.logger.info(`Project structure analysis complete`, { analysisSize: analysis.length });
        return analysis;
      } catch (error) {
        this.logger.error(`Failed to analyze project structure: ${projectPath}`, { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    }
  
    private async generateDirectoryTree(dir: string): Promise<any> {
      const stats = await fs.stat(dir);
      const name = path.basename(dir);
  
      if (!stats.isDirectory()) {
        return name;
      }
  
      const items = await fs.readdir(dir);
      const children = await Promise.all(
        items
          .filter(item => !item.startsWith('.') && item !== 'node_modules')
          .map(item => this.generateDirectoryTree(path.join(dir, item)))
      );
  
      return {
        name,
        children,
      };
    }
  
    private async analyzeDependencies(projectPath: string): Promise<any> {
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        return {
          dependencies: packageJson.dependencies || {},
          devDependencies: packageJson.devDependencies || {},
        };
      }
      return {};
    }
  
    private async analyzeTechStack(projectPath: string): Promise<string[]> {
      const techStack = [];
      const files = await fs.readdir(projectPath);
  
      if (files.includes('package.json')) techStack.push('Node.js');
      if (files.includes('tsconfig.json')) techStack.push('TypeScript');
      if (files.some(file => file.endsWith('.py'))) techStack.push('Python');
      if (files.some(file => file.endsWith('.java'))) techStack.push('Java');
      if (files.includes('Dockerfile')) techStack.push('Docker');
      if (files.includes('docker-compose.yml')) techStack.push('Docker Compose');
  
      return techStack;
    }
  
    private generateSecretKey(): string {
      return crypto.randomBytes(32).toString('hex');
    }
  }