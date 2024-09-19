import { Command, Flags } from '@oclif/core'
import { PrismaClient } from '@prisma/client'
import { LoggingService } from './services/LoggingService.js'
import chalk from 'chalk'
import figlet from 'figlet'

export class PicuraCLI extends Command {
  static description = 'PICURA: CLI Avanzada para Gestión Integral de Proyectos de Software'

  static flags = {
    help: Flags.help({ char: 'h' }),
  }

  private prisma: PrismaClient
  private logger: LoggingService

  constructor(argv: string[], config: any) {
    super(argv, config)
    this.prisma = new PrismaClient()
    this.logger = new LoggingService(process.cwd())
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(PicuraCLI)

    try {
      this.displayWelcomeMessage()

      // No es necesario comprobar manualmente si flags.version está presente

      await this.displayAvailableCommands()
    } catch (error) {
      this.logger.error('Error al ejecutar PICURA CLI:', { error: error instanceof Error ? error.message : String(error) })
      this.error(chalk.red('Se produjo un error al ejecutar PICURA CLI. Por favor, revise los logs para más detalles.'))
    }
  }

  private displayWelcomeMessage(): void {
    this.log(
      chalk.cyan(
        figlet.textSync('PICURA CLI', { horizontalLayout: 'full' })
      )
    )
    this.log(chalk.yellow('Bienvenido a PICURA CLI - Gestión Integral de Proyectos de Software\n'))
  }

  private async displayAvailableCommands(): Promise<void> {
    this.log(chalk.yellow('\nComandos disponibles:'))
    this.log(chalk.green('- init:     ') + 'Inicializar un nuevo proyecto PICURA')
    this.log(chalk.green('- generate: ') + 'Generar documentación del proyecto')
    this.log(chalk.blue('\nPara obtener ayuda sobre un comando específico, ejecute: picura [comando] --help'))
  }

  async finally(err?: Error): Promise<void> {
    await this.prisma.$disconnect()
    if (err) {
      this.logger.error('Se produjo un error inesperado:', { error: err.message })
    }
  }
}
