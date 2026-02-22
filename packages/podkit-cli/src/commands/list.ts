/* eslint-disable no-console */
import { Command } from 'commander';

export const listCommand = new Command('list')
  .description('list tracks on iPod or in collection')
  .option('-s, --source <path>', 'list from collection directory instead of iPod')
  .option('--format <fmt>', 'output format: table, json, csv', 'table')
  .option('--fields <list>', 'fields to show (comma-separated): title,artist,album,duration')
  .action(async (options) => {
    const parent = listCommand.parent;
    const globalOpts = parent?.opts() ?? {};

    // Stub implementation
    if (globalOpts.json || options.format === 'json') {
      console.log(
        JSON.stringify(
          {
            status: 'not_implemented',
            message: 'List command not yet implemented',
            source: options.source ?? null,
            device: globalOpts.device ?? null,
            format: options.format,
          },
          null,
          2
        )
      );
    } else {
      console.log('List command not yet implemented.');
      console.log('');
      console.log('This command will list tracks from:');
      if (options.source) {
        console.log(`  Collection: ${options.source}`);
      } else {
        console.log(`  iPod: ${globalOpts.device ?? '(auto-detect)'}`);
      }
      console.log('');
      console.log(`Output format: ${options.format}`);
      if (options.fields) {
        console.log(`Fields: ${options.fields}`);
      }
    }
  });
