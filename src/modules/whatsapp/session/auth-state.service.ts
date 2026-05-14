import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppSession } from '../../../database/entities/whatsapp-session.entity';
import { WhatsAppSessionKey } from '../../../database/entities/whatsapp-session-key.entity';
import { initAuthCreds, proto, BufferJSON } from '@whiskeysockets/baileys';

@Injectable()
export class AuthStateService {
  private readonly logger = new Logger(AuthStateService.name);

  constructor(
    @InjectRepository(WhatsAppSession)
    private readonly sessionRepo: Repository<WhatsAppSession>,
    @InjectRepository(WhatsAppSessionKey)
    private readonly keyRepo: Repository<WhatsAppSessionKey>,
  ) {}

  async getAuthState(tenantId: string) {
    const session = await this.sessionRepo.findOne({ where: { tenantId } });

    let creds: any;
    if (session?.creds) {
      creds = JSON.parse(JSON.stringify(session.creds), BufferJSON.reviver);
    } else {
      creds = initAuthCreds();
    }

    const state = {
      creds,
      keys: {
        get: async (type: string, ids: string[]) => {
          const result: Record<string, any> = {};
          if (ids.length === 0) return result;

          const rows = await this.keyRepo
            .createQueryBuilder('key')
            .where(
              'key.session_id = (SELECT id FROM whatsapp_sessions WHERE tenant_id = :tenantId)',
              { tenantId },
            )
            .andWhere('key.category = :type', { type })
            .andWhere('key.key_id IN (:...ids)', { ids })
            .getMany();

          for (const row of rows) {
            try {
              result[row.keyId] = JSON.parse(
                JSON.stringify(row.keyData),
                BufferJSON.reviver,
              );
            } catch {
              result[row.keyId] = row.keyData;
            }
          }
          return result;
        },
        set: async (data: Record<string, Record<string, any>>) => {
          const sessionRecord = await this.sessionRepo.findOne({
            where: { tenantId },
          });
          if (!sessionRecord) return;

          for (const [category, entries] of Object.entries(data)) {
            for (const [id, value] of Object.entries(entries)) {
              if (value) {
                const serialized = JSON.parse(
                  JSON.stringify(value, BufferJSON.replacer),
                );
                await this.keyRepo
                  .createQueryBuilder()
                  .insert()
                  .into(WhatsAppSessionKey)
                  .values({
                    sessionId: sessionRecord.id,
                    category,
                    keyId: id,
                    keyData: serialized,
                  })
                  .orUpdate(['key_data'], ['session_id', 'category', 'key_id'])
                  .execute();
              } else {
                await this.keyRepo
                  .createQueryBuilder()
                  .delete()
                  .where(
                    'session_id = :sessionId AND category = :category AND key_id = :keyId',
                    {
                      sessionId: sessionRecord.id,
                      category,
                      keyId: id,
                    },
                  )
                  .execute();
              }
            }
          }
        },
      },
    };

    const saveCreds = async () => {
      const serialized = JSON.parse(
        JSON.stringify(state.creds, BufferJSON.replacer),
      );
      await this.sessionRepo
        .createQueryBuilder()
        .update()
        .set({ creds: serialized })
        .where('tenant_id = :tenantId', { tenantId })
        .execute();
    };

    return { state, saveCreds };
  }

  async clearAuthState(tenantId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { tenantId } });
    if (session) {
      await this.keyRepo.delete({ sessionId: session.id });
      await this.sessionRepo.update(session.id, { creds: null } as any);
    }
  }
}
