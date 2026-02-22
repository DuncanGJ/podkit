/* eslint-disable no-console */
import { Command } from 'commander';
import { getContext } from '../context.js';

export const syncCommand = new Command('sync')
  .description('sync music collection to iPod')
  .option('-s, --source <path>', 'source directory to sync from')
  .option('-n, --dry-run', 'show what would be synced without making changes')
  .option('--quality <preset>', 'transcoding quality: high, medium, low', 'high')
  .option('--filter <pattern>', 'only sync tracks matching pattern')
  .option('--no-artwork', 'skip artwork transfer')
  .option('--delete', 'remove tracks from iPod not in source')
  .action(async (options) => {
    const { config, globalOpts, configResult } = getContext();

    // Stub implementation
    if (globalOpts.json) {
      console.log(JSON.stringify({
        status: 'not_implemented',
        message: 'Sync command not yet implemented',
        config: {
          source: config.source ?? null,
          device: config.device ?? null,
          quality: config.quality,
          artwork: config.artwork,
        },
        options: {
          dryRun: options.dryRun ?? false,
          filter: options.filter ?? null,
          delete: options.delete ?? false,
        },
        configFile: configResult.configPath ?? null,
      }, null, 2));
    } else {
      console.log('Sync command not yet implemented.');
      console.log('');
      console.log('Configuration (merged from all sources):');
      console.log(`  Source: ${config.source ?? '(not specified)'}`);
      console.log(`  Device: ${config.device ?? '(auto-detect)'}`);
      console.log(`  Quality: ${config.quality}`);
      console.log(`  Artwork: ${config.artwork}`);
      console.log('');
      console.log('Options:');
      console.log(`  Dry run: ${options.dryRun ?? false}`);
      console.log(`  Delete: ${options.delete ?? false}`);
      if (options.filter) {
        console.log(`  Filter: ${options.filter}`);
      }
      if (configResult.configPath) {
        console.log('');
        console.log(`Config loaded from: ${configResult.configPath}`);
      }
    }
  });
