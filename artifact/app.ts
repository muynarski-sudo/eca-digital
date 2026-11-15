// @ts-nocheck
/* Demo interativa do Falando Francês Prática para rodar como artefato: tudo no navegador, estado no localStorage.
   Reaproveita a lógica real (correção, SRS, domínio, plano diário, métricas) e o conteúdo do e-book. */
import unitsJson from '../content/data/units.json';
import vocabJson from '../content/data/vocab.json';
import questionsJson from '../content/data/questions.json';
import conjugationsJson from '../content/data/conjugations.json';
import cultureJson from '../content/data/culture.json';
import { gradeQuestion } from '../src/lib/domain/grade';
import { newCard, qualityFrom, review, isDue } from '../src/lib/domain/srs';
import { decayed, levelProgress, localDay, skillLabel, studyStreak, unitMastery, unitStates, updateMastery } from '../src/lib/domain/mastery';
import { buildDailyPlan } from '../src/lib/domain/plan';
import { weeklySummary } from '../src/lib/domain/metrics';
import { TAG_LABELS } from '../src/lib/data/weak';
import { PERSONS, TENSES } from '../src/lib/content/schema';
import { PERSON_LABELS, TENSE_LABELS, splitSubject } from '../src/lib/content/conjugation';

const UNITS = unitsJson;
const Q = questionsJson.filter((q) => !q.needs_review && q.type !== 'speak');
const QBY = new Map(Q.map((q) => [q.id, q]));
const VOCAB = vocabJson.filter((v) => !v.needs_review && v.category !== 'alfabeto' && v.category !== 'numeros');
const DAY = 86400000;
const KEY = 'ffp-demo-v1';
const SKILLS = [['vocabulario', 'Vocabulário'], ['gramatica', 'Gramática'], ['escuta', 'Escuta'], ['fala', 'Fala']];
const tagLabel = (t) => TAG_LABELS[t] ?? t.replace(/_/g, ' ');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const $ = (s, r = document) => r.querySelector(s);

// ---------- estado ----------
function rng(seed) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
function blankStudent(id, name, email, pw) {
  return { id, name, email, pw, access: 'active', attempts: [], mastery: {}, srs: {}, skills: {}, unlocks: [], consented: false };
}
function applyResult(st, itemId, kind, unit, skill, tags, grade, response, elapsedMs, now, quality, assignmentId) {
  if (kind === 'question') st.attempts.push({ q: itemId, v: grade.verdict, s: grade.score, tags, r: String(response).slice(0, 80), t: now.getTime(), a: assignmentId || null });
  const c = st.srs[itemId];
  const card = c ? { ease: c.ease, intervalDays: c.intervalDays, repetitions: c.repetitions, dueAt: new Date(c.due) } : newCard(now);
  const nx = review(card, quality ?? qualityFrom(grade.verdict, elapsedMs), now);
  st.srs[itemId] = { ease: nx.ease, intervalDays: nx.intervalDays, repetitions: nx.repetitions, due: nx.dueAt.getTime() };
  const m = st.mastery[itemId];
  st.mastery[itemId] = { m: updateMastery(m ? m.m : 0, m ? new Date(m.t) : null, grade.score, now), t: now.getTime() };
  const sk = st.skills[skill] ?? 0;
  st.skills[skill] = updateMastery(sk, null, grade.score, now);
}
function seedHistory(st) {
  const r = rng(7);
  const pool = Q.filter((q) => ['u01', 'u02', 'u03'].includes(q.unit) && !['dictation', 'match_pairs'].includes(q.type));
  for (let d = 14; d >= 0; d--) {
    if (r() < 0.2) continue;
    const when = Math.min(Date.now() - d * DAY + 12 * 3600000, Date.now() - 2 * 3600000 - 8 * 60000);
    for (let n = 0; n < 8; n++) {
      const q = pool[Math.floor(r() * pool.length)];
      const ok = r() < 0.8;
      const resp = ok ? q.answers[0] : q.type === 'multiple_choice' ? (q.choices.find((x) => x !== q.answers[0]) ?? 'x') : 'resposta errada';
      applyResult(st, q.id, 'question', q.unit, q.skill, q.error_tags, gradeQuestion(q, resp), resp, 4000 + Math.floor(r() * 9000), new Date(when + n * 60000));
    }
  }
  st.consented = true;
}
function initialState() {
  const aluno = blankStudent('s1', 'Aluno Teste', 'aluno@teste.local', 'aluno123');
  seedHistory(aluno);
  return { students: [aluno], cur: 's1', role: 'aluno', assignments: [], uid: 2 };
}
let S;
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch {}
  return initialState();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }
S = load();
const student = () => S.students.find((x) => x.id === S.cur) ?? S.students[0];

// ---------- cálculo de progresso (equivale a loadProgress) ----------
function progress(st, now = new Date()) {
  const itemMastery = {};
  for (const [id, m] of Object.entries(st.mastery)) itemMastery[id] = { mastery: m.m, lastPracticed: new Date(m.t) };
  const snaps = UNITS.map((u) => {
    const items = Q.filter((q) => q.unit === u.id);
    const mastery = unitMastery(items.map((q) => { const m = itemMastery[q.id]; return { weight: q.difficulty, mastery: m ? decayed(m.mastery, m.lastPracticed, now) : 0 }; }));
    return { u, items, mastery };
  });
  const states = unitStates(snaps.map((s) => ({ id: s.u.id, order: s.u.order, mastery: s.mastery, manuallyUnlocked: st.unlocks.includes(s.u.id) })));
  const units = snaps.map((s) => ({ unit: s.u, mastery: s.mastery, state: states[s.u.id], count: s.items.length, practiced: s.items.filter((q) => itemMastery[q.id]).length }));
  const days = [...new Set(st.attempts.map((a) => localDay(new Date(a.t))))];
  const due = Object.entries(st.srs).filter(([id, c]) => QBY.has(id) && isDue({ dueAt: new Date(c.due) }, now)).map(([id]) => id);
  const last = st.attempts.length ? new Date(Math.max(...st.attempts.map((a) => a.t))) : null;
  return { units, level: levelProgress(units), skills: Object.fromEntries(SKILLS.map(([k]) => [k, st.skills[k] ?? 0])), streak: studyStreak(days, localDay(now)), due, itemMastery, last };
}
function weakTags(st, days = 60) {
  const since = Date.now() - days * DAY; const map = new Map();
  for (const a of st.attempts) { if (a.t < since) continue; for (const t of a.tags ?? []) { const e = map.get(t) ?? { tag: t, errors: 0, n: 0 }; e.n++; if (a.v !== 'correct') e.errors++; map.set(t, e); } }
  return [...map.values()].filter((x) => x.errors > 0).sort((a, b) => b.errors - a.errors).slice(0, 8);
}

