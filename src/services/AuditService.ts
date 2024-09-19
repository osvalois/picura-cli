import { PrismaClient, AuditAction } from '@prisma/client';
import { LoggingService } from './LoggingService.js';

export class AuditService {
  private prisma: PrismaClient;
  private logger: LoggingService;

  constructor(logger: LoggingService) {
    this.prisma = new PrismaClient();
    this.logger = logger;
  }

  async logAudit(data: {
    action: AuditAction;
    userId: string;
    entityType: string;
    entityId: string;
    details: any;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: data.action,
          externalUserId: data.userId,
          entityType: data.entityType,
          entityId: data.entityId,
          details: data.details,
          timestamp: new Date(),
        },
      });
      this.logger.info(`Audit log created`, { action: data.action, entityId: data.entityId });
    } catch (error) {
      this.logger.error(`Failed to create audit log`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  async getAuditLogs(entityId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      const where: any = { entityId };
      if (startDate) where.timestamp = { gte: startDate };
      if (endDate) where.timestamp = { ...where.timestamp, lte: endDate };

      const logs = await this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
      });

      this.logger.info(`Audit logs retrieved`, { entityId, count: logs.length });
      return logs;
    } catch (error) {
      this.logger.error(`Failed to retrieve audit logs`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}