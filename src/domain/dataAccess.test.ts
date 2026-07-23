import {describe,expect,it} from 'vitest';
import {filterCollectionForActor,mergeScopedCollection,validateScopedWrite} from './dataAccess';

const founder={userId:'f1',email:'f@x.com',name:'Erdem',role:'Kurucu' as const,branch:'Tüm Şubeler' as const,active:true};
const manager={userId:'m1',email:'m@x.com',name:'Dilek',role:'Müdür' as const,branch:'İzmit' as const,active:true};
const advisor={userId:'a1',email:'a@x.com',name:'Ayşenur Kaya',role:'Danışman' as const,branch:'İzmit' as const,active:true};
const rows=[{id:'1',branch:'İzmit',ownerId:'a1'},{id:'2',branch:'İzmit',owner:'Başka Danışman'},{id:'3',branch:'Körfez',ownerId:'a1'}];

describe('backend data scope policy',()=>{
 it('keeps founder scope complete and manager scope branch-bound',()=>{
  expect(filterCollectionForActor(founder,'candidates',rows)).toHaveLength(3);
  expect(filterCollectionForActor(manager,'candidates',rows)).toHaveLength(2);
 });
 it('limits advisors to assigned records with legacy name support',()=>{
  expect(filterCollectionForActor(advisor,'candidates',rows)).toEqual([rows[0]]);
  expect(filterCollectionForActor(advisor,'offers',[{id:'4',branch:'İzmit',owner:'Ayşenur Kaya'}])).toHaveLength(1);
 });
 it('rejects cross-branch mutation and protected collection writes',()=>{
  expect(validateScopedWrite(manager,'candidates',[...rows,{id:'4',branch:'Körfez'}],rows)).toBeTruthy();
 expect(validateScopedWrite(advisor,'campaigns',[],[])).toBeTruthy();
 });
 it('preserves records outside the actor scope when a filtered collection is saved',()=>{
  expect(mergeScopedCollection(manager,'candidates',[{id:'1',branch:'İzmit',ownerId:'a1',name:'new'}],rows)).toEqual([rows[2],{id:'1',branch:'İzmit',ownerId:'a1',name:'new'}]);
 });
});
