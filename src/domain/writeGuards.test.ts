import {describe,expect,it} from 'vitest';
import {describeCollectionChanges,requestFingerprint,validateCollectionIdentity,validateNoPhysicalDelete} from './writeGuards';

describe('backend write guards',()=>{
 it('rejects duplicate ids and candidate phones, including archived candidates',()=>{
  expect(validateCollectionIdentity('offers',[{id:'1'},{id:'1'}])).toContain('Duplicate');
  expect(validateCollectionIdentity('candidates',[{id:'1',phone:'0532 000 00 00'},{id:'2',phone:'+90 532 000 00 00',archivedAt:'2026-01-01'}])).toContain('Duplicate candidate phone');
 });
 it('requires candidates and offers to use archive instead of physical deletion',()=>{
  expect(validateNoPhysicalDelete('candidates',[{id:'1'}],[])).toContain('archived instead of deleted');
  expect(validateNoPhysicalDelete('campaigns',[{id:'1'}],[])).toBeNull();
 });
 it('keeps archived phones reserved and rejects a conflicting restore snapshot',()=>{
  const archived={id:'1',phone:'0532 111 22 33',archivedAt:'2026-07-23T00:00:00.000Z'};
  const active={id:'2',phone:'+90 532 111 22 33'};
  expect(validateCollectionIdentity('candidates',[archived,active])).toContain('Duplicate candidate phone');
  expect(validateCollectionIdentity('candidates',[{...archived,archivedAt:undefined},active])).toContain('Duplicate candidate phone');
 });
 it('describes archive, restore and offer status audit events',()=>{
  expect(describeCollectionChanges('candidates',[{id:'1'}],[{id:'1',archivedAt:'now'}])[0].action).toBe('candidates.archive');
  expect(describeCollectionChanges('candidates',[{id:'1',archivedAt:'then'}],[{id:'1'}])[0].action).toBe('candidates.restore');
  expect(describeCollectionChanges('offers',[{id:'1',status:'Taslak'}],[{id:'1',status:'Paylaşıldı'}])[0]).toMatchObject({action:'offers.status_change',metadata:{from:'Taslak',to:'Paylaşıldı'}});
 });
 it('creates stable request fingerprints',()=>{expect(requestFingerprint('offers',[{id:'1'}])).toBe(requestFingerprint('offers',[{id:'1'}]));expect(requestFingerprint('offers',[{id:'1'}])).not.toBe(requestFingerprint('offers',[{id:'2'}]))});
});
