const userAgent = process.env.npm_config_user_agent ?? "";
const agentVersion = /\bnpm\/(\d+\.\d+\.\d+)\b/u.exec(userAgent);
if (agentVersion === null) {
  throw new Error("Could not determine npm version from npm_config_user_agent.");
}
const version = agentVersion[1];
const match = /^(\d+)\.(\d+)\.(\d+)/u.exec(version);
if (match === null) {
  throw new Error(`Could not parse npm version '${version}'.`);
}
const [major, minor, patch] = match.slice(1).map(Number);
if (major < 11 || (major === 11 && (minor < 5 || (minor === 5 && patch < 1)))) {
  throw new Error(`npm ${version} is too old for trusted publishing; npm 11.5.1 or later is required.`);
}
process.stdout.write(`npm ${version} supports trusted publishing.\n`);
