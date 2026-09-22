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
import { compileAccount, compileBlock, escapeHtml, __resetCompileCache } from '../../src/content/compile.ts';

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
  assert.ok(/<details class="aside" data-key="a-key" open>/.test(html));
  assert.ok(!compileBlock(block(), [aside()]).includes(' open>'));
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
    assert.equal(compiled.html, compiled.blocks.join(''));
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
