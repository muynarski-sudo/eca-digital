#!/usr/bin/env python3
"""Gera os áudios da área "Brincar" (um .mp3 por texto) com o Piper, uma voz neural offline.

Requisitos (uma vez): pip install piper-tts ; ffmpeg instalado ; baixar a voz francesa:
  https://huggingface.co/rhasspy/piper-voices/tree/main/fr/fr_FR/siwis/medium  (arquivos .onnx e .onnx.json)

Uso:  npx tsx scripts/play-texts.ts && python3 scripts/play_audio.py --voice caminho/fr_FR-siwis-medium.onnx
Só gera o que falta. Saída: public/audio/play/<chave>.mp3 e manifest.json.

Voz: base SIWIS (Universidade de Edimburgo), licença CC BY 4.0. Exige atribuição (já exibida no app).
"""
import argparse, json, os, subprocess, sys, tempfile, wave

ap = argparse.ArgumentParser()
ap.add_argument('--voice', required=True)
ap.add_argument('--texts', default='.audio-cache/play-texts.json')
ap.add_argument('--out', default='public/audio/play')
ap.add_argument('--force', action='store_true')
args = ap.parse_args()

from piper import PiperVoice

voice = PiperVoice.load(args.voice)
texts = json.load(open(args.texts, encoding='utf8'))
os.makedirs(args.out, exist_ok=True)
done = skipped = 0
tmp = tempfile.mkdtemp()
for key, text in texts.items():
    mp3 = os.path.join(args.out, f'{key}.mp3')
    if os.path.exists(mp3) and not args.force:
        skipped += 1
        continue
    wav = os.path.join(tmp, f'{key}.wav')
    with wave.open(wav, 'wb') as w:
        voice.synthesize_wav(text, w)
    # tira o silêncio só do começo e do fim (não pode cortar nas pausas do meio: com stop_periods o áudio era cortado na primeira vírgula),
    # normaliza o volume e comprime (mono, 22 kHz, 40 kbps)
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-i', wav,
        '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-18:TP=-2:LRA=7',
        '-ac', '1', '-ar', '22050', '-codec:a', 'libmp3lame', '-b:a', '40k', mp3,
    ], check=True)
    os.remove(wav)
    done += 1

keys = sorted(k for k in texts if os.path.exists(os.path.join(args.out, f'{k}.mp3')))
json.dump({
    'voice': 'fr_FR-siwis-medium (Piper)',
    'credit': 'Vozes sintetizadas com Piper, a partir da base SIWIS (Universidade de Edimburgo), licença CC BY 4.0.',
    'keys': keys,
}, open(os.path.join(args.out, 'manifest.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
size = sum(os.path.getsize(os.path.join(args.out, f'{k}.mp3')) for k in keys)
print(f'{done} gerados, {skipped} já existiam, {len(keys)} no total, {size/1e6:.1f} MB')
