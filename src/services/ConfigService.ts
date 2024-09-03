// src/services/ConfigService.ts
import fs from 'fs-extra';
import path from 'path';

export class ConfigService {
  async initializeConfig(projectPath: string, projectId: string): Promise<void> {
    const configDir = path.join(projectPath, '.picura');
    const configPath = path.join(configDir, 'config.json');

    await fs.ensureDir(configDir);
    await fs.writeJson(configPath, { projectId }, { spaces: 2 });
  }
}