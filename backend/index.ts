import {db,error,json,router,requireAdminEmailAllowlist,requireAuth} from '@appdeploy/sdk';
import {notifySubscribers,realtimeSubscriptionRoutes} from './realtime-subscribers';
import {validateOfferCollectionTransitions} from '../src/domain/offers';
import {describeCollectionChanges,requestFingerprint,validateCollectionIdentity,validateNoPhysicalDelete} from '../src/domain/writeGuards';
import {calculateOfferPrice,priceMatches,type PaymentMethod,type PricingCampaign,type PricingRule} from '../src/domain/pricing';

const TABLE='umay_data';
type DataRecord={id:string;key:string;value:unknown;updatedAt:number};
const BASE_KEYS=new Set(['candidates','offers','campaigns','education','cardRules','noteRules','offerShares','completedTasks','candidateNotes','archivedCampaignIds','targetPlans']);
const MAX_VALUE_BYTES=5*1024*1024;
const USERS_TABLE='umay_users';
const AUDIT_TABLE='umay_audit_logs';
const IDEMPOTENCY_TABLE='umay_idempotency';
const ADMIN_EMAILS=['turkozerdem@gmail.com'];
type UserRecord={id:string;userId?:string;email:string;name:string;role:'Kurucu'|'Müdür'|'Danışman';branch:'Tüm Şubeler'|'İzmit'|'Körfez';active:boolean;createdAt:number;updatedAt:number};

function baseKey(key:string){return key.replace(/^(development|qa|test):/,'')}
function siblingKey(key:string,name:string){const match=key.match(/^(development|qa|test):/);return `${match?.[0]||''}${name}`}
function isAllowedKey(key:string){return BASE_KEYS.has(baseKey(key))}
function valueSize(value:unknown){return new TextEncoder().encode(JSON.stringify(value)).length}
function hasNonFiniteNumber(value:unknown):boolean{
 if(typeof value==='number')return !Number.isFinite(value);
 if(Array.isArray(value))return value.some(hasNonFiniteNumber);
 if(value&&typeof value==='object')return Object.values(value as Record<string,unknown>).some(hasNonFiniteNumber);
 return false;
}
function validCollectionShape(key:string,value:unknown){
 if(hasNonFiniteNumber(value))return false;
 if(['candidates','offers','campaigns','education','cardRules','noteRules','offerShares','completedTasks','archivedCampaignIds','targetPlans'].includes(key))return Array.isArray(value);
 if(key==='candidateNotes')return !!value&&typeof value==='object'&&!Array.isArray(value);
 return false;
}

async function listAll<T>(table:string):Promise<Array<T&{id:string}>>{
 const items:Array<T&{id:string}>=[];let nextToken:string|undefined;
 do{const page=await db.list<T>(table,{limit:1000,...(nextToken?{nextToken}:{})});items.push(...page.items);nextToken=page.nextToken}while(nextToken);
 return items;
}

async function findRecord(key:string):Promise<DataRecord|null>{
 const matches=(await listAll<DataRecord>(TABLE)).filter(item=>item.key===key).sort((a,b)=>b.updatedAt-a.updatedAt);
 return matches[0]||null;
}

async function findUser(userId:string):Promise<UserRecord|null>{
 return (await listAll<UserRecord>(USERS_TABLE)).find(item=>item.userId===userId)||null;
}

async function claimMembership(userId:string,email:string):Promise<UserRecord|null>{
 const existing=await findUser(userId);if(existing)return existing;
 const normalized=email.trim().toLocaleLowerCase('tr');let invited=await findUserByEmail(normalized);
 if(!invited||!invited.active||invited.userId)return null;
 const linked={...invited,userId,updatedAt:Date.now()};const [ok]=await db.update(USERS_TABLE,[{id:invited.id,record:linked}]);
 if(!ok)return null;await db.add(AUDIT_TABLE,[{actorUserId:userId,actorEmail:invited.email,action:'user.claim',target:invited.id,branch:invited.branch,metadata:{source:'verified-email'},createdAt:Date.now()}]);return linked;
}

async function findUserByEmail(email:string):Promise<UserRecord|null>{
 const normalized=email.trim().toLocaleLowerCase('tr');
 return (await listAll<UserRecord>(USERS_TABLE)).find(item=>item.email.trim().toLocaleLowerCase('tr')===normalized)||null;
}

