import type { UmayRole } from './permissions';

export type UmayBranch = 'Tüm Şubeler' | 'İzmit' | 'Körfez';

export type UmayMembership = {
  userId: string;
  email: string;
  name: string;
  role: UmayRole;
  branch: UmayBranch;
  active: boolean;
};

export function isValidMembership(value: unknown): value is UmayMembership {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<UmayMembership>;
  return typeof item.userId === 'string' && item.userId.length > 0
    && typeof item.email === 'string' && item.email.includes('@')
    && typeof item.name === 'string' && item.name.trim().length > 0
    && ['Kurucu','Müdür','Danışman'].includes(item.role || '')
    && ['Tüm Şubeler','İzmit','Körfez'].includes(item.branch || '')
    && typeof item.active === 'boolean'
    && (item.role === 'Kurucu' ? item.branch === 'Tüm Şubeler' : item.branch !== 'Tüm Şubeler');
}

export function uiRole(role: UmayRole): 'Kurucu' | 'Şube Müdürü' | 'Satış Danışmanı' {
  return role === 'Müdür' ? 'Şube Müdürü' : role === 'Danışman' ? 'Satış Danışmanı' : 'Kurucu';
}

