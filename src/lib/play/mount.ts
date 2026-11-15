import { ALPHABET, exampleWords, letterByChar } from './alphabet';
import { avatarSvg, createSpeaker } from './avatar';
import { clipKey } from './clipkey';
import {
  listenRound,
  memoryDeck,
  pickUnseen,
  spellable,
  spellingBank,
  type MemoryCard,
} from './games';

export interface PlayOptions {
  vocab: Array<{ fr: string; pt: string }>;
  phrases: Array<{ fr: string; pt: string; pron?: string }>;
  /** Áudios pré-gravados: pasta dos .mp3 e lista das chaves que existem. Sem isso, usa a voz do aparelho. */
  clips?: { base: string; keys: string[]; credit?: string; inline?: Record<string, string> };
  /** Chave do armazenamento local (estrelas e o que já saiu em cada jogo). */
  storageKey: string;
  rng?: () => number;
}

interface Saved {
  stars: number;
  seenSpell: string[];
  seenMemory: string[];
  seenPhrase: string[];
}
type View = 'home' | 'alfabeto' | 'ouvir' | 'soletrar' | 'memoria' | 'frases';

const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const reduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Monta a área lúdica dentro de `root`. Devolve a função que desmonta (para a voz e os temporizadores). */
export function mountPlay(root: HTMLElement, opts: PlayOptions): () => void {
  const rng = opts.rng ?? Math.random;
  const examples = exampleWords(opts.vocab);
  const words = spellable(opts.vocab);
  let saved: Saved = { stars: 0, seenSpell: [], seenMemory: [], seenPhrase: [] };
  try {
    const raw = localStorage.getItem(opts.storageKey);
    if (raw) saved = { ...saved, ...(JSON.parse(raw) as Partial<Saved>) };
  } catch {
    /* sem armazenamento: segue sem salvar */
  }
  const persist = () => {
    try {
      localStorage.setItem(opts.storageKey, JSON.stringify(saved));
    } catch {
      /* ignora */
    }
  };

  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };

  let view: View = 'home';
  let mouthTimer: ReturnType<typeof setInterval> | null = null;
  let warnEl: HTMLElement | null = null;
  const speaker = createSpeaker(
    (speaking) => {
      const svg = root.querySelector<SVGElement>('.pl-avatar');
      if (!svg) return;
      svg.classList.toggle('speaking', speaking);
      if (mouthTimer) clearInterval(mouthTimer);
      mouthTimer = null;
      if (!speaking) return void svg.setAttribute('data-mouth', '0');
      if (reduced()) return void svg.setAttribute('data-mouth', '1');
      mouthTimer = setInterval(
        () => svg.setAttribute('data-mouth', String(Math.floor(Math.random() * 3))),
        130,
      );
    },
    (problem) => {
      if (warnEl) warnEl.hidden = !problem;
    },
    opts.clips
      ? (() => {
          const have = new Set(opts.clips.keys);
          const base = opts.clips.base.endsWith('/') ? opts.clips.base : `${opts.clips.base}/`;
          const inline = opts.clips.inline;
          return {
            has: (t: string) => have.has(clipKey(t)),
            url: (t: string) => inline?.[clipKey(t)] ?? `${base}${clipKey(t)}.mp3`,
          };
        })()
      : undefined,
  );

  root.innerHTML = `<div class="play">
    <div class="pl-stage">
      <div class="pl-avatar-wrap">${avatarSvg()}</div>
      <div class="pl-say">
        <p class="pl-name">Iasmyn</p>
        <div class="pl-balloon" role="status" aria-live="polite"><p class="pl-b1"></p><p class="pl-b2"></p></div>
        <div class="pl-stats"><span class="pl-stars" aria-label="Estrelas ganhas"></span><span class="pl-voice"><button class="pl-btn ghost" data-act="testvoice">Testar a voz</button><button class="pl-btn ghost" data-act="stop" aria-label="Parar a voz">Parar voz</button></span></div>
        <div class="pl-warn" role="alert" hidden><p><strong>Não consegui tocar a voz neste aparelho.</strong> Confira: 1) o volume de mídia está alto; 2) no iPhone, o modo silencioso (botão lateral) está desligado; 3) o aparelho tem voz em francês instalada (iPhone: Ajustes, Acessibilidade, Conteúdo Falado, Vozes, Francês; Android: Configurações, Idioma, Saída de texto para voz). Enquanto isso, leia o que a Iasmyn diz no balão.</p><button class="pl-btn sec" data-act="testvoice">Tentar de novo</button></div>
      </div>
    </div>
    <div class="pl-body"></div>
  </div>`;
  const body = root.querySelector<HTMLElement>('.pl-body')!;
  const b1 = root.querySelector<HTMLElement>('.pl-b1')!;
  const b2 = root.querySelector<HTMLElement>('.pl-b2')!;
  const starsEl = root.querySelector<HTMLElement>('.pl-stars')!;
  warnEl = root.querySelector<HTMLElement>('.pl-warn');

  const showStars = () =>
    (starsEl.textContent = `★ ${saved.stars} ${saved.stars === 1 ? 'estrela' : 'estrelas'}`);
  const addStars = (n: number) => {
    saved.stars += n;
    persist();
    showStars();
  };
  /** Texto do balão (legenda do que a Iasmyn diz). */
  const caption = (main: string, sub = '') => {
    b1.textContent = main;
    b2.textContent = sub;
  };
  const say = (text: string, cap?: [string, string?], rate?: number) => {
    if (cap) caption(cap[0], cap[1] ?? '');
    return speaker.say(text, { rate });
  };

  // ---------- telas ----------
  const back = `<button class="pl-btn ghost" data-act="home">← Voltar</button>`;

  const homeHtml = () => `<h2 class="pl-h">O que vamos fazer hoje?</h2>
    <ul class="pl-menu">
      ${[
        ['alfabeto', 'Alfabeto', 'As 26 letras, com a voz da Iasmyn'],
        ['ouvir', 'Que letra é essa?', 'Ouça e escolha a letra'],
        ['soletrar', 'Soletrar', 'Monte palavras do e-book, letra por letra'],
        ['memoria', 'Memória', 'Combine o francês com o português'],
        ['frases', 'Repita comigo', 'Frases do e-book, devagar ou no ritmo normal'],
      ]
        .map(
          ([id, t, d]) =>
            `<li><button class="pl-card" data-act="go" data-v="${id}"><span class="pl-card-t">${t}</span><span class="pl-card-d">${d}</span></button></li>`,
        )
        .join('')}
    </ul>${opts.clips?.credit ? `<p class="pl-tip pl-credit">${esc(opts.clips.credit)}</p>` : ''}`;

  // alfabeto
  let letterSel: string | null = null;
  let singing = false;
  const alfabetoHtml = () => {
    const l = letterSel ? letterByChar(letterSel) : null;
    const ex = l ? examples[l.letter] : undefined;
    return `<div class="pl-row">${back}<button class="pl-btn" data-act="cantar">${singing ? '■ Parar' : '▶ Ouvir o alfabeto todo'}</button></div>
    <h2 class="pl-h">Alfabeto francês</h2>
    <ul class="pl-letters" aria-label="Letras do alfabeto">
      ${ALPHABET.map((x) => `<li><button class="pl-letter ${letterSel === x.letter ? 'on' : ''}" data-act="letter" data-l="${x.letter}" aria-label="Letra ${x.letter}, ${esc(x.name)}"><span class="pl-lbig">${x.letter}</span><span class="pl-lsm">${esc(x.name)}</span></button></li>`).join('')}
    </ul>
    ${
      l
        ? `<div class="pl-detail"><p class="pl-dbig" aria-hidden="true">${l.letter}${l.letter.toLowerCase()}</p><div><p class="pl-dname">${esc(l.name)}</p><p class="pl-dpron">(${esc(l.pron)})</p>${
            ex
              ? `<p class="pl-dex">Palavra do e-book: <strong lang="fr">${esc(ex.fr)}</strong> · ${esc(ex.pt)}</p>`
              : `<p class="pl-dex">Ainda não há palavra do e-book com essa letra.</p>`
          }<div class="pl-row"><button class="pl-btn" data-act="letter" data-l="${l.letter}">▶ Ouvir de novo</button>${ex ? `<button class="pl-btn sec" data-act="sayword" data-t="${esc(ex.fr)}">▶ Ouvir a palavra</button>` : ''}</div></div></div>`
        : `<p class="pl-tip">Toque em uma letra para ouvir.</p>`
    }`;
  };

  // que letra é essa
  let ls = {
    i: 0,
    score: 0,
    avoid: [] as string[],
    round: listenRound(rng),
    answered: null as null | boolean,
    picked: '',
  };
  const ouvirHtml = () => {
    if (ls.i >= 10) {
      return `<div class="pl-end"><h2 class="pl-h">Voilà, bravo!</h2><p class="pl-big">✓ ${ls.score} de 10 letras certas.</p><div class="pl-row"><button class="pl-btn" data-act="restart">Jogar de novo</button>${back}</div></div>`;
    }
    const r = ls.round;
    return `<div class="pl-row">${back}<span class="pl-prog">Rodada ${ls.i + 1} de 10</span></div>
    <h2 class="pl-h">Que letra é essa?</h2>
    <p><button class="pl-btn" data-act="replay">▶ Ouvir de novo</button></p>
    <ul class="pl-opts" aria-label="Escolha a letra">${r.options
      .map((o) => {
        const state =
          ls.answered === null
            ? ''
            : o.letter === r.target.letter
              ? 'right'
              : o.letter === ls.picked
                ? 'wrong'
                : '';
        const mark = state === 'right' ? '✓ ' : state === 'wrong' ? '✗ ' : '';
        return `<li><button class="pl-opt ${state}" data-act="pick" data-l="${o.letter}" ${ls.answered !== null ? 'disabled' : ''}><span aria-hidden="true">${mark}</span>${o.letter}</button></li>`;
      })
      .join('')}</ul>
    ${ls.answered !== null ? `<p><button class="pl-btn" data-act="next">${ls.i + 1 < 10 ? 'Próxima' : 'Ver resultado'}</button></p>` : ''}`;
  };
  const newListen = () => {
    ls.round = listenRound(rng, ls.avoid);
    ls.avoid = [ls.round.target.letter, ...ls.avoid].slice(0, 12);
    ls.answered = null;
    ls.picked = '';
    void say(ls.round.target.name, ['Que letra é essa?', 'Ouça com atenção.']);
  };

  // soletrar
  let sp = {
    list: [] as Array<{ fr: string; pt: string }>,
    i: 0,
    filled: 0,
    hint: false,
    msg: '',
    bank: [] as string[],
    used: [] as number[],
    done: false,
  };
  const soletrarHtml = () => {
    if (sp.i >= sp.list.length) {
      return `<div class="pl-end"><h2 class="pl-h">Voilà, bravo!</h2><p class="pl-big">Você soletrou ${sp.list.length} palavras.</p><div class="pl-row"><button class="pl-btn" data-act="restart">Mais palavras</button>${back}</div></div>`;
    }
    const w = sp.list[sp.i]!;
    const slots = w.fr
      .toUpperCase()
      .split('')
      .map(
        (c, k) =>
          `<span class="pl-slot ${k < sp.filled ? 'fill' : ''}" aria-label="${k < sp.filled ? c : 'vazio'}">${k < sp.filled ? c : ''}</span>`,
      )
      .join('');
    return `<div class="pl-row">${back}<span class="pl-prog">Palavra ${sp.i + 1} de ${sp.list.length}</span></div>
    <h2 class="pl-h">Soletrar</h2>
    <p class="pl-mean">Significa: <strong>${esc(w.pt)}</strong></p>
    <p><button class="pl-btn" data-act="sayword" data-t="${esc(w.fr)}">▶ Ouvir a palavra</button></p>
    <div class="pl-slots" role="group" aria-label="Palavra em montagem">${slots}</div>
    <p class="pl-msg" role="status">${esc(sp.msg)}</p>
    ${
      sp.done
        ? `<p><button class="pl-btn" data-act="next">${sp.i + 1 < sp.list.length ? 'Próxima palavra' : 'Ver resultado'}</button></p>`
        : `<ul class="pl-bank" aria-label="Letras disponíveis">${sp.bank.map((c, k) => `<li><button class="pl-key" data-act="key" data-k="${k}" ${sp.used.includes(k) ? 'disabled' : ''}>${c}</button></li>`).join('')}</ul><p><button class="pl-btn ghost" data-act="hint">Dica: mostrar a próxima letra</button></p>`
    }`;
  };
  const newSpellWord = () => {
    const w = sp.list[sp.i];
    if (!w) return;
    sp.filled = 0;
    sp.hint = false;
    sp.done = false;
    sp.msg = '';
    sp.used = [];
    sp.bank = spellingBank(w.fr, rng, 2);
    void say(w.fr, ['Ouça a palavra e monte letra por letra.', w.pt], 0.8);
  };
  const startSpell = () => {
    const out = pickUnseen(words, saved.seenSpell, (x) => x.fr, 6, rng);
    saved.seenSpell = out.seen;
    persist();
    sp = { ...sp, list: out.picked, i: 0 };
    newSpellWord();
  };

  // memória
  let mem = {
    cards: [] as MemoryCard[],
    open: [] as string[],
    matched: new Set<string>(),
    moves: 0,
    lock: false,
  };
  const memoriaHtml = () => {
    const won = mem.cards.length > 0 && mem.matched.size === mem.cards.length;
    return `<div class="pl-row">${back}<span class="pl-prog">Jogadas: ${mem.moves}</span></div>
    <h2 class="pl-h">Memória</h2>
    <p class="pl-tip">Vire duas cartas: uma em francês e a tradução dela em português.</p>
    ${won ? `<div class="pl-end"><p class="pl-big">✓ Você achou todos os pares em ${mem.moves} jogadas!</p><button class="pl-btn" data-act="restart">Jogar de novo</button></div>` : ''}
    <ul class="pl-grid" aria-label="Cartas">${mem.cards
      .map((c) => {
        const shown = mem.open.includes(c.id) || mem.matched.has(c.id);
        return `<li><button class="pl-mem ${shown ? 'up' : ''} ${mem.matched.has(c.id) ? 'ok' : ''} ${c.side}" data-act="flip" data-id="${c.id}" ${shown ? 'disabled' : ''} aria-label="${shown ? esc(c.text) + (mem.matched.has(c.id) ? ' (par encontrado)' : '') : 'Carta virada para baixo'}"><span lang="${c.side}" ${shown ? '' : 'aria-hidden="true"'}>${shown ? esc(c.text) : '?'}</span></button></li>`;
      })
      .join('')}</ul>`;
  };
  const startMemory = () => {
    const d = memoryDeck(opts.vocab, 6, saved.seenMemory, rng);
    saved.seenMemory = d.seen;
    persist();
    mem = { cards: d.cards, open: [], matched: new Set(), moves: 0, lock: false };
    caption('Vamos jogar memória?', 'Combine cada palavra com a tradução.');
  };

  // frases
  let fr = { list: [] as PlayOptions['phrases'], i: 0 };
  const frasesHtml = () => {
    if (fr.i >= fr.list.length)
      return `<div class="pl-end"><h2 class="pl-h">Voilà, bravo!</h2><p class="pl-big">Você ouviu ${fr.list.length} frases.</p><div class="pl-row"><button class="pl-btn" data-act="restart">Mais frases</button>${back}</div></div>`;
    const p = fr.list[fr.i]!;
    return `<div class="pl-row">${back}<span class="pl-prog">Frase ${fr.i + 1} de ${fr.list.length}</span></div>
    <h2 class="pl-h">Repita comigo</h2>
    <div class="pl-phrase"><p lang="fr" class="pl-pfr">${esc(p.fr)}</p>${p.pron ? `<p class="pl-ppron">(${esc(p.pron)})</p>` : ''}<p class="pl-ppt">${esc(p.pt)}</p></div>
    <div class="pl-row"><button class="pl-btn" data-act="say" data-slow="0">▶ Ouvir</button><button class="pl-btn sec" data-act="say" data-slow="1">▶ Ouvir devagar</button><button class="pl-btn" data-act="next">${fr.i + 1 < fr.list.length ? 'Próxima frase' : 'Terminar'}</button></div>
    <p class="pl-tip">Diga a frase em voz alta, imitando a Iasmyn.</p>`;
  };
  const startPhrases = () => {
    const out = pickUnseen(
      opts.phrases.filter((p) => p.fr.split(' ').length <= 10),
      saved.seenPhrase,
      (x) => x.fr,
      5,
      rng,
    );
    saved.seenPhrase = out.seen;
    persist();
    fr = { list: out.picked, i: 0 };
    sayPhrase();
  };
  const sayPhrase = (slow = false) => {
    const p = fr.list[fr.i];
    if (p) void say(p.fr, ['Repita comigo!', p.pt], slow ? 0.6 : 0.85);
  };

  const render = () => {
    body.innerHTML = {
      home: homeHtml,
      alfabeto: alfabetoHtml,
      ouvir: ouvirHtml,
      soletrar: soletrarHtml,
      memoria: memoriaHtml,
      frases: frasesHtml,
    }[view]();
  };
  const go = (v: View) => {
    speaker.cancel();
    singing = false;
    view = v;
    if (v === 'home') caption('Bonjour! Eu sou a Iasmyn.', 'Escolha uma brincadeira.');
    if (v === 'alfabeto') {
      letterSel = null;
      caption('Vamos aprender o alfabeto!', 'Toque em uma letra para ouvir.');
    }
    if (v === 'ouvir') {
      ls = { i: 0, score: 0, avoid: [], round: listenRound(rng), answered: null, picked: '' };
      newListen();
    }
    if (v === 'soletrar') startSpell();
    if (v === 'memoria') startMemory();
    if (v === 'frases') startPhrases();
    render();
  };

  // ---------- eventos ----------
  const onClick = (e: Event) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || !root.contains(el)) return;
    const act = el.dataset.act;
    const d = el.dataset;
    if (act === 'stop') return void speaker.cancel();
    if (act === 'testvoice')
      return void say(
        "Bonjour! Je m'appelle Iasmyn.",
        ["Bonjour! Je m'appelle Iasmyn.", 'Olá! Eu me chamo Iasmyn.'],
        0.9,
      );
    if (act === 'home') return go('home');
    if (act === 'go') return go(d.v as View);
    if (act === 'restart') return go(view);
    if (act === 'sayword') return void say(d.t!, undefined, 0.8);

    if (view === 'alfabeto') {
      if (act === 'letter') {
        const l = letterByChar(d.l!)!;
        letterSel = l.letter;
        singing = false;
        const ex = examples[l.letter];
        render();
        caption(`${l.letter}: ${l.name}`, `(${l.pron})${ex ? ` · ${ex.fr}` : ''}`);
        void speaker
          .say(l.name, { rate: 0.8 })
          .then(() =>
            ex && letterSel === l.letter ? speaker.say(ex.fr, { rate: 0.8 }) : undefined,
          );
      }
      if (act === 'cantar') {
        if (singing) {
          singing = false;
          speaker.cancel();
          return render();
        }
        singing = true;
        render();
        void speaker
          .seq(
            ALPHABET.map((l) => l.name),
            {
              rate: 0.8,
              gapMs: 350,
              onEach: (i) => {
                letterSel = ALPHABET[i]!.letter;
                caption(`${ALPHABET[i]!.letter}: ${ALPHABET[i]!.name}`, `(${ALPHABET[i]!.pron})`);
                render();
              },
            },
          )
          .then(() => {
            if (!singing) return;
            singing = false;
            caption('Voilà! Esse é o alfabeto.', 'Parabéns por ouvir até o fim!');
            render();
          });
      }
    }

    if (view === 'ouvir') {
      if (act === 'replay')
        void say(ls.round.target.name, ['Que letra é essa?', 'Ouça com atenção.']);
      if (act === 'pick' && ls.answered === null) {
        ls.picked = d.l!;
        const right = d.l === ls.round.target.letter;
        ls.answered = right;
        if (right) {
          ls.score++;
          addStars(1);
        }
        const t = ls.round.target;
        void say(
          right ? 'Voilà, bravo!' : t.name,
          right
            ? [`Voilà, bravo! É a letra ${t.letter}.`, `${t.name} (${t.pron})`]
            : [`Quase! Era a letra ${t.letter}.`, `${t.name} (${t.pron})`],
        );
        render();
      }
      if (act === 'next') {
        ls.i++;
        if (ls.i < 10) newListen();
        else void say('Voilà, bravo!', ['Voilà, bravo!', `Você acertou ${ls.score} de 10.`]);
        render();
      }
    }

    if (view === 'soletrar') {
      const w = sp.list[sp.i];
      if (act === 'key' && w && !sp.done) {
        const k = Number(d.k);
        const expected = w.fr[sp.filled]!.toUpperCase();
        if (sp.bank[k] === expected) {
          sp.filled++;
          sp.used.push(k);
          sp.msg = '';
          if (sp.filled === w.fr.length) {
            sp.done = true;
            if (!sp.hint) addStars(1);
            sp.msg = sp.hint
              ? '✓ Palavra completa! (com dica, sem estrela)'
              : '✓ Palavra completa! Ganhou uma estrela.';
            const names = w.fr
              .toUpperCase()
              .split('')
              .map((c) => letterByChar(c)?.name ?? c);
            caption(`${w.fr.toUpperCase().split('').join(' - ')}`, `${w.fr}: ${w.pt}`);
            void speaker.seq([...names, w.fr], { rate: 0.8, gapMs: 200 });
          }
        } else {
          sp.msg = `✗ Essa não é a próxima letra. Tente de novo.`;
        }
        render();
      }
      if (act === 'hint' && w && !sp.done) {
        sp.hint = true;
        const expected = w.fr[sp.filled]!.toUpperCase();
        sp.msg = `Dica: a próxima letra é ${expected} (${letterByChar(expected)?.name ?? ''}).`;
        void say(letterByChar(expected)?.name ?? expected);
        render();
      }
      if (act === 'next') {
        sp.i++;
        newSpellWord();
        render();
      }
    }

    if (view === 'memoria' && act === 'flip' && !mem.lock) {
      const id = d.id!;
      if (mem.open.includes(id) || mem.matched.has(id)) return;
      mem.open.push(id);
      const card = mem.cards.find((c) => c.id === id)!;
      if (card.side === 'fr') void speaker.say(card.text, { rate: 0.85 });
      if (mem.open.length === 2) {
        mem.moves++;
        const [a, b] = mem.open.map((x) => mem.cards.find((c) => c.id === x)!) as [
          MemoryCard,
          MemoryCard,
        ];
        if (a.pair === b.pair && a.side !== b.side) {
          mem.open.forEach((x) => mem.matched.add(x));
          mem.open = [];
          caption(
            'Voilà! Um par!',
            `${a.side === 'fr' ? a.text : b.text} = ${a.side === 'pt' ? a.text : b.text}`,
          );
          if (mem.matched.size === mem.cards.length) {
            addStars(3);
            void say('Voilà, bravo!', [
              'Voilà, bravo! Você achou todos os pares.',
              'Ganhou 3 estrelas.',
            ]);
          }
        } else {
          mem.lock = true;
          caption('Não é um par. Tente de novo!', '');
          later(() => {
            mem.open = [];
            mem.lock = false;
            render();
          }, 1100);
        }
      }
      render();
    }

    if (view === 'frases') {
      if (act === 'say') sayPhrase(d.slow === '1');
      if (act === 'next') {
        fr.i++;
        if (fr.i < fr.list.length) sayPhrase();
        else void say('Voilà, bravo!', ['Voilà, bravo!', 'Você ouviu todas as frases.']);
        render();
      }
    }
  };
  // o primeiro toque destrava a voz em celulares que exigem isso
  const onFirstTouch = () => speaker.unlock();
  root.addEventListener('pointerdown', onFirstTouch, { once: true });
  root.addEventListener('click', onClick);

  showStars();
  caption('Bonjour! Eu sou a Iasmyn.', 'Escolha uma brincadeira.');
  render();

  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('pointerdown', onFirstTouch);
    speaker.cancel();
    if (mouthTimer) clearInterval(mouthTimer);
    timers.forEach(clearTimeout);
    timers.clear();
    root.innerHTML = '';
  };
}
