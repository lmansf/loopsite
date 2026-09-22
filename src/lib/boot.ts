/**
 * src/lib/boot.ts — the pre-paint bootstrap. (Was `hero-bootstrap.ts`.)
 *
 * Spec: design/11-narrative-build-spec.md §C.6, §C.16, §E. Renamed and
 * rewritten by WP-N under §I.14, then **FROZEN**: four agents depend on the
 * attributes it writes, and it is the reason CLS is 0.
 *
 * `layout.tsx` inlines this with `dangerouslySetInnerHTML` as a **classic**
 * script in `<head>` — not `type="module"`, which would defer and miss first
 * paint. It runs synchronously before the first frame, so by the time
 * anything is painted the document already knows:
 *
 *   html[data-loop-js]      JavaScript is on, so CSS may collapse the twelve
 *                           accounts to the selected one. Absent = the whole
 *                           readable document, which is the zero-JS site.
 *   html[data-motion]       'reduce' | 'auto' — the resolved value, the
 *                           reader's stored override beating the OS.
 *   html[data-s]            the selected account, from ?s= or #section-<slug>,
 *                           falling back to the landing account.
 *   html[data-belief]       'valley' | 'hill', from ?b= or from storage.
 *   <style id="loop-keys">  one `display:block!important` rule per held key,
 *                           for the ENTRY account only — which is what makes
 *                           the entry-time materialisation rule (§C.6) true
 *                           on a cold load; AND one solid-rule declaration per
 *                           held key for the pressable words themselves, for
 *                           the whole document.
 *
 * The solid rule is the second half of §C.2 and §C.8: *dotted = unpressed,
 * solid = held, permanently. The page literally gets more solid as the reader
 * works.* The attribute that carries it, `data-held`, cannot be set from
 * here — this script runs in `<head>`, before a single `<details>` has been
 * parsed — so what boot writes is the declaration, keyed on the `data-key`
 * the server already put in the markup. A returning reader therefore sees
 * every word they have ever opened already solid in the FIRST PAINTED FRAME,
 * with no JavaScript beyond this one inline script. The runtime sets the
 * attributes at hydration and drops `#loop-keys`; the computed result is
 * identical, so again nothing flashes.
 *
 * It needs no `!important`: `html[data-loop-js] .aside[data-key="…"]>summary`
 * outranks `read.css`'s `.aside[data-held]>summary`, and both declare the
 * same value, so stylesheet order cannot matter.
 *
 * The display rule keeps its `!important`, because the stylesheet's position
 * relative to this injected `<style>` is not guaranteed by the framework and
 * `display:none` on the same element is what it has to beat.
 *
 * The runtime adopts all of it at hydration and then removes `#loop-keys`;
 * the computed result is identical, so nothing flashes.
 *
 * Everything is inside one try/catch: a reader with storage disabled, a
 * hostile `?s=`, or no `matchMedia` gets the zero-JS document, which is a
 * complete site. Kept well under the 2 KB raw cap; `pnpm budget` weighs it
 * gzipped as part of Tier A.
 */

import { ACCOUNT_IDS } from '../content/schema.ts';

const SLUGS = ACCOUNT_IDS.join(' ');
const LANDING = ACCOUNT_IDS[0];

export const BOOT = `(function(){try{
var d=document,h=d.documentElement,S=' ${SLUGS} ';
h.setAttribute('data-loop-js','');
var st={};try{var raw=localStorage.getItem('loop:v2');if(raw)st=JSON.parse(raw)||{}}catch(e){}
var r=false;try{r=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
h.setAttribute('data-motion',st.motion==='reduce'||(st.motion!=='auto'&&r)?'reduce':'auto');
var q=location.search,g=function(n){var m=new RegExp('[?&]'+n+'=([^&#]*)').exec(q);return m?decodeURIComponent(m[1]):''};
var s=g('s');if(!s&&location.hash.indexOf('#section-')===0)s=location.hash.slice(9);
if(S.indexOf(' '+s+' ')<0)s='${LANDING}';
h.setAttribute('data-s',s);
var b=g('b');if(b!=='valley'&&b!=='hill')b=st.belief===1?'valley':st.belief===2?'hill':'';
h.setAttribute('data-belief',b||'none');
var k=st.keys,c='',i,x,P='html[data-loop-js] ';
if(k&&k.length)for(i=0;i<k.length;i++){x=k[i];if(/^[a-z0-9-]{1,48}$/.test(x))c+=P+'#section-'+s+' .blk[data-needs="'+x+'"]{display:block!important}'+P+'.aside[data-key="'+x+'"]>summary{text-decoration-style:solid}'}
if(c){var e=d.createElement('style');e.id='loop-keys';e.textContent=c;d.head.appendChild(e)}
}catch(e){}})();`;

/** The attribute contract, exported so the runtime and the tests cannot drift. */
export const BOOT_ATTRS = ['data-loop-js', 'data-motion', 'data-s', 'data-belief'] as const;

/** The landing account: the one `/` server-renders as selected. */
export const LANDING_ACCOUNT = LANDING;
