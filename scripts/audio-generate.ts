/* Gera só o áudio que falta e guarda no Storage (bucket "audio"). Uso: npm run audio:generate [-- --dry-run] [-- --local]
   Sem TTS_API_KEY usa o provider simulado (tom de teste). Itens needs_review nunca entram. */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { loadContent, isUsable } from '../src/lib/content/load';
import { audioKey, audioPath } from '../src/lib/audio/key';
import { ttsFromEnv } from '../src/lib/audio/tts';
import { loadEnv, serviceClient } from './lib/env';

export function collectTexts() {
  const c = loadContent();
  const texts = new Set<string>();
  c.vocab.filter(isUsable).forEach((v) => texts.add(v.fr.replace(/\s+/g, ' ').trim()));
  c.phrases.filter(isUsable).forEach((p) => texts.add(p.fr));
  c.dialogues.filter(isUsable).forEach((d) => d.lines.forEach((l) => texts.add(l.fr)));
  c.questions.filter(isUsable).forEach((q) => q.audio_text && texts.add(q.audio_text));
  return [...texts];
}

async function main() {
  loadEnv();
  const dry = process.argv.includes('--dry-run');
  const local = process.argv.includes('--local');
  const tts = ttsFromEnv();
  const texts = collectTexts();
  const db = local || dry ? null : serviceClient();

  const existing = new Set<string>();
  if (db) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.storage.from('audio').list('fr', { limit: 1000, offset });
      if (error) throw new Error(`Storage: ${error.message}`);
      (data ?? []).forEach((f) => existing.add(f.name.replace(/\.(mp3|wav)$/, '')));
      if (!data || data.length < 1000) break;
    }
  } else if (local) {
    mkdirSync('.audio-cache/fr', { recursive: true });
  }

  const missing = texts.filter((t) => {
    const k = audioKey(t);
    return db
      ? !existing.has(k)
      : !existsSync(`.audio-cache/${audioPath(k, 'mp3')}`) &&
          !existsSync(`.audio-cache/${audioPath(k, 'wav')}`);
  });
  console.warn(
    `Provider: ${tts.name}. ${texts.length} textos, ${texts.length - missing.length} já existem, ${missing.length} a gerar.${dry ? ' (simulação)' : ''}`,
  );
  if (dry) return;
  let done = 0;
  for (const t of missing) {
    const out = await tts.synthesize(t, { lang: 'fr-FR' });
    const path = audioPath(audioKey(t), out.ext);
    if (db) {
      const { error } = await db.storage
        .from('audio')
        .upload(path, out.data, { contentType: out.mime, upsert: false });
      if (error) throw new Error(`upload ${path}: ${error.message}`);
    } else {
      writeFileSync(`.audio-cache/${path}`, out.data);
    }
    if (++done % 25 === 0) console.warn(`${done}/${missing.length}`);
  }
  console.warn(`Concluído: ${done} áudios gerados.`);
}

if (process.argv[1]?.endsWith('audio-generate.ts')) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
