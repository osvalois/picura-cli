import { Command, Flags } from '@oclif/core'
import * as path from 'path'
import { ProjectService } from '../services/ProjectService'
import { GitService } from '../services/GitService'
import { ConfigService } from '../services/ConfigService'
import { LoggingService } from '../services/LoggingService'
import { AuditService } from '../services/AuditService'
import { AuditAction } from '@prisma/client'

export default class Init extends Command {
  static description = 'Inicializar un nuevo proyecto PICURA'

  static flags = {
    name: Flags.string({
      char: 'n', 
      description: 'Nombre del proyecto', 
      required: true
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
    this.gitService = new GitService(this.logger);
    this.configService = new ConfigService(this.logger);
    this.auditService = new AuditService(this.logger)
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Init)
    
    try {
      const projectPath = path.resolve(flags.path)
      
      // Verificar si el directorio es un repositorio Git
      const isGitRepo = await this.gitService.isGitRepository(projectPath)
      if (!isGitRepo) {
        this.error('El directorio no es un repositorio Git. Por favor, inicialice un repositorio Git antes de continuar.')
        return
      }

      // Obtener la URL del repositorio remoto
      const repoUrl = await this.gitService.getRemoteUrl(projectPath)
      if (!repoUrl) {
        this.error('No se pudo obtener la URL del repositorio remoto. Asegúrese de que el repositorio tenga un origen remoto configurado.')
        return
      }

      // Crear el proyecto en la base de datos
      const project = await this.projectService.createProject({
        name: flags.name,
        description: flags.description,
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

      this.log(`Proyecto PICURA inicializado con éxito: ${project.name} (ID: ${project.id})`)
      this.log(`Ubicación: ${project.path}`)
      this.log('Se han configurado los hooks de Git para PICURA.')

    } catch (error) {
      this.logger.error('Falló la inicialización del proyecto', { error: error instanceof Error ? error.message : String(error) })
      this.error(`Falló la inicialización del proyecto: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}