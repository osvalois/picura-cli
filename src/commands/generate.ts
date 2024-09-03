//generate.ts

import { Command } from '@oclif/core'
import { Flags } from '@oclif/core'
import chalk from 'chalk'
import ora from 'ora';
import type { Ora } from 'ora';

import fs from 'fs-extra'
import path from 'path'

import { ProjectService } from '../services/ProjectService.js'
import { AIService } from '../services/AIService.js'
import { LoggingService } from '../services/LoggingService.js'
import { AuditService } from '../services/AuditService.js'
import { DocumentType, AuditAction } from '@prisma/client'
import { DocumentService } from '../services/DocumentService.js';

export default class Generate extends Command {
  static description = 'Generate comprehensive and high-quality project documentation'

  static flags = {
    type: Flags.string({
      char: 't',
      description: 'Type of document to generate',
      options: Object.values(DocumentType),
      required: true
    }),
    project: Flags.string({
      char: 'p', 
      description: 'Project ID (optional if in a PICURA project directory)',
      required: false
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Force regeneration if the document already exists',
      default: false
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output directory for generated documents',
      default: './docs'
    })
  }

  private documentService: DocumentService
  private projectService: ProjectService
  private aiService: AIService
  private logger: LoggingService
  private auditService: AuditService

  constructor(argv: string[], config: any) {
    super(argv, config)
    this.logger = new LoggingService(process.cwd())
    this.documentService = new DocumentService()
    this.projectService = new ProjectService(this.logger)
    this.aiService = new AIService(this.logger)
    this.auditService = new AuditService(this.logger)
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Generate)
    const spinner = ora('Initializing document generation process...').start()

    try {
      const projectId = await this.getProjectId(flags.project)
      const project = await this.getProject(projectId)

      this.logger.info(`Starting document generation for project: ${project.name}`, { projectId, documentType: flags.type })
      spinner.succeed(chalk.green(`Project "${project.name}" found.`))

      const existingDocument = await this.checkExistingDocument(flags.type as DocumentType, projectId, flags.force)

      spinner.text = 'Analyzing project structure...'
      const projectStructure = await this.projectService.analyzeProjectStructure(project.path)
      this.logger.debug('Project structure analysis completed', { structureSize: JSON.stringify(projectStructure).length })
      spinner.succeed(chalk.green('Project structure analysis completed.'))

      spinner.text = `Generating ${flags.type} document using AI...`
      const { md: content, pdf: pdfBuffer } = await this.aiService.generateDocumentContent(flags.type as DocumentType, project.path)
      this.logger.debug(`${flags.type} document content generated`, { contentSize: content.length })
      spinner.succeed(chalk.green(`${flags.type} document content generated.`))

      const document = await this.saveDocument(existingDocument, flags, project, content)

      await this.saveFiles(flags, document, content, pdfBuffer)
      await this.logAudit(existingDocument, flags, document)

      this.displayDocumentDetails(document, flags.output)

      this.logger.info('Document generation process completed successfully', { documentId: document.id })
      this.logToConsole(chalk.green('\nDocument generation process completed successfully.'))

    } catch (error) {
      this.handleError(spinner, error)
    }
  }

  private async getProjectId(flagProject: string | undefined): Promise<string> {
    const projectId = flagProject || await this.projectService.getProjectIdFromCurrentDirectory()
    if (!projectId) {
      throw new Error('No project specified and not in a PICURA project directory.')
    }
    return projectId
  }

  private async getProject(projectId: string) {
    const project = await this.projectService.getProjectById(projectId)
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`)
    }
    return project
  }

  private async checkExistingDocument(type: DocumentType, projectId: string, force: boolean) {
    const existingDocument = await this.documentService.getDocumentByTypeAndProject(type, projectId)
    if (existingDocument && !force) {
      this.logger.info(`Document of type ${type} already exists.`, { documentId: existingDocument.id })
      this.logToConsole(chalk.yellow(`Document of type ${type} already exists for this project.`))
      this.logToConsole(chalk.yellow(`Use the --force flag to regenerate the document.`))
      return process.exit(0)
    }
    return existingDocument
  }

  private async saveDocument(existingDocument: any, flags: any, project: any, content: string) {
    if (existingDocument && flags.force) {
      return await this.documentService.updateDocument(existingDocument.id, content)
    } else {
      return await this.documentService.createDocument({
        title: `${project.name} - ${flags.type.charAt(0).toUpperCase() + flags.type.slice(1)}`,
        type: flags.type as DocumentType,
        projectId: project.id,
        content: content,
      })
    }
  }

  private async saveFiles(flags: any, document: any, content: string, pdfBuffer: Buffer) {
    const outputDir = path.join(flags.output, flags.type.toLowerCase())
    await fs.ensureDir(outputDir)
    
    const mdFilePath = path.join(outputDir, `${document.title}.md`)
    const pdfFilePath = path.join(outputDir, `${document.title}.pdf`)
    
    await fs.writeFile(mdFilePath, content)
    await fs.writeFile(pdfFilePath, pdfBuffer)
  }

  private async logAudit(existingDocument: any, flags: any, document: any) {
    await this.auditService.logAudit({
      action: existingDocument && flags.force ? AuditAction.UPDATE : AuditAction.CREATE,
      userId: process.env.USER || 'unknown',
      entityType: 'Document',
      entityId: document.id,
      details: {
        documentId: document.id,
        documentType: flags.type,
        force: flags.force,
      },
    })
  }

  private displayDocumentDetails(document: any, outputDir: string) {
    this.logToConsole(chalk.cyan(`\nDocument Details:`))
    this.logToConsole(chalk.cyan(`- Title: ${document.title}`))
    this.logToConsole(chalk.cyan(`- ID: ${document.id}`))
    this.logToConsole(chalk.cyan(`- Type: ${document.type}`))
    this.logToConsole(chalk.cyan(`- MD Path: ${path.join(outputDir, document.type.toLowerCase(), `${document.title}.md`)}`))
    this.logToConsole(chalk.cyan(`- PDF Path: ${path.join(outputDir, document.type.toLowerCase(), `${document.title}.pdf`)}`))
  }

  private handleError(spinner: Ora, error: unknown) {
    spinner.fail(chalk.red('Document generation failed.'))
    this.logger.error('Document generation failed', { error: error instanceof Error ? error.message : String(error) })
    this.logToConsole(chalk.red(`Error generating document: ${error instanceof Error ? error.message : String(error)}`))
  }

  private logToConsole(message: string) {
    console.log(message)
  }
}