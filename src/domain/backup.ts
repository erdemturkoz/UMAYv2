export const UMAY_BACKUP_SCHEMA_VERSION = 1;

export type UmayBackupRecord = { key: string; value: unknown; updatedAt: number };
export type UmayBackup = {
  schemaVersion: number;
  exportedAt: string;
  environment?: string;
  records: UmayBackupRecord[];
};

export type BackupValidation = { valid: boolean; errors: string[]; warnings: string[] };

export function validateUmayBackup(input: unknown): BackupValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!input || typeof input !== 'object') return { valid: false, errors: ['Yedek bir JSON nesnesi olmalıdır.'], warnings };
  const backup = input as Partial<UmayBackup>;
  if (backup.schemaVersion !== UMAY_BACKUP_SCHEMA_VERSION) errors.push(`Desteklenmeyen şema sürümü: ${String(backup.schemaVersion)}`);
  if (!backup.exportedAt || Number.isNaN(Date.parse(backup.exportedAt))) errors.push('Geçerli exportedAt alanı bulunamadı.');
  if (!Array.isArray(backup.records)) return { valid: false, errors: [...errors, 'records dizisi bulunamadı.'], warnings };
  const seen = new Set<string>();
  backup.records.forEach((record, index) => {
    if (!record || typeof record !== 'object') { errors.push(`records[${index}] geçersiz.`); return; }
    const item = record as Partial<UmayBackupRecord>;
    if (!item.key || typeof item.key !== 'string') errors.push(`records[${index}].key geçersiz.`);
    else if (seen.has(item.key)) warnings.push(`Tekrarlanan koleksiyon anahtarı: ${item.key}`);
    else seen.add(item.key);
    if (typeof item.updatedAt !== 'number' || !Number.isFinite(item.updatedAt)) errors.push(`records[${index}].updatedAt geçersiz.`);
    if (!Object.prototype.hasOwnProperty.call(item, 'value')) errors.push(`records[${index}].value eksik.`);
  });
  if (backup.records.length === 0) warnings.push('Yedek hiç kayıt içermiyor.');
  return { valid: errors.length === 0, errors, warnings };
}

