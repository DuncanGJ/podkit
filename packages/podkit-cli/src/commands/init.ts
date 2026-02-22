/* eslint-disable no-console */
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.config', 'podkit', 'config.toml');

const DEFAULT_CONFIG = `# podkit configuration
# See: https://github.com/your-repo/podkit

# Default source directory for sync
# source = "/path/to/your/music"

# iPod mount point (auto-detect if omitted)
# device = "/media/ipod"

# Transcoding quality: high, medium, low
quality = "high"

# Include artwork in sync
artwork = true
`;

export const initCommand = new Command('init')
  .description('create a default configuration file')
  .option('-f, --force', 'overwrite existing config file')
  .option('--path <path>', 'config file path', DEFAULT_CONFIG_PATH)
  .action(async (options) => {
    const configPath = options.path as string;
    const force = options.force as boolean;

    // Check if config already exists
    if (fs.existsSync(configPath) && !force) {
      console.error(`Error: Config file already exists at ${configPath}`);
      console.error('Use --force to overwrite.');
      process.exit(1);
    }

    // Create directory if it doesn't exist
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Write config file
    fs.writeFileSync(configPath, DEFAULT_CONFIG);

    console.log(`Created config file at ${configPath}`);
    console.log('');
    console.log('Next steps:');
    console.log(`  1. Edit ${configPath} to set your music source directory`);
    console.log('  2. Connect your iPod');
    console.log('  3. Run: podkit status');
    console.log('  4. Run: podkit sync --dry-run');
  });
