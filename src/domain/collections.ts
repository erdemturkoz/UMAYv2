export const UMAY_COLLECTION_KEYS = [
  'candidates','offers','campaigns','education','cardRules','noteRules',
  'offerShares','completedTasks','candidateNotes','archivedCampaignIds',
] as const;

export type UmayCollectionKey = typeof UMAY_COLLECTION_KEYS[number];

export function baseCollectionKey(key: string): string {
  return key.replace(/^(development|qa|test):/, '');
}

export function isAllowedCollectionKey(key: string): key is UmayCollectionKey {
  return (UMAY_COLLECTION_KEYS as readonly string[]).includes(baseCollectionKey(key));
}

