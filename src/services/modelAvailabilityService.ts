
/**
 * @fileOverview A service to track the availability of AI models to prevent
 * repeated calls to models that are known to be unavailable due to quota issues.
 * This acts as a simple in-memory cache with a Time-to-Live (TTL).
 * Because serverless environments can spin up and down, this cache is instance-specific,
 * but it's highly effective for scenarios with `minInstances: 1` or for gracefully
 * handling temporary quota issues within the lifecycle of a single server instance.
 */

// How long to remember a model failure before retrying, in milliseconds.
// 5 minutes is a reasonable time to wait for a potential quota reset.
const MODEL_FAILURE_TTL_MS = 5 * 60 * 1000;

// In-memory cache to store the timestamp of the last failure for each model.
// Key: model name (e.g., 'googleai/gemini-1.5-pro-latest')
// Value: timestamp (in ms) of when the failure was reported.
const modelFailureTimestamps = new Map<string, number>();

/**
 * Reports that a model has failed, likely due to a quota error.
 * This will mark the model as unavailable for the duration of the TTL.
 * @param modelName The name of the model that failed.
 */
function reportModelFailure(modelName: string): void {
  const now = Date.now();
  modelFailureTimestamps.set(modelName, now);
  console.log(`[ModelCache] Failure reported for ${modelName}. It will be skipped for the next ${MODEL_FAILURE_TTL_MS / 1000} seconds.`);
}

/**
 * Checks if a model is currently considered available.
 * A model is considered unavailable if a failure has been reported for it
 * within the TTL window.
 * @param modelName The name of the model to check.
 * @returns {boolean} True if the model is available, false otherwise.
 */
function isModelAvailable(modelName: string): boolean {
  const lastFailureTimestamp = modelFailureTimestamps.get(modelName);

  if (!lastFailureTimestamp) {
    return true; // No failure has been recorded.
  }

  const now = Date.now();
  const timeSinceFailure = now - lastFailureTimestamp;

  if (timeSinceFailure > MODEL_FAILURE_TTL_MS) {
    // The TTL has expired, so we can try the model again.
    // We'll remove the old entry from the map.
    modelFailureTimestamps.delete(modelName);
    console.log(`[ModelCache] TTL expired for ${modelName}. Re-enabling for next request.`);
    return true;
  }

  // The model failed recently and is still within the TTL window.
  console.log(`[ModelCache] Skipping model ${modelName} as it is marked unavailable.`);
  return false;
}

export const modelAvailabilityService = {
  reportFailure: reportModelFailure,
  isAvailable: isModelAvailable,
};
