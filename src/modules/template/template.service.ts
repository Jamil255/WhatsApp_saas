import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from '../../database/entities/template.entity';
import { TemplateStatus } from '../../common/enums';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(Template) private readonly repo: Repository<Template>,
  ) {}

  async create(tenantId: string, data: Partial<Template>): Promise<Template> {
    return this.repo.save({ ...data, tenantId });
  }

  async findAll(tenantId: string): Promise<Template[]> {
    return this.repo.find({
      where: { tenantId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(tenantId: string, id: string): Promise<Template> {
    const tpl = await this.repo.findOne({
      where: { id, tenantId, isDeleted: false },
    });
    if (!tpl) throw new NotFoundException('Template not found.');
    return tpl;
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<Template>,
  ): Promise<Template> {
    const tpl = await this.findById(tenantId, id);
    Object.assign(tpl, data);
    return this.repo.save(tpl);
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.findById(tenantId, id);
    await this.repo.update({ id, tenantId }, { isDeleted: true });
  }

  async renderTemplate(
    templateId: string,
    variables: Record<string, string>,
  ): Promise<string> {
    const tpl = await this.repo.findOne({
      where: { id: templateId, status: TemplateStatus.ACTIVE },
    });
    if (!tpl) throw new NotFoundException('Template not found or not active.');

    let rendered = tpl.body;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return rendered;
  }
}