async function requireMembership(userId:string){const membership=await findUser(userId);return membership?.active?membership:null}
function validRole(value:unknown):value is UserRecord['role']{return ['Kurucu','Müdür','Danışman'].includes(String(value))}
function validBranch(value:unknown):value is UserRecord['branch']{return ['Tüm Şubeler','İzmit','Körfez'].includes(String(value))}
function validRoleBranch(role:UserRecord['role'],branch:UserRecord['branch']){return role==='Kurucu'?branch==='Tüm Şubeler':branch!=='Tüm Şubeler'}
async function audit(actor:UserRecord,action:string,target:string,metadata:Record<string,unknown>={}){await db.add(AUDIT_TABLE,[{actorUserId:actor.userId,actorEmail:actor.email,action,target,branch:actor.branch,metadata,createdAt:Date.now()}])}
type IdempotencyRecord={id:string;actorUserId:string;requestId:string;fingerprint:string;response:unknown;createdAt:number};
async function findIdempotency(actorUserId:string,requestId:string){return (await listAll<IdempotencyRecord>(IDEMPOTENCY_TABLE)).find(item=>item.actorUserId===actorUserId&&item.requestId===requestId)||null}

const BRANCH_ARRAY_KEYS=new Set(['candidates','offers','campaigns','cardRules','noteRules']);
const SHARED_BRANCH_KEYS=new Set(['campaigns','cardRules','noteRules']);
async function recordValue(key:string){return (await findRecord(key))?.value}
const QNB_CARD_RULE={id:1784720075561,name:'QNB Finansbank · Card Finans',branch:'Tüm Şubeler',period:'2026-07-01 – 2026-07-31',detail:'1 taksit · %2.99 | 2 taksit · %5.34 | 3 taksit · %7.12 | 4 taksit · %8.9 | 5 taksit · %10.68 | 6 taksit · %12.46 | 7 taksit · %14.24 | 8 taksit · %16.02 | 9 taksit · %17.8 | 10 taksit · %19.58 | 11 taksit · %21.36 | 12 taksit · %23.14',active:true,draft:{type:'card',name:'QNB Finansbank · Card Finans',branch:'Tüm Şubeler',period:'2026-07-01 – 2026-07-31',detail:'1 taksit · %2.99 | 2 taksit · %5.34 | 3 taksit · %7.12 | 4 taksit · %8.9 | 5 taksit · %10.68 | 6 taksit · %12.46 | 7 taksit · %14.24 | 8 taksit · %16.02 | 9 taksit · %17.8 | 10 taksit · %19.58 | 11 taksit · %21.36 | 12 taksit · %23.14',active:true,start:'2026-07-01',end:'2026-07-31',simulationBase:10000,bank:'QNB Finansbank',cardFamily:'Card Finans',steps:[{count:1,enabled:true,rate:2.99,bonus:0},{count:2,enabled:true,rate:5.34,bonus:0},{count:3,enabled:true,rate:7.12,bonus:0},{count:4,enabled:true,rate:8.9,bonus:0},{count:5,enabled:true,rate:10.68,bonus:0},{count:6,enabled:true,rate:12.46,bonus:0},{count:7,enabled:true,rate:14.24,bonus:0},{count:8,enabled:true,rate:16.02,bonus:0},{count:9,enabled:true,rate:17.8,bonus:0},{count:10,enabled:true,rate:19.58,bonus:0},{count:11,enabled:true,rate:21.36,bonus:0},{count:12,enabled:true,rate:23.14,bonus:0}],noteInstallment:4,noteMode:'TOTAL_RATE',noteRate:0,fixedTotal:0,minimumDownPayment:0,interestBase:'AFTER_DOWNPAYMENT',firstInstallmentTiming:'AFTER_30_DAYS',firstInstallmentDate:'',id:1784720075561}};
async function recoverQnbCardRule(){const current=await findRecord('cardRules'),values=Array.isArray(current?.value)?current.value as any[]:[];if(values.some(x=>String(x?.name||'').toLocaleLowerCase('tr-TR')==='qnb finansbank · card finans'&&x?.draft?.start==='2026-07-01'&&x?.draft?.end==='2026-07-31'))return {imported:false,value:values,updatedAt:current?.updatedAt||null};const value=[...values,QNB_CARD_RULE],updatedAt=Date.now();if(current){const[ok]=await db.update(TABLE,[{id:current.id,record:{key:'cardRules',value,updatedAt}}]);if(!ok)throw new Error('QNB recovery update failed')}else{const[id]=await db.add(TABLE,[{key:'cardRules',value,updatedAt}]);if(!id)throw new Error('QNB recovery create failed')}return {imported:true,value,updatedAt}}
function itemId(value:any){return String(value?.id??'')}
function isOwned(value:any,actor:UserRecord){return value?.branch===actor.branch&&(value?.ownerId===actor.userId||(!value?.ownerId&&String(value?.owner||'').trim().toLocaleLowerCase('tr')===actor.name.trim().toLocaleLowerCase('tr')))}
function canSeeItem(value:any,actor:UserRecord,includeShared=false){if(actor.role==='Kurucu')return true;if(actor.role==='Müdür')return value?.branch===actor.branch||(includeShared&&value?.branch==='Tüm Şubeler');return isOwned(value,actor)}
async function allowedIds(key:'candidates'|'offers'|'campaigns',actor:UserRecord,includeShared=false){const value=await recordValue(key);return new Set((Array.isArray(value)?value:[]).filter((x:any)=>canSeeItem(x,actor,includeShared)).map(itemId))}
async function projectValue(key:string,value:unknown,actor:UserRecord):Promise<unknown>{
 if(actor.role==='Kurucu')return value;
 if(BRANCH_ARRAY_KEYS.has(key)){const shared=SHARED_BRANCH_KEYS.has(key);if(actor.role==='Danışman'&&shared)return (Array.isArray(value)?value:[]).filter((x:any)=>x?.branch===actor.branch||x?.branch==='Tüm Şubeler');return (Array.isArray(value)?value:[]).filter((x:any)=>canSeeItem(x,actor,shared))}
 if(key==='offerShares'){const ids=await allowedIds('offers',actor);return (Array.isArray(value)?value:[]).filter((x:any)=>ids.has(String(x?.offerId??'')))}
 if(key==='completedTasks'){const ids=await allowedIds('candidates',actor);return (Array.isArray(value)?value:[]).filter(x=>ids.has(String(x).split(':')[0]))}
 if(key==='candidateNotes'){const ids=await allowedIds('candidates',actor);return Object.fromEntries(Object.entries(value&&typeof value==='object'?value as Record<string,unknown>:{}).filter(([id])=>ids.has(id)))}
 if(key==='archivedCampaignIds'){const ids=await allowedIds('campaigns',actor,true);return (Array.isArray(value)?value:[]).filter(id=>ids.has(String(id)))}
 if(key==='targetPlans'){return (Array.isArray(value)?value:[]).filter((x:any)=>actor.role==='Müdür'?x?.branch===actor.branch:x?.branch===actor.branch&&(x?.scope==='Şube'||x?.assigneeId===actor.userId))}
 return value;
}
async function mergeBranchWrite(key:string,incoming:unknown,current:unknown,actor:UserRecord):Promise<unknown>{
 if(actor.role==='Kurucu')return incoming;
 if(actor.role==='Danışman'&&['campaigns','cardRules','noteRules','archivedCampaignIds'].includes(key))throw new Error('readonly');
 if(BRANCH_ARRAY_KEYS.has(key)){
  if(!Array.isArray(incoming))throw new Error('invalid');const existing=Array.isArray(current)?current as any[]:[];
  if(actor.role==='Müdür'){const foreign=incoming.some((x:any)=>x?.branch!==actor.branch&&x?.branch!=='Tüm Şubeler');if(foreign)throw new Error('foreign');const preserved=existing.filter((x:any)=>x?.branch!==actor.branch);return [...preserved,...incoming.filter((x:any)=>x?.branch===actor.branch)]}
  const currentOwn=existing.filter((x:any)=>isOwned(x,actor)),currentIds=new Set(currentOwn.map(itemId)),incomingIds=new Set(incoming.map(itemId));
  if(currentOwn.some((x:any)=>!incomingIds.has(itemId(x))))throw new Error('delete-forbidden');
  if(incoming.some((x:any)=>x?.branch!==actor.branch||(!currentIds.has(itemId(x))&&(x?.ownerId!==actor.userId||x?.owner!==actor.name))))throw new Error('foreign');
  return [...existing.filter((x:any)=>!isOwned(x,actor)),...incoming];
 }
 if(key==='offerShares'){if(!Array.isArray(incoming))throw new Error('invalid');const ids=await allowedIds('offers',actor);if(incoming.some((x:any)=>!ids.has(String(x?.offerId??''))))throw new Error('foreign');return [...(Array.isArray(current)?current:[]).filter((x:any)=>!ids.has(String(x?.offerId??''))),...incoming]}
 if(key==='completedTasks'){if(!Array.isArray(incoming))throw new Error('invalid');const ids=await allowedIds('candidates',actor);if(incoming.some(x=>!ids.has(String(x).split(':')[0])))throw new Error('foreign');return [...(Array.isArray(current)?current:[]).filter(x=>!ids.has(String(x).split(':')[0])),...incoming]}
 if(key==='candidateNotes'){const ids=await allowedIds('candidates',actor),body=incoming&&typeof incoming==='object'?incoming as Record<string,unknown>:{};if(Object.keys(body).some(id=>!ids.has(id)))throw new Error('foreign');const base=current&&typeof current==='object'?current as Record<string,unknown>:{};return {...Object.fromEntries(Object.entries(base).filter(([id])=>!ids.has(id))),...body}}
 if(key==='targetPlans'){if(actor.role==='Danışman'||!Array.isArray(incoming))throw new Error('readonly');const existing=Array.isArray(current)?current as any[]:[];if(actor.role==='Müdür'){if(incoming.some((x:any)=>x?.branch!==actor.branch))throw new Error('foreign');return [...existing.filter((x:any)=>x?.branch!==actor.branch),...incoming]}return incoming}
 throw new Error('readonly');
}

function sameSnapshot(left:unknown,right:unknown){return JSON.stringify(left)===JSON.stringify(right)}
type StoredOfferAlternative={payment?:PaymentMethod;financeRule?:string;installmentText?:string;installments?:number;total?:number};
type StoredOffer={id?:string;campaign?:string;program?:string;branch?:string;payment?:PaymentMethod;financeRule?:string;installmentText?:string;financeSnapshot?:{installments?:number};total?:number;discountRate?:number;discountAuthority?:string;alternatives?:StoredOfferAlternative[];archivedAt?:string};
type StoredCampaign=PricingCampaign&{name?:string;program?:string;branch?:string;archived?:boolean};
type StoredRule=PricingRule&{name?:string;branch?:string;active?:boolean};
async function validateOfferPrices(key:string,nextValue:unknown,currentValue:unknown){
 if(!Array.isArray(nextValue))return 'Offers collection must be an array';
 const previous=new Map((Array.isArray(currentValue)?currentValue:[]).map((item:any)=>[String(item?.id||''),item]));
 const changed=(nextValue as StoredOffer[]).filter(item=>{const before=previous.get(String(item.id||''));return !before||before.total!==item.total||before.payment!==item.payment||before.campaign!==item.campaign||before.financeRule!==item.financeRule||before.installmentText!==item.installmentText||before.discountRate!==item.discountRate||JSON.stringify(before.alternatives||[])!==JSON.stringify(item.alternatives||[])});
 if(!changed.length)return null;
 const [campaignRecord,cardRecord,noteRecord]=await Promise.all([findRecord(siblingKey(key,'campaigns')),findRecord(siblingKey(key,'cardRules')),findRecord(siblingKey(key,'noteRules'))]);
 const campaigns=Array.isArray(campaignRecord?.value)?campaignRecord.value as StoredCampaign[]:[],cardRules=Array.isArray(cardRecord?.value)?cardRecord.value as StoredRule[]:[],noteRules=Array.isArray(noteRecord?.value)?noteRecord.value as StoredRule[]:[];
 for(const offer of changed){
  if(offer.archivedAt)continue;
  if(!offer.id||!offer.campaign||!offer.payment)return 'Offer identity, campaign and payment are required';
  const campaign=campaigns.find(item=>item.name===offer.campaign&&(!offer.program||item.program===offer.program)&&(item.branch==='Tüm Şubeler'||item.branch===offer.branch)&&!item.archived);if(!campaign)return `Campaign not found for offer ${offer.id}`;
  const rules=offer.payment==='Kredi Kartı'?cardRules:offer.payment==='Senet'?noteRules:[],rule=offer.payment==='Nakit'?undefined:rules.find(item=>item.name===offer.financeRule&&item.active!==false&&(item.branch==='Tüm Şubeler'||item.branch===offer.branch));
  const installmentCount=Number(offer.financeSnapshot?.installments||offer.installmentText?.match(/^(\d+)/)?.[1]||0)||undefined;
  try{const expected=calculateOfferPrice({campaign,payment:offer.payment,rule,installmentCount,discountRate:offer.discountRate});if(!priceMatches(expected,offer.total)||expected.discountAuthority!==String(offer.discountAuthority||'Standart'))return `Server price validation failed for offer ${offer.id}`}
  catch{return `Pricing rules are invalid for offer ${offer.id}`}
  if((offer.alternatives?.length||0)>2)return `At most two alternatives are allowed for offer ${offer.id}`;
  for(const [index,alternative] of (offer.alternatives||[]).entries()){
   if(!alternative.payment)return `Alternative payment is required for offer ${offer.id}`;
   const alternativeRules=alternative.payment==='Kredi Kartı'?cardRules:alternative.payment==='Senet'?noteRules:[];
   const alternativeRule=alternative.payment==='Nakit'?undefined:alternativeRules.find(item=>item.name===alternative.financeRule&&item.active!==false&&(item.branch==='Tüm Şubeler'||item.branch===offer.branch));
   try{const expected=calculateOfferPrice({campaign,payment:alternative.payment,rule:alternativeRule,installmentCount:Number(alternative.installments)||undefined,discountRate:offer.discountRate});if(!priceMatches(expected,alternative.total)||expected.installmentText!==alternative.installmentText)return `Server price validation failed for alternative ${index+1} of offer ${offer.id}`}
   catch{return `Pricing rules are invalid for alternative ${index+1} of offer ${offer.id}`}
  }
 }
 return null;
}
function registrationDateLabel(value:string){const [year,month,day]=value.split('-');return day+'.'+month+'.'+year}
async function coordinatedRegistration(actor:UserRecord,body:any){
 const candidateId=String(body?.candidateId||''),offerId=String(body?.offerId||''),source=String(body?.source||'').trim(),registrationDate=String(body?.registrationDate||''),paidCourses=Number(body?.paidCourses),giftCourses=Number(body?.giftCourses||0),downPayment=Number(body?.downPayment||0);
 if(!candidateId||!offerId||!source||!/^\d{4}-\d{2}-\d{2}$/.test(registrationDate)||!Number.isInteger(paidCourses)||paidCourses<1||!Number.isInteger(giftCourses)||giftCourses<0||!Number.isFinite(downPayment)||downPayment<0)throw new Error('invalid');
 const candidateRecord=await findRecord('candidates'),offerRecord=await findRecord('offers');if(!candidateRecord||!offerRecord||!Array.isArray(candidateRecord.value)||!Array.isArray(offerRecord.value))throw new Error('missing');
 const candidates=candidateRecord.value as any[],offers=offerRecord.value as any[],candidate=candidates.find(item=>itemId(item)===candidateId),offer=offers.find(item=>itemId(item)===offerId);
 if(!candidate||!offer)throw new Error('missing');if(!canSeeItem(candidate,actor)||!canSeeItem(offer,actor))throw new Error('forbidden');
 if(!sameSnapshot(candidate,body.expectedCandidate)||!sameSnapshot(offer,body.expectedOffer))throw new Error('conflict');
 if(offer.guest||String(offer.candidateId||'')!==candidateId||offers.some(item=>String(item?.parentOfferId||'')===offerId))throw new Error('invalid-state');
 const registeredAt=new Date(registrationDate+'T12:00:00+03:00').toISOString(),financeSnapshot=offer.financeSnapshot?{...offer.financeSnapshot,downPayment}:undefined;
 const updatedOffer={...offer,candidateId,candidate:candidate.name,phone:candidate.phone,source,program:candidate.program||offer.program,status:'Kazanıldı',registrationComplete:true,registeredAt,date:registrationDateLabel(registrationDate),paidCourses,giftCourses,financeSnapshot};
 const updatedCandidate={...candidate,source,course:paidCourses,status:'Kesin Kayıt',agreement:'Onaylandı',collection:new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0}).format(downPayment),last:'Kesin kayıt tamamlandı',next:'Kayıt detayını incele'};
 const nextCandidates=candidates.map(item=>itemId(item)===candidateId?updatedCandidate:item),nextOffers=offers.map(item=>itemId(item)===offerId?updatedOffer:item),now=Date.now();
 const results=await db.update(TABLE,[{id:candidateRecord.id,record:{key:'candidates',value:nextCandidates,updatedAt:now}},{id:offerRecord.id,record:{key:'offers',value:nextOffers,updatedAt:now}}]);
 if(!results.every(Boolean)){const rollback=[] as Array<{id:string;record:Record<string,unknown>}>;if(results[0])rollback.push({id:candidateRecord.id,record:{key:'candidates',value:candidates,updatedAt:candidateRecord.updatedAt}});if(results[1])rollback.push({id:offerRecord.id,record:{key:'offers',value:offers,updatedAt:offerRecord.updatedAt}});if(rollback.length){const restored=await db.update(TABLE,rollback);if(!restored.every(Boolean))console.error('registration rollback failed',{candidateId,offerId})}throw new Error('write-failed')}
 await Promise.allSettled([audit(actor,'registration.complete',offerId,{candidateId,source,paidCourses,giftCourses,registeredAt}),notifySubscribers('umay_data','candidates',now,body.connection_id),notifySubscribers('umay_data','offers',now,body.connection_id)]);
 return {candidate:updatedCandidate,offer:updatedOffer,updatedAt:now};
}

export const handler=router({
 'GET /api/_healthcheck':[async()=>json({message:'Success'})],
 'POST /api/auth/bootstrap-founder':[requireAuth(),requireAdminEmailAllowlist(ADMIN_EMAILS),async(ctx)=>{const existingById=await findUser(ctx.user!.userId);if(existingById){if(existingById.role!=='Kurucu'||existingById.branch!=='Tüm Şubeler'||!existingById.active)return error('This identity already has a different UMAY membership',409);return json({created:false,userId:existingById.userId,email:existingById.email,name:existingById.name,role:existingById.role,branch:existingById.branch})}const existingByEmail=await findUserByEmail(ADMIN_EMAILS[0]);const now=Date.now();if(existingByEmail){if(existingByEmail.role!=='Kurucu'||existingByEmail.branch!=='Tüm Şubeler'||!existingByEmail.active)return error('Founder membership is not eligible for secure relinking',409);const previousUserId=existingByEmail.userId||null;const linked={...existingByEmail,userId:ctx.user!.userId,email:ADMIN_EMAILS[0],updatedAt:now};const [ok]=await db.update(USERS_TABLE,[{id:existingByEmail.id,record:linked}]);if(!ok)return error('Founder membership could not be relinked',500);await db.add(AUDIT_TABLE,[{actorUserId:linked.userId,actorEmail:linked.email,action:'founder.relink',target:linked.id,branch:linked.branch,metadata:{source:'verified-admin-email',previousUserId},createdAt:now}]);return json({created:false,relinked:true,userId:linked.userId,email:linked.email,name:linked.name,role:linked.role,branch:linked.branch})}const founder={userId:ctx.user!.userId,email:ADMIN_EMAILS[0],name:'Erdem Türköz',role:'Kurucu' as const,branch:'Tüm Şubeler' as const,active:true,createdAt:now,updatedAt:now};const [id]=await db.add(USERS_TABLE,[founder]);if(!id)return error('Founder membership could not be created',500);await db.add(AUDIT_TABLE,[{actorUserId:founder.userId,actorEmail:founder.email,action:'founder.bootstrap',target:String(id),branch:founder.branch,metadata:{source:'explicit-email-allowlist'},createdAt:now}]);return json({created:true,userId:founder.userId,email:founder.email,name:founder.name,role:founder.role,branch:founder.branch})}],
 'GET /api/auth/me':[requireAuth(),async(ctx)=>{const membership=await claimMembership(ctx.user!.userId,ctx.user!.email||'');if(!membership?.active)return error('UMAY access has not been provisioned',403);return json({userId:membership.userId,email:membership.email,name:membership.name,role:membership.role,branch:membership.branch})}],
 'GET /api/admin/users':[requireAuth(),async(ctx)=>{const actor=await requireMembership(ctx.user!.userId);if(!actor||actor.role!=='Kurucu')return error('Founder access required',403);const items=await listAll<UserRecord>(USERS_TABLE);return json({users:items.map(({id,...user})=>({id,...user}))})}],
 'GET /api/team/users':[requireAuth(),async(ctx)=>{const actor=await requireMembership(ctx.user!.userId);if(!actor||actor.role==='Danışman')return error('Manager access required',403);const items=await listAll<UserRecord>(USERS_TABLE);const users=items.filter(u=>u.active&&u.role==='Danışman'&&(actor.role==='Kurucu'||u.branch===actor.branch)).map(({id,userId,name,role,branch,active})=>({id,userId,name,role,branch,active}));return json({users})}],
 'POST /api/admin/users':[requireAuth(),async(ctx)=>{const actor=await requireMembership(ctx.user!.userId);if(!actor||actor.role!=='Kurucu')return error('Founder access required',403);const body=(ctx.body||{}) as Partial<UserRecord>;const email=String(body.email||'').trim().toLocaleLowerCase('tr');const name=String(body.name||'').trim();if(!email.includes('@')||!name||!validRole(body.role)||!validBranch(body.branch)||!validRoleBranch(body.role,body.branch)||body.role==='Kurucu')return error('Invalid membership',400);const existing=await findUserByEmail(email);if(existing)return error('This email already has a membership',409);const now=Date.now();const record={email,name,role:body.role,branch:body.branch,active:body.active!==false,createdAt:now,updatedAt:now};const [id]=await db.add(USERS_TABLE,[record]);if(!id)return error('Membership could not be created',500);await audit(actor,'user.create',String(id),{email,role:body.role,branch:body.branch});return json({id,...record})}],
 'PUT /api/admin/users/:id':[requireAuth(),async(ctx)=>{const actor=await requireMembership(ctx.user!.userId);if(!actor||actor.role!=='Kurucu')return error('Founder access required',403);const body=(ctx.body||{}) as Partial<UserRecord>;if(!validRole(body.role)||!validBranch(body.branch)||!validRoleBranch(body.role,body.branch)||typeof body.active!=='boolean')return error('Invalid membership update',400);const target=(await listAll<UserRecord>(USERS_TABLE)).find(x=>x.id===ctx.params.id);if(!target)return error('Membership not found',404);if(target.userId===actor.userId&&(!body.active||body.role!=='Kurucu'))return error('Founder cannot remove own access',409);const [ok]=await db.update(USERS_TABLE,[{id:target.id,record:{...target,role:body.role,branch:body.branch,active:body.active,updatedAt:Date.now()}}]);if(!ok)return error('Membership could not be updated',500);await audit(actor,'user.update',target.id,{role:body.role,branch:body.branch,active:body.active});return json({updated:true})}],
 'POST /api/admin/recovery/qnb-card-rule':[requireAuth(),async(ctx)=>{const actor=await requireMembership(ctx.user!.userId);if(!actor||actor.role!=='Kurucu')return error('Founder access required',403);const result=await recoverQnbCardRule();if(result.imported){await audit(actor,'data.recovery-import','cardRules',{source:'device-recovery',record:'QNB Finansbank · Card Finans'});await notifySubscribers('umay_data','cardRules',Number(result.updatedAt)||Date.now())}return json({imported:result.imported,count:result.value.length,updatedAt:result.updatedAt})}],
 'GET /api/admin/migration/plan':[requireAuth(),async(ctx)=>{const actor=await requireMembership(ctx.user!.userId);if(!actor||actor.role!=='Kurucu')return error('Founder access required',403);const items=await listAll<DataRecord>(TABLE);const records=items.map(({key,value,updatedAt})=>({key,value,updatedAt}));return json({mode:'dry-run',recordCount:records.length,records})}],
 'GET /api/data/export':[requireAuth(),async(ctx)=>{const actor=await requireMembership(ctx.user!.userId);if(!actor||actor.role!=='Kurucu')return error('Founder access required',403);const items=await listAll<DataRecord>(TABLE);await audit(actor,'data.export','umay_data');return json({schemaVersion:1,exportedAt:new Date().toISOString(),records:items.map(({key,value,updatedAt})=>({key,value,updatedAt}))})}],
 'POST /api/registrations/complete':[requireAuth(),async(ctx)=>{const actor=await requireMembership(ctx.user!.userId);if(!actor)return error('UMAY membership required',403);try{return json(await coordinatedRegistration(actor,ctx.body||{}))}catch(cause){const code=cause instanceof Error?cause.message:'unknown';if(code==='forbidden')return error('Registration is outside your authority',403);if(code==='conflict')return error('Candidate or offer was changed by another user',409);if(code==='missing')return error('Candidate or offer was not found',404);if(code==='invalid'||code==='invalid-state')return error('Registration payload or offer state is invalid',400);return error('Registration could not be saved safely',500)}}],
 'GET /api/data/:key':[requireAuth(),async(ctx)=>{if(!isAllowedKey(ctx.params.key))return error('Unknown data collection',404);const actor=await requireMembership(ctx.user!.userId);if(!actor)return error('UMAY membership required',403);const record=await findRecord(ctx.params.key);return json(record?{found:true,value:await projectValue(baseKey(ctx.params.key),record.value,actor),updatedAt:record.updatedAt}:{found:false})}],
 'PUT /api/data/:key':[requireAuth(),async(ctx)=>{
  const body=(ctx.body||{}) as {value?:unknown;connection_id?:string;expectedUpdatedAt?:number|null;requestId?:string};
  if(!isAllowedKey(ctx.params.key))return error('Unknown data collection',404);
  const actor=await requireMembership(ctx.user!.userId);if(!actor)return error('UMAY membership required',403);
  if(!Object.prototype.hasOwnProperty.call(body,'value'))return error('value is required',400);
  const collectionKey=baseKey(ctx.params.key);if(!validCollectionShape(collectionKey,body.value))return error('Collection payload is invalid',400);
  const requestId=String(body.requestId||'').trim();if(!requestId||requestId.length>100)return error('Valid requestId is required',400);
  const actorUserId=String(actor.userId||ctx.user!.userId),fingerprint=requestFingerprint(ctx.params.key,body.value),replay=await findIdempotency(actorUserId,requestId);
  if(replay){if(replay.fingerprint!==fingerprint)return error('requestId was already used for another payload',409);return json(replay.response)}
  const current=await findRecord(ctx.params.key);
  if(current&&typeof body.expectedUpdatedAt==='number'&&current.updatedAt!==body.expectedUpdatedAt)return error('Collection was changed by another user',409);
  let storedValue:unknown;try{storedValue=await mergeBranchWrite(collectionKey,body.value,current?.value,actor)}catch{return error('This collection or branch is outside your authority',403)}
  if(valueSize(storedValue)>MAX_VALUE_BYTES)return error('Collection payload is too large',413);
  if(['candidates','offers','campaigns','education','cardRules','noteRules','offerShares','targetPlans'].includes(collectionKey)){const identityError=validateCollectionIdentity(collectionKey,storedValue);if(identityError)return error(identityError,422)}
  const deletionError=validateNoPhysicalDelete(collectionKey,current?.value,storedValue);if(deletionError)return error(deletionError,422);
  if(collectionKey==='offers'){const transitionError=validateOfferCollectionTransitions(Array.isArray(current?.value)?current.value:[],Array.isArray(storedValue)?storedValue:[]);if(transitionError)return error(transitionError,422)}
  if(collectionKey==='offers'){const pricingError=await validateOfferPrices(ctx.params.key,storedValue,current?.value);if(pricingError)return error(pricingError,422)}
  const updatedAt=Date.now();
  if(current){const [ok]=await db.update(TABLE,[{id:current.id,record:{key:ctx.params.key,value:storedValue,updatedAt}}]);if(!ok)return error('Data could not be updated',500)}else{const [id]=await db.add(TABLE,[{key:ctx.params.key,value:storedValue,updatedAt}]);if(!id)return error('Data could not be created',500)}
  const responseValue=await projectValue(collectionKey,storedValue,actor),payload={key:ctx.params.key,value:responseValue,updatedAt};
  const changes=describeCollectionChanges(collectionKey,current?.value,storedValue);
  if(changes.length){for(const change of changes.slice(0,100))await audit(actor,change.action,change.target,{...change.metadata,updatedAt});if(changes.length>100)await audit(actor,'data.bulk_write',collectionKey,{updatedAt,changeCount:changes.length})}else await audit(actor,'data.write',collectionKey,{updatedAt,changeCount:0});
  await db.add(IDEMPOTENCY_TABLE,[{actorUserId,requestId,fingerprint,response:payload,createdAt:updatedAt}]);
  await notifySubscribers('umay_data',ctx.params.key,updatedAt,body.connection_id);return json(payload)
 }],
 ...realtimeSubscriptionRoutes(async(userId,entityType,entityId)=>{const actor=await requireMembership(userId);return Boolean(actor&&entityType==='umay_data'&&isAllowedKey(entityId))}),
});
