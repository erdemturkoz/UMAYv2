import { nowIso } from "./time";

export type Archivable = {
  archivedAt?: string;
  archivedBy?: string;
};

export function isArchived(record: Archivable): boolean {
  return Boolean(record.archivedAt);
}

export function archiveRecord<T extends object>(
  record: T & Archivable,
  actor: string,
  archivedAt = nowIso(),
): T & Archivable {
  if (record.archivedAt) return record;
  return {...record, archivedAt, archivedBy: actor};
}

export function restoreRecord<T extends object>(record: T & Archivable): T & Archivable {
  if (!record.archivedAt && !record.archivedBy) return record;
  const restored = {...record};
  delete restored.archivedAt;
  delete restored.archivedBy;
  return restored;
}
