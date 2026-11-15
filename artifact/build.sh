#!/bin/sh
# Gera a página única da demo (artefato): artifact/dist/falando-frances-pratica.html
set -eu
cd "$(dirname "$0")/.."
mkdir -p artifact/dist
STUB="$(mktemp -d)/empty.js"; echo "export {}" > "$STUB"
npx esbuild artifact/app.ts --bundle --minify --format=iife --target=es2020 --loader:.json=json --alias:@=./src --alias:server-only="$STUB" --outfile=artifact/dist/app.js --log-level=warning
python3 - <<'PY'
js = open('artifact/dist/app.js', encoding='utf8').read().replace('</script', '<\\/script')
css = open('artifact/style.css', encoding='utf8').read()
html = f'''<title>Falando Francês Prática</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
{css}
</style>
<div id="app"></div>
<script>
{js}
</script>
'''
open('artifact/dist/falando-frances-pratica.html', 'w', encoding='utf8').write(html)
print(round(len(html) / 1e6, 2), 'MB')
PY
