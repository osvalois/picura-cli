import fs from 'fs-extra';
import path from 'path';
import { LoggingService } from './LoggingService.js';

export class ConfigService {
  private logger: LoggingService;

  constructor(logger: LoggingService) {
    this.logger = logger;
  }

  async initializeConfig(projectPath: string, projectId: string): Promise<void> {
    try {
      const configDir = path.join(projectPath, '.picura');
      const configPath = path.join(configDir, 'config.json');

      await fs.ensureDir(configDir);
      await fs.writeJson(configPath, { projectId }, { spaces: 2 });

      this.logger.info(`Project configuration initialized`, { projectPath, projectId });
    } catch (error) {
      this.logger.error(`Failed to initialize project configuration`, { error: error instanceof Error ? error.message : String(error), projectPath, projectId });
      throw error;
    }
  }

  async getConfig(projectPath: string): Promise<{ projectId: string } | null> {
    try {
      const configPath = path.join(projectPath, '.picura', 'config.json');
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath);
        this.logger.info(`Project configuration retrieved`, { projectPath, projectId: config.projectId });
        return config;
      }
      this.logger.warn(`No project configuration found`, { projectPath });
      return null;
    } catch (error) {
      this.logger.error(`Failed to retrieve project configuration`, { error: error instanceof Error ? error.message : String(error), projectPath });
      throw error;
    }
  }
}