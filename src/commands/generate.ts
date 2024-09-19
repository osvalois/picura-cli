import { Command, Flags } from '@oclif/core';
import { DocumentService } from '../services/DocumentService.js';
import { ProjectService } from '../services/ProjectService.js';
import { AIService } from '../services/AIService.js';
import { DocumentType, AuditAction } from '@prisma/client';
import { LoggingService } from '../services/LoggingService.js';
import { AuditService } from '../services/AuditService.js';
import chalk from 'chalk';
import figlet from 'figlet';
import inquirer from 'inquirer';
export default class Generate extends Command {
  static description = 'Generate comprehensive project documentation with AI assistance';

  static flags = {
    type: Flags.string({
      char: 't',
      description: 'Type of document to generate',
      options: Object.values(DocumentType),
      required: true,
    }),
    project: Flags.string({
      char: 'p', 
      description: 'Project ID (optional if in project directory)',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Force regeneration if document already exists',
      default: false,
    }),
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

  async run(): Promise<void> {
    const { flags } = await this.parse(Generate);
    
    this.displayWelcomeMessage();

    this.log('Initializing document generation process...');

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

      this.log(chalk.green(`Project "${project.name}" found.`));

      const existingDocument = await this.documentService.getDocumentByTypeAndProject(
        flags.type as DocumentType,
        projectId
      );

      if (existingDocument && !flags.force) {
        this.logger.info(`Document of type ${flags.type} already exists.`, { documentId: existingDocument.id });
        this.log(chalk.yellow(`Document of type ${flags.type} already exists for this project.`));
        this.log(chalk.yellow(`Use --force flag to regenerate the document.`));
        return;
      }

      this.log('Analyzing project structure...');
      const projectStructure = await this.projectService.analyzeProjectStructure(project.path);
      this.logger.debug('Project structure analysis complete', { structureSize: JSON.stringify(projectStructure).length });
      this.log(chalk.green('Project structure analysis complete.'));

      this.displayProjectSummary(projectStructure);

      const proceed = await this.promptConfirmation('Do you want to proceed with document generation?');
      if (!proceed) {
        this.log(chalk.red('Document generation cancelled.'));
        return;
      }

      this.log(`Generating ${flags.type} document using AI...`);
      const content = await this.aiService.generateDocumentContent(flags.type as DocumentType, project.path);
      this.logger.debug(`${flags.type} document content generated`, { contentSize: content.length });
      this.log(chalk.green(`${flags.type.charAt(0).toUpperCase() + flags.type.slice(1)} document content generated.`));

      let document;
      if (existingDocument && flags.force) {
        this.log('Updating existing document...');
        document = await this.documentService.updateDocument(existingDocument.id, content);
        this.logger.info('Document updated', { documentId: document.id });
        this.log(chalk.green('Document updated successfully.'));
      } else {
        this.log('Creating new document...');
        document = await this.documentService.createDocument({
          title: `${project.name} - ${flags.type.charAt(0).toUpperCase() + flags.type.slice(1)}`,
          type: flags.type as DocumentType,
          projectId: project.id,
          content: content,
        });
        this.logger.info('New document created', { documentId: document.id });
        this.log(chalk.green('Document created successfully.'));
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

      this.displayDocumentSummary(document, project);

      this.logger.info('Document generation process completed successfully', { documentId: document.id });
      this.displaySuccessMessage();

    } catch (error) {
      this.logger.error('Document generation failed', { error: error instanceof Error ? error.message : String(error) });
      this.error(chalk.red(`Failed to generate document: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  private async promptConfirmation(message: string): Promise<boolean> {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.yellow(message),
      },
    ]);
    return confirm;
  }

  private displayWelcomeMessage(): void {
    this.log(
      chalk.cyan(
        figlet.textSync('DocuMentor AI', { horizontalLayout: 'full' })
      )
    );
    this.log(chalk.yellow('Welcome to the next-generation AI-powered documentation generator!\n'));
  }

  private displayProjectSummary(projectStructure: any): void {
    const fileCount = this.countFiles(projectStructure);
    const directoryCount = this.countDirectories(projectStructure);
    this.log(chalk.green('Project Summary'));
    this.log(chalk.white(`Total Files: ${fileCount}`));
    this.log(chalk.white(`Total Directories: ${directoryCount}`));
    this.log(chalk.white(`Main Directory: ${Object.keys(projectStructure)[0]}`));
  }

  private countFiles(structure: any): number {
    let count = 0;
    for (const key in structure) {
      if (typeof structure[key] === 'object' && structure[key] !== null) {
        count += this.countFiles(structure[key]);
      } else {
        count++;
      }
    }
    return count;
  }

  private countDirectories(structure: any): number {
    let count = 0;
    for (const key in structure) {
      if (typeof structure[key] === 'object' && structure[key] !== null) {
        count++;
        count += this.countDirectories(structure[key]);
      }
    }
    return count;
  }

  private displayDocumentSummary(document: any, project: any): void {
    this.log(chalk.cyan('Document Details'));
    this.log(chalk.white(`Title: ${document.title}`));
    this.log(chalk.white(`ID: ${document.id}`));
    this.log(chalk.white(`Type: ${document.type}`));
    this.log(chalk.white(`Path: ${project.path}/docs/${document.type.toLowerCase()}/${document.title}.md`));
  }

  private displaySuccessMessage(): void {
    this.log(
      chalk.green(
        figlet.textSync('Success!', { horizontalLayout: 'full' })
      )
    );
    this.log(chalk.yellow('Your AI-generated documentation is ready. Happy coding!\n'));
  }
}