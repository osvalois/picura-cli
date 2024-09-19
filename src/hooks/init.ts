import {Hook} from '@oclif/core'
import {PrismaClient} from '@prisma/client'
import dotenv from 'dotenv'
import chalk from 'chalk'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'

let prisma: PrismaClient | undefined

const hook: Hook<'init'> = async function () {
  console.log(chalk.cyan('Inicializando PICURA CLI...'))

  try {
    await loadEnvironmentVariables()
    await setupDirectories()
    await initializeDatabaseConnection()
    await checkProjectConfiguration()
    await checkExternalDependencies()
    setupLogging()

    console.log(chalk.green('PICURA CLI inicializado y listo para usar.'))
  } catch (error) {
    console.error(chalk.red('Error durante la inicialización de PICURA CLI:'), error)
    process.exit(1)
  }
}

async function loadEnvironmentVariables() {
  const envPath = path.join(process.cwd(), '.env')
  if (await fs.pathExists(envPath)) {
    dotenv.config({ path: envPath })
    console.log(chalk.green('Variables de entorno cargadas desde .env'))
  } else {
    console.warn(chalk.yellow('Archivo .env no encontrado. Usando variables de entorno del sistema.'))
  }

  const requiredEnvVars = ['DATABASE_URL', 'API_KEY']
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Variable de entorno ${envVar} no está configurada.`)
    }
  }
}

async function setupDirectories() {
  const directories = [
    path.join(os.homedir(), '.picura'),
    path.join(os.homedir(), '.picura', 'logs'),
    path.join(os.homedir(), '.picura', 'cache')
  ]

  for (const dir of directories) {
    await fs.ensureDir(dir)
    console.log(chalk.green(`Directorio asegurado: ${dir}`))
  }
}

async function initializeDatabaseConnection() {
  prisma = new PrismaClient()
  try {
    await prisma.$connect()
    console.log(chalk.green('Conexión a la base de datos establecida.'))
  } catch (error) {
    console.error(chalk.red(`Error al conectar con la base de datos: ${error}`))
    prisma = undefined
  }
}

async function checkProjectConfiguration() {
  const configPath = path.join(process.cwd(), 'picura.config.json')
  if (await fs.pathExists(configPath)) {
    const config = await fs.readJson(configPath)
    console.log(chalk.green(`Configuración del proyecto cargada: ${JSON.stringify(config)}`))
  } else {
    console.warn(chalk.yellow('Archivo de configuración del proyecto no encontrado. Se usará la configuración por defecto.'))
  }
}

async function checkExternalDependencies() {
  try {
    const { execSync } = require('child_process')
    execSync('git --version', { stdio: 'ignore' })
    console.log(chalk.green('Git está instalado y disponible.'))
  } catch (error) {
    console.warn(chalk.yellow('Git no está instalado o no está disponible en el PATH.'))
  }
}

function setupLogging() {
  console.log(chalk.green('Sistema de logging configurado.'))
}

process.on('exit', () => {
  if (prisma) {
    prisma.$disconnect()
  }
})

export default hook