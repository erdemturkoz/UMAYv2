export type UmayRole = 'Kurucu' | 'Müdür' | 'Danışman';
export type UmayAction =
  | 'branches:view-all'
  | 'candidates:view-branch'
  | 'candidates:view-assigned'
  | 'offers:revise-branch'
  | 'offers:revise-own'
  | 'offers:override-won'
  | 'data:export'
  | 'campaigns:manage';

const permissions: Record<UmayRole, readonly UmayAction[]> = {
  Kurucu: ['branches:view-all','candidates:view-branch','candidates:view-assigned','offers:revise-branch','offers:revise-own','offers:override-won','data:export','campaigns:manage'],
  Müdür: ['candidates:view-branch','candidates:view-assigned','offers:revise-branch','offers:revise-own','campaigns:manage'],
  Danışman: ['candidates:view-assigned','offers:revise-own'],
};

export function can(role: UmayRole, action: UmayAction): boolean {
  return permissions[role].includes(action);
}

export function canAccessBranch(role: UmayRole, userBranch: string, recordBranch: string): boolean {
  return role === 'Kurucu' || userBranch === recordBranch;
}

export function canReviseOffer(input: {
  role: UmayRole;
  userId: string;
  userBranch: string;
  ownerId?: string;
  offerBranch: string;
  status: string;
}): boolean {
  if (['Kazanıldı','WON','Revize edildi','SUPERSEDED'].includes(input.status)) return input.role === 'Kurucu' && can(input.role,'offers:override-won');
  if (input.role === 'Kurucu') return true;
  if (!canAccessBranch(input.role,input.userBranch,input.offerBranch)) return false;
  if (input.role === 'Müdür') return can(input.role,'offers:revise-branch');
  return input.ownerId === input.userId && can(input.role,'offers:revise-own');
}

