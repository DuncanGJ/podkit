/* eslint-disable no-console */
import { Command } from 'commander';

export const statusCommand = new Command('status')
  .description('show iPod device information and connection status')
  .action(async () => {
    const parent = statusCommand.parent;
    const globalOpts = parent?.opts() ?? {};

    // Stub implementation
    if (globalOpts.json) {
      console.log(JSON.stringify({
        status: 'not_implemented',
        message: 'Status command not yet implemented',
        device: globalOpts.device ?? null,
      }, null, 2));
    } else {
      console.log('Status command not yet implemented.');
      console.log('');
      console.log('This command will show:');
      console.log('  - Device name and model');
      console.log('  - Storage capacity (used/free)');
      console.log('  - Track count');
      console.log('  - Connection status');
      if (globalOpts.device) {
        console.log('');
        console.log(`Device path specified: ${globalOpts.device}`);
      }
    }
  });
