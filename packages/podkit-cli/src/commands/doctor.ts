/**
 * Doctor command — run health checks on an iPod
 *
 * Checks the iPod database for known issues and reports findings.
 * Currently checks:
 * - Artwork integrity (ArtworkDB vs ithmb file consistency)
 *
 * @example
 * ```bash
 * podkit doctor                              # Run all checks
 * podkit doctor --json                       # JSON output
 * podkit doctor --repair-artwork             # Repair artwork corruption
 * podkit doctor --repair-artwork --dry-run   # Preview repair
 * ```
 */

import { Command } from 'commander';
import { getContext } from '../context.js';
import {
  resolveDevicePath,
  formatDeviceError,
  getDeviceIdentity,
  formatDeviceLookupMessage,
  parseCliDeviceArg,
  resolveEffectiveDevice,
} from '../device-resolver.js';
import { OutputContext } from '../output/index.js';
import { existsSync } from '../utils/fs.js';
import { createMusicAdapter } from '../utils/source-adapter.js';

// ── Output types ────────────────────────────────────────────────────────────

interface DoctorCheckOutput {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  summary: string;
  details?: Record<string, unknown>;
  repair?: { flag: string; description: string };
  docsUrl?: string;
}

interface DoctorOutput {
  healthy: boolean;
  mountPoint: string;
  deviceModel: string;
  checks: DoctorCheckOutput[];
}

interface RepairOutput {
  success: boolean;
  totalTracks: number;
  matched: number;
  noSource: number;
  noArtwork: number;
  errors: number;
  dryRun: boolean;
  error?: string;
  errorDetails?: Array<{ artist: string; title: string; error: string }>;
}

// ── Options ─────────────────────────────────────────────────────────────────

interface DoctorOptions {
  repairArtwork?: boolean;
  dryRun?: boolean;
  collection?: string;
}

// ── Status symbols ──────────────────────────────────────────────────────────

function statusSymbol(status: string): string {
  switch (status) {
    case 'pass':
      return '\u2713'; // ✓
    case 'fail':
      return '\u2717'; // ✗
    case 'warn':
      return '!';
    case 'skip':
      return '-';
    default:
      return '?';
  }
}

// ── Resolve device helper ───────────────────────────────────────────────────

async function resolveDevice(out: OutputContext): Promise<{ path: string } | { error: string }> {
  const { config, globalOpts } = getContext();

  const cliDeviceArg = parseCliDeviceArg(globalOpts.device, config);
  const deviceResult = resolveEffectiveDevice(cliDeviceArg, undefined, config);

  if (!deviceResult.success) {
    return { error: deviceResult.error };
  }

  const resolvedDevice = deviceResult.device;
  const cliPath = deviceResult.cliPath;
  const deviceIdentity = getDeviceIdentity(resolvedDevice);

  let getDeviceManager: typeof import('@podkit/core').getDeviceManager;
  try {
    const core = await import('@podkit/core');
    getDeviceManager = core.getDeviceManager;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to load podkit-core' };
  }

  const manager = getDeviceManager();

  if (deviceIdentity?.volumeUuid) {
    out.print(formatDeviceLookupMessage(resolvedDevice?.name, deviceIdentity, out.isVerbose));
  }

  const resolveResult = await resolveDevicePath({
    cliDevice: cliPath,
    deviceIdentity,
    manager,
    requireMounted: true,
    quiet: true,
  });

  if (!resolveResult.path) {
    return { error: resolveResult.error ?? formatDeviceError(resolveResult) };
  }

  if (!existsSync(resolveResult.path)) {
    return { error: `Device path not found: ${resolveResult.path}` };
  }

  return { path: resolveResult.path };
}

// ── Doctor command ──────────────────────────────────────────────────────────

export const doctorCommand = new Command('doctor')
  .description('run health checks on an iPod')
  .option('--repair-artwork', 'rebuild all artwork from source collection')
  .option('-c, --collection <name>', 'music collection to use as artwork source')
  .option('--dry-run', 'preview repair without modifying the iPod')
  .action(async (options: DoctorOptions) => {
    const { config, globalOpts } = getContext();
    const out = OutputContext.fromGlobalOpts(globalOpts);

    // Repair is destructive — require explicit device and collection before resolving anything
    if (options.repairArtwork) {
      if (!globalOpts.device) {
        out.error(
          'Repair requires an explicit device. Use -d <name|path> to specify which iPod to repair.'
        );
        process.exitCode = 1;
        return;
      }
      if (!options.collection) {
        const available = Object.keys(config.music ?? {});
        const hint = available.length > 0 ? ` Available collections: ${available.join(', ')}` : '';
        out.error(
          `Repair requires an explicit collection. Use -c <name> to specify the artwork source.${hint}`
        );
        process.exitCode = 1;
        return;
      }
    }

    // Resolve device
    const resolved = await resolveDevice(out);
    if ('error' in resolved) {
      out.result<DoctorOutput>(
        { healthy: false, mountPoint: '', deviceModel: '', checks: [] },
        () => out.error(resolved.error)
      );
      process.exitCode = 1;
      return;
    }

    const devicePath = resolved.path;

    // If --repair-artwork, run repair flow
    if (options.repairArtwork) {
      await runRepair(devicePath, options.dryRun ?? false, options.collection, out, config);
      return;
    }

    // Otherwise, run diagnostic checks
    await runDiagnostics(devicePath, out);
  });

// ── Diagnostics ─────────────────────────────────────────────────────────────

async function runDiagnostics(devicePath: string, out: OutputContext): Promise<void> {
  let runDoctor: typeof import('@podkit/core').runDoctor;
  try {
    const core = await import('@podkit/core');
    runDoctor = core.runDoctor;
  } catch (err) {
    out.error(err instanceof Error ? err.message : 'Failed to load podkit-core');
    process.exitCode = 1;
    return;
  }

  const report = await runDoctor(devicePath);

  const output: DoctorOutput = {
    healthy: report.healthy,
    mountPoint: report.mountPoint,
    deviceModel: report.deviceModel,
    checks: report.checks.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      summary: c.summary,
      details: c.details,
      repair: c.repair,
      docsUrl: c.docsUrl,
    })),
  };

  out.result<DoctorOutput>(output, () => {
    out.print(`podkit doctor \u2014 checking iPod at ${devicePath}`);
    out.newline();

    for (const check of report.checks) {
      const sym = statusSymbol(check.status);
      out.print(`  ${sym} ${check.name}    ${check.summary}`);

      // For failures, show details and repair instructions
      if (check.status === 'fail' && check.details) {
        out.newline();
        const d = check.details as Record<string, unknown>;

        if (d.totalEntries !== undefined) {
          const total = (d.totalEntries as number).toLocaleString();
          const corrupt = (d.corruptEntries as number).toLocaleString();
          const healthy = (d.healthyEntries as number).toLocaleString();
          const pct = d.corruptPercent;

          out.print(
            `    Corrupt:      ${corrupt} / ${total} entries (${pct}%) reference data beyond ithmb file bounds`
          );
          out.print(`    Healthy:      ${healthy} entries with valid offsets`);
        }

        out.newline();
        out.print('    The artwork database is out of sync with the thumbnail files.');
        out.print('    Affected tracks display wrong or missing artwork on the iPod.');
      }

      if (check.repair) {
        out.newline();
        out.print(`    To repair: podkit doctor ${check.repair.flag}`);
      }

      if (check.docsUrl) {
        out.print(`    More info: ${check.docsUrl}`);
      }
    }

    out.newline();
    if (report.healthy) {
      out.success('All checks passed.');
    } else {
      const failCount = report.checks.filter((c) => c.status === 'fail').length;
      out.error(`${failCount} check${failCount === 1 ? '' : 's'} failed.`);
    }
  });

  if (!report.healthy) {
    process.exitCode = 1;
  }
}

// ── Repair ──────────────────────────────────────────────────────────────────

async function runRepair(
  devicePath: string,
  dryRun: boolean,
  collectionName: string | undefined,
  out: OutputContext,
  config: ReturnType<typeof getContext>['config']
): Promise<void> {
  let core: typeof import('@podkit/core');
  try {
    core = await import('@podkit/core');
  } catch (err) {
    out.error(err instanceof Error ? err.message : 'Failed to load podkit-core');
    process.exitCode = 1;
    return;
  }

  // Resolve the specified collection (always required — validated before calling runRepair)
  const allMusic = config.music ?? {};
  const found = allMusic[collectionName!];
  if (!found) {
    const available = Object.keys(allMusic);
    const msg =
      available.length > 0
        ? `Available collections: ${available.join(', ')}`
        : 'No music collections configured.';
    out.error(`Music collection "${collectionName}" not found. ${msg}`);
    process.exitCode = 1;
    return;
  }
  const selectedCollections = { [collectionName!]: found };

  // Open iPod database
  let db: Awaited<ReturnType<typeof core.IpodDatabase.open>>;
  try {
    db = await core.IpodDatabase.open(devicePath);
  } catch (err) {
    out.error(err instanceof Error ? err.message : 'Failed to open iPod database');
    process.exitCode = 1;
    return;
  }

  // Create and connect adapters
  const adapters: import('@podkit/core').CollectionAdapter[] = [];
  try {
    for (const [name, collectionConfig] of Object.entries(selectedCollections)) {
      const adapter = createMusicAdapter({
        config: collectionConfig,
        name,
      });
      await adapter.connect();
      adapters.push(adapter);
    }
  } catch (err) {
    db.close();
    out.error(
      `Failed to connect to source collection: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exitCode = 1;
    return;
  }

  if (!dryRun) {
    out.print(
      `Repairing artwork for ${db.trackCount.toLocaleString()} tracks${dryRun ? ' (dry run)' : ''}...`
    );
    out.newline();
  } else {
    out.print(`Dry run: checking artwork repair for ${db.trackCount.toLocaleString()} tracks...`);
    out.newline();
  }

  try {
    const result = await core.repairArtwork(
      { db, adapters },
      {
        dryRun,
        onProgress: (progress) => {
          if (!out.isText) return;
          // Simple progress line (overwrite previous)
          const pct = Math.round((progress.current / progress.total) * 100);
          process.stderr.write(
            `\r  ${progress.current} / ${progress.total}  (${pct}%)  Matched: ${progress.matched}  No source: ${progress.noSource}  No artwork: ${progress.noArtwork}`
          );
        },
      }
    );

    // Clear progress line
    if (out.isText) {
      process.stderr.write('\r' + ' '.repeat(100) + '\r');
    }

    const output: RepairOutput = {
      success: result.errors === 0,
      totalTracks: result.totalTracks,
      matched: result.matched,
      noSource: result.noSource,
      noArtwork: result.noArtwork,
      errors: result.errors,
      dryRun,
      errorDetails: result.errorDetails.length > 0 ? result.errorDetails : undefined,
    };

    out.result<RepairOutput>(output, () => {
      out.print(dryRun ? 'Dry run complete.' : 'Repair complete.');
      out.print(
        `  Matched & ${dryRun ? 'would repair' : 'repaired'}:  ${result.matched.toLocaleString()} tracks`
      );
      out.print(
        `  No source found:     ${result.noSource.toLocaleString()} tracks (artwork ${dryRun ? 'would be ' : ''}cleared)`
      );
      out.print(
        `  Source has no art:   ${result.noArtwork.toLocaleString()} tracks (artwork ${dryRun ? 'would be ' : ''}cleared)`
      );
      out.print(`  Errors:              ${result.errors.toLocaleString()}`);

      if (result.errorDetails.length > 0) {
        out.newline();
        out.error('Error details:');
        for (const err of result.errorDetails.slice(0, 10)) {
          out.error(`  ${err.artist} - ${err.title}: ${err.error}`);
        }
        if (result.errorDetails.length > 10) {
          out.error(`  ... and ${result.errorDetails.length - 10} more`);
        }
      }

      // Run post-repair verification (not for dry run)
      if (!dryRun && result.errors === 0) {
        out.newline();
        out.success('Artwork rebuilt successfully. Run `podkit doctor` to verify.');
      }
    });

    if (result.errors > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    out.error(`Repair failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  } finally {
    // Disconnect adapters
    for (const adapter of adapters) {
      try {
        await adapter.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
    db.close();
  }
}
