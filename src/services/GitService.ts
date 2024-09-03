//GitService.ts
import { simpleGit, type SimpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';

export class GitService {
  private git: SimpleGit;

  constructor() {
    this.git = simpleGit();
  }

  async isGitRepository(dir: string): Promise<boolean> {
    try {
      await this.git.cwd(dir).status();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getRemoteUrl(dir: string): Promise<string> {
    const remotes = await this.git.cwd(dir).getRemotes(true);
    const origin = remotes.find(remote => remote.name === 'origin');
    return origin?.refs.push || '';
  }

  async initRepository(dir: string): Promise<void> {
    await this.git.cwd(dir).init();
  }

  async setupGitHooks(dir: string): Promise<void> {
    const hooksDir = path.join(dir, '.git', 'hooks');
    const picuraHookPath = path.join(__dirname, '..', '..', 'scripts', 'picura-hook.sh');
    
    const hooks = ['pre-commit', 'post-commit', 'pre-push'];
    
    for (const hook of hooks) {
      const hookPath = path.join(hooksDir, hook);
      await fs.ensureFile(hookPath);
      await fs.appendFile(hookPath, `\n# PICURA Hook\n. ${picuraHookPath}\n`);
      await fs.chmod(hookPath, '755');
    }
  }
}