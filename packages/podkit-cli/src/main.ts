#!/usr/bin/env node
/**
 * podkit CLI
 *
 * Command-line interface for syncing music to iPods.
 */

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { statusCommand } from './commands/status.js';
import { listCommand } from './commands/list.js';

const program = new Command();

program
  .name('podkit')
  .description('Sync music collections to iPod devices')
  .version('0.0.0')
  .option('-v, --verbose', 'increase verbosity (stackable: -v, -vv, -vvv)', increaseVerbosity, 0)
  .option('-q, --quiet', 'suppress non-essential output')
  .option('--json', 'output in JSON format')
  .option('--no-color', 'disable colored output')
  .option('--device <path>', 'iPod mount point (auto-detect if omitted)')
  .option('--config <path>', 'config file path');

function increaseVerbosity(
  _value: string,
  previous: number,
): number {
  return previous + 1;
}

// Register commands
program.addCommand(initCommand);
program.addCommand(syncCommand);
program.addCommand(statusCommand);
program.addCommand(listCommand);

program.parse();
