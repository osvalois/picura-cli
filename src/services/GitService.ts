import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { LoggingService } from './LoggingService';

export class GitService {
  private git: SimpleGit;
  private logger: LoggingService;

  constructor(logger: LoggingService) {
    this.git = simpleGit();
    this.logger = logger;
  }

  async isGitRepository(dir: string): Promise<boolean> {
    try {
      await this.git.cwd(dir).status();
      this.logger.info(`Directory is a Git repository: ${dir}`);
      return true;
    } catch (error) {
      this.logger.warn(`Directory is not a Git repository: ${dir}`);
      return false;
    }
  }

  async getRemoteUrl(dir: string): Promise<string> {
    try {
      const remotes = await this.git.cwd(dir).getRemotes(true);
      const origin = remotes.find(remote => remote.name === 'origin');
      if (origin && origin.refs.push) {
        this.logger.info(`Remote URL found: ${origin.refs.push}`);
        return origin.refs.push;
      }
      this.logger.warn(`No remote URL found for directory: ${dir}`);
      return '';
    } catch (error) {
      this.logger.error(`Failed to get remote URL for directory: ${dir}`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async setupGitHooks(dir: string): Promise<void> {
    try {
      const hooksDir = path.join(dir, '.git', 'hooks');
      const picuraHookPath = path.join(__dirname, '..', '..', 'scripts', 'picura-hook.sh');
      
      const hooks = ['pre-commit', 'post-commit', 'pre-push'];
      
      for (const hook of hooks) {
        const hookPath = path.join(hooksDir, hook);
        await fs.ensureFile(hookPath);
        await fs.appendFile(hookPath, `\n# PICURA Hook\n. ${picuraHookPath}\n`);
        await fs.chmod(hookPath, '755');
        this.logger.info(`Git hook setup completed for: ${hook}`);
      }
    } catch (error) {
      this.logger.error(`Failed to setup Git hooks in directory: ${dir}`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}