-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ARCHITECTURE', 'DATA_SCHEMA', 'DEPLOYMENT', 'API_SPECIFICATION', 'USER_MANUAL');

-- CreateEnum
CREATE TYPE "DeploymentEnvironment" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RollbackStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'DEPLOY', 'ROLLBACK', 'ANALYZE', 'AI_INTERACTION');

-- CreateEnum
CREATE TYPE "AnalysisType" AS ENUM ('STATIC', 'DYNAMIC', 'SECURITY', 'PERFORMANCE');

-- CreateTable
CREATE TABLE "picura_projects" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "repoUrl" VARCHAR(512),
    "path" VARCHAR(512) NOT NULL,
    "externalOwnerId" VARCHAR(128) NOT NULL,
    "externalCompanyId" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "secretKey" TEXT NOT NULL,

    CONSTRAINT "picura_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "picura_documents" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "type" "DocumentType" NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "picura_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "picura_document_versions" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "externalAuthorId" VARCHAR(128) NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checksum" VARCHAR(64) NOT NULL,

    CONSTRAINT "picura_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "picura_code_analyses" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "analysisDate" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "codeQualityScore" DOUBLE PRECISION NOT NULL,
    "securityScore" DOUBLE PRECISION NOT NULL,
    "performanceScore" DOUBLE PRECISION NOT NULL,
    "recommendations" JSONB NOT NULL,
    "rawAnalysisData" JSONB NOT NULL,
    "analysisType" "AnalysisType" NOT NULL,

    CONSTRAINT "picura_code_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "picura_deployments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "environment" "DeploymentEnvironment" NOT NULL,
    "status" "DeploymentStatus" NOT NULL,
    "deployedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deploymentLogs" TEXT NOT NULL,
    "rollbackStatus" "RollbackStatus",
    "externalDeployerId" VARCHAR(128) NOT NULL,

    CONSTRAINT "picura_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "picura_ai_assistants" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "model" VARCHAR(128) NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "picura_ai_assistants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "picura_ai_interactions" (
    "id" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "externalUserId" VARCHAR(128) NOT NULL,
    "query" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "feedbackRating" INTEGER,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "picura_ai_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "picura_audit_logs" (
    "id" TEXT NOT NULL,
    "externalUserId" VARCHAR(128) NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "picura_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "picura_projects_externalOwnerId_externalCompanyId_idx" ON "picura_projects"("externalOwnerId", "externalCompanyId");

-- CreateIndex
CREATE INDEX "picura_documents_projectId_type_idx" ON "picura_documents"("projectId", "type");

-- CreateIndex
CREATE INDEX "picura_document_versions_documentId_externalAuthorId_idx" ON "picura_document_versions"("documentId", "externalAuthorId");

-- CreateIndex
CREATE UNIQUE INDEX "picura_document_versions_documentId_version_key" ON "picura_document_versions"("documentId", "version");

-- CreateIndex
CREATE INDEX "picura_code_analyses_projectId_analysisDate_idx" ON "picura_code_analyses"("projectId", "analysisDate");

-- CreateIndex
CREATE INDEX "picura_deployments_projectId_environment_status_idx" ON "picura_deployments"("projectId", "environment", "status");

-- CreateIndex
CREATE INDEX "picura_ai_assistants_projectId_idx" ON "picura_ai_assistants"("projectId");

-- CreateIndex
CREATE INDEX "picura_ai_interactions_assistantId_externalUserId_idx" ON "picura_ai_interactions"("assistantId", "externalUserId");

-- CreateIndex
CREATE INDEX "picura_audit_logs_externalUserId_action_entityType_idx" ON "picura_audit_logs"("externalUserId", "action", "entityType");

-- AddForeignKey
ALTER TABLE "picura_documents" ADD CONSTRAINT "picura_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "picura_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "picura_document_versions" ADD CONSTRAINT "picura_document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "picura_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "picura_code_analyses" ADD CONSTRAINT "picura_code_analyses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "picura_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "picura_deployments" ADD CONSTRAINT "picura_deployments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "picura_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "picura_ai_assistants" ADD CONSTRAINT "picura_ai_assistants_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "picura_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "picura_ai_interactions" ADD CONSTRAINT "picura_ai_interactions_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "picura_ai_assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
