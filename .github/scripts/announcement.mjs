import { randomUUID } from 'node:crypto';
import { appendFileSync, existsSync } from 'node:fs';
import { EOL } from 'node:os';
import { fileURLToPath } from 'node:url';

/** Based on https://github.com/withastro/astro/blob/main/.github/scripts/announce.mjs */

const baseUrl = new URL('https://github.com/neutronui/neutron/releases/tag/');
const emojis = ['🚀'];
const descriptors = ['new release'];
const verbs = ['now available'];
const extraVerbs = ['new'];

async function run() {
  const content = await generateMessage();
  console.info(content);
  setOutput('DISCORD_MESSAGE', content);
}

function item(items) {
  return items[Math.floor(Math.random() * items.length)];
}

const plurals = new Map([
  ['is', 'are'],
  ['has', 'have']
]);

function pluralize(text) {
  return text.replace(/(\[([^\]]+)\])/gm, (_, _full, match) =>
    plurals.has(match) ? plurals.get(match) : `${match}s`
  );
}

function singularize(text) {
  return text.replace(/(\{([^\}]+)\})/gm, (_, _full, match) => `${match}`);
}

async function generateMessage() {
  const releases = process.argv.slice(2)[0] || '{}';
  const data = JSON.parse(releases);
  const packageData = (await import('../../package.json', { with: { type: 'json' } })).default;

  const { name, version } = packageData;
  const url = new URL(encodeURIComponent(`${name}@${version}`), baseUrl).toString();
  
  const emoji = item(emojis);
  const descriptor = item(descriptors);
  const verb = item(verbs);

  let message = '';
  message += `${emoji} \`${name}@${version}\` ${singularize(verb)}\nRead the [release notes →](<${url}>)\n`;

  return message;
}

function setOutput(key, value) {
  const filePath = process.env['GITHUB_OUTPUT'] || '';
  if (filePath) {
    return issueFileCommand('OUTPUT', prepareKeyValueMessage(key, value));
  }
  process.stdout.write(EOL);
}

function toCommandValue(input) {
  if (input === null || input === undefined) {
    return '';
  } else if (typeof input === 'string' || input instanceof String) {
    return input;
  }
  return JSON.stringify(input);
}

function prepareKeyValueMessage(key, value) {
  const delimiter = `gh-delimiter-${randomUUID()}`;
  const convertedValue = toCommandValue(value);

  if (key.includes(delimiter)) {
    throw new Error(`Unexpected input: name should not contain the delimiter "${delimiter}"`);
  }

  if (convertedValue.includes(delimiter)) {
    throw new Error(`Unexpected input: value should not contain the delimiter "${delimiter}"`);
  }

  return `${key}<<${delimiter}${EOL}${convertedValue}${EOL}${delimiter}`;
}

function issueFileCommand(command, message) {
  const filePath = process.env[`GITHUB_${command}`];
  if (!filePath) {
    throw new Error(`Unable to find environment variable for file command ${command}`);
  }

  if (!existsSync(filePath)) {
    throw new Error(`Missing file at path: ${filePath}`);
  }

  appendFileSync(filePath, `${toCommandValue(message)}${EOL}`, {
    encoding: 'utf8'
  });
}

run();