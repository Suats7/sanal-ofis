import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function readText(relPath) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Eksik koruma dosyası: ${relPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function assertPattern(content, pattern, message) {
  if (!pattern.test(content)) {
    throw new Error(message);
  }
}

try {
  const ceoLockSource = readText('src/constants/ceoLock.ts');
  assertPattern(
    ceoLockSource,
    /LOCKED_CEO_IDENTITY\s*=\s*Object\.freeze\(/,
    'LOCKED_CEO_IDENTITY Object.freeze ile kilitlenmiş olmalıdır.',
  );
  assertPattern(ceoLockSource, /id:\s*'sef'/, "CEO id 'sef' olarak kilitli kalmalıdır.");
  assertPattern(ceoLockSource, /name:\s*'Sauron'/, "CEO adı 'Sauron' olarak kilitli kalmalıdır.");
  assertPattern(
    ceoLockSource,
    /shortRole:\s*'CEO'/,
    "CEO kısa rolü 'CEO' olarak kilitli kalmalıdır.",
  );
  assertPattern(ceoLockSource, /locked:\s*true/, 'CEO locked: true bayrağı korunmalıdır.');
  assertPattern(
    ceoLockSource,
    /signature:\s*'SAURON_IMMUTABLE_CEO_V1'/,
    'CEO imza sabiti SAURON_IMMUTABLE_CEO_V1 değiştirilmemelidir.',
  );

  const agentsSource = readText('src/constants/agents.ts');
  assertPattern(
    agentsSource,
    /import\s*\{\s*LOCKED_CEO_IDENTITY\s*\}\s*from\s*'\.\/ceoLock'/,
    'agents.ts, LOCKED_CEO_IDENTITY sabitini ceoLock.ts dosyasından içe aktarmalıdır.',
  );
  assertPattern(
    agentsSource,
    /AGENTS\s*[:\w<>ReadonlyRecordAgentIdAgentConfig,\s]*=\s*Object\.freeze\(/,
    'AGENTS nesnesi Object.freeze ile dondurulmuş olmalıdır.',
  );
  assertPattern(
    agentsSource,
    /sef:\s*Object\.freeze\(/,
    'AGENTS.sef (CEO Sauron) Object.freeze ile dondurulmuş olmalıdır.',
  );
  assertPattern(
    agentsSource,
    /name:\s*LOCKED_CEO_IDENTITY\.name/,
    'AGENTS.sef.name, LOCKED_CEO_IDENTITY.name kaynağından alınmalıdır.',
  );
  assertPattern(
    agentsSource,
    /shortRole:\s*LOCKED_CEO_IDENTITY\.shortRole/,
    'AGENTS.sef.shortRole, LOCKED_CEO_IDENTITY.shortRole kaynağından alınmalıdır.',
  );
  assertPattern(
    agentsSource,
    /locked:\s*LOCKED_CEO_IDENTITY\.locked/,
    'AGENTS.sef.locked, LOCKED_CEO_IDENTITY.locked kaynağından alınmalıdır.',
  );

  const appSource = readText('src/App.tsx');
  assertPattern(
    appSource,
    /assertSauronIntegrity\s*\(\s*AGENTS\.sef\s*\)/,
    'App.tsx başlangıcında assertSauronIntegrity(AGENTS.sef) kontrolü yer almalıdır.',
  );

  console.log('✅ CEO Sauron koruma doğrulaması geçti.');
} catch (err) {
  console.error(`❌ CEO Sauron koruma ihlali: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
