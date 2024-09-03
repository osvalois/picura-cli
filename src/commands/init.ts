import { Command, Flags } from '@oclif/core'
import * as path from 'path'
import { ProjectService } from '../services/ProjectService'
import { GitService } from '../services/GitService'
import { ConfigService } from '../services/ConfigService'

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

  async run(): Promise<void> {
    const { flags } = await this.parse(Init)
    
    const projectService = new ProjectService()
    const gitService = new GitService()
    const configService = new ConfigService()

    try {
      const projectPath = path.resolve(flags.path)
      
      // Verificar si el directorio es un repositorio Git
      const isGitRepo = await gitService.isGitRepository(projectPath)
      if (!isGitRepo) {
        this.error('El directorio no es un repositorio Git. Por favor, inicialice un repositorio Git antes de continuar.')
        return
      }

      // Obtener la URL del repositorio remoto
      const repoUrl = await gitService.getRemoteUrl(projectPath)
      if (!repoUrl) {
        this.error('No se pudo obtener la URL del repositorio remoto. Asegúrese de que el repositorio tenga un origen remoto configurado.')
        return
      }

      // Crear el proyecto en la base de datos
      const project = await projectService.createProject({
        name: flags.name,
        description: flags.description,
        repoUrl: repoUrl,
        path: projectPath,
      })

      // Inicializar la configuración del proyecto
      await configService.initializeConfig(projectPath, project.id)

      // Configurar los hooks de Git
      await gitService.setupGitHooks(projectPath)

      this.log(`Proyecto PICURA inicializado con éxito: ${project.name} (ID: ${project.id})`)
      this.log(`Ubicación: ${project.path}`)
      this.log('Se han configurado los hooks de Git para PICURA.')

    } catch (error) {
      this.error(`Falló la inicialización del proyecto: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}