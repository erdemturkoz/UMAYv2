type Item={id?:unknown;phone?:unknown;status?:unknown;archivedAt?:unknown};

export type CollectionChange={action:string;target:string;metadata:Record<string,unknown>};

const normalizedPhone=(value:unknown)=>String(value||'').replace(/\D/g,'').replace(/^90(?=5\d{9}$)/,'').replace(/^0(?=5\d{9}$)/,'');

export function validateCollectionIdentity(key:string,value:unknown):string|null{
 if(!Array.isArray(value))return `${key} collection must be an array`;
 const ids=new Set<string>(),phones=new Set<string>();
 for(const raw of value){const item=(raw||{}) as Item,id=String(item.id||'').trim();if(!id)return `${key} item id is required`;if(ids.has(id))return `Duplicate ${key} id: ${id}`;ids.add(id);
  if(key==='candidates'){const phone=normalizedPhone(item.phone);if(phone){if(phones.has(phone))return `Duplicate candidate phone: ${phone}`;phones.add(phone)}}
 }
 return null;
}

export function validateNoPhysicalDelete(key:string,beforeValue:unknown,afterValue:unknown):string|null{
 if(!['candidates','offers'].includes(key)||!Array.isArray(beforeValue)||!Array.isArray(afterValue))return null;
 const nextIds=new Set(afterValue.map((item:Item)=>String(item?.id||'')));
 const removed=beforeValue.find((item:Item)=>!nextIds.has(String(item?.id||''))) as Item|undefined;
 return removed?`${key} records must be archived instead of deleted: ${String(removed.id||'unknown')}`:null;
}

export function describeCollectionChanges(key:string,beforeValue:unknown,afterValue:unknown):CollectionChange[]{
 const before=new Map((Array.isArray(beforeValue)?beforeValue:[]).map((x:Item)=>[String(x.id||''),x]));
 const after=new Map((Array.isArray(afterValue)?afterValue:[]).map((x:Item)=>[String(x.id||''),x]));
 const changes:CollectionChange[]=[];
 for(const [id,item] of after){const previous=before.get(id);if(!previous){changes.push({action:`${key}.create`,target:id,metadata:{}});continue}
  if(!previous.archivedAt&&item.archivedAt)changes.push({action:`${key}.archive`,target:id,metadata:{}});
  else if(previous.archivedAt&&!item.archivedAt)changes.push({action:`${key}.restore`,target:id,metadata:{}});
  if(key==='offers'&&previous.status!==item.status)changes.push({action:'offers.status_change',target:id,metadata:{from:previous.status||null,to:item.status||null}});
  if(JSON.stringify(previous)!==JSON.stringify(item)&&changes.every(change=>change.target!==id))changes.push({action:`${key}.update`,target:id,metadata:{}});
 }
 return changes;
}

export function requestFingerprint(key:string,value:unknown){
 const input=`${key}:${JSON.stringify(value)}`;let hash=2166136261;
 for(let i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,16777619)}
 return (hash>>>0).toString(16);
}
