
/* Stores a boolean, and an optional reason for its value. If `false`, the
 * reason is required. Used for success/failure return values. */
export type BoolWithReason = {
    bool: true
    reason?: string
} | {
    bool: false,
    reason: string
}

export type Range = number | {min: number, max: number}

/**
 * A set of callback functions for use with long-running tasks which may be run
 * asynchronously.
 *
 * This is mostly used for the task runner, which lives in "/ui/", but the type
 * is here since any function which needs to be run in a task and update
 * progress uses it.
 */
export type TaskCallbacks = {
    progressCallback: (percent: number | null, progressMessage?: string | null) => void,
    logCallback: (message: string) => void,
}

/**
 * Preset callbacks object with callbacks that do nothing. A convenience in
 * case you want no callbacks, or want to set just a few callbacks.
 */
export const voidTaskCallbacks: TaskCallbacks = {
    logCallback: () => {},
    progressCallback: () => {},
}
