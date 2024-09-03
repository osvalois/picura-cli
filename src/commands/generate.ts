import { Command, Flags } from '@oclif/core';
import { DocumentService } from '../services/DocumentService';
import { ProjectService } from '../services/ProjectService';
import { AIService } from '../services/AIService';
import { DocumentType, AuditAction } from '@prisma/client';
import { LoggingService } from '../services/LoggingService';
import { AuditService } from '../services/AuditService';
import chalk from 'chalk';
import ora from 'ora';

export default class Generate extends Command {
  static description = 'Generate comprehensive project documentation';

  static flags = {
    type: Flags.string({
      char: 't',
      description: 'Type of document to generate',
      options: Object.values(DocumentType),
      required: true
    }),
    project: Flags.string({
      char: 'p', 
      description: 'Project ID (optional if in project directory)'
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Force regeneration if document already exists',
      default: false
    })
  };

  private documentService: DocumentService;
  private projectService: ProjectService;
  private aiService: AIService;
  private logger: LoggingService;
  private auditService: AuditService;

  constructor(argv: string[], config: any) {
    super(argv, config);
    this.logger = new LoggingService(process.cwd());
    this.documentService = new DocumentService(this.logger);
    this.projectService = new ProjectService(this.logger);
    this.aiService = new AIService(this.logger);
    this.auditService = new AuditService(this.logger);
  }

  async run() {
    const { flags } = await this.parse(Generate);
    const spinner = ora('Initializing document generation process...').start();

    try {
      const projectId = flags.project || await this.projectService.getProjectIdFromCurrentDirectory();
      if (!projectId) {
        throw new Error('No project specified and not in a PICURA project directory.');
      }

      const project = await this.projectService.getProjectById(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found.`);
      }

      this.logger.info(`Starting document generation for project: ${project.name}`, { projectId, documentType: flags.type });

      spinner.succeed(chalk.green(`Project "${project.name}" found.`));

      const existingDocument = await this.documentService.getDocumentByTypeAndProject(
        flags.type as DocumentType,
        projectId
      );

      if (existingDocument && !flags.force) {
        this.logger.info(`Document of type ${flags.type} already exists.`, { documentId: existingDocument.id });
        spinner.info(chalk.yellow(`Document of type ${flags.type} already exists for this project.`));
        spinner.info(chalk.yellow(`Use --force flag to regenerate the document.`));
        this.exit(0);
      }

      spinner.text = 'Analyzing project structure...';
      const projectStructure = await this.projectService.analyzeProjectStructure(project.path);
      this.logger.debug('Project structure analysis complete', { structureSize: JSON.stringify(projectStructure).length });
      spinner.succeed(chalk.green('Project structure analysis complete.'));

      spinner.text = `Generating ${flags.type} document using AI...`;
      const content = await this.aiService.generateDocumentContent(flags.type as DocumentType, projectStructure);
      this.logger.debug(`${flags.type} document content generated`, { contentSize: content.length });
      spinner.succeed(chalk.green(`${flags.type.charAt(0).toUpperCase() + flags.type.slice(1)} document content generated.`));

      let document;
      if (existingDocument && flags.force) {
        spinner.text = 'Updating existing document...';
        document = await this.documentService.updateDocument(existingDocument.id, content);
        this.logger.info('Document updated', { documentId: document.id });
        spinner.succeed(chalk.green('Document updated successfully.'));
      } else {
        spinner.text = 'Creating new document...';
        document = await this.documentService.createDocument({
          title: `${project.name} - ${flags.type.charAt(0).toUpperCase() + flags.type.slice(1)}`,
          type: flags.type as DocumentType,
          projectId: project.id,
          content: content,
        });
        this.logger.info('New document created', { documentId: document.id });
        spinner.succeed(chalk.green('Document created successfully.'));
      }

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
      });

      this.log(chalk.cyan(`\nDocument Details:`));
      this.log(chalk.cyan(`- Title: ${document.title}`));
      this.log(chalk.cyan(`- ID: ${document.id}`));
      this.log(chalk.cyan(`- Type: ${document.type}`));
      this.log(chalk.cyan(`- Path: ${project.path}/docs/${flags.type.toLowerCase()}/${document.title}.md`));

      this.logger.info('Document generation process completed successfully', { documentId: document.id });
      this.log(chalk.green('\nDocument generation process completed successfully.'));

    } catch (error) {
      spinner.fail(chalk.red('Document generation failed.'));
      this.logger.error('Document generation failed', { error: error instanceof Error ? error.message : String(error) });
      this.error(chalk.red(`Failed to generate document: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
}