import chalk from 'chalk';

export class ProgressBar {
  private totalSteps: number;
  private currentStep: number;
  private startTime: number;
  private barWidth: number;
  private lastUpdateTime: number;

  constructor(barWidth: number = 40) {
    this.totalSteps = 100;
    this.currentStep = 0;
    this.startTime = 0;
    this.barWidth = barWidth;
    this.lastUpdateTime = 0;
  }

  start(message: string, total: number = 100): void {
    this.totalSteps = total;
    this.currentStep = 0;
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
    console.log(chalk.cyan(message));
    this.render();
  }

  update(step: number, message: string): void {
    this.currentStep = step;
    const now = Date.now();
    if (now - this.lastUpdateTime > 100 || step === this.totalSteps) { // Update at most every 100ms
      this.render(message);
      this.lastUpdateTime = now;
    }
  }

  complete(message: string): void {
    this.currentStep = this.totalSteps;
    this.render(message);
    console.log(chalk.green('\n' + message));
  }

  fail(message: string): void {
    console.log(chalk.red('\n' + message));
  }

  private render(message: string = ''): void {
    const percent = this.currentStep / this.totalSteps;
    const filledWidth = Math.round(this.barWidth * percent);
    const emptyWidth = this.barWidth - filledWidth;

    const elapsedTime = (Date.now() - this.startTime) / 1000; // in seconds
    const estimatedTotalTime = elapsedTime / percent;
    const remainingTime = estimatedTotalTime - elapsedTime;

    const bar = chalk.bgCyan(' '.repeat(filledWidth)) + chalk.bgGray(' '.repeat(emptyWidth));
    const percentage = chalk.yellow(`${(percent * 100).toFixed(1)}%`);
    const timeInfo = chalk.magenta(`${this.formatTime(elapsedTime)} / ${this.formatTime(estimatedTotalTime)} (${this.formatTime(remainingTime)} remaining)`);

    process.stdout.write(`\r${bar} ${percentage} ${timeInfo} ${message}`);
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}