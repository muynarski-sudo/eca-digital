#!/bin/sh
# Gera o app instalável (PWA) em docs/: index.html, manifest, service worker (offline) e ícones.
# Roda tudo no aparelho depois de instalado; os dados ficam só no celular (localStorage).
set -eu
cd "$(dirname "$0")/.."
./artifact/build.sh >/dev/null
rm -rf docs && mkdir -p docs/icons docs/audio/play docs/audio/reading
cp public/audio/play/*.mp3 public/audio/play/manifest.json docs/audio/play/ 2>/dev/null || true
cp public/audio/reading/*.mp3 public/audio/reading/manifest.json docs/audio/reading/ 2>/dev/null || true
python3 - <<'PY'
import glob, hashlib, json, os
from PIL import Image

clip_files = sorted(os.path.basename(f) for f in glob.glob('docs/audio/play/*.mp3'))
manifest_clips = json.load(open('docs/audio/play/manifest.json', encoding='utf8')) if clip_files else None
clips_script = ('window.__PLAY_CLIPS__=' + json.dumps({'base': 'audio/play/', 'keys': manifest_clips['keys'], 'credit': manifest_clips.get('credit', '')}, ensure_ascii=False) + ';') if manifest_clips else ''

read_files = sorted(os.path.basename(f) for f in glob.glob('docs/audio/reading/*.mp3'))
read_keys = [f[:-4] for f in read_files]
clips_script += ('window.__READING_AUDIO__=' + json.dumps({'base': 'audio/reading/', 'keys': read_keys}) + ';') if read_keys else ''

js = open('artifact/dist/app.js', encoding='utf8').read().replace('</script', '<\\/script')
css = open('artifact/style.css', encoding='utf8').read() + open('src/lib/play/play.css', encoding='utf8').read()
install = open('artifact/pwa-install.js', encoding='utf8').read()

extra_css = '''
html{-webkit-text-size-adjust:100%}
body{margin:0;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
#pwa-bar{position:fixed;left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:60;display:flex;gap:10px;align-items:center;justify-content:space-between;background:var(--card);color:var(--fg);border:2px solid var(--blue);border-radius:14px;padding:12px 14px;box-shadow:0 6px 24px rgb(0 0 0/.25)}
@media(min-width:720px){#pwa-bar{bottom:max(12px,env(safe-area-inset-bottom,0px))}}
#pwa-bar p{margin:0;font-size:.95rem}#pwa-bar .row2{display:flex;gap:8px;flex-shrink:0}
'''
version = hashlib.sha1((js + css + install + extra_css + clips_script + ''.join(clip_files) + ''.join(read_files)).encode('utf8')).hexdigest()[:10]
html = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Falando Francês Prática</title>
<meta name="description" content="Pratique o francês das suas aulas: exercícios, flashcards e conjugação. Funciona offline.">
<meta name="theme-color" content="#0055a4">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Falando Francês">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<style>
{css}
{extra_css}
</style>
</head>
<body>
<div id="app"></div>
<script>
{clips_script}
</script>
<script>
{js}
</script>
<script>
{install}
</script>
</body>
</html>
'''
open('docs/index.html', 'w', encoding='utf8').write(html)

manifest = {
  "name": "Falando Francês Prática", "short_name": "Falando Francês", "description": "Pratique o francês das suas aulas, mesmo sem internet.",
  "lang": "pt-BR", "dir": "ltr", "start_url": "./", "scope": "./", "id": "./", "display": "standalone", "orientation": "any",
  "theme_color": "#0055a4", "background_color": "#ffffff", "categories": ["education"],
  "icons": [
    {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
    {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
    {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
  ],
}
open('docs/manifest.webmanifest', 'w', encoding='utf8').write(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n')

sw = f'''// Service worker do Falando Francês Prática. Guarda o app no aparelho para abrir sem internet.
const CACHE = 'ffp-{version}';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];
const CLIPS = {json.dumps(['audio/play/' + f for f in clip_files] + ['audio/reading/' + f for f in read_files])};
self.addEventListener('install', (e) => {{
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).then(() => Promise.allSettled(CLIPS.map((u) => c.add(u))))).then(() => self.skipWaiting()));
}});
self.addEventListener('activate', (e) => {{
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('ffp-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
}});
self.addEventListener('fetch', (e) => {{
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // páginas: tenta a internet primeiro (versão nova na hora) e usa o que está guardado se estiver offline
  if (e.request.mode === 'navigate') {{
    e.respondWith(
      fetch(e.request).then((res) => {{
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('index.html', copy));
        return res;
      }}).catch(() => caches.match('index.html').then((hit) => hit || caches.match('./')))
    );
    return;
  }}
  // demais arquivos (ícones, manifest): guardados primeiro
  e.respondWith(
    caches.match(e.request, {{ ignoreSearch: true }}).then((hit) => hit || fetch(e.request).then((res) => {{
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }}).catch(() => caches.match('index.html')))
  );
}});
'''
open('docs/sw.js', 'w', encoding='utf8').write(sw)
open('docs/.nojekyll', 'w').write('')

# ícones: torre da logo sobre fundo branco (normal) e com margem de segurança (maskable)
logo = Image.open('public/logo.png').convert('RGBA')
mark = logo.crop((0, 0, 70, logo.size[1]))
def icon(size, scale, bg=(255, 255, 255, 255)):
    canvas = Image.new('RGBA', (size, size), bg)
    h = int(size * scale)
    w = int(mark.size[0] * h / mark.size[1])
    m = mark.resize((w, h), Image.LANCZOS)
    canvas.alpha_composite(m, ((size - w) // 2, (size - h) // 2))
    return canvas.convert('RGB')
icon(192, 0.72).save('docs/icons/icon-192.png', optimize=True)
icon(512, 0.72).save('docs/icons/icon-512.png', optimize=True)
icon(512, 0.52).save('docs/icons/icon-maskable-512.png', optimize=True)
icon(180, 0.72).save('docs/icons/apple-touch-icon.png', optimize=True)
print('docs/index.html', round(len(html) / 1e6, 2), 'MB; versão', version)
PY
