export type LegacyCollection={key:string;value:unknown;updatedAt:number};
export type MigrationIssue={severity:'error'|'warning';collection:string;index?:number;message:string};
export type MigrationPlan={ready:boolean;counts:Record<string,number>;issues:MigrationIssue[];targetTables:string[]};

const ARRAY_COLLECTIONS=['candidates','offers','campaigns','education','cardRules','noteRules','offerShares','completedTasks','candidateNotes'] as const;
const TARGET_TABLES=['users','branches','candidates','offers','offer_versions','offer_shares','activities','notes','tasks','campaigns','education_programs','payment_rules','audit_logs'];

export function buildMigrationPlan(records:LegacyCollection[]):MigrationPlan{
 const latest=new Map<string,LegacyCollection>();
 for(const record of records){const current=latest.get(record.key);if(!current||record.updatedAt>current.updatedAt)latest.set(record.key,record)}
 const issues:MigrationIssue[]=[];const counts:Record<string,number>={};
 for(const key of ARRAY_COLLECTIONS){const value=latest.get(key)?.value;if(value===undefined){counts[key]=0;continue}if(!Array.isArray(value)){issues.push({severity:'error',collection:key,message:'Koleksiyon dizi biçiminde değil'});counts[key]=0;continue}counts[key]=value.length}
 const candidates=Array.isArray(latest.get('candidates')?.value)?latest.get('candidates')!.value as Record<string,unknown>[]:[];
 const offers=Array.isArray(latest.get('offers')?.value)?latest.get('offers')!.value as Record<string,unknown>[]:[];
 const candidateIds=new Set(candidates.map(x=>String(x.id??'')).filter(Boolean));
 offers.forEach((offer,index)=>{if(!offer.candidateId)issues.push({severity:'warning',collection:'offers',index,message:'Eski teklif candidateId içermiyor; legacy snapshot olarak korunacak'});else if(!candidateIds.has(String(offer.candidateId)))issues.push({severity:'error',collection:'offers',index,message:'candidateId mevcut bir adaya bağlı değil'})});
 const ids=new Set<string>();candidates.forEach((candidate,index)=>{const id=String(candidate.id??'');if(!id)issues.push({severity:'error',collection:'candidates',index,message:'Aday kimliği eksik'});else if(ids.has(id))issues.push({severity:'error',collection:'candidates',index,message:'Aday kimliği tekrarlanıyor'});else ids.add(id)});
 return{ready:!issues.some(x=>x.severity==='error'),counts,issues,targetTables:TARGET_TABLES};
}
