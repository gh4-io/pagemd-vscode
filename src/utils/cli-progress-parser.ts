/**
 * CLI Progress Parser
 *
 * Provides two mechanisms for tracking CLI progress:
 * 1. parseProgressStage() - Pattern-matches CLI output lines to detect stage transitions
 * 2. TimedProgressTracker - Time-based fallback when CLI output is silent (default log level)
 */

/**
 * Parsed progress stage from CLI output.
 */
export interface ProgressStage {
  message: string;
}

/**
 * Pattern-match a CLI output line to detect a progress stage transition.
 *
 * Recognizes common PageMD CLI output patterns:
 * - "[PageMD-CLI] Processing:" → "Processing {name}..."
 * - "build.html" + "start" → "Generating HTML..."
 * - "build.pdf" + "start" → "Generating PDF..."
 * - "✓ Success:" → "Complete"
 *
 * Returns undefined for unrecognized lines (safe for HTML content in stdout).
 */
export function parseProgressStage(line: string): ProgressStage | undefined {
  const trimmed = line.trim();

  // Processing file
  const processingMatch = trimmed.match(/\[PageMD-CLI\]\s*Processing:\s*(.+)/i);
  if (processingMatch) {
    const name = processingMatch[1].trim();
    return { message: `Processing ${name}...` };
  }

  // HTML generation start
  if (/build\.html/i.test(trimmed) && /start/i.test(trimmed)) {
    return { message: 'Generating HTML...' };
  }

  // PDF generation start
  if (/build\.pdf/i.test(trimmed) && /start/i.test(trimmed)) {
    return { message: 'Generating PDF...' };
  }

  // Browser launch
  if (/launch|browser|chrome|puppeteer/i.test(trimmed) && /start/i.test(trimmed)) {
    return { message: 'Launching browser...' };
  }

  // Paged.js rendering
  if (/paged\.?js|paged\s+media/i.test(trimmed) && /start|render/i.test(trimmed)) {
    return { message: 'Rendering pages...' };
  }

  // Success
  if (/✓\s*Success:/i.test(trimmed) || /success/i.test(trimmed) && /complete|done|finish/i.test(trimmed)) {
    return { message: 'Complete' };
  }

  // Failure
  if (/✗\s*Failed:/i.test(trimmed)) {
    return { message: 'Failed' };
  }

  return undefined;
}

/**
 * Stage definition for timed progress.
 */
interface TimedStage {
  /** Seconds after start to show this stage */
  atSeconds: number;
  /** Message to display */
  message: string;
}

/**
 * Preset stage configurations for different operation types.
 */
const STAGE_PRESETS: Record<string, TimedStage[]> = {
  preview: [
    { atSeconds: 0, message: 'Starting...' },
    { atSeconds: 0.5, message: 'Loading pipeline...' },
    { atSeconds: 2, message: 'Parsing markdown...' },
    { atSeconds: 3.5, message: 'Rendering HTML...' },
    { atSeconds: 5, message: 'Finalizing...' },
  ],
  'export-html': [
    { atSeconds: 0, message: 'Starting...' },
    { atSeconds: 0.5, message: 'Loading pipeline...' },
    { atSeconds: 2, message: 'Parsing markdown...' },
    { atSeconds: 3, message: 'Generating HTML...' },
    { atSeconds: 4, message: 'Writing output...' },
  ],
  'export-pdf': [
    { atSeconds: 0, message: 'Starting...' },
    { atSeconds: 0.5, message: 'Loading pipeline...' },
    { atSeconds: 2, message: 'Generating HTML...' },
    { atSeconds: 3.5, message: 'Launching browser...' },
    { atSeconds: 5, message: 'Rendering pages...' },
    { atSeconds: 8, message: 'Writing PDF...' },
  ],
  'bundle-html': [
    { atSeconds: 0, message: 'Starting...' },
    { atSeconds: 0.5, message: 'Loading pipeline...' },
    { atSeconds: 2, message: 'Parsing markdown...' },
    { atSeconds: 3, message: 'Generating HTML...' },
    { atSeconds: 4, message: 'Bundling assets...' },
    { atSeconds: 5, message: 'Writing output...' },
  ],
};

/**
 * Time-based progress tracker with CLI output override capability.
 *
 * Reports progress stages based on elapsed time. When CLI output is parsed
 * into a recognized stage (via parseProgressStage), it overrides the timed
 * stage for more accurate feedback.
 *
 * Usage:
 *   const tracker = new TimedProgressTracker(
 *     (msg) => progress.report({ message: msg }),
 *     'preview'
 *   );
 *   tracker.start();
 *   // ... run CLI with onProgress calling tracker.override() ...
 *   tracker.stop();
 */
export class TimedProgressTracker {
  private readonly onReport: (message: string) => void;
  private readonly stages: TimedStage[];
  private intervalId: ReturnType<typeof setInterval> | undefined;
  private startTime = 0;
  private currentStageIndex = -1;
  private overridden = false;

  constructor(onReport: (message: string) => void, preset: string) {
    this.onReport = onReport;
    this.stages = STAGE_PRESETS[preset] || STAGE_PRESETS['preview'];
  }

  /**
   * Start tracking progress. Reports the first stage immediately,
   * then checks for stage transitions every 250ms.
   */
  start(): void {
    this.startTime = Date.now();
    this.currentStageIndex = -1;
    this.overridden = false;
    this.tick();
    this.intervalId = setInterval(() => this.tick(), 250);
  }

  /**
   * Override the current timed stage with a parsed CLI message.
   * Timed stages resume if no further overrides are received
   * and the next timed threshold is crossed.
   */
  override(message: string): void {
    this.overridden = true;
    this.onReport(message);
  }

  /**
   * Stop tracking and clean up the interval.
   */
  stop(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private tick(): void {
    const elapsed = (Date.now() - this.startTime) / 1000;

    // Find the latest stage whose threshold has been reached
    let newIndex = this.currentStageIndex;
    for (let i = this.stages.length - 1; i >= 0; i--) {
      if (elapsed >= this.stages[i].atSeconds) {
        newIndex = i;
        break;
      }
    }

    // Only report if we've advanced to a new timed stage
    if (newIndex > this.currentStageIndex) {
      this.currentStageIndex = newIndex;
      // Only report timed stage if not currently overridden by CLI output
      if (!this.overridden) {
        this.onReport(this.stages[newIndex].message);
      }
      // Reset override flag so next timed stage can take over
      this.overridden = false;
    }
  }
}
