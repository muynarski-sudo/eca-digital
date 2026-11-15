#!/bin/sh
# Gera a página única da demo (artefato): artifact/dist/falando-frances-pratica.html
set -eu
cd "$(dirname "$0")/.."
mkdir -p artifact/dist
STUB="$(mktemp -d)/empty.js"; echo "export {}" > "$STUB"
npx esbuild artifact/app.ts --bundle --minify --format=iife --target=es2020 --loader:.json=json --loader:.png=dataurl --alias:@=./src --alias:server-only="$STUB" --outfile=artifact/dist/app.js --log-level=warning
python3 - <<'PY'
import base64, json, os
js = open('artifact/dist/app.js', encoding='utf8').read().replace('</script', '<\\/script')
# áudios embutidos (data URI): a página única não tem onde hospedar arquivos
clips = ''
mf = 'public/audio/play/manifest.json'
if os.path.exists(mf):
    m = json.load(open(mf, encoding='utf8'))
    inline = {k: 'data:audio/mpeg;base64,' + base64.b64encode(open(f'public/audio/play/{k}.mp3', 'rb').read()).decode() for k in m['keys']}
    clips = 'window.__PLAY_CLIPS__=' + json.dumps({'base': '', 'keys': m['keys'], 'credit': m.get('credit', ''), 'inline': inline}, ensure_ascii=False) + ';'
css = open('artifact/style.css', encoding='utf8').read() + open('src/lib/play/play.css', encoding='utf8').read()
html = f'''<meta charset="utf-8">
<title>Falando Francês Prática</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
{css}
</style>
<div id="app"></div>
<script>
{clips}
</script>
<script>
{js}
</script>
'''
open('artifact/dist/falando-frances-pratica.html', 'w', encoding='utf8').write(html)
print(round(len(html) / 1e6, 2), 'MB')
PY
