/**
 * tests/unit/compile.test.ts — the compiler, and the hostile strings.
 * Written by WP-N; **owned by WP-A thereafter.**
 *
 * `src/content/compile.ts` is the one place in the site where a string from
 * the corpus becomes markup. Everything it emits is escaped first, so this
 * file's real job is to prove that a corpus containing `<script>` cannot
 * produce a `<script>`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Account, Aside, Block } from '../../src/content/schema.ts';
import { CORPUS } from '../../src/content/accounts.ts';
import {
  compileAccount,
  compileBlock,
  escapeHtml,
  CONTRADICTION_HOME,
  __resetCompileCache,
} from '../../src/content/compile.ts';

function aside(over: Partial<Aside> = {}): Aside {
  return { id: 'a-key', word: 'the word', text: 'a body.', ...over };
}
function block(over: Partial<Block> = {}): Block {
  return { id: 'b-1', text: 'a sentence with [the word] in it.', ...over };
}

test('escaping happens before any markup is substituted', () => {
  assert.equal(escapeHtml('<b>&"'), '&lt;b&gt;&amp;&quot;');
  const html = compileBlock(
    block({ text: '<script>alert(1)</script> and [the word].' }),
    [aside()],
  );
  assert.ok(!html.includes('<script>'), 'a raw script tag survived');
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('<summary>the word</summary>'));
});

test('a hostile aside body cannot break out of its span', () => {
  const html = compileBlock(block(), [
    aside({ text: '</span></details><img src=x onerror=alert(1)>' }),
  ]);
  assert.ok(!html.includes('<img'), 'an img survived the escape');
  assert.ok(!html.includes('</details><img'));
  assert.equal([...html.matchAll(/<\/details>/g)].length, 1);
});

test('a hostile aside id cannot break out of its attribute', () => {
  const html = compileBlock(block(), [aside({ id: 'x" onclick="alert(1)' })]);
  // the quotes are escaped, so the whole thing stays one attribute value:
  // nothing after it is parsed as a new attribute.
  assert.ok(html.includes('data-key="x&quot; onclick=&quot;alert(1)"'));
  assert.ok(!/onclick="/.test(html), 'an attribute broke out');
  assert.equal([...html.matchAll(/"/g)].length % 2, 0);
});

test('a hostile word is matched and escaped, not interpreted', () => {
  const html = compileBlock(
    block({ text: 'here is [<b>bold</b>] and nothing else.' }),
    [aside({ word: '<b>bold</b>' })],
  );
  assert.ok(!html.includes('<b>'), 'a bold tag survived');
  assert.ok(html.includes('<summary>&lt;b&gt;bold&lt;/b&gt;</summary>'));
});

test('a regex-shaped word is matched literally', () => {
  const html = compileBlock(
    block({ text: 'a [a.b*c] word.' }),
    [aside({ word: 'a.b*c' })],
  );
  assert.ok(html.includes('<summary>a.b*c</summary>'));
});

test('the one aside carrying open is emitted already open', () => {
  const html = compileBlock(block(), [aside({ open: true })]);
  assert.ok(/<details class="aside" data-key="a-key" data-i="0" open>/.test(html));
  assert.ok(!compileBlock(block(), [aside()]).includes(' open>'));
});

test('the body is emitted at the foot of the block, never inside the word', () => {
  const html = compileBlock(block(), [aside()]);
  // the <details> carries the word and nothing else: a block-level box inside
  // an inline is what cut the sentence in half (`13` §2.1)
  assert.ok(html.includes('<summary>the word</summary></details>'), html);
  assert.ok(html.indexOf('aside-body') > html.indexOf('</details>'));
  // and the paragraph's own text is untouched either side of it
  assert.ok(html.startsWith('a sentence with <details'));
  assert.ok(
    html.includes('</details> in it.<span class="aside-body"'),
    'the prose after the word did not stay with the prose',
  );
});

test('the note names its word, escaped, and the pair is matched by data-i', () => {
  const html = compileBlock(
    block({ text: 'one [the word] and two [other] here.' }),
    [aside(), aside({ id: 'b-key', word: 'other', text: 'another body.' })],
  );
  assert.ok(html.includes('data-key="a-key" data-i="0"'));
  assert.ok(html.includes('data-key="b-key" data-i="1"'));
  assert.ok(
    html.includes('<span class="aside-body" data-i="0"><span class="aside-word">the word</span>a body.</span>'),
  );
  assert.ok(html.includes('<span class="aside-body" data-i="1"><span class="aside-word">other</span>'));
  // both notes are after both words, which is what `~` needs to pair them
  assert.ok(html.indexOf('aside-body') > html.lastIndexOf('</details>'));
});

test('data-i runs in reading order, whatever order the asides are in', () => {
  const html = compileBlock(
    block({ text: 'first [other] then [the word].' }),
    [aside(), aside({ id: 'b-key', word: 'other', text: 'another body.' })],
  );
  assert.ok(html.includes('data-key="b-key" data-i="0"'));
  assert.ok(html.includes('data-key="a-key" data-i="1"'));
});

test('a hostile word cannot escape the note that names it', () => {
  const html = compileBlock(
    block({ text: 'here is [<img src=x>] and nothing else.' }),
    [aside({ word: '<img src=x>' })],
  );
  assert.ok(!html.includes('<img'), 'an img survived into the note');
  assert.ok(html.includes('<span class="aside-word">&lt;img src=x&gt;</span>'));
});

test('a bracketed word with no aside keeps its brackets rather than vanishing', () => {
  const html = compileBlock(block({ text: 'nothing [matches] here.' }), [aside()]);
  assert.ok(html.includes('[matches]'));
});

test('a block is a div role=paragraph, never a p', () => {
  __resetCompileCache();
  const account = CORPUS.accounts[0] as Account;
  const compiled = compileAccount(account);
  assert.equal(compiled.blocks.length, account.blocks.length);
  for (const html of compiled.blocks) {
    assert.ok(html.startsWith('<div class="blk" role="paragraph"'), html.slice(0, 60));
    assert.ok(!/<p[ >]/.test(html), '<details> is not legal inside <p>');
  }
});

test('locked blocks are interleaved at their authored position, never appended', () => {
  __resetCompileCache();
  for (const account of CORPUS.accounts) {
    const compiled = compileAccount(account);
    account.blocks.forEach((b, i) => {
      assert.ok(
        (compiled.blocks[i] as string).includes(`data-id="${b.id}"`),
        `${account.id}: block ${i} is out of order`,
      );
      if (b.needs) {
        assert.ok((compiled.blocks[i] as string).includes(`data-needs="${b.needs}"`));
      }
      if (b.belief) {
        assert.ok((compiled.blocks[i] as string).includes(`data-belief="${b.belief}"`));
      }
    });
    assert.ok(compiled.html.startsWith(compiled.blocks.join('')));
  }
});

test('every aside in the corpus compiles to exactly one pressable word', () => {
  __resetCompileCache();
  for (const account of CORPUS.accounts) {
    const compiled = compileAccount(account);
    for (const a of account.asides) {
      const hits = [...compiled.html.matchAll(new RegExp(`data-key="${a.id}"`, 'g'))];
      assert.equal(hits.length, 1, `${account.id}/${a.id}: ${hits.length} pressable words`);
    }
    // no bracket survives compilation anywhere in the shipped corpus
    assert.ok(
      !/\[[^\]]+\]/.test(compiled.html),
      `${account.id}: an unmatched bracketed word reached the page`,
    );
  }
});

test('four seconds carries a see also link beside every blank', () => {
  __resetCompileCache();
  const fs = CORPUS.accounts.find((a) => a.id === 'four-seconds') as Account;
  const compiled = compileAccount(fs);
  const locked = fs.blocks.filter((b) => b.needs);
  assert.equal([...compiled.html.matchAll(/class="see-also"/g)].length, locked.length);

  // `see also` is the §C.13 string; the LINK is the account that holds the
  // missing key, named by its own title, so its accessible name is never a
  // bare `see also` repeated seven times (§C.10, WP-N notes §D.12).
  const links = [...compiled.html.matchAll(/see also <a href="\/\?s=([a-z-]+)"[^>]*>([^<]+)<\/a>/g)];
  assert.equal(links.length, locked.length);
  const titles = new Map(CORPUS.accounts.map((a) => [a.id as string, a.title]));
  for (const [, slug, text] of links) {
    assert.equal(text, titles.get(slug as string), `${slug}: the link is not its own title`);
  }
  // six of the twelve accounts are named, so the ending is an index
  assert.ok(new Set(links.map((m) => m[1])).size >= 6);

  // and no other account has one
  for (const account of CORPUS.accounts) {
    if (account.id === 'four-seconds') continue;
    assert.ok(!compileAccount(account).html.includes('see-also'), account.id);
  }
});

test('a blankWhenLocked block wraps its prose so the blank can be its shape', () => {
  __resetCompileCache();
  const fs = CORPUS.accounts.find((a) => a.id === 'four-seconds') as Account;
  const compiled = compileAccount(fs);

  fs.blocks.forEach((b, i) => {
    const html = compiled.blocks[i] as string;
    // `.rule` draws a line under every line box the sentence makes;
    // `.hush` takes the sentence out of sight AND out of the accessibility
    // tree, so a reader who does not hold the key is not read it aloud.
    assert.ok(html.includes('<span class="rule"><span class="hush">'), `${b.id}: no wrapper`);
    assert.equal([...html.matchAll(/class="rule"/g)].length, 1);
    assert.equal([...html.matchAll(/class="hush"/g)].length, 1);
    // the see also sits OUTSIDE the hidden sentence, or it would be hidden too
    assert.ok(html.indexOf('class="see-also"') > html.indexOf('</span></span>'), b.id);
  });

  // every other account is plain prose: no wrapper, no cost
  for (const account of CORPUS.accounts) {
    if (account.blankWhenLocked) continue;
    const html = compileAccount(account).html;
    assert.ok(!html.includes('class="rule"'), account.id);
    assert.ok(!html.includes('class="hush"'), account.id);
  }
});

test('the memo returns the same object for the same account', () => {
  __resetCompileCache();
  const account = CORPUS.accounts[0] as Account;
  assert.equal(compileAccount(account), compileAccount(account));
});


/* ------------------------------------------------- the five contradictions */

