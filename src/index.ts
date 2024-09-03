
//index.ts
import { Command, Flags } from '@oclif/core'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config()

export default class PicuraCLI extends Command {
  static description = 'PICURA: CLI Avanzada para Gestión Integral de Proyectos de Software'

  static flags = {
    version: Flags.version({ char: 'v' }),
    help: Flags.help({ char: 'h' }),
  }

  static args = [
    { name: 'command', description: 'Command to run', required: false },
  ]

  private prisma: PrismaClient

  constructor(argv: string[], config: any) {
    super(argv, config)
    this.prisma = new PrismaClient()
  }

  async run(): Promise<void> {
    const { args } = await this.parse(PicuraCLI)

    if (!args.command) {
      this.log('Bienvenido a PICURA CLI')
      await this.displayAvailableCommands()
    } else {
      this.error(`Comando desconocido: ${args.command}`)
    }
  }

  async displayAvailableCommands(): Promise<void> {
    this.log('\nComandos disponibles:')
    this.log('- init: Inicializar un nuevo proyecto PICURA')
    this.log('- generate: Generar documentación del proyecto')
    this.log('\nPara obtener ayuda sobre un comando específico, ejecute: picura [comando] --help')
  }

  async finally(err: Error | undefined): Promise<void> {
    await this.prisma.$disconnect()
    if (err) {
      this.error('Se produjo un error inesperado:', err)
    }
  }
}