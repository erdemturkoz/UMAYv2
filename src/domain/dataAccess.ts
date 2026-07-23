import type {UmayMembership} from './membership';

export type ScopedRecord={branch?:unknown;owner?:unknown;ownerId?:unknown;advisor?:unknown;advisorId?:unknown};

const GLOBAL_BRANCH='Tüm Şubeler';
const BRANCH_SCOPED=new Set(['candidates','offers','campaigns','cardRules','noteRules']);
const FOUNDER_WRITE_ONLY=new Set(['education','archivedCampaignIds']);
const MANAGER_WRITE=new Set(['campaigns','cardRules','noteRules']);

export function canReadCollection(_:UmayMembership,key:string){return Boolean(key)}
export function canWriteCollection(actor:UmayMembership,key:string){
 if(actor.role==='Kurucu')return true;
 if(FOUNDER_WRITE_ONLY.has(key))return false;
 if(MANAGER_WRITE.has(key))return actor.role==='Müdür';
 return ['candidates','offers','offerShares','completedTasks','candidateNotes'].includes(key);
}

export function recordInScope(actor:UmayMembership,key:string,value:unknown){
 if(actor.role==='Kurucu'||!BRANCH_SCOPED.has(key))return true;
 if(!value||typeof value!=='object')return false;
 const item=value as ScopedRecord;
 const branch=String(item.branch||'');
 if(branch!==actor.branch&&branch!==GLOBAL_BRANCH)return false;
 if(actor.role==='Müdür'||key==='campaigns'||key==='cardRules'||key==='noteRules')return true;
 const ownerIds=[item.ownerId,item.advisorId].filter(Boolean).map(String);
 const ownerNames=[item.owner,item.advisor].filter(Boolean).map(value=>String(value).trim().toLocaleLowerCase('tr'));
 return ownerIds.includes(actor.userId)||ownerNames.includes(actor.name.trim().toLocaleLowerCase('tr'));
}

export function filterCollectionForActor(actor:UmayMembership,key:string,value:unknown){
 return Array.isArray(value)&&BRANCH_SCOPED.has(key)?value.filter(item=>recordInScope(actor,key,item)):value;
}

export function validateScopedWrite(actor:UmayMembership,key:string,next:unknown,current:unknown){
 if(!canWriteCollection(actor,key))return 'Bu koleksiyon için yazma yetkiniz yok';
 if(actor.role==='Kurucu'||!BRANCH_SCOPED.has(key))return null;
 if(!Array.isArray(next)||!Array.isArray(current))return 'Şube kapsamlı koleksiyon bir dizi olmalıdır';
 const id=(item:any)=>String(item?.id||'');
 const currentMap=new Map(current.map(item=>[id(item),item]));
 const nextMap=new Map(next.map(item=>[id(item),item]));
 for(const item of next){
  const before=currentMap.get(id(item));
  if((!before||JSON.stringify(before)!==JSON.stringify(item))&&!recordInScope(actor,key,item))return 'Yetki alanınız dışındaki kayıt değiştirilemez';
 }
 for(const item of current){
  if(!nextMap.has(id(item))&&!recordInScope(actor,key,item))return 'Yetki alanınız dışındaki kayıt silinemez';
 }
 return null;
}

export function mergeScopedCollection(actor:UmayMembership,key:string,next:unknown,current:unknown){
 if(actor.role==='Kurucu'||!BRANCH_SCOPED.has(key)||!Array.isArray(next)||!Array.isArray(current))return next;
 if(next.some(item=>!recordInScope(actor,key,item)))return next;
 const preserved=current.filter(item=>!recordInScope(actor,key,item));
 return [...preserved,...next];
}
