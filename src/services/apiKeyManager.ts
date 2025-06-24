
'use server';

/**
 * @fileOverview A service to manage and rotate API keys intelligently.
 * This service helps improve performance and resilience by:
 * 1. Prioritizing the last known working API key.
 * 2. Temporarily skipping keys that have recently failed due to quota errors.
 * 3. Automatically retrying "failed" keys after a cooldown period (TTL).
 */

// How long to remember a key failure before retrying, in milliseconds.
// 5 minutes is a reasonable time to wait for a potential quota reset.
const API_KEY_FAILURE_TTL_MS = 5 * 60 * 1000;

// In-memory state. This will reset if the server instance recycles, which is acceptable.
let lastKnownGoodKeyIndex = 0;
const keyFailureTimestamps = new Map<number, number>(); // Stores: key_index -> failure_timestamp

function getApiKeys(): string[] {
    return (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);
}

/**
 * Reports that an API key at a specific index has failed due to a quota error.
 * This marks the key as temporarily unavailable.
 * @param keyIndex The index of the failing key in the original list.
 */
function reportKeyFailure(keyIndex: number): void {
    const now = Date.now();
    keyFailureTimestamps.set(keyIndex, now);
    console.log(`[ApiKeyManager] Failure reported for key index ${keyIndex}. It will be skipped for the next ${API_KEY_FAILURE_TTL_MS / 1000} seconds.`);
}

/**
 * Reports that an API key at a specific index has succeeded.
 * This key will be prioritized for subsequent requests, and its failure status will be cleared.
 * @param keyIndex The index of the successful key.
 */
function reportKeySuccess(keyIndex: number): void {
    if (lastKnownGoodKeyIndex !== keyIndex) {
        console.log(`[ApiKeyManager] New last known good key index set to: ${keyIndex}`);
        lastKnownGoodKeyIndex = keyIndex;
    }
    // If the key was previously marked as failed, clear that status since it's working now.
    if (keyFailureTimestamps.has(keyIndex)) {
        keyFailureTimestamps.delete(keyIndex);
        console.log(`[ApiKeyManager] Key index ${keyIndex} is working. Cleared its failure status.`);
    }
}

/**
 * Gets an intelligently ordered list of API keys to try for a request.
 * The list is ordered to try the most likely-to-succeed keys first.
 * @returns An array of objects, each containing the key string and its original index.
 */
function getKeysToTry(): { key: string; index: number }[] {
    const allKeys = getApiKeys();
    if (allKeys.length === 0) {
        return [];
    }

    const now = Date.now();

    // 1. Filter out keys that have failed within the TTL window.
    const availableKeysAndIndices = allKeys
        .map((key, index) => ({ key, index }))
        .filter(({ index }) => {
            const lastFailure = keyFailureTimestamps.get(index);
            if (!lastFailure) {
                return true; // No failure has ever been recorded for this key.
            }
            
            const isExpired = (now - lastFailure) > API_KEY_FAILURE_TTL_MS;
            if (isExpired) {
                keyFailureTimestamps.delete(index); // TTL expired, so clean up the old entry.
                console.log(`[ApiKeyManager] TTL for key index ${index} expired. It is now available for use again.`);
            }
            return isExpired;
        });

    // 2. If all keys are currently marked as unavailable, it's time to try them all again.
    if (availableKeysAndIndices.length === 0 && allKeys.length > 0) {
        console.warn(`[ApiKeyManager] All API keys are currently marked as unavailable. Clearing all failure timestamps and re-attempting in case quota has reset.`);
        keyFailureTimestamps.clear();
        lastKnownGoodKeyIndex = 0; // Reset preferred key
        return allKeys.map((key, index) => ({ key, index }));
    }

    // 3. Prioritize the last known good key by moving it to the front of the list.
    const goodKeyOriginalIndex = availableKeysAndIndices.findIndex(k => k.index === lastKnownGoodKeyIndex);

    if (goodKeyOriginalIndex > 0) { // If it's not already at the front or not found
        const [goodKey] = availableKeysAndIndices.splice(goodKeyOriginalIndex, 1);
        availableKeysAndIndices.unshift(goodKey);
        console.log(`[ApiKeyManager] Prioritizing last known good key at index ${lastKnownGoodKeyIndex}.`);
    }

    console.log(`[ApiKeyManager] Providing key list to try. Order of indices: [${availableKeysAndIndices.map(k => k.index).join(', ')}]`);
    return availableKeysAndIndices;
}

export const apiKeyManager = {
    reportFailure: reportKeyFailure,
    reportSuccess: reportKeySuccess,
    getKeysToTry,
};