// ---------- componentes ----------
const ring = (v, size = 128) => {
  const pct = Math.round(v * 100), stroke = 12, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<div class="ring" role="img" aria-label="Progresso do nível A1: ${pct}%" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" aria-hidden="true" style="transform:rotate(-90deg)"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--tint)" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--blue)" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/></svg><span>${pct}%</span></div>`;
};
const badge = (v) => { const l = skillLabel(v); const ic = l === 'sólido' ? '✓' : l === 'em evolução' ? '↗' : '•'; return `<span class="badge b-${l === 'sólido' ? 'ok' : l === 'em evolução' ? 'mid' : 'low'}"><span aria-hidden="true">${ic}</span> ${Math.round(v * 100)}% · ${l}</span>`; };
const bar = (v, label) => `<div class="meter" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(v * 100)}"><i style="width:${Math.round(v * 100)}%"></i></div>`;
const streakChip = (d) => `<span class="chip"><span class="dot" aria-hidden="true">●</span> ${d === 0 ? 'Comece sua sequência hoje' : d === 1 ? '1 dia seguido' : d + ' dias seguidos'}</span>`;
const fr = (f, pt, pron) => `<div class="fr"><p lang="fr" class="frt">${esc(f)}${pron ? ` <span class="pron">(${esc(pron)})</span>` : ''}</p>${pt ? `<p class="pt">${esc(pt)}</p>` : ''}</div>`;
const speak = (text) => `<button class="btn ghost" data-a="say" data-t="${esc(text)}" aria-label="Ouvir"><span aria-hidden="true">▶</span> Ouvir</button>`;
const fmt = (t) => new Date(t).toLocaleDateString('pt-BR');
const sayNow = (text) => { try { const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch {} };

// ---------- execução de exercícios ----------
let run = null; // { qs, i, res, tally, title, back, assignmentId, t0, picked, pairs, text, choice, done }
function startRun(qs, title, back, assignmentId = null) {
  run = { qs, i: 0, res: null, tally: { correct: 0, almost: 0, wrong: 0 }, title, back, assignmentId, t0: Date.now(), picked: [], pairs: {}, text: '', choice: '' };
  location.hash = 'praticar';
  render();
}
const weakFirst = (st, list, now = new Date()) => [...list].sort((a, b) => { const ma = st.mastery[a.id], mb = st.mastery[b.id]; return (ma ? decayed(ma.m, new Date(ma.t), now) : 0) - (mb ? decayed(mb.m, new Date(mb.t), now) : 0) || a.id.localeCompare(b.id); });
function dailyPlanQuestions(st) {
  const p = progress(st); const open = p.units.filter((u) => u.state !== 'locked').map((u) => u.unit.id);
  const plan = buildDailyPlan({ questions: Q.filter((q) => q.type !== 'dictation'), itemMastery: p.itemMastery, dueQuestionIds: p.due, now: new Date(), unitMastery: Object.fromEntries(p.units.map((u) => [u.unit.id, u.mastery])), openUnits: open });
  let list = plan.ids.map((id) => QBY.get(id)).filter(Boolean);
  if (!list.length) list = weakFirst(st, Q.filter((q) => q.unit === 'u01' && q.type !== 'dictation')).slice(0, 10);
  return { list, weakest: plan.weakestUnit };
}

// ---------- telas do aluno ----------
function vInicio() {
  const st = student(), p = progress(st), plan = dailyPlanQuestions(st);
  const mine = S.assignments.filter((a) => a.sid === st.id);
  const todo = mine.filter((a) => a.status === 'assigned' || a.status === 'in_progress');
  const rev = mine.filter((a) => a.status === 'reviewed' && a.feedback).slice(-1)[0];
  const weakest = p.units.find((u) => u.unit.id === plan.weakest);
  return `<section class="hero"><h1>Bienvenu(e), ${esc(st.name.split(' ')[0])}!</h1><p>Um pouquinho por dia leva longe.</p></section>
  <div class="grid3"><div class="card center">${ring(p.level)}<p class="strong">Seu progresso no A1</p>${streakChip(p.streak)}</div>
  <div class="span2 stack"><div class="card tint"><h2>Treino de hoje · 10 minutos</h2><p>${p.due.length ? Math.min(p.due.length, 6) + ' revisões na fila' : 'Sem revisões vencidas'}${weakest ? ' e a unidade mais fraca: ' + esc(weakest.unit.title) + '.' : '.'}</p><button class="btn" data-a="treino">On y va!</button></div>
  <div class="card"><h2>Tarefa da professora</h2>${todo.length ? todo.map((a) => `<div class="row"><div><p class="strong">${esc(a.title)}</p><p class="small">Prazo: ${fmt(a.due)}${a.due < Date.now() ? ' <span class="badge b-warn">! Atrasada</span>' : ''}</p></div><button class="btn sec" data-a="tarefa" data-id="${a.id}">Fazer tarefa</button></div>`).join('') : '<p>Nada pendente por aqui. Que tal revisar algo?</p>'}
  ${rev ? `<div class="note"><b>Recado da professora${rev.grade != null ? ' · nota ' + rev.grade : ''}</b><p>${esc(rev.feedback)}</p></div>` : ''}</div></div></div>`;
}
function vTrilha() {
  const p = progress(student());
  return `<section class="hero"><h1>Trilha A1</h1><p>Dominando 70% de uma unidade, a próxima se abre. A professora também pode liberar.</p></section><ol class="grid2">${p.units.map((u) => `<li><div class="card ${u.state === 'locked' ? 'locked' : ''}"><div class="row"><p class="small strong">Unidade ${u.unit.order}</p>${u.state === 'locked' ? '<span class="badge b-low">🔒 Bloqueada</span>' : u.state === 'mastered' ? '<span class="badge b-ok">✓ Dominada</span>' : '<span class="badge b-mid">Em andamento</span>'}</div><h2>${esc(u.unit.title)}</h2><p>${esc(u.unit.objective)}</p>${u.state !== 'locked' ? `${badge(u.mastery)}<p><a href="#unidade-${u.unit.id}" class="strong">Abrir unidade →</a></p>` : '<p class="small">Abre quando você dominar 70% da unidade anterior.</p>'}</div></li>`).join('')}</ol>`;
}
function vUnidade(id) {
  const st = student(), p = progress(st), u = p.units.find((x) => x.unit.id === id);
  if (!u || u.state === 'locked') return `<div class="card">Unidade bloqueada. <a href="#trilha">Voltar à trilha</a></div>`;
  const vs = VOCAB.filter((v) => v.unit === id), cats = [...new Set(vs.map((v) => v.category))];
  const tips = cultureJson.filter((t) => t.unit === id);
  return `<section class="hero"><h1>Unidade ${u.unit.order}: ${esc(u.unit.title)}</h1><p>${esc(u.unit.objective)}</p><div class="actions">${badge(u.mastery)}<button class="btn" data-a="praticar-unidade" data-id="${id}">Praticar esta unidade</button><button class="btn sec" data-a="flash" data-id="${id}">Flashcards</button></div></section>
  ${tips.map((t) => `<aside class="card tint"><p class="strong">Dica cultural: ${esc(t.title)}</p><p>${esc(t.text)}</p></aside>`).join('')}
  <h2 class="sec-h">Vocabulário</h2>${cats.map((c) => `<div class="card"><h3 class="cat">${esc(c.replace(/_/g, ' '))}</h3><ul class="grid2 plain">${vs.filter((v) => v.category === c).map((v) => `<li class="row">${fr(v.fr, v.pt, v.pron)}${speak(v.fr)}</li>`).join('')}</ul></div>`).join('')}`;
}
function vPraticar() {
  if (!run) return `<div class="card">Nenhum exercício em andamento. <a href="#inicio">Voltar ao início</a></div>`;
  const r = run, total = r.qs.length;
  if (r.i >= total) {
    const t = r.tally; const a = r.assignmentId ? S.assignments.find((x) => x.id === r.assignmentId) : null;
    return `<section class="card tint center narrow"><h1>On y va, c'est fini!</h1><p class="big">✓ ${t.correct} certas · ≈ ${t.almost} quase · ✗ ${t.wrong} para rever, de ${total}.</p><p>O que você errou volta nas suas revisões, no momento certo.</p><div class="actions c">${a && a.status !== 'submitted' && a.status !== 'reviewed' ? `<button class="btn" data-a="entregar" data-id="${a.id}">Entregar tarefa à professora</button>` : ''}${a && a.status === 'submitted' ? '<p class="ok">✓ Tarefa entregue. Merci!</p>' : ''}<a class="btn sec" href="${r.back}">Voltar</a></div></section>`;
  }
  const q = r.qs[r.i], pct = Math.round((r.i / total) * 100), done = !!r.res;
  let body = '';
  if (['fill_blank', 'translate_pt_fr', 'write_out', 'conjugate', 'dictation'].includes(q.type)) body = `<label for="resp" class="strong">Sua resposta</label><input id="resp" class="field" lang="fr" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(r.text)}" ${done ? 'disabled' : ''}>`;
  if (q.type === 'multiple_choice') body = `<fieldset ${done ? 'disabled' : ''}><legend class="sr">Escolha uma resposta</legend>${q.choices.map((c) => `<label class="opt ${r.choice === c ? 'on' : ''}"><input type="radio" name="choice" value="${esc(c)}" ${r.choice === c ? 'checked' : ''}> ${esc(c)}</label>`).join('')}</fieldset>`;
  if (q.type === 'order_words') { const pool = q.words.map((w, i) => [w, i]).filter(([, i]) => !r.picked.includes(i)); body = `<div class="chips mine" aria-label="Sua frase">${r.picked.map((i) => `<button class="word on" data-a="unpick" data-i="${i}" lang="fr" ${done ? 'disabled' : ''}>${esc(q.words[i])}</button>`).join('')}</div><div class="chips" aria-label="Palavras disponíveis">${pool.map(([w, i]) => `<button class="word" data-a="pick" data-i="${i}" lang="fr" ${done ? 'disabled' : ''}>${esc(w)}</button>`).join('')}</div>`; }
  if (q.type === 'match_pairs') { const rights = [...q.pairs.map((p) => p.right)].sort((a, b) => ((a.length * 7 + a.charCodeAt(0)) % 11) - ((b.length * 7 + b.charCodeAt(0)) % 11)); body = q.pairs.map((p, i) => `<div class="row left"><label for="pr${i}" lang="fr" class="strong minw">${esc(p.left)}</label><select id="pr${i}" class="field" data-left="${esc(p.left)}" ${done ? 'disabled' : ''}><option value="">Escolha…</option>${rights.map((x) => `<option ${r.pairs[p.left] === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>`).join(''); }
  const audio = q.type === 'dictation' ? `<p>${speak(q.audio_text)}</p>` : '';
  const fb = r.res ? (() => { const v = r.res.verdict; const m = { correct: ['✓', 'Voilà, bravo!', 'fb-ok'], almost: ['≈', 'Quase! Falta um detalhe, como um acento.', 'fb-mid'], wrong: ['✗', 'Ainda não, mas você chega lá.', 'fb-bad'] }[v]; return `<div role="status" aria-live="polite" class="fb ${m[2]}"><p class="strong big"><span aria-hidden="true">${m[0]}</span> ${m[1]}</p>${v !== 'correct' ? `<p>Forma correta: <strong lang="fr">${esc(r.res.expected)}</strong></p>` : ''}<p>${esc(q.explanation)}</p></div>`; })() : '';
  return `<section class="narrow"><div class="row small strong"><span>${esc(r.title)}</span><span>${r.i + 1} de ${total}</span></div>${bar(r.i / total, 'Progresso da sessão')}<div class="card stack"><p class="strong q">${esc(q.prompt)}</p>${q.hint && !done ? `<p class="small">Dica: ${esc(q.hint)}</p>` : ''}${audio}${body}${fb}<div class="actions">${!done ? '<button class="btn" data-a="conferir">Conferir</button>' : `<button class="btn" data-a="proxima">${r.i + 1 < total ? 'Continuar' : 'Ver resumo'}</button>`}<a href="${r.back}">Sair</a></div></div></section>`;
}
let fc = null; // flashcards
function vFlash() {
  const st = student();
  if (!fc) {
    const nowT = Date.now(); const dueIds = Object.entries(st.srs).filter(([id, c]) => id.startsWith('v:') && c.due <= nowT).map(([id]) => id.slice(2));
    const known = new Set(Object.keys(st.srs).filter((k) => k.startsWith('v:')).map((k) => k.slice(2)));
    const open = new Set(progress(st).units.filter((u) => u.state !== 'locked').map((u) => u.unit.id));
    const due = VOCAB.filter((v) => dueIds.includes(v.id));
    const fresh = VOCAB.filter((v) => !known.has(v.id) && open.has(v.unit) && (!fcUnit || v.unit === fcUnit)).slice(0, Math.max(0, 15 - due.length));
    fc = { cards: [...due, ...fresh], i: 0, shown: false, t0: Date.now() };
  }
  const c = fc.cards[fc.i];
  if (!fc.cards.length) return `<div class="card tint center"><p class="strong">Nenhum cartão para hoje.</p><p>Volte amanhã ou escolha uma unidade na trilha.</p></div>`;
  if (!c) return `<div class="card tint center"><h1>Voilà, bravo!</h1><p>Você revisou ${fc.cards.length} cartões. Eles voltam no momento certo.</p><a class="btn" href="#inicio">Voltar</a></div>`;
  return `<section class="narrow"><div class="row small strong"><span>Flashcards</span><span>${fc.i + 1} de ${fc.cards.length}</span></div>${bar(fc.i / fc.cards.length, 'Progresso')}<div class="card center stack"><p lang="fr" class="huge">${esc(c.fr)}</p>${speak(c.fr)}${fc.shown ? `<div aria-live="polite">${c.pron ? `<p class="small">(${esc(c.pron)})</p>` : ''}<p class="big">${esc(c.pt)}</p>${c.example ? `<p class="small" lang="fr">${esc(c.example.fr)} · ${esc(c.example.pt)}</p>` : ''}</div><div class="grid4"><button class="btn danger" data-a="rate" data-q="1"><span aria-hidden="true">✗</span> Errei</button><button class="btn sec" data-a="rate" data-q="3">Difícil</button><button class="btn sec" data-a="rate" data-q="4">Bom</button><button class="btn" data-a="rate" data-q="5">Fácil</button></div>` : '<button class="btn sec" data-a="reveal">Mostrar tradução</button>'}</div></section>`;
}
let fcUnit = null;
let cj = { verb: 'conj-avoir', tense: 'present', mode: 'tabela' };
function vConj() {
  const v = conjugationsJson.find((c) => c.id === cj.verb) ?? conjugationsJson[0];
  const head = `<section class="hero"><h1>Laboratório de conjugação</h1><p>17 verbos em 5 tempos, direto das tabelas do e-book.</p></section><div class="card"><div class="actions"><div><label for="cv" class="strong">Verbo</label><select id="cv" class="field">${conjugationsJson.map((c) => `<option value="${c.id}" ${c.id === v.id ? 'selected' : ''}>${esc(c.verb)} (${esc(c.pt)})</option>`).join('')}</select></div><div><label for="ct" class="strong">Tempo</label><select id="ct" class="field">${TENSES.map((t) => `<option value="${t}" ${t === cj.tense ? 'selected' : ''}>${TENSE_LABELS[t]}</option>`).join('')}</select></div><button class="btn sec" data-a="conj-tabela">Ver tabela</button><button class="btn" data-a="conj-praticar">Praticar</button></div></div>`;
  return head + `<div class="card"><h2><span lang="fr">${esc(v.verb)}</span> · ${esc(v.pt)} · ${TENSE_LABELS[cj.tense]}</h2><table><caption class="sr">Conjugação</caption><thead><tr><th scope="col">Pessoa</th><th scope="col">Forma</th></tr></thead><tbody>${PERSONS.map((p) => `<tr><th scope="row" class="muted">${PERSON_LABELS[p]}</th><td lang="fr" class="frt">${esc(v.tenses[cj.tense][p])}</td></tr>`).join('')}</tbody></table></div>`;
}
function vEvolucao() {
  const st = student(), p = progress(st), w = weakTags(st);
  const hist = [...st.attempts].slice(-20).reverse(); const VR = { correct: '✓ Certa', almost: '≈ Quase', wrong: '✗ Errada' };
  return `<section class="hero"><h1>Sua evolução</h1><p>O progresso é a média do domínio das unidades. Ele cai um pouco se você ficar muito tempo sem praticar.</p></section>
  <div class="grid3"><div class="card center">${ring(p.level)}${streakChip(p.streak)}</div><div class="card span2"><h2>Por habilidade</h2><ul class="grid2 plain">${SKILLS.map(([k, l]) => `<li><p class="strong">${l}</p>${badge(p.skills[k])}</li>`).join('')}</ul></div></div>
  <div class="card"><h2>Domínio por unidade</h2><ul class="plain stack">${p.units.map((u) => `<li class="row"><div class="grow"><p class="strong">${u.unit.order}. ${esc(u.unit.title)}</p>${bar(u.mastery, 'Domínio de ' + u.unit.title)}</div>${badge(u.mastery)}</li>`).join('')}</ul></div>
  <div class="card"><h2>Pontos para reforçar</h2>${w.length ? `<ul class="plain">${w.map((x) => `<li class="row"><span>${esc(tagLabel(x.tag))}</span><span class="muted">✗ ${x.errors} de ${x.n}</span></li>`).join('')}</ul>` : '<p>Ainda não há erros suficientes para apontar pontos fracos.</p>'}</div>
  <div class="card"><h2>Últimas respostas</h2><ul class="plain small">${hist.map((a) => `<li class="row"><span class="trunc">${esc((QBY.get(a.q) ?? {}).prompt ?? a.q)}</span><span class="strong nowrap">${VR[a.v]} · ${fmt(a.t)}</span></li>`).join('')}</ul></div>`;
}

// ---------- telas da professora ----------
function vAlunos() {
  const rows = S.students.map((s) => { const p = progress(s); const d = p.last ? Math.max(0, Math.floor((Date.now() - p.last.getTime()) / DAY)) : null; return { s, p, d }; });
  return `<section class="hero"><h1>Seus alunos</h1><p>Última atividade e progresso no nível.</p></section>
  <ul class="plain stack">${rows.map(({ s, p, d }) => `<li><div class="card row"><div><a href="#aluno-${s.id}" class="strong big">${esc(s.name)}</a><p class="small">${esc(s.email)}</p><p class="small">${d === null ? 'Ainda não praticou' : d === 0 ? 'Praticou hoje' : 'Última atividade há ' + d + ' dia' + (d > 1 ? 's' : '')} · sequência: ${p.streak}</p></div><div class="actions">${s.access === 'paused' ? '<span class="badge b-warn">! Acesso pausado</span>' : ''}${d !== null && d >= 7 ? `<span class="badge b-warn">! Parado há ${d} dias</span>` : ''}${badge(p.level)}</div></div></li>`).join('')}</ul>
  <div class="card"><h2>Cadastrar aluno</h2><p class="small">Você cria o e-mail e a senha e passa ao aluno. (Nesta demonstração o cadastro fica só neste aparelho.)</p><form id="cad" class="stack"><label for="cn" class="strong">Nome do aluno</label><input id="cn" class="field" required autocomplete="off"><label for="ce" class="strong">E-mail (será o login)</label><input id="ce" type="email" class="field" required autocomplete="off"><label for="cp" class="strong">Senha</label><div class="row left"><input id="cp" class="field" required minlength="8" autocomplete="off"><button type="button" class="btn sec" data-a="gerar">Gerar</button></div><button class="btn" type="submit">Cadastrar aluno</button><p id="cad-msg" role="status"></p></form></div>`;
}
function vAluno(id) {
  const s = S.students.find((x) => x.id === id); if (!s) return `<div class="card">Aluno não encontrado. <a href="#alunos">Voltar</a></div>`;
  const p = progress(s), w = weakTags(s); const hist = [...s.attempts].slice(-15).reverse(); const VR = { correct: '✓ Certa', almost: '≈ Quase', wrong: '✗ Errada' };
  const weakItems = Object.entries(p.itemMastery).sort((a, b) => a[1].mastery - b[1].mastery).slice(0, 6).filter(([k]) => QBY.has(k));
  return `<section class="hero"><h1>${esc(s.name)}</h1><p>${esc(s.email)}</p><div class="actions">${badge(p.level)}<span>Sequência: ${p.streak} dia(s)</span>${s.access === 'paused' ? '<span class="badge b-warn">! Acesso pausado</span>' : '<span class="badge b-ok">✓ Acesso liberado</span>'}</div></section>
  <div class="grid2"><div class="card stack"><h2>Acesso</h2><button class="btn ${s.access === 'paused' ? '' : 'danger'}" data-a="pausar" data-id="${s.id}">${s.access === 'paused' ? 'Liberar acesso' : 'Pausar acesso'}</button><form id="pwd" class="stack"><label for="np" class="strong">Nova senha</label><input id="np" class="field" minlength="8" required autocomplete="off"><button class="btn sec" type="submit">Definir nova senha</button><p id="pwd-msg" role="status"></p></form></div>
  <div class="card stack"><h2>Atribuir tarefa de casa</h2><form id="atr" class="stack"><label for="at" class="strong">Título</label><input id="at" class="field" required><label for="au" class="strong">Unidade</label><select id="au" class="field">${UNITS.map((u) => `<option value="${u.id}">${u.order}. ${esc(u.title)}</option>`).join('')}</select><label for="ad" class="strong">Prazo</label><input id="ad" type="date" class="field" required value="${new Date(Date.now() + 7 * DAY).toISOString().slice(0, 10)}"><button class="btn" type="submit">Atribuir</button><p id="atr-msg" role="status"></p></form></div></div>
  <div class="card"><h2>Domínio por unidade</h2><ul class="plain stack">${p.units.map((u) => `<li class="row"><div class="grow"><p class="strong">${u.unit.order}. ${esc(u.unit.title)}</p><p class="small">${u.practiced} de ${u.count} exercícios praticados · ${u.state === 'locked' ? 'bloqueada' : u.state === 'mastered' ? 'dominada' : 'em andamento'}</p></div><div class="actions">${badge(u.mastery)}${u.state === 'locked' ? `<button class="btn sec" data-a="liberar" data-id="${s.id}" data-u="${u.unit.id}">Liberar</button>` : ''}${s.unlocks.includes(u.unit.id) ? `<button class="btn ghost" data-a="travar" data-id="${s.id}" data-u="${u.unit.id}">Desfazer liberação</button>` : ''}</div></li>`).join('')}</ul></div>
  <div class="grid2"><div class="card"><h2>Erros mais frequentes</h2>${w.length ? `<ul class="plain">${w.map((x) => `<li class="row"><span>${esc(tagLabel(x.tag))}</span><span>✗ ${x.errors} de ${x.n}</span></li>`).join('')}</ul>` : '<p>Sem erros registrados.</p>'}</div><div class="card"><h2>Itens mais fracos</h2><ul class="plain small">${weakItems.map(([k, v]) => `<li class="row"><span class="trunc">${esc(QBY.get(k).prompt)}</span><span>${Math.round(v.mastery * 100)}%</span></li>`).join('') || '<li>Ainda sem prática.</li>'}</ul></div></div>
  <div class="card"><h2>Histórico recente</h2><ul class="plain small">${hist.map((a) => `<li class="row"><span class="trunc">${esc((QBY.get(a.q) ?? {}).prompt ?? a.q)} <span class="muted">→ ${esc(a.r)}</span></span><span class="strong nowrap">${VR[a.v]} · ${fmt(a.t)}</span></li>`).join('')}</ul></div>
  <div class="card stack danger-zone"><h2>Descadastrar</h2><p>Apaga a conta de ${esc(s.name)} e todos os dados dele. Não dá para desfazer. Para só suspender, use “Pausar acesso”.</p><form id="del" class="stack"><label for="dc" class="strong">Digite EXCLUIR para confirmar</label><input id="dc" class="field" autocomplete="off"><button class="btn danger" type="submit">Descadastrar aluno</button><p id="del-msg" role="alert"></p></form></div><p><a href="#alunos">← Voltar para a lista</a></p>`;
}
function vTarefas() {
  const order = { submitted: 0, in_progress: 1, assigned: 2, reviewed: 3 }; const L = { assigned: ['Atribuída', 'low'], in_progress: ['Em andamento', 'mid'], submitted: ['! Entregue, aguarda feedback', 'warn'], reviewed: ['✓ Corrigida', 'ok'] };
  const list = [...S.assignments].sort((a, b) => order[a.status] - order[b.status]);
  return `<section class="hero"><h1>Tarefas de casa</h1><p>As entregues aparecem primeiro. Escreva o feedback e o aluno vê no início.</p></section>${list.length ? `<ul class="plain stack">${list.map((a) => { const s = S.students.find((x) => x.id === a.sid); const res = s ? s.attempts.filter((t) => t.a === a.id) : []; const acc = res.length ? Math.round((res.reduce((x, t) => x + t.s, 0) / res.length) * 100) : null; return `<li><div class="card stack"><div class="row"><div><p class="strong big">${esc(a.title)}</p><p class="small">${esc(s ? s.name : '(aluno removido)')} · prazo ${fmt(a.due)}</p></div><span class="badge b-${L[a.status][1]}">${L[a.status][0]}</span></div>${acc !== null ? `<p class="small">Resultado: ${res.length} respostas, ${acc}% de acerto.</p>` : ''}${a.status === 'submitted' || a.status === 'reviewed' ? `<form class="stack gf" data-id="${a.id}"><label class="strong">Nota (0 a 10)<input class="field gn" type="number" min="0" max="10" step="0.5" value="${a.grade ?? ''}"></label><label class="strong">Feedback para o aluno<textarea class="field gt" rows="3">${esc(a.feedback ?? '')}</textarea></label><button class="btn" type="submit">Salvar feedback</button></form>` : ''}</div></li>`; }).join('')}</ul>` : '<div class="card tint center"><p class="strong">Nenhuma tarefa ainda</p><p>Atribua pela página de cada aluno.</p></div>'}`;
}
function vResumo() {
  const now = new Date();
  return `<section class="hero"><h1>Resumo semanal</h1><p>Últimos 7 dias, antes da próxima aula.</p></section><ul class="grid2 plain">${S.students.map((s) => { const w = weeklySummary(s.attempts.map((a) => ({ studentId: s.id, at: new Date(a.t), verdict: a.v, score: a.s, tags: a.tags })), now); return `<li><div class="card"><h2>${esc(s.name)}</h2>${w.attempts === 0 ? '<p><span aria-hidden="true">● </span>Não praticou nesta semana.</p>' : `<p>${w.attempts} respostas em ${w.daysStudied} dia(s), ${Math.round((w.accuracy ?? 0) * 100)}% de acerto.</p>${w.topErrorTags.length ? `<p class="muted">Para reforçar na aula: ${w.topErrorTags.map((t) => tagLabel(t.tag) + ' (' + t.errors + ')').join(', ')}.</p>` : ''}`}</div></li>`; }).join('')}</ul>`;
}

// ---------- casca, rotas e eventos ----------
const NAV_A = [['inicio', 'Início'], ['trilha', 'Trilha'], ['flashcards', 'Flashcards'], ['conjugacao', 'Conjugação'], ['evolucao', 'Evolução']];
const NAV_P = [['alunos', 'Alunos'], ['tarefas', 'Tarefas'], ['resumo', 'Resumo semanal']];
function route() { const h = (location.hash || '').replace('#', ''); return h || (S.role === 'aluno' ? 'inicio' : 'alunos'); }
function view(r) {
  if (S.role === 'aluno') {
    const st = student();
    if (st.access === 'paused') return `<div class="card center narrow"><h1>Seu acesso está pausado</h1><p>A professora pausou o seu acesso por enquanto. Fale com ela.</p></div>`;
    if (!st.consented) return `<div class="card narrow stack"><h1>Antes de começar</h1><p>Sua professora criou o seu acesso. Falta só confirmar três coisas.</p><fieldset class="stack tint pad"><legend class="sr">Aceites</legend><label class="chk"><input type="checkbox" class="acc"> Li e aceito a Política de Privacidade.</label><label class="chk"><input type="checkbox" class="acc"> Li e aceito o Termo de Uso.</label><label class="chk"><input type="checkbox" class="acc"> Tenho 18 anos ou mais, ou tenho autorização do meu responsável.</label></fieldset><button class="btn" data-a="aceitar">Aceitar e continuar</button><p id="acc-msg" role="alert"></p></div>`;
    if (r.startsWith('unidade-')) return vUnidade(r.slice(8));
    return { inicio: vInicio, trilha: vTrilha, praticar: vPraticar, flashcards: vFlash, conjugacao: vConj, evolucao: vEvolucao }[r]?.() ?? vInicio();
  }
  if (r.startsWith('aluno-')) return vAluno(r.slice(6));
  return { alunos: vAlunos, tarefas: vTarefas, resumo: vResumo }[r]?.() ?? vAlunos();
}
function render() {
  const r = route(); const nav = S.role === 'aluno' ? NAV_A : NAV_P; const active = r.startsWith('aluno-') ? 'alunos' : r.startsWith('unidade-') ? 'trilha' : r;
  const studs = S.role === 'aluno' && S.students.length > 1 ? `<label class="small">Aluno <select id="who" class="field mini">${S.students.map((s) => `<option value="${s.id}" ${s.id === S.cur ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>` : '';
  $('#app').innerHTML = `<div class="bar" aria-hidden="true"><i></i><i></i><i></i></div><header class="top"><div class="inner"><a class="brand" href="#${S.role === 'aluno' ? 'inicio' : 'alunos'}">Falando Francês <span>Prática</span></a><div class="who"><div class="seg" role="group" aria-label="Quem está usando"><button data-a="role" data-r="aluno" aria-pressed="${S.role === 'aluno'}">Aluno</button><button data-a="role" data-r="professora" aria-pressed="${S.role === 'professora'}">Professora</button></div>${studs}</div></div><nav aria-label="Principal" class="inner nav">${nav.map(([h, l]) => `<a href="#${h}" ${active === h ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav></header><main class="inner" id="conteudo">${view(r)}</main><footer><div class="inner row"><span>Demonstração: os dados ficam só neste aparelho.</span><button class="link" data-a="reset">Recomeçar demo</button></div></footer>`;
  window.scrollTo(0, 0);
}
function msg(id, text, ok = true) { const el = $(id); if (el) { el.textContent = (ok ? '✓ ' : '✗ ') + text; el.className = ok ? 'ok' : 'err'; } }
const words = ['sol', 'lua', 'mar', 'rio', 'pao', 'vinho', 'queijo', 'cafe', 'paris', 'lyon', 'nice', 'rosa', 'azul', 'bleu', 'rouge', 'blanc'];

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a; const st = student(); const d = b.dataset;
  if (a === 'say') return sayNow(d.t);
  if (a === 'role') { S.role = d.r; run = null; fc = null; save(); location.hash = ''; return render(); }
  if (a === 'reset') { try { localStorage.removeItem(KEY); } catch {} S = initialState(); run = null; fc = null; location.hash = ''; save(); return render(); }
  if (a === 'treino') { const { list } = dailyPlanQuestions(st); return startRun(list, 'Treino de hoje', '#inicio'); }
  if (a === 'praticar-unidade') { const qs = weakFirst(st, Q.filter((q) => q.unit === d.id)).slice(0, 12); return startRun(qs, UNITS.find((u) => u.id === d.id).title, '#unidade-' + d.id); }
  if (a === 'tarefa') { const t = S.assignments.find((x) => x.id === d.id); const qs = weakFirst(st, Q.filter((q) => q.unit === t.unit)).slice(0, 12); if (t.status === 'assigned') t.status = 'in_progress'; save(); return startRun(qs, t.title, '#inicio', t.id); }
  if (a === 'entregar') { const t = S.assignments.find((x) => x.id === d.id); t.status = 'submitted'; save(); return render(); }
  if (a === 'flash') { fcUnit = d.id; fc = null; location.hash = 'flashcards'; return render(); }
  if (a === 'reveal') { fc.shown = true; return render(); }
  if (a === 'rate') { const c = fc.cards[fc.i], qlt = +d.q; const verdict = qlt >= 4 ? 'correct' : qlt === 3 ? 'almost' : 'wrong'; applyResult(st, 'v:' + c.id, 'vocab', c.unit, 'vocabulario', [], { verdict, score: verdict === 'correct' ? 1 : verdict === 'almost' ? 0.5 : 0, expected: '' }, '', 0, new Date(), qlt); save(); fc.i++; fc.shown = false; return render(); }
  if (a === 'conj-tabela') { cj.mode = 'tabela'; cj.verb = $('#cv').value; cj.tense = $('#ct').value; return render(); }
  if (a === 'conj-praticar') { cj.verb = $('#cv').value; cj.tense = $('#ct').value; const v = conjugationsJson.find((c) => c.id === cj.verb); const qs = PERSONS.map((p) => { const { subject, form } = splitSubject(v.tenses[cj.tense][p]); return { id: `conj:${v.id}:${cj.tense}:${p}`, unit: null, type: 'conjugate', skill: 'gramatica', prompt: `Conjugue ${v.verb} (${v.pt}) no ${TENSE_LABELS[cj.tense]}: ${subject}_____`, answers: [form], explanation: `${v.verb}: ${v.tenses[cj.tense][p]}`, error_tags: ['conjugacao_' + v.id.replace('conj-', '')], difficulty: 1 }; }); return startRun(qs, `${v.verb} · ${TENSE_LABELS[cj.tense]}`, '#conjugacao'); }
  if (a === 'pick') { run.picked.push(+d.i); return render(); }
  if (a === 'unpick') { run.picked = run.picked.filter((x) => x !== +d.i); return render(); }
  if (a === 'conferir') {
    const q = run.qs[run.i]; let resp;
    if (q.type === 'multiple_choice') resp = run.choice; else if (q.type === 'order_words') resp = run.picked.map((i) => q.words[i]).join(' '); else if (q.type === 'match_pairs') resp = { pairs: Object.entries(run.pairs).map(([left, right]) => ({ left, right })) }; else resp = $('#resp')?.value ?? '';
    if ((typeof resp === 'string' && !resp.trim()) || (typeof resp === 'object' && resp.pairs.length < q.pairs.length)) return;
    const g = gradeQuestion(q, resp); run.res = g; run.tally[g.verdict]++;
    applyResult(st, q.id, q.id.startsWith('conj:') ? 'conjugation' : 'question', q.unit, q.skill, q.error_tags, g, typeof resp === 'string' ? resp : JSON.stringify(resp), Date.now() - run.t0, new Date(), undefined, run.assignmentId); save(); return render();
  }
  if (a === 'proxima') { run.i++; run.res = null; run.picked = []; run.pairs = {}; run.text = ''; run.choice = ''; run.t0 = Date.now(); return render(); }
  if (a === 'aceitar') { const all = [...document.querySelectorAll('.acc')].every((c) => c.checked); if (!all) return msg('#acc-msg', 'Aceite os três itens para continuar.', false); st.consented = true; save(); return render(); }
  if (a === 'gerar') { const r = new Uint32Array(3); crypto.getRandomValues(r); $('#cp').value = `${words[r[0] % 16]}-${words[r[1] % 16]}-${1000 + (r[2] % 9000)}`; return; }
  if (a === 'pausar') { const s = S.students.find((x) => x.id === d.id); s.access = s.access === 'paused' ? 'active' : 'paused'; save(); return render(); }
  if (a === 'liberar') { const s = S.students.find((x) => x.id === d.id); if (!s.unlocks.includes(d.u)) s.unlocks.push(d.u); save(); return render(); }
  if (a === 'travar') { const s = S.students.find((x) => x.id === d.id); s.unlocks = s.unlocks.filter((x) => x !== d.u); save(); return render(); }
});
document.addEventListener('input', (e) => {
  if (!run) return; if (e.target.id === 'resp') run.text = e.target.value;
  if (e.target.name === 'choice') { run.choice = e.target.value; render(); }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'who') { S.cur = e.target.value; run = null; fc = null; save(); return render(); }
  if (e.target.dataset?.left !== undefined && run) { run.pairs[e.target.dataset.left] = e.target.value; }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'resp' && run && !run.res) { e.preventDefault(); $('[data-a="conferir"]')?.click(); } });
document.addEventListener('submit', (e) => {
  e.preventDefault(); const f = e.target;
  if (f.id === 'cad') {
    const name = $('#cn').value.trim(), email = $('#ce').value.trim().toLowerCase(), pw = $('#cp').value;
    if (S.students.some((s) => s.email === email)) return msg('#cad-msg', 'Já existe um cadastro com esse e-mail.', false);
    const s = blankStudent('s' + S.uid++, name, email, pw); S.students.push(s); save(); render(); return msg('#cad-msg', `Aluno cadastrado. Passe estes dados a ele: e-mail ${email} e senha ${pw}. A senha não aparece de novo.`);
  }
  if (f.id === 'pwd') { const id = location.hash.replace('#aluno-', ''); const s = S.students.find((x) => x.id === id); s.pw = $('#np').value; save(); return msg('#pwd-msg', `Nova senha definida: ${s.pw}. Ela não aparece de novo.`); }
  if (f.id === 'atr') { const id = location.hash.replace('#aluno-', ''); S.assignments.push({ id: 't' + S.uid++, sid: id, title: $('#at').value.trim(), unit: $('#au').value, due: new Date($('#ad').value + 'T23:59:00').getTime(), status: 'assigned', grade: null, feedback: '' }); save(); return msg('#atr-msg', 'Tarefa atribuída. O aluno vê no início.'); }
  if (f.id === 'del') { if ($('#dc').value.trim().toUpperCase() !== 'EXCLUIR') return msg('#del-msg', 'Digite EXCLUIR para confirmar.', false); const id = location.hash.replace('#aluno-', ''); S.students = S.students.filter((x) => x.id !== id); S.assignments = S.assignments.filter((x) => x.sid !== id); if (S.cur === id) S.cur = S.students[0]?.id; save(); location.hash = 'alunos'; return render(); }
  if (f.classList.contains('gf')) { const t = S.assignments.find((x) => x.id === f.dataset.id); const g = f.querySelector('.gn').value; t.grade = g === '' ? null : +g; t.feedback = f.querySelector('.gt').value; t.status = 'reviewed'; save(); return render(); }
});
window.addEventListener('hashchange', render);
render();
