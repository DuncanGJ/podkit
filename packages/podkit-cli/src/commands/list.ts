/* eslint-disable no-console */
import { Command } from 'commander';
import { getContext } from '../context.js';

export const listCommand = new Command('list')
  .description('list tracks on iPod or in collection')
  .option('-s, --source <path>', 'list from collection directory instead of iPod')
  .option('--format <fmt>', 'output format: table, json, csv', 'table')
  .option('--fields <list>', 'fields to show (comma-separated): title,artist,album,duration')
  .action(async (options) => {
    const { config, globalOpts, configResult } = getContext();

    // Use config.source as default if --source not specified
    const source = options.source ?? config.source;

    // Stub implementation
    if (globalOpts.json || options.format === 'json') {
      console.log(
        JSON.stringify(
          {
            status: 'not_implemented',
            message: 'List command not yet implemented',
            source: source ?? null,
            device: config.device ?? null,
            format: options.format,
            configFile: configResult.configPath ?? null,
          },
          null,
          2
        )
      );
    } else {
      console.log('List command not yet implemented.');
      console.log('');
      console.log('This command will list tracks from:');
      if (source) {
        console.log(`  Collection: ${source}`);
      } else {
        console.log(`  iPod: ${config.device ?? '(auto-detect)'}`);
      }
      console.log('');
      console.log(`Output format: ${options.format}`);
      if (options.fields) {
        console.log(`Fields: ${options.fields}`);
      }
      if (configResult.configPath) {
        console.log('');
        console.log(`Config loaded from: ${configResult.configPath}`);
      }
    }
  });