test('every contradiction line goes home to the account it names first', () => {
  __resetCompileCache();
  assert.equal(CONTRADICTION_HOME.size, CORPUS.contradictions.length);
  for (const c of CORPUS.contradictions) {
    const home = CONTRADICTION_HOME.get(c.id) as string;
    // `needs` is written in the order the line names its witnesses, so the
    // line lands with the first one — which is also the account the reader
    // met first, every pair running earlier to later in nav order.
    const emitter = CORPUS.accounts.find((a) => a.asides.some((x) => x.id === c.needs[0]));
    assert.equal(home, emitter?.id, c.id);
    const later = CORPUS.accounts.find((a) => a.asides.some((x) => x.id === c.needs[1]));
    const order = CORPUS.accounts.map((a) => a.id);
    assert.ok(
      order.indexOf(home as never) <= order.indexOf((later?.id ?? home) as never),
      `${c.id}: the line is parked in the later of its two accounts`,
    );
  }
});

test('a contradiction renders as a locked block at the foot of its account', () => {
  __resetCompileCache();
  for (const account of CORPUS.accounts) {
    const html = compileAccount(account).html;
    const mine = CORPUS.contradictions.filter((c) => CONTRADICTION_HOME.get(c.id) === account.id);
    assert.equal(
      [...html.matchAll(/class="blk contra"/g)].length,
      mine.length,
      `${account.id}: wrong number of contradiction lines`,
    );
    for (const c of mine) {
      // it is behind the synthetic key the engine already computes (§C.5), so
      // it materialises by the ordinary entry rule and costs no new mechanism
      assert.ok(html.includes(`data-needs="contra:${c.id}"`), c.id);
      assert.ok(html.includes(c.line), c.id);
      // last: after every block of the account's own prose
      assert.ok(
        html.indexOf(`data-id="contra-${c.id}"`) >
          html.lastIndexOf(`data-id="${account.blocks[account.blocks.length - 1]?.id}"`),
        `${c.id} is not the last block in ${account.id}`,
      );
    }
  }
  // no contradiction is printed twice anywhere on the site
  const all = CORPUS.accounts.map((a) => compileAccount(a).html).join('');
  for (const c of CORPUS.contradictions) {
    assert.equal([...all.matchAll(new RegExp(`data-id="contra-${c.id}"`, 'g'))].length, 1, c.id);
  }
});

test('a contradiction id cannot collide with a block id', () => {
  const ids = new Set(CORPUS.accounts.flatMap((a) => a.blocks.map((b) => b.id)));
  for (const c of CORPUS.contradictions) assert.ok(!ids.has(`contra-${c.id}`), c.id);
});
