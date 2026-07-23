import {describe,expect,it} from 'vitest';
import {can,canAccessBranch,canReviseOffer} from './permissions';

describe('UMAY permission matrix',()=>{
  it('limits export to founder',()=>{
    expect(can('Kurucu','data:export')).toBe(true);
    expect(can('Müdür','data:export')).toBe(false);
    expect(can('Danışman','data:export')).toBe(false);
  });
  it('limits branch access outside founder role',()=>{
    expect(canAccessBranch('Kurucu','İzmit','Körfez')).toBe(true);
    expect(canAccessBranch('Müdür','İzmit','Körfez')).toBe(false);
  });
  it('allows a consultant to revise only their own non-terminal offer',()=>{
    const base={role:'Danışman' as const,userId:'u1',userBranch:'İzmit',offerBranch:'İzmit'};
    expect(canReviseOffer({...base,ownerId:'u1',status:'Taslak'})).toBe(true);
    expect(canReviseOffer({...base,ownerId:'u2',status:'Taslak'})).toBe(false);
    expect(canReviseOffer({...base,ownerId:'u1',status:'Kazanıldı'})).toBe(false);
  });
});
