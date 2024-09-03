//DocumentService.ts
import { PrismaClient } from '@prisma/client';
import type { Document, DocumentType, DocumentVersion, Project } from '@prisma/client';

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

export class DocumentService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createDocument(data: {
    title: string;
    type: DocumentType;
    projectId: string;
    content: string;
  }): Promise<Document & { versions: DocumentVersion[] }> {
    try {
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
      return document;
    } catch (error) {
      console.error('Error creating document:', error);
      throw new Error('Failed to create document');
    }
  }

  async getDocumentById(id: string): Promise<(Document & { versions: DocumentVersion[] }) | null> {
    try {
      return await this.prisma.document.findUnique({
        where: { id },
        include: { versions: true },
      });
    } catch (error) {
      console.error('Error fetching document:', error);
      throw new Error('Failed to fetch document');
    }
  }

  async getDocumentByTypeAndProject(type: DocumentType, projectId: string): Promise<(Document & { versions: DocumentVersion[] }) | null> {
    try {
      return await this.prisma.document.findFirst({
        where: { type, projectId },
        include: { versions: true },
      });
    } catch (error) {
      console.error('Error fetching document by type and project:', error);
      throw new Error('Failed to fetch document by type and project');
    }
  }

  async updateDocument(id: string, newContent: string): Promise<Document & { versions: DocumentVersion[] }> {
    try {
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
      return updatedDocument;
    } catch (error) {
      console.error('Error updating document:', error);
      throw new Error('Failed to update document');
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      const document = await this.getDocumentById(id);
      if (!document) {
        throw new Error('Document not found');
      }

      await this.prisma.document.delete({ where: { id } });

      const project = await this.getProjectById(document.projectId);
      if (project) {
        const filePath = this.getDocumentFilePath(project, document);
        await fs.remove(filePath);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error('Failed to delete document');
    }
  }

  private async saveDocumentToFile(document: Document & { versions: DocumentVersion[] }): Promise<void> {
    try {
      const project = await this.getProjectById(document.projectId);
      if (!project) throw new Error('Project not found');

      const filePath = this.getDocumentFilePath(project, document);
      await fs.ensureDir(path.dirname(filePath));

      const latestVersion = document.versions.reduce((latest, current) => 
        current.version > latest.version ? current : latest
      );

      await fs.writeFile(filePath, latestVersion.content);
    } catch (error) {
      console.error('Error saving document to file:', error);
      throw new Error('Failed to save document to file');
    }
  }

  private getDocumentFilePath(project: Project, document: Document): string {
    return path.join(project.path, 'docs', document.type.toLowerCase(), `${document.title}.md`);
  }

  private async getProjectById(id: string): Promise<Project | null> {
    try {
      return await this.prisma.project.findUnique({ where: { id } });
    } catch (error) {
      console.error('Error fetching project:', error);
      throw new Error('Failed to fetch project');
    }
  }

  private calculateChecksum(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }
}