/* eslint-disable no-console */
import { Command } from 'commander';

export const syncCommand = new Command('sync')
  .description('sync music collection to iPod')
  .option('-s, --source <path>', 'source directory to sync from')
  .option('-n, --dry-run', 'show what would be synced without making changes')
  .option('--quality <preset>', 'transcoding quality: high, medium, low', 'high')
  .option('--filter <pattern>', 'only sync tracks matching pattern')
  .option('--no-artwork', 'skip artwork transfer')
  .option('--delete', 'remove tracks from iPod not in source')
  .action(async (options) => {
    const parent = syncCommand.parent;
    const globalOpts = parent?.opts() ?? {};

    // Stub implementation
    if (globalOpts.json) {
      console.log(JSON.stringify({
        status: 'not_implemented',
        message: 'Sync command not yet implemented',
        options: { ...globalOpts, ...options },
      }, null, 2));
    } else {
      console.log('Sync command not yet implemented.');
      console.log('');
      console.log('Options received:');
      console.log(`  Source: ${options.source ?? '(not specified)'}`);
      console.log(`  Device: ${globalOpts.device ?? '(auto-detect)'}`);
      console.log(`  Quality: ${options.quality}`);
      console.log(`  Dry run: ${options.dryRun ?? false}`);
      console.log(`  Artwork: ${options.artwork}`);
      console.log(`  Delete: ${options.delete ?? false}`);
      if (options.filter) {
        console.log(`  Filter: ${options.filter}`);
      }
    }
  });
