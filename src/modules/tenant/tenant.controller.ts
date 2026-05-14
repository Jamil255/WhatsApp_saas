import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/create-tenant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { AuditService } from '../admin/audit.service';
import express from 'express';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create tenant',
    description:
      'Provision a new tenant with admin user and API credentials. Super admin only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tenant created with admin user and API keys',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or duplicate slug',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — super admin only' })
  async create(@Body() dto: CreateTenantDto, @Req() req: express.Request) {
    const result = await this.tenantService.create(dto);
    await this.auditService.log({
      userId: (req as any).user?.sub,
      action: 'tenant.create',
      resourceType: 'tenant',
      resourceId: result.tenant.id,
      newValues: { companyName: dto.companyName, plan: dto.plan },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'List all tenants',
    description: 'Retrieve all tenants. Super admin only.',
  })
  @ApiResponse({ status: 200, description: 'List of all tenants' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get tenant by ID',
    description: 'Retrieve a specific tenant by UUID.',
  })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findById(@Param('id') id: string) {
    return this.tenantService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update tenant',
    description:
      'Update tenant details like company name, plan, or rate limits.',
  })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @Req() req: express.Request,
  ) {
    const result = await this.tenantService.update(id, dto);
    await this.auditService.log({
      userId: (req as any).user?.sub,
      action: 'tenant.update',
      resourceType: 'tenant',
      resourceId: id,
      newValues: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Post(':id/suspend')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Suspend tenant',
    description: 'Suspend a tenant — disables API access and messaging.',
  })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Tenant suspended' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async suspend(@Param('id') id: string, @Req() req: express.Request) {
    const result = await this.tenantService.suspend(id);
    await this.auditService.log({
      userId: (req as any).user?.sub,
      action: 'tenant.suspend',
      resourceType: 'tenant',
      resourceId: id,
      newValues: { status: 'suspended' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Post(':id/activate')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Activate tenant',
    description: 'Re-activate a suspended tenant.',
  })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Tenant activated' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async activate(@Param('id') id: string, @Req() req: express.Request) {
    const result = await this.tenantService.activate(id);
    await this.auditService.log({
      userId: (req as any).user?.sub,
      action: 'tenant.activate',
      resourceType: 'tenant',
      resourceId: id,
      newValues: { status: 'active' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete tenant',
    description: 'Soft-delete a tenant. Data is preserved but inaccessible.',
  })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({ status: 204, description: 'Tenant deleted' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async remove(@Param('id') id: string, @Req() req: express.Request) {
    await this.tenantService.softDelete(id);
    await this.auditService.log({
      userId: (req as any).user?.sub,
      action: 'tenant.delete',
      resourceType: 'tenant',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
