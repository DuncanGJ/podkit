/* eslint-disable no-console */
import { Command } from 'commander';
import { getContext } from '../context.js';

export const statusCommand = new Command('status')
  .description('show iPod device information and connection status')
  .action(async () => {
    const { config, globalOpts, configResult } = getContext();

    // Stub implementation
    if (globalOpts.json) {
      console.log(JSON.stringify({
        status: 'not_implemented',
        message: 'Status command not yet implemented',
        device: config.device ?? null,
        configFile: configResult.configPath ?? null,
      }, null, 2));
    } else {
      console.log('Status command not yet implemented.');
      console.log('');
      console.log('This command will show:');
      console.log('  - Device name and model');
      console.log('  - Storage capacity (used/free)');
      console.log('  - Track count');
      console.log('  - Connection status');
      if (config.device) {
        console.log('');
        console.log(`Device path: ${config.device}`);
      }
      if (configResult.configPath) {
        console.log(`Config loaded from: ${configResult.configPath}`);
      }
    }
  });
