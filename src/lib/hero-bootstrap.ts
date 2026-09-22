/**
 * src/lib/hero-bootstrap.ts — the <=2 KB inline bootstrap.
 *
 * Spec: design/05-build-spec.md §B (0–3 s), §F.4, doc 03 §2.4. Owned by WP1.
 *
 * Inlined by `layout.tsx` with `dangerouslySetInnerHTML` as a **classic**
 * script (not `type="module"`, which would defer and miss first paint). It
 * runs synchronously before the first frame so `html[data-loop-js]` and
 * `html[data-motion]` are already correct — that is what keeps CLS at 0 and
 * the reduced-motion sweep twelve-stepped from the very first frame — and it
 * writes the ring geometry mirrors (`--ring-r/cx/cy`) that the CSS ring in
 * `src/components/ring/ring.css` is painted from. The ring, its sweep and the
 * seed node therefore exist before a byte of React has arrived.
 *
 * What it records for React to ADOPT (`window.__loop`):
 *   interacted  first pointer/touch/key of any kind (the beacon's hero_interacted)
 *   tap         a real input — pointerdown / touchstart / a non-modifier key.
 *               This is what "dies on first touch" and the ghost demo key off.
 *   taps        pointerdowns that landed on the ring band before hydration.
 *               RingStage replays them as nodes the instant it mounts, so a tap
 *               at 400 ms is a node, not a lost gesture. The last one is also
 *               painted by CSS at once (`--tap-x/--tap-y`, `html[data-loop-tap]`).
 *   t0          performance.now() at boot, the fallback for phase handover.
 *   q / off     the pre-hydration beacon queue and the detach functions.
 *
 * `--cap-o` is the caption's opacity at the moment it is dismissed, so the
 * exit animation starts from wherever the fade-in had got to (never a flash).
 * HeroIsland calls every function in `off` to detach these listeners; both
 * implementations drive the same custom properties, so there is no visual
 * discontinuity. Kept under 2 KB raw; `pnpm budget` weighs it gzipped.
 */

export const HERO_BOOTSTRAP = `(function(){
try{
var d=document,h=d.documentElement,s=h.style,M=Math,A=function(n,v){h.setAttribute(n,v||'')},P=function(n,v){s.setProperty(n,v)};
A('data-loop-js');
var red=false;try{red=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
var ov=null;try{var raw=localStorage.getItem('loop:v1');if(raw)ov=(JSON.parse(raw)||{}).motion}catch(e){}
red=ov==='reduce'||(ov!=='auto'&&red);
A('data-motion',red?'reduce':'auto');
var w=innerWidth,ht=innerHeight,co=false;
try{co=matchMedia('(pointer: coarse)').matches}catch(e){}
var sc=co?(ht<600?[0.35,0.37]:ht<700?[0.37,0.4]:[0.39,0.42]):[0.39,0.5],R=sc[0]*M.min(w,ht),cx=w/2,cy=sc[1]*ht;
P('--ring-r',R+'px');P('--ring-cx',cx+'px');P('--ring-cy',cy+'px');
var L=window.__loop={interacted:false,tap:false,t0:performance.now(),taps:[],q:[],off:[]};
var px=0.5,py=0.5,f=0;
function paint(){f=0;P('--px',px);P('--py',py)}
function first(){if(L.interacted)return;L.interacted=true;L.q.push({n:'hero_interacted',t:M.round(performance.now())})}
function pt(e){return e.touches?e.touches[0]:e}
function move(e){first();if(red)return;var t=pt(e);if(!t)return;px=t.clientX/innerWidth;py=t.clientY/innerHeight;if(!f)f=requestAnimationFrame(paint);A('data-loop-pointer')}
function engage(){if(L.tap)return;L.tap=true;var c=d.getElementById('loop-title');try{P('--cap-o',c?getComputedStyle(c).opacity:'1')}catch(e){}A('data-stage-state','engaged')}
function tap(e){if(e.type==='touchstart'&&window.PointerEvent)return;first();move(e);engage();var t=pt(e);if(!t)return;
var x=t.clientX,y=t.clientY;
if(M.abs(M.hypot(x-cx,y-cy)-R)<=M.max(28,0.12*R)&&L.taps.length<24){L.taps.push({x:x,y:y});P('--tap-x',x+'px');P('--tap-y',y+'px');A('data-loop-tap')}}
function key(e){first();if(!/^(Tab|Shift|Control|Alt|Meta|CapsLock)$/.test(e.key))engage()}
var o={passive:true},E=[['pointermove',move],['pointerdown',tap],['touchstart',tap],['keydown',key]];
E.forEach(function(x){d.addEventListener(x[0],x[1],o)});
L.off.push(function(){E.forEach(function(x){d.removeEventListener(x[0],x[1],o)})});
A('data-loop-hero-ready');
}catch(e){}
})();`;
