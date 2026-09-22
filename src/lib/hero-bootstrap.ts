/**
 * src/lib/hero-bootstrap.ts — the <=2 KB inline bootstrap.
 *
 * Spec: design/05-build-spec.md §F.4, doc 03 §2.4. Owned by WP1 from here on.
 *
 * Inlined by `layout.tsx` with `dangerouslySetInnerHTML` as a **classic**
 * script (not `type="module"`, which would defer and miss first paint). It
 * runs synchronously before the first frame so `html[data-loop-js]` and
 * `html[data-motion]` are already correct — that is what keeps CLS at 0 and
 * the reduced-motion sweep twelve-stepped from the very first frame.
 *
 * React ADOPTS it: HeroIsland flushes `window.__loop.q` into the beacon and
 * calls every function in `window.__loop.off` to detach these listeners. Both
 * implementations drive the same two custom properties, so there is no visual
 * discontinuity.
 */

export const HERO_BOOTSTRAP = `(function(){
try{
var d=document,h=d.documentElement,s=h.style;
h.setAttribute('data-loop-js','');
var red=false;try{red=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
var ov=null;try{var raw=localStorage.getItem('loop:v1');if(raw)ov=(JSON.parse(raw)||{}).motion}catch(e){}
h.setAttribute('data-motion',ov==='reduce'||(ov!=='auto'&&red)?'reduce':'auto');
var w=innerWidth,ht=innerHeight,coarse=false;
try{coarse=matchMedia('(pointer: coarse)').matches}catch(e){}
var R=0.39*Math.min(w,ht);
s.setProperty('--ring-r',R+'px');
s.setProperty('--ring-cx',(w/2)+'px');
s.setProperty('--ring-cy',(coarse?ht*0.455:ht*0.5)+'px');
var L=window.__loop={interacted:false,q:[],off:[]};
var px=0.5,py=0.5,f=0;
function paint(){f=0;s.setProperty('--px',px);s.setProperty('--py',py)}
function first(){if(L.interacted)return;L.interacted=true;L.q.push({n:'hero_interacted',t:Math.round(performance.now())})}
function move(e){first();if(red)return;var t=e.touches?e.touches[0]:e;if(!t)return;px=t.clientX/innerWidth;py=t.clientY/innerHeight;if(!f)f=requestAnimationFrame(paint)}
function tap(e){first();move(e)}
function key(){first()}
var o={passive:true};
d.addEventListener('pointermove',move,o);
d.addEventListener('pointerdown',tap,o);
d.addEventListener('touchstart',tap,o);
d.addEventListener('keydown',key,o);
L.off.push(function(){d.removeEventListener('pointermove',move,o);d.removeEventListener('pointerdown',tap,o);d.removeEventListener('touchstart',tap,o);d.removeEventListener('keydown',key,o)});
h.setAttribute('data-loop-hero-ready','');
}catch(e){}
})();`;
