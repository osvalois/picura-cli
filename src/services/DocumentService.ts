import { PrismaClient, Document, DocumentType, DocumentVersion } from '@prisma/client';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { LoggingService } from './LoggingService';

export class DocumentService {
  private prisma: PrismaClient;
  private logger: LoggingService;

  constructor(logger: LoggingService) {
    this.prisma = new PrismaClient();
    this.logger = logger;
  }

  async createDocument(data: {
    title: string;
    type: DocumentType;
    projectId: string;
    content: string;
  }): Promise<Document & { versions: DocumentVersion[] }> {
    try {
      this.logger.info(`Creating new document: ${data.title}`);
      const document = await this.prisma.document.create({
        data: {
          title: data.title,
          type: data.type,
          projectId: data.projectId,
          versions: {
            create: {
              content: data.content,
              version: 1,
              externalAuthorId: process.env.USER || 'unknown',
              checksum: this.calculateChecksum(data.content),
            },
          },
        },
        include: { versions: true },
      });

      await this.saveDocumentToFile(document);
      this.logger.info(`Document created successfully`, { documentId: document.id });
      return document;
    } catch (error) {
      this.logger.error(`Failed to create document: ${data.title}`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async getDocumentById(id: string): Promise<(Document & { versions: DocumentVersion[] }) | null> {
    try {
      this.logger.info(`Fetching document by ID: ${id}`);
      const document = await this.prisma.document.findUnique({
        where: { id },
        include: { versions: true },
      });
      if (document) {
        this.logger.info(`Document found`, { documentId: document.id });
      } else {
        this.logger.warn(`Document not found for ID: ${id}`);
      }
      return document;
    } catch (error) {
      this.logger.error(`Failed to fetch document by ID: ${id}`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async getDocumentByTypeAndProject(type: DocumentType, projectId: string): Promise<(Document & { versions: DocumentVersion[] }) | null> {
    try {
      this.logger.info(`Fetching document by type and project`, { type, projectId });
      const document = await this.prisma.document.findFirst({
        where: {
          type,
          projectId
        },
        include: { versions: true }
      });
      if (document) {
        this.logger.info(`Document found`, { documentId: document.id });
      } else {
        this.logger.warn(`Document not found for type and project`, { type, projectId });
      }
      return document;
    } catch (error) {
      this.logger.error(`Failed to fetch document by type and project`, { error: error instanceof Error ? error.message : String(error), type, projectId });
      throw error;
    }
  }

  async updateDocument(id: string, newContent: string): Promise<Document & { versions: DocumentVersion[] }> {
    try {
      this.logger.info(`Updating document: ${id}`);
      const document = await this.getDocumentById(id);
      if (!document) {
        throw new Error('Document not found');
      }

      const latestVersion = Math.max(...document.versions.map(v => v.version));
      const updatedDocument = await this.prisma.document.update({
        where: { id },
        data: {
          versions: {
            create: {
              content: newContent,
              version: latestVersion + 1,
              externalAuthorId: process.env.USER || 'unknown',
              checksum: this.calculateChecksum(newContent),
            },
          },
        },
        include: { versions: true },
      });

      await this.saveDocumentToFile(updatedDocument);
      this.logger.info(`Document updated successfully`, { documentId: updatedDocument.id });
      return updatedDocument;
    } catch (error) {
      this.logger.error(`Failed to update document: ${id}`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      this.logger.info(`Deleting document: ${id}`);
      const document = await this.getDocumentById(id);
      if (!document) {
        throw new Error('Document not found');
      }

      await this.prisma.document.delete({ where: { id } });

      const project = await this.prisma.project.findUnique({ where: { id: document.projectId } });
      if (project) {
        const filePath = this.getDocumentFilePath(project, document);
        await fs.remove(filePath);
      }

      this.logger.info(`Document deleted successfully`, { documentId: id });
    } catch (error) {
      this.logger.error(`Failed to delete document: ${id}`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private async saveDocumentToFile(document: Document & { versions: DocumentVersion[] }): Promise<void> {
    const project = await this.prisma.project.findUnique({ where: { id: document.projectId } });
    if (!project) throw new Error('Project not found');

    const filePath = this.getDocumentFilePath(project, document);
    await fs.ensureDir(path.dirname(filePath));

    const latestVersion = document.versions.reduce((latest, current) => 
      current.version > latest.version ? current : latest
    );

    await fs.writeFile(filePath, latestVersion.content);
  }

  private getDocumentFilePath(project: any, document: Document): string {
    return path.join(project.path, 'docs', document.type.toLowerCase(), `${document.title}.md`);
  }

  private calculateChecksum(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }
}