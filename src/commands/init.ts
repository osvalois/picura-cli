import { Command, Flags } from '@oclif/core'
import * as path from 'path'
import { ProjectService } from '../services/ProjectService.js'
import { GitService } from '../services/GitService.js'
import { ConfigService } from '../services/ConfigService.js'
import { LoggingService } from '../services/LoggingService.js'
import { AuditService } from '../services/AuditService.js'
import { AuditAction } from '@prisma/client'
import chalk from 'chalk'
import inquirer from 'inquirer'
import ora from 'ora'

export default class Init extends Command {
  static description = 'Inicializar un nuevo proyecto PICURA'

  static flags = {
    name: Flags.string({
      char: 'n', 
      description: 'Nombre del proyecto'
    }),
    description: Flags.string({
      char: 'd', 
      description: 'Descripción del proyecto'
    }),
    path: Flags.string({
      char: 'p', 
      description: 'Ruta al proyecto', 
      default: '.'
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Forzar la inicialización incluso si el directorio no es un repositorio Git',
      default: false
    })
  }

  private logger: LoggingService
  private projectService: ProjectService
  private gitService: GitService
  private configService: ConfigService
  private auditService: AuditService

  constructor(argv: string[], config: any) {
    super(argv, config)
    this.logger = new LoggingService(process.cwd())
    this.projectService = new ProjectService(this.logger)
    this.gitService = new GitService(this.logger)
    this.configService = new ConfigService(this.logger)
    this.auditService = new AuditService(this.logger)
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Init)
    
    try {
      const projectPath = path.resolve(flags.path)
      
      // Verificar si el directorio es un repositorio Git
      const isGitRepo = await this.gitService.isGitRepository(projectPath)
      if (!isGitRepo && !flags.force) {
        const initGit = await this.promptConfirmation('El directorio no es un repositorio Git. ¿Desea inicializar uno?')
        if (initGit) {
          await this.gitService.initializeRepository(projectPath)
        } else {
          this.error(chalk.red('El directorio no es un repositorio Git. Operación cancelada.'))
          return
        }
      }

      // Obtener el nombre del proyecto si no se proporcionó
      const projectName = flags.name || await this.promptProjectName()

      // Obtener la descripción del proyecto si no se proporcionó
      const projectDescription = flags.description || await this.promptProjectDescription()

      // Obtener la URL del repositorio remoto
      let repoUrl = await this.gitService.getRemoteUrl(projectPath)
      if (!repoUrl) {
        repoUrl = await this.promptRepoUrl()
        if (repoUrl) {
          await this.gitService.setRemoteUrl(projectPath, repoUrl)
        }
      }

      const spinner = ora('Inicializando proyecto PICURA...').start()

      // Crear el proyecto en la base de datos
      const project = await this.projectService.createProject({
        name: projectName,
        description: projectDescription,
        repoUrl: repoUrl,
        path: projectPath,
      })

      // Inicializar la configuración del proyecto
      await this.configService.initializeConfig(projectPath, project.id)

      // Configurar los hooks de Git
      await this.gitService.setupGitHooks(projectPath)

      // Registrar la acción en el log de auditoría
      await this.auditService.logAudit({
        action: AuditAction.CREATE,
        userId: process.env.USER || 'unknown',
        entityType: 'Project',
        entityId: project.id,
        details: {
          name: project.name,
          description: project.description,
          repoUrl: project.repoUrl,
          path: project.path,
        },
      })

      spinner.succeed('Proyecto PICURA inicializado con éxito')

      this.log(chalk.green(`Proyecto: ${project.name} (ID: ${project.id})`))
      this.log(chalk.green(`Ubicación: ${project.path}`))
      this.log(chalk.green('Se han configurado los hooks de Git para PICURA.'))

    } catch (error) {
      this.logger.error('Falló la inicialización del proyecto', { error: error instanceof Error ? error.message : String(error) })
      this.error(chalk.red(`Falló la inicialización del proyecto: ${error instanceof Error ? error.message : String(error)}`))
    }
  }

  private async promptConfirmation(message: string): Promise<boolean> {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.yellow(message),
      },
    ])
    return confirm
  }

  private async promptProjectName(): Promise<string> {
    const { projectName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Ingrese el nombre del proyecto:',
        validate: (input: string) => input.trim() !== '' || 'El nombre del proyecto es requerido',
      },
    ])
    return projectName
  }

  private async promptProjectDescription(): Promise<string> {
    const { projectDescription } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectDescription',
        message: 'Ingrese la descripción del proyecto (opcional):',
      },
    ])
    return projectDescription
  }

  private async promptRepoUrl(): Promise<string> {
    const { repoUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'repoUrl',
        message: 'Ingrese la URL del repositorio remoto (opcional):',
      },
    ])
    return repoUrl
  }
}