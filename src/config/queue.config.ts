import { registerAs } from '@nestjs/config';

export default registerAs('queue', () => ({
  schema: process.env.QUEUE_SCHEMA || 'pgboss',
  monitorStateIntervalSeconds: parseInt(
    process.env.QUEUE_MONITOR_INTERVAL || '30',
    10,
  ),
  archiveCompletedAfterSeconds: parseInt(
    process.env.QUEUE_ARCHIVE_AFTER || '43200',
    10,
  ), // 12h
  deleteArchivedAfterSeconds: parseInt(
    process.env.QUEUE_DELETE_AFTER || '604800',
    10,
  ), // 7d
}));
