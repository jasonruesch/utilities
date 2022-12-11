import {
  readFileSync,
  existsSync,
  readdirSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
  renameSync,
  copyFileSync,
  lstatSync,
} from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function cleanupGamelist(systemPath, games) {
  const systemMissingAssetsPath = join(systemPath, '_missing-assets');
  mkdirSync(join(systemMissingAssetsPath), { recursive: true });

  for (var i = 0; i < games.length; i++) {
    const { path } = games[i];
    const gamePath = join(systemPath, path);

    console.log('Removing', path, '...');

    if (existsSync(gamePath)) {
      copyFileSync(gamePath, join(systemMissingAssetsPath, path));
      unlinkSync(gamePath);
    }
  }
}

function processSystem(romsPath, system) {
  const systemPath = join(romsPath, system);
  const gamelistPath = join(systemPath, 'gamelist.xml');

  if (
    (existsSync(systemPath) && !lstatSync(systemPath).isDirectory()) ||
    !existsSync(gamelistPath)
  ) {
    return false;
  }

  if (
    !existsSync(join(systemPath, 'images')) ||
    !existsSync(join(systemPath, 'downloaded_images'))
  ) {
    console.log();
    console.log(system, 'has not been scraped yet');
    return true;
  }

  const findGamesMissingAssets = (gamelist) => {
    const games =
      gamelist?.match(/<game>[\s\S]*?<\/game>/g)?.map((game) => {
        const path = game.match(/<path>(.*?)<\/path>/)[1];
        return { game, path };
      }) || [];

    return games;
  };

  const gamelist = readFileSync(gamelistPath, 'utf8');
  const games = findGamesMissingAssets(gamelist);

  if (games.length > 0) {
    console.log();
    console.log(
      'Cleaning up',
      games.length,
      system,
      `${games.length === 1 ? 'game' : 'games'}...`
    );

    cleanupGamelist(systemPath, games);

    const modifiedGamelist = games.reduce(
      (gamelist, { game }) => gamelist.replace(`\t${game}\n`, ''),
      gamelist
    );

    renameSync(gamelistPath, join(systemPath, 'gamelist.xml.bak'));
    writeFileSync(gamelistPath, modifiedGamelist);

    console.log('Saved gamelist.xml for', system);
  }

  return true;
}

function main() {
  const args = process.argv.slice(2);
  let romsPath = args[0] || __dirname;

  if (existsSync(join(romsPath, 'gamelist.xml'))) {
    const system = basename(romsPath);
    romsPath = dirname(romsPath);

    processSystem(romsPath, system);
  } else if (existsSync(romsPath) && lstatSync(romsPath).isDirectory()) {
    const systems = readdirSync(romsPath);

    const foundSystems = systems.reduce(
      (exists, system) => exists || processSystem(romsPath, system),
      false
    );

    if (!foundSystems) {
      console.log();
      console.log('No systems found');
    }
  } else {
    console.log();
    console.log('Roms path was not found');
  }

  console.log();
}

main();
