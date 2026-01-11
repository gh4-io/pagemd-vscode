/**
 * CLI Message Extractor Utility
 *
 * **TEMPORARY SOLUTION** - This utility extracts clean messages from CLI stderr/stdout
 * for user-facing popups. It's a short-term workaround for the thin client architecture.
 *
 * **FUTURE:** When migrating to direct API imports (import @pagemd/core, etc.),
 * this file can be REMOVED and replaced with structured error objects from the packages.
 *
 * See CLAUDE.md > Future Work > Extension Architecture Migration
 */

/**
 * Extract clean, user-friendly message from CLI output.
 *
 * The CLI outputs user-friendly messages with these patterns:
 * - "✗ Failed: [message]" (errors, to stderr)
 * - "✓ Success: [message]" (success, to stdout)
 *
 * This function extracts those clean messages and strips verbose logger metadata
 * (timestamps, [ERROR], [CLI], JSON objects, etc.) that shouldn't appear in popups.
 *
 * **Priority order:**
 * 1. Look for "✗ Failed: [message]" in stderr (most common for errors)
 * 2. Look for "✓ Success: [message]" in stdout (for success messages)
 * 3. Fall back to "Error: [message]" pattern (legacy, stops at ; or { to avoid JSON)
 * 4. Return "Unknown error" as last resort
 *
 * **Note:** This does NOT modify or consume the original stderr/stdout.
 * All data remains available in result.stderr, result.stdout, and output channel.
 *
 * @param stderr - CLI stderr output (may contain logger format + ✗ messages)
 * @param stdout - CLI stdout output (may contain ✓ messages)
 * @returns Clean message suitable for popup display
 *
 * @example
 * // CLI stderr contains:
 * // "2024-01-10 14:32:45.123 [ERROR] [CLI] [build] failure: ...
 * //  ✗ Failed: duplicated mapping key at line 78"
 *
 * const message = extractCleanMessage(result.stderr, result.stdout);
 * // Returns: "duplicated mapping key at line 78"
 */
export function extractCleanMessage(stderr: string, stdout: string): string {
  // 1. Try ✗ Failed: pattern in stderr (most common for errors)
  // Matches: "  ✗ Failed: duplicated mapping key at line 78"
  // Captures: "duplicated mapping key at line 78"
  const failedMatch = stderr.match(/✗\s*Failed:\s*(.+)/);
  if (failedMatch) {
    return failedMatch[1].trim();
  }

  // 2. Try ✓ Success: pattern in stdout (for success messages)
  // Matches: "  ✓ Success: 2 outputs created"
  // Captures: "2 outputs created"
  const successMatch = stdout.match(/✓\s*Success:\s*(.+)/);
  if (successMatch) {
    return successMatch[1].trim();
  }

  // 3. Fall back to Error: pattern (legacy)
  // Stops at ';' or '{' to avoid capturing JSON/logger data
  // Matches: "Error: Profile not found: custom"
  // Captures: "Profile not found: custom"
  const errorMatch = stderr.match(/Error:\s*([^;{]+)/i);
  if (errorMatch) {
    return errorMatch[1].trim();
  }

  // 4. Last resort
  return 'Unknown error';
}
