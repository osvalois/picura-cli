//DocumentGenerator.ts
import { format } from 'date-fns';
import { DocumentType } from '@prisma/client'; 

export class DocumentGenerator {
  private readonly basePrompt: string;

  constructor() {
    this.basePrompt = 'You are a world-class expert in software development and documentation. Your task is to create an extremely detailed, comprehensive, and high-quality document that follows international standards and best practices. The document should be thorough, precise, and cover all relevant aspects in depth. Use professional language, provide concrete examples, and ensure the document is well-structured and easy to navigate.';
  }

  public getSystemPromptForDocumentType(type: DocumentType): string {
    const prompts: Record<DocumentType, string> = {
      [DocumentType.ARCHITECTURE]: `
        ${this.basePrompt} Generate a software architecture document that includes:
        1. Executive Summary
        2. Introduction and Goals
        3. System Stakeholders and Concerns
        4. System Context and Scope
        5. Solution Strategy
        6. Building Block View (from context to components)
        7. Runtime View (important scenarios)
        8. Deployment View
        9. Cross-cutting Concepts
        10. Architectural Decisions
        11. Quality Requirements
        12. Risks and Technical Debt
        13. Glossary
        Use diagrams (described in text) where appropriate. Follow the ISO/IEC/IEEE 42010 standard for architecture description.
      `,
      [DocumentType.DATA_SCHEMA]: `
        ${this.basePrompt} Create a comprehensive data schema document that includes:
        1. Executive Summary
        2. Data Model Overview
        3. Entity-Relationship Diagrams (described in text)
        4. Detailed Entity Descriptions
        5. Attribute Definitions and Data Types
        6. Relationships and Cardinalities
        7. Indexing Strategy
        8. Data Integrity Constraints
        9. Normalization Level and Justification
        10. Data Migration and Evolution Strategy
        11. Performance Considerations
        12. Security and Access Control
        13. Backup and Recovery Strategies
        14. Glossary of Terms
        Provide example SQL schemas where appropriate. Adhere to ISO/IEC 11179 for data element standardization.
      `,
      [DocumentType.API_SPECIFICATION]: `
        ${this.basePrompt} Develop a complete API specification that includes:
        1. Executive Summary
        2. Introduction and Objectives
        3. API Overview
        4. Authentication and Authorization
        5. Detailed Endpoints
           - HTTP Method
           - Path
           - Request Parameters
           - Request Body
           - Responses (status codes and bodies)
           - Request and Response Examples
        6. Error Handling and Status Codes
        7. Rate Limiting and Quotas
        8. Versioning
        9. Best Practices for Usage
        10. Security Considerations
        11. Performance and Optimization
        12. Appendices (code examples, use cases)
        Follow OpenAPI 3.0 specifications and provide examples in YAML or JSON format.
      `,
      [DocumentType.USER_MANUAL]: `
        ${this.basePrompt} Write a comprehensive user manual that includes:
        1. Introduction to the Software
        2. System Requirements
        3. Installation and Configuration
        4. Getting Started
        5. User Interface
        6. Main Features (detailed step-by-step)
        7. Advanced Settings
        8. Troubleshooting Common Issues
        9. Frequently Asked Questions
        10. Glossary of Terms
        11. Appendices (keyboard shortcuts, additional resources)
        Include descriptions of screenshots or diagrams where appropriate. Follow ISO/IEC/IEEE 26511:2018 guidelines for technical documentation.
      `,
      [DocumentType.DEPLOYMENT]: `
        ${this.basePrompt} Create a detailed deployment plan that includes:
        1. Executive Summary
        2. Deployment Objectives
        3. System Architecture
        4. Infrastructure Requirements
        5. Environment Preparation
           - Server Configuration
           - Dependency Installation
           - Network Configuration
        6. Build Process
        7. Step-by-Step Deployment Procedure
        8. Post-Deployment Configuration
        9. Verification Tests
        10. Monitoring and Logging
        11. Rollback Procedures
        12. Security Considerations
        13. Maintenance Plan
        14. Appendices (scripts, checklists)
        Include necessary commands and scripts. Follow DevOps best practices and Continuous Integration/Continuous Deployment (CI/CD) principles.
      `,
    };

    return prompts[type] || `Unsupported document type: ${type}`;
  }

  public formatGeneratedContent(type: DocumentType, content: string): string {
    const title = `# ${type}\n\n`;
    const metadata = `
---
title: ${type}
author: PICURA AI Service
date: ${format(new Date(), 'yyyy-MM-dd')}
version: 1.0
---

`;
    const toc = '## Table of Contents\n\n';

    const headers = content.match(/^##?\s.+$/gm) || [];
    const tocContent = headers.map(header => {
      const level = header.startsWith('##') ? 2 : 1;
      const text = header.replace(/^##?\s/, '');
      const link = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return `${'  '.repeat(level - 1)}- [${text}](#${link})`;
    }).join('\n');

    const footer = `

---

*This document was automatically generated by PICURA AI Service. Last updated: ${new Date().toLocaleString()}*
`;

    return `${metadata}${title}${toc}${tocContent}\n\n${content}${footer}`;
  }
}
