import {describe,expect,it} from 'vitest';
import {isValidMembership,uiRole} from './membership';

describe('membership',()=>{
  it('requires founder to have all-branch access',()=>{
    expect(isValidMembership({userId:'u1',email:'owner@example.com',name:'Owner',role:'Kurucu',branch:'Tüm Şubeler',active:true})).toBe(true);
    expect(isValidMembership({userId:'u1',email:'owner@example.com',name:'Owner',role:'Kurucu',branch:'İzmit',active:true})).toBe(false);
  });
  it('does not allow managers or advisors to escape their branch',()=>{
    expect(isValidMembership({userId:'u2',email:'manager@example.com',name:'Manager',role:'Müdür',branch:'İzmit',active:true})).toBe(true);
    expect(isValidMembership({userId:'u3',email:'advisor@example.com',name:'Advisor',role:'Danışman',branch:'Tüm Şubeler',active:true})).toBe(false);
  });
  it('maps backend roles to existing UI labels',()=>{
    expect(uiRole('Kurucu')).toBe('Kurucu');
    expect(uiRole('Müdür')).toBe('Şube Müdürü');
    expect(uiRole('Danışman')).toBe('Satış Danışmanı');
  });
});
