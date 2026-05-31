import{r as s,j as m,R as L,a as mt,b as gt,c as kt}from"./vendor-BRdaGGst.js";function O(e,t,{checkForDefaultPrevented:n=!0}={}){return function(a){if(e==null||e(a),n===!1||!a.defaultPrevented)return t==null?void 0:t(a)}}function xe(e,t){if(typeof e=="function")return e(t);e!=null&&(e.current=t)}function Le(...e){return t=>{let n=!1;const r=e.map(a=>{const o=xe(a,t);return!n&&typeof o=="function"&&(n=!0),o});if(n)return()=>{for(let a=0;a<r.length;a++){const o=r[a];typeof o=="function"?o():xe(e[a],null)}}}}function N(...e){return s.useCallback(Le(...e),e)}function Ct(e,t){const n=s.createContext(t),r=o=>{const{children:i,...c}=o,f=s.useMemo(()=>c,Object.values(c));return m.jsx(n.Provider,{value:f,children:i})};r.displayName=e+"Provider";function a(o){const i=s.useContext(n);if(i)return i;if(t!==void 0)return t;throw new Error(`\`${o}\` must be used within \`${e}\``)}return[r,a]}function de(e,t=[]){let n=[];function r(o,i){const c=s.createContext(i),f=n.length;n=[...n,i];const u=y=>{var g;const{scope:v,children:k,...E}=y,d=((g=v==null?void 0:v[e])==null?void 0:g[f])||c,p=s.useMemo(()=>E,Object.values(E));return m.jsx(d.Provider,{value:p,children:k})};u.displayName=o+"Provider";function h(y,v){var d;const k=((d=v==null?void 0:v[e])==null?void 0:d[f])||c,E=s.useContext(k);if(E)return E;if(i!==void 0)return i;throw new Error(`\`${y}\` must be used within \`${o}\``)}return[u,h]}const a=()=>{const o=n.map(i=>s.createContext(i));return function(c){const f=(c==null?void 0:c[e])||o;return s.useMemo(()=>({[`__scope${e}`]:{...c,[e]:f}}),[c,f])}};return a.scopeName=e,[r,xt(a,...t)]}function xt(...e){const t=e[0];if(e.length===1)return t;const n=()=>{const r=e.map(a=>({useScope:a(),scopeName:a.scopeName}));return function(o){const i=r.reduce((c,{useScope:f,scopeName:u})=>{const y=f(o)[`__scope${u}`];return{...c,...y}},{});return s.useMemo(()=>({[`__scope${t.scopeName}`]:i}),[i])}};return n.scopeName=t.scopeName,n}function q(e){const t=bt(e),n=s.forwardRef((r,a)=>{const{children:o,...i}=r,c=s.Children.toArray(o),f=c.find(Et);if(f){const u=f.props.children,h=c.map(y=>y===f?s.Children.count(u)>1?s.Children.only(null):s.isValidElement(u)?u.props.children:null:y);return m.jsx(t,{...i,ref:a,children:s.isValidElement(u)?s.cloneElement(u,void 0,h):null})}return m.jsx(t,{...i,ref:a,children:o})});return n.displayName=`${e}.Slot`,n}var nr=q("Slot");function bt(e){const t=s.forwardRef((n,r)=>{const{children:a,...o}=n;if(s.isValidElement(a)){const i=wt(a),c=Mt(o,a.props);return a.type!==s.Fragment&&(c.ref=r?Le(r,i):i),s.cloneElement(a,c)}return s.Children.count(a)>1?s.Children.only(null):null});return t.displayName=`${e}.SlotClone`,t}var Ie=Symbol("radix.slottable");function rr(e){const t=({children:n})=>m.jsx(m.Fragment,{children:n});return t.displayName=`${e}.Slottable`,t.__radixId=Ie,t}function Et(e){return s.isValidElement(e)&&typeof e.type=="function"&&"__radixId"in e.type&&e.type.__radixId===Ie}function Mt(e,t){const n={...t};for(const r in t){const a=e[r],o=t[r];/^on[A-Z]/.test(r)?a&&o?n[r]=(...c)=>{o(...c),a(...c)}:a&&(n[r]=a):r==="style"?n[r]={...a,...o}:r==="className"&&(n[r]=[a,o].filter(Boolean).join(" "))}return{...e,...n}}function wt(e){var r,a;let t=(r=Object.getOwnPropertyDescriptor(e.props,"ref"))==null?void 0:r.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=(a=Object.getOwnPropertyDescriptor(e,"ref"))==null?void 0:a.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}function ar(e){const t=e+"CollectionProvider",[n,r]=de(t),[a,o]=n(t,{collectionRef:{current:null},itemMap:new Map}),i=d=>{const{scope:p,children:g}=d,C=L.useRef(null),x=L.useRef(new Map).current;return m.jsx(a,{scope:p,itemMap:x,collectionRef:C,children:g})};i.displayName=t;const c=e+"CollectionSlot",f=q(c),u=L.forwardRef((d,p)=>{const{scope:g,children:C}=d,x=o(c,g),b=N(p,x.collectionRef);return m.jsx(f,{ref:b,children:C})});u.displayName=c;const h=e+"CollectionItemSlot",y="data-radix-collection-item",v=q(h),k=L.forwardRef((d,p)=>{const{scope:g,children:C,...x}=d,b=L.useRef(null),w=N(p,b),S=o(h,g);return L.useEffect(()=>(S.itemMap.set(b,{ref:b,...x}),()=>void S.itemMap.delete(b))),m.jsx(v,{[y]:"",ref:w,children:C})});k.displayName=h;function E(d){const p=o(e+"CollectionConsumer",d);return L.useCallback(()=>{const C=p.collectionRef.current;if(!C)return[];const x=Array.from(C.querySelectorAll(`[${y}]`));return Array.from(p.itemMap.values()).sort((S,M)=>x.indexOf(S.ref.current)-x.indexOf(M.ref.current))},[p.collectionRef,p.itemMap])}return[{Provider:i,Slot:u,ItemSlot:k},E,r]}var St=["a","button","div","form","h2","h3","img","input","label","li","nav","ol","p","span","svg","ul"],R=St.reduce((e,t)=>{const n=q(`Primitive.${t}`),r=s.forwardRef((a,o)=>{const{asChild:i,...c}=a,f=i?n:t;return typeof window<"u"&&(window[Symbol.for("radix-ui")]=!0),m.jsx(f,{...c,ref:o})});return r.displayName=`Primitive.${t}`,{...e,[t]:r}},{});function Rt(e,t){e&&mt.flushSync(()=>e.dispatchEvent(t))}function I(e){const t=s.useRef(e);return s.useEffect(()=>{t.current=e}),s.useMemo(()=>(...n)=>{var r;return(r=t.current)==null?void 0:r.call(t,...n)},[])}function Pt(e,t=globalThis==null?void 0:globalThis.document){const n=I(e);s.useEffect(()=>{const r=a=>{a.key==="Escape"&&n(a)};return t.addEventListener("keydown",r,{capture:!0}),()=>t.removeEventListener("keydown",r,{capture:!0})},[n,t])}var At="DismissableLayer",le="dismissableLayer.update",Nt="dismissableLayer.pointerDownOutside",Dt="dismissableLayer.focusOutside",be,_e=s.createContext({layers:new Set,layersWithOutsidePointerEventsDisabled:new Set,branches:new Set}),fe=s.forwardRef((e,t)=>{const{disableOutsidePointerEvents:n=!1,onEscapeKeyDown:r,onPointerDownOutside:a,onFocusOutside:o,onInteractOutside:i,onDismiss:c,...f}=e,u=s.useContext(_e),[h,y]=s.useState(null),v=(h==null?void 0:h.ownerDocument)??(globalThis==null?void 0:globalThis.document),[,k]=s.useState({}),E=N(t,M=>y(M)),d=Array.from(u.layers),[p]=[...u.layersWithOutsidePointerEventsDisabled].slice(-1),g=d.indexOf(p),C=h?d.indexOf(h):-1,x=u.layersWithOutsidePointerEventsDisabled.size>0,b=C>=g,w=Tt(M=>{const D=M.target,B=[...u.branches].some(te=>te.contains(D));!b||B||(a==null||a(M),i==null||i(M),M.defaultPrevented||c==null||c())},v),S=Lt(M=>{const D=M.target;[...u.branches].some(te=>te.contains(D))||(o==null||o(M),i==null||i(M),M.defaultPrevented||c==null||c())},v);return Pt(M=>{C===u.layers.size-1&&(r==null||r(M),!M.defaultPrevented&&c&&(M.preventDefault(),c()))},v),s.useEffect(()=>{if(h)return n&&(u.layersWithOutsidePointerEventsDisabled.size===0&&(be=v.body.style.pointerEvents,v.body.style.pointerEvents="none"),u.layersWithOutsidePointerEventsDisabled.add(h)),u.layers.add(h),Ee(),()=>{n&&u.layersWithOutsidePointerEventsDisabled.size===1&&(v.body.style.pointerEvents=be)}},[h,v,n,u]),s.useEffect(()=>()=>{h&&(u.layers.delete(h),u.layersWithOutsidePointerEventsDisabled.delete(h),Ee())},[h,u]),s.useEffect(()=>{const M=()=>k({});return document.addEventListener(le,M),()=>document.removeEventListener(le,M)},[]),m.jsx(R.div,{...f,ref:E,style:{pointerEvents:x?b?"auto":"none":void 0,...e.style},onFocusCapture:O(e.onFocusCapture,S.onFocusCapture),onBlurCapture:O(e.onBlurCapture,S.onBlurCapture),onPointerDownCapture:O(e.onPointerDownCapture,w.onPointerDownCapture)})});fe.displayName=At;var Ot="DismissableLayerBranch",je=s.forwardRef((e,t)=>{const n=s.useContext(_e),r=s.useRef(null),a=N(t,r);return s.useEffect(()=>{const o=r.current;if(o)return n.branches.add(o),()=>{n.branches.delete(o)}},[n.branches]),m.jsx(R.div,{...e,ref:a})});je.displayName=Ot;function Tt(e,t=globalThis==null?void 0:globalThis.document){const n=I(e),r=s.useRef(!1),a=s.useRef(()=>{});return s.useEffect(()=>{const o=c=>{if(c.target&&!r.current){let f=function(){Fe(Nt,n,u,{discrete:!0})};const u={originalEvent:c};c.pointerType==="touch"?(t.removeEventListener("click",a.current),a.current=f,t.addEventListener("click",a.current,{once:!0})):f()}else t.removeEventListener("click",a.current);r.current=!1},i=window.setTimeout(()=>{t.addEventListener("pointerdown",o)},0);return()=>{window.clearTimeout(i),t.removeEventListener("pointerdown",o),t.removeEventListener("click",a.current)}},[t,n]),{onPointerDownCapture:()=>r.current=!0}}function Lt(e,t=globalThis==null?void 0:globalThis.document){const n=I(e),r=s.useRef(!1);return s.useEffect(()=>{const a=o=>{o.target&&!r.current&&Fe(Dt,n,{originalEvent:o},{discrete:!1})};return t.addEventListener("focusin",a),()=>t.removeEventListener("focusin",a)},[t,n]),{onFocusCapture:()=>r.current=!0,onBlurCapture:()=>r.current=!1}}function Ee(){const e=new CustomEvent(le);document.dispatchEvent(e)}function Fe(e,t,n,{discrete:r}){const a=n.originalEvent.target,o=new CustomEvent(e,{bubbles:!1,cancelable:!0,detail:n});t&&a.addEventListener(e,t,{once:!0}),r?Rt(a,o):a.dispatchEvent(o)}var or=fe,sr=je,U=globalThis!=null&&globalThis.document?s.useLayoutEffect:()=>{},It="Portal",We=s.forwardRef((e,t)=>{var c;const{container:n,...r}=e,[a,o]=s.useState(!1);U(()=>o(!0),[]);const i=n||a&&((c=globalThis==null?void 0:globalThis.document)==null?void 0:c.body);return i?gt.createPortal(m.jsx(R.div,{...r,ref:t}),i):null});We.displayName=It;function _t(e,t){return s.useReducer((n,r)=>t[n][r]??n,e)}var H=e=>{const{present:t,children:n}=e,r=jt(t),a=typeof n=="function"?n({present:r.isPresent}):s.Children.only(n),o=N(r.ref,Ft(a));return typeof n=="function"||r.isPresent?s.cloneElement(a,{ref:o}):null};H.displayName="Presence";function jt(e){const[t,n]=s.useState(),r=s.useRef({}),a=s.useRef(e),o=s.useRef("none"),i=e?"mounted":"unmounted",[c,f]=_t(i,{mounted:{UNMOUNT:"unmounted",ANIMATION_OUT:"unmountSuspended"},unmountSuspended:{MOUNT:"mounted",ANIMATION_END:"unmounted"},unmounted:{MOUNT:"mounted"}});return s.useEffect(()=>{const u=V(r.current);o.current=c==="mounted"?u:"none"},[c]),U(()=>{const u=r.current,h=a.current;if(h!==e){const v=o.current,k=V(u);e?f("MOUNT"):k==="none"||(u==null?void 0:u.display)==="none"?f("UNMOUNT"):f(h&&v!==k?"ANIMATION_OUT":"UNMOUNT"),a.current=e}},[e,f]),U(()=>{if(t){let u;const h=t.ownerDocument.defaultView??window,y=k=>{const d=V(r.current).includes(k.animationName);if(k.target===t&&d&&(f("ANIMATION_END"),!a.current)){const p=t.style.animationFillMode;t.style.animationFillMode="forwards",u=h.setTimeout(()=>{t.style.animationFillMode==="forwards"&&(t.style.animationFillMode=p)})}},v=k=>{k.target===t&&(o.current=V(r.current))};return t.addEventListener("animationstart",v),t.addEventListener("animationcancel",y),t.addEventListener("animationend",y),()=>{h.clearTimeout(u),t.removeEventListener("animationstart",v),t.removeEventListener("animationcancel",y),t.removeEventListener("animationend",y)}}else f("ANIMATION_END")},[t,f]),{isPresent:["mounted","unmountSuspended"].includes(c),ref:s.useCallback(u=>{u&&(r.current=getComputedStyle(u)),n(u)},[])}}function V(e){return(e==null?void 0:e.animationName)||"none"}function Ft(e){var r,a;let t=(r=Object.getOwnPropertyDescriptor(e.props,"ref"))==null?void 0:r.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=(a=Object.getOwnPropertyDescriptor(e,"ref"))==null?void 0:a.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}function ze({prop:e,defaultProp:t,onChange:n=()=>{}}){const[r,a]=Wt({defaultProp:t,onChange:n}),o=e!==void 0,i=o?e:r,c=I(n),f=s.useCallback(u=>{if(o){const y=typeof u=="function"?u(e):u;y!==e&&c(y)}else a(u)},[o,e,a,c]);return[i,f]}function Wt({defaultProp:e,onChange:t}){const n=s.useState(e),[r]=n,a=s.useRef(r),o=I(t);return s.useEffect(()=>{a.current!==r&&(o(r),a.current=r)},[r,a,o]),n}/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zt=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),Be=(...e)=>e.filter((t,n,r)=>!!t&&r.indexOf(t)===n).join(" ");/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Bt={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qt=s.forwardRef(({color:e="currentColor",size:t=24,strokeWidth:n=2,absoluteStrokeWidth:r,className:a="",children:o,iconNode:i,...c},f)=>s.createElement("svg",{ref:f,...Bt,width:t,height:t,stroke:e,strokeWidth:r?Number(n)*24/Number(t):n,className:Be("lucide",a),...c},[...i.map(([u,h])=>s.createElement(u,h)),...Array.isArray(o)?o:[o]]));/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=(e,t)=>{const n=s.forwardRef(({className:r,...a},o)=>s.createElement(qt,{ref:o,iconNode:t,className:Be(`lucide-${zt(e)}`,r),...a}));return n.displayName=`${e}`,n};/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cr=l("ArrowDown",[["path",{d:"M12 5v14",key:"s699le"}],["path",{d:"m19 12-7 7-7-7",key:"1idqje"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ir=l("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lr=l("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ur=l("ArrowUp",[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dr=l("Award",[["path",{d:"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526",key:"1yiouv"}],["circle",{cx:"12",cy:"8",r:"6",key:"1vp47v"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fr=l("Bell",[["path",{d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9",key:"1qo2s2"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0",key:"qgo35s"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hr=l("BookCheck",[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",key:"k3hazp"}],["path",{d:"m9 9.5 2 2 4-4",key:"1dth82"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yr=l("BookMarked",[["path",{d:"M10 2v8l3-3 3 3V2",key:"sqw3rj"}],["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",key:"k3hazp"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pr=l("BookOpen",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vr=l("Building2",[["path",{d:"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z",key:"1b4qmf"}],["path",{d:"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2",key:"i71pzd"}],["path",{d:"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2",key:"10jefs"}],["path",{d:"M10 6h4",key:"1itunk"}],["path",{d:"M10 10h4",key:"tcdvrf"}],["path",{d:"M10 14h4",key:"kelpxr"}],["path",{d:"M10 18h4",key:"1ulq68"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mr=l("Calculator",[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",key:"1nb95v"}],["line",{x1:"8",x2:"16",y1:"6",y2:"6",key:"x4nwl0"}],["line",{x1:"16",x2:"16",y1:"14",y2:"18",key:"wjye3r"}],["path",{d:"M16 10h.01",key:"1m94wz"}],["path",{d:"M12 10h.01",key:"1nrarc"}],["path",{d:"M8 10h.01",key:"19clt8"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M8 18h.01",key:"lrp35t"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gr=l("CalendarCheck",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"m9 16 2 2 4-4",key:"19s6y9"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kr=l("Calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cr=l("ChartPie",[["path",{d:"M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z",key:"pzmjnu"}],["path",{d:"M21.21 15.89A10 10 0 1 1 8 2.83",key:"k2fpak"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xr=l("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const br=l("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Er=l("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mr=l("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wr=l("ChevronUp",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sr=l("CircleAlert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rr=l("CircleCheckBig",[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pr=l("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ar=l("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nr=l("Circle",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dr=l("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Or=l("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tr=l("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lr=l("EllipsisVertical",[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"12",cy:"5",r:"1",key:"gxeob9"}],["circle",{cx:"12",cy:"19",r:"1",key:"lyex9k"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ir=l("EyeOff",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _r=l("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jr=l("FileSpreadsheet",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M8 13h2",key:"yr2amv"}],["path",{d:"M14 13h2",key:"un5t4a"}],["path",{d:"M8 17h2",key:"2yhykz"}],["path",{d:"M14 17h2",key:"10kma7"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fr=l("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wr=l("Filter",[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3",key:"1yg77f"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zr=l("GraduationCap",[["path",{d:"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z",key:"j76jl0"}],["path",{d:"M22 10v6",key:"1lu8f3"}],["path",{d:"M6 12.5V16a6 3 0 0 0 12 0v-3.5",key:"1r8lef"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Br=l("Hash",[["line",{x1:"4",x2:"20",y1:"9",y2:"9",key:"4lhtct"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15",key:"vyu0kd"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21",key:"1ggp8o"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21",key:"weycgp"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qr=l("Heart",[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",key:"c3ymky"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ur=l("History",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}],["path",{d:"M12 7v5l4 2",key:"1fdv2h"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hr=l("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vr=l("IndianRupee",[["path",{d:"M6 3h12",key:"ggurg9"}],["path",{d:"M6 8h12",key:"6g4wlu"}],["path",{d:"m6 13 8.5 8",key:"u1kupk"}],["path",{d:"M6 13h3",key:"wdp6ag"}],["path",{d:"M9 13c6.667 0 6.667-10 0-10",key:"1nkvk2"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $r=l("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kr=l("Keyboard",[["path",{d:"M10 8h.01",key:"1r9ogq"}],["path",{d:"M12 12h.01",key:"1mp3jc"}],["path",{d:"M14 8h.01",key:"1primd"}],["path",{d:"M16 12h.01",key:"1l6xoz"}],["path",{d:"M18 8h.01",key:"emo2bl"}],["path",{d:"M6 8h.01",key:"x9i8wu"}],["path",{d:"M7 16h10",key:"wp8him"}],["path",{d:"M8 12h.01",key:"czm47f"}],["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",key:"18n3k1"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zr=l("Layers",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gr=l("LayoutDashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xr=l("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yr=l("Loader",[["path",{d:"M12 2v4",key:"3427ic"}],["path",{d:"m16.2 7.8 2.9-2.9",key:"r700ao"}],["path",{d:"M18 12h4",key:"wj9ykh"}],["path",{d:"m16.2 16.2 2.9 2.9",key:"1bxg5t"}],["path",{d:"M12 18v4",key:"jadmvz"}],["path",{d:"m4.9 19.1 2.9-2.9",key:"bwix9q"}],["path",{d:"M2 12h4",key:"j09sii"}],["path",{d:"m4.9 4.9 2.9 2.9",key:"giyufr"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qr=l("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jr=l("Mail",[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",key:"18n3k1"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",key:"1ocrg3"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ea=l("MapPin",[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ta=l("Menu",[["line",{x1:"4",x2:"20",y1:"12",y2:"12",key:"1e0a9i"}],["line",{x1:"4",x2:"20",y1:"6",y2:"6",key:"1owob3"}],["line",{x1:"4",x2:"20",y1:"18",y2:"18",key:"yk5zj1"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const na=l("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ra=l("MessageSquare",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aa=l("MousePointer2",[["path",{d:"M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z",key:"edeuup"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oa=l("PanelsTopLeft",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M9 21V9",key:"1oto5p"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sa=l("Pause",[["rect",{x:"14",y:"4",width:"4",height:"16",rx:"1",key:"zuxfzm"}],["rect",{x:"6",y:"4",width:"4",height:"16",rx:"1",key:"1okwgv"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ca=l("Pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ia=l("Pencil",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const la=l("Phone",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ua=l("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const da=l("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fa=l("RefreshCcw",[["path",{d:"M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"14sxne"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}],["path",{d:"M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16",key:"1hlbsb"}],["path",{d:"M16 16h5v5",key:"ccwih5"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ha=l("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ya=l("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pa=l("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const va=l("Send",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ma=l("Server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ga=l("Settings",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ka=l("Share2",[["circle",{cx:"18",cy:"5",r:"3",key:"gq8acd"}],["circle",{cx:"6",cy:"12",r:"3",key:"w7nqdw"}],["circle",{cx:"18",cy:"19",r:"3",key:"1xt0gg"}],["line",{x1:"8.59",x2:"15.42",y1:"13.51",y2:"17.49",key:"47mynk"}],["line",{x1:"15.41",x2:"8.59",y1:"6.51",y2:"10.49",key:"1n3mei"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ca=l("ShieldCheck",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xa=l("SquarePen",[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ba=l("ThumbsDown",[["path",{d:"M17 14V2",key:"8ymqnk"}],["path",{d:"M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z",key:"m61m77"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ea=l("Timer",[["line",{x1:"10",x2:"14",y1:"2",y2:"2",key:"14vaq8"}],["line",{x1:"12",x2:"15",y1:"14",y2:"11",key:"17fdiu"}],["circle",{cx:"12",cy:"14",r:"8",key:"1e1u0o"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ma=l("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wa=l("TrendingDown",[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7",key:"1r2t7k"}],["polyline",{points:"16 17 22 17 22 11",key:"11uiuu"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sa=l("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ra=l("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pa=l("Trophy",[["path",{d:"M6 9H4.5a2.5 2.5 0 0 1 0-5H6",key:"17hqa7"}],["path",{d:"M18 9h1.5a2.5 2.5 0 0 0 0-5H18",key:"lmptdp"}],["path",{d:"M4 22h16",key:"57wxv0"}],["path",{d:"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",key:"1nw9bq"}],["path",{d:"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",key:"1np0yb"}],["path",{d:"M18 2H6v7a6 6 0 0 0 12 0V2Z",key:"u46fv3"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Aa=l("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Na=l("UserCheck",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["polyline",{points:"16 11 18 13 22 9",key:"1pwet4"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Da=l("UserCog",[["circle",{cx:"18",cy:"15",r:"3",key:"gjjjvw"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M10 15H6a4 4 0 0 0-4 4v2",key:"1nfge6"}],["path",{d:"m21.7 16.4-.9-.3",key:"12j9ji"}],["path",{d:"m15.2 13.9-.9-.3",key:"1fdjdi"}],["path",{d:"m16.6 18.7.3-.9",key:"heedtr"}],["path",{d:"m19.1 12.2.3-.9",key:"1af3ki"}],["path",{d:"m19.6 18.7-.4-1",key:"1x9vze"}],["path",{d:"m16.8 12.3-.4-1",key:"vqeiwj"}],["path",{d:"m14.3 16.6 1-.4",key:"1qlj63"}],["path",{d:"m20.7 13.8 1-.4",key:"1v5t8k"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oa=l("UserPlus",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ta=l("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const La=l("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ia=l("Video",[["path",{d:"m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",key:"ftymec"}],["rect",{x:"2",y:"6",width:"14",height:"12",rx:"2",key:"158x01"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _a=l("Wallet",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ja=l("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fa=l("Zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]);var Ut=kt[" useId ".trim().toString()]||(()=>{}),Ht=0;function X(e){const[t,n]=s.useState(Ut());return U(()=>{n(r=>r??String(Ht++))},[e]),t?`radix-${t}`:""}var Vt=s.createContext(void 0);function Wa(e){const t=s.useContext(Vt);return e||t||"ltr"}var ne=0;function $t(){s.useEffect(()=>{const e=document.querySelectorAll("[data-radix-focus-guard]");return document.body.insertAdjacentElement("afterbegin",e[0]??Me()),document.body.insertAdjacentElement("beforeend",e[1]??Me()),ne++,()=>{ne===1&&document.querySelectorAll("[data-radix-focus-guard]").forEach(t=>t.remove()),ne--}},[])}function Me(){const e=document.createElement("span");return e.setAttribute("data-radix-focus-guard",""),e.tabIndex=0,e.style.outline="none",e.style.opacity="0",e.style.position="fixed",e.style.pointerEvents="none",e}var re="focusScope.autoFocusOnMount",ae="focusScope.autoFocusOnUnmount",we={bubbles:!1,cancelable:!0},Kt="FocusScope",qe=s.forwardRef((e,t)=>{const{loop:n=!1,trapped:r=!1,onMountAutoFocus:a,onUnmountAutoFocus:o,...i}=e,[c,f]=s.useState(null),u=I(a),h=I(o),y=s.useRef(null),v=N(t,d=>f(d)),k=s.useRef({paused:!1,pause(){this.paused=!0},resume(){this.paused=!1}}).current;s.useEffect(()=>{if(r){let d=function(x){if(k.paused||!c)return;const b=x.target;c.contains(b)?y.current=b:T(y.current,{select:!0})},p=function(x){if(k.paused||!c)return;const b=x.relatedTarget;b!==null&&(c.contains(b)||T(y.current,{select:!0}))},g=function(x){if(document.activeElement===document.body)for(const w of x)w.removedNodes.length>0&&T(c)};document.addEventListener("focusin",d),document.addEventListener("focusout",p);const C=new MutationObserver(g);return c&&C.observe(c,{childList:!0,subtree:!0}),()=>{document.removeEventListener("focusin",d),document.removeEventListener("focusout",p),C.disconnect()}}},[r,c,k.paused]),s.useEffect(()=>{if(c){Re.add(k);const d=document.activeElement;if(!c.contains(d)){const g=new CustomEvent(re,we);c.addEventListener(re,u),c.dispatchEvent(g),g.defaultPrevented||(Zt(Jt(Ue(c)),{select:!0}),document.activeElement===d&&T(c))}return()=>{c.removeEventListener(re,u),setTimeout(()=>{const g=new CustomEvent(ae,we);c.addEventListener(ae,h),c.dispatchEvent(g),g.defaultPrevented||T(d??document.body,{select:!0}),c.removeEventListener(ae,h),Re.remove(k)},0)}}},[c,u,h,k]);const E=s.useCallback(d=>{if(!n&&!r||k.paused)return;const p=d.key==="Tab"&&!d.altKey&&!d.ctrlKey&&!d.metaKey,g=document.activeElement;if(p&&g){const C=d.currentTarget,[x,b]=Gt(C);x&&b?!d.shiftKey&&g===b?(d.preventDefault(),n&&T(x,{select:!0})):d.shiftKey&&g===x&&(d.preventDefault(),n&&T(b,{select:!0})):g===C&&d.preventDefault()}},[n,r,k.paused]);return m.jsx(R.div,{tabIndex:-1,...i,ref:v,onKeyDown:E})});qe.displayName=Kt;function Zt(e,{select:t=!1}={}){const n=document.activeElement;for(const r of e)if(T(r,{select:t}),document.activeElement!==n)return}function Gt(e){const t=Ue(e),n=Se(t,e),r=Se(t.reverse(),e);return[n,r]}function Ue(e){const t=[],n=document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT,{acceptNode:r=>{const a=r.tagName==="INPUT"&&r.type==="hidden";return r.disabled||r.hidden||a?NodeFilter.FILTER_SKIP:r.tabIndex>=0?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});for(;n.nextNode();)t.push(n.currentNode);return t}function Se(e,t){for(const n of e)if(!Xt(n,{upTo:t}))return n}function Xt(e,{upTo:t}){if(getComputedStyle(e).visibility==="hidden")return!0;for(;e;){if(t!==void 0&&e===t)return!1;if(getComputedStyle(e).display==="none")return!0;e=e.parentElement}return!1}function Yt(e){return e instanceof HTMLInputElement&&"select"in e}function T(e,{select:t=!1}={}){if(e&&e.focus){const n=document.activeElement;e.focus({preventScroll:!0}),e!==n&&Yt(e)&&t&&e.select()}}var Re=Qt();function Qt(){let e=[];return{add(t){const n=e[0];t!==n&&(n==null||n.pause()),e=Pe(e,t),e.unshift(t)},remove(t){var n;e=Pe(e,t),(n=e[0])==null||n.resume()}}}function Pe(e,t){const n=[...e],r=n.indexOf(t);return r!==-1&&n.splice(r,1),n}function Jt(e){return e.filter(t=>t.tagName!=="A")}var en=function(e){if(typeof document>"u")return null;var t=Array.isArray(e)?e[0]:e;return t.ownerDocument.body},j=new WeakMap,$=new WeakMap,K={},oe=0,He=function(e){return e&&(e.host||He(e.parentNode))},tn=function(e,t){return t.map(function(n){if(e.contains(n))return n;var r=He(n);return r&&e.contains(r)?r:(console.error("aria-hidden",n,"in not contained inside",e,". Doing nothing"),null)}).filter(function(n){return!!n})},nn=function(e,t,n,r){var a=tn(t,Array.isArray(e)?e:[e]);K[n]||(K[n]=new WeakMap);var o=K[n],i=[],c=new Set,f=new Set(a),u=function(y){!y||c.has(y)||(c.add(y),u(y.parentNode))};a.forEach(u);var h=function(y){!y||f.has(y)||Array.prototype.forEach.call(y.children,function(v){if(c.has(v))h(v);else try{var k=v.getAttribute(r),E=k!==null&&k!=="false",d=(j.get(v)||0)+1,p=(o.get(v)||0)+1;j.set(v,d),o.set(v,p),i.push(v),d===1&&E&&$.set(v,!0),p===1&&v.setAttribute(n,"true"),E||v.setAttribute(r,"true")}catch(g){console.error("aria-hidden: cannot operate on ",v,g)}})};return h(t),c.clear(),oe++,function(){i.forEach(function(y){var v=j.get(y)-1,k=o.get(y)-1;j.set(y,v),o.set(y,k),v||($.has(y)||y.removeAttribute(r),$.delete(y)),k||y.removeAttribute(n)}),oe--,oe||(j=new WeakMap,j=new WeakMap,$=new WeakMap,K={})}},rn=function(e,t,n){n===void 0&&(n="data-aria-hidden");var r=Array.from(Array.isArray(e)?e:[e]),a=en(e);return a?(r.push.apply(r,Array.from(a.querySelectorAll("[aria-live]"))),nn(r,a,n,"aria-hidden")):function(){return null}},A=function(){return A=Object.assign||function(t){for(var n,r=1,a=arguments.length;r<a;r++){n=arguments[r];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[o]=n[o])}return t},A.apply(this,arguments)};function Ve(e,t){var n={};for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&t.indexOf(r)<0&&(n[r]=e[r]);if(e!=null&&typeof Object.getOwnPropertySymbols=="function")for(var a=0,r=Object.getOwnPropertySymbols(e);a<r.length;a++)t.indexOf(r[a])<0&&Object.prototype.propertyIsEnumerable.call(e,r[a])&&(n[r[a]]=e[r[a]]);return n}function an(e,t,n){if(n||arguments.length===2)for(var r=0,a=t.length,o;r<a;r++)(o||!(r in t))&&(o||(o=Array.prototype.slice.call(t,0,r)),o[r]=t[r]);return e.concat(o||Array.prototype.slice.call(t))}var Y="right-scroll-bar-position",Q="width-before-scroll-bar",on="with-scroll-bars-hidden",sn="--removed-body-scroll-bar-size";function se(e,t){return typeof e=="function"?e(t):e&&(e.current=t),e}function cn(e,t){var n=s.useState(function(){return{value:e,callback:t,facade:{get current(){return n.value},set current(r){var a=n.value;a!==r&&(n.value=r,n.callback(r,a))}}}})[0];return n.callback=t,n.facade}var ln=typeof window<"u"?s.useLayoutEffect:s.useEffect,Ae=new WeakMap;function un(e,t){var n=cn(null,function(r){return e.forEach(function(a){return se(a,r)})});return ln(function(){var r=Ae.get(n);if(r){var a=new Set(r),o=new Set(e),i=n.current;a.forEach(function(c){o.has(c)||se(c,null)}),o.forEach(function(c){a.has(c)||se(c,i)})}Ae.set(n,e)},[e]),n}function dn(e){return e}function fn(e,t){t===void 0&&(t=dn);var n=[],r=!1,a={read:function(){if(r)throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");return n.length?n[n.length-1]:e},useMedium:function(o){var i=t(o,r);return n.push(i),function(){n=n.filter(function(c){return c!==i})}},assignSyncMedium:function(o){for(r=!0;n.length;){var i=n;n=[],i.forEach(o)}n={push:function(c){return o(c)},filter:function(){return n}}},assignMedium:function(o){r=!0;var i=[];if(n.length){var c=n;n=[],c.forEach(o),i=n}var f=function(){var h=i;i=[],h.forEach(o)},u=function(){return Promise.resolve().then(f)};u(),n={push:function(h){i.push(h),u()},filter:function(h){return i=i.filter(h),n}}}};return a}function hn(e){e===void 0&&(e={});var t=fn(null);return t.options=A({async:!0,ssr:!1},e),t}var $e=function(e){var t=e.sideCar,n=Ve(e,["sideCar"]);if(!t)throw new Error("Sidecar: please provide `sideCar` property to import the right car");var r=t.read();if(!r)throw new Error("Sidecar medium not found");return s.createElement(r,A({},n))};$e.isSideCarExport=!0;function yn(e,t){return e.useMedium(t),$e}var Ke=hn(),ce=function(){},ee=s.forwardRef(function(e,t){var n=s.useRef(null),r=s.useState({onScrollCapture:ce,onWheelCapture:ce,onTouchMoveCapture:ce}),a=r[0],o=r[1],i=e.forwardProps,c=e.children,f=e.className,u=e.removeScrollBar,h=e.enabled,y=e.shards,v=e.sideCar,k=e.noIsolation,E=e.inert,d=e.allowPinchZoom,p=e.as,g=p===void 0?"div":p,C=e.gapMode,x=Ve(e,["forwardProps","children","className","removeScrollBar","enabled","shards","sideCar","noIsolation","inert","allowPinchZoom","as","gapMode"]),b=v,w=un([n,t]),S=A(A({},x),a);return s.createElement(s.Fragment,null,h&&s.createElement(b,{sideCar:Ke,removeScrollBar:u,shards:y,noIsolation:k,inert:E,setCallbacks:o,allowPinchZoom:!!d,lockRef:n,gapMode:C}),i?s.cloneElement(s.Children.only(c),A(A({},S),{ref:w})):s.createElement(g,A({},S,{className:f,ref:w}),c))});ee.defaultProps={enabled:!0,removeScrollBar:!0,inert:!1};ee.classNames={fullWidth:Q,zeroRight:Y};var pn=function(){if(typeof __webpack_nonce__<"u")return __webpack_nonce__};function vn(){if(!document)return null;var e=document.createElement("style");e.type="text/css";var t=pn();return t&&e.setAttribute("nonce",t),e}function mn(e,t){e.styleSheet?e.styleSheet.cssText=t:e.appendChild(document.createTextNode(t))}function gn(e){var t=document.head||document.getElementsByTagName("head")[0];t.appendChild(e)}var kn=function(){var e=0,t=null;return{add:function(n){e==0&&(t=vn())&&(mn(t,n),gn(t)),e++},remove:function(){e--,!e&&t&&(t.parentNode&&t.parentNode.removeChild(t),t=null)}}},Cn=function(){var e=kn();return function(t,n){s.useEffect(function(){return e.add(t),function(){e.remove()}},[t&&n])}},Ze=function(){var e=Cn(),t=function(n){var r=n.styles,a=n.dynamic;return e(r,a),null};return t},xn={left:0,top:0,right:0,gap:0},ie=function(e){return parseInt(e||"",10)||0},bn=function(e){var t=window.getComputedStyle(document.body),n=t[e==="padding"?"paddingLeft":"marginLeft"],r=t[e==="padding"?"paddingTop":"marginTop"],a=t[e==="padding"?"paddingRight":"marginRight"];return[ie(n),ie(r),ie(a)]},En=function(e){if(e===void 0&&(e="margin"),typeof window>"u")return xn;var t=bn(e),n=document.documentElement.clientWidth,r=window.innerWidth;return{left:t[0],top:t[1],right:t[2],gap:Math.max(0,r-n+t[2]-t[0])}},Mn=Ze(),z="data-scroll-locked",wn=function(e,t,n,r){var a=e.left,o=e.top,i=e.right,c=e.gap;return n===void 0&&(n="margin"),`
  .`.concat(on,` {
   overflow: hidden `).concat(r,`;
   padding-right: `).concat(c,"px ").concat(r,`;
  }
  body[`).concat(z,`] {
    overflow: hidden `).concat(r,`;
    overscroll-behavior: contain;
    `).concat([t&&"position: relative ".concat(r,";"),n==="margin"&&`
    padding-left: `.concat(a,`px;
    padding-top: `).concat(o,`px;
    padding-right: `).concat(i,`px;
    margin-left:0;
    margin-top:0;
    margin-right: `).concat(c,"px ").concat(r,`;
    `),n==="padding"&&"padding-right: ".concat(c,"px ").concat(r,";")].filter(Boolean).join(""),`
  }
  
  .`).concat(Y,` {
    right: `).concat(c,"px ").concat(r,`;
  }
  
  .`).concat(Q,` {
    margin-right: `).concat(c,"px ").concat(r,`;
  }
  
  .`).concat(Y," .").concat(Y,` {
    right: 0 `).concat(r,`;
  }
  
  .`).concat(Q," .").concat(Q,` {
    margin-right: 0 `).concat(r,`;
  }
  
  body[`).concat(z,`] {
    `).concat(sn,": ").concat(c,`px;
  }
`)},Ne=function(){var e=parseInt(document.body.getAttribute(z)||"0",10);return isFinite(e)?e:0},Sn=function(){s.useEffect(function(){return document.body.setAttribute(z,(Ne()+1).toString()),function(){var e=Ne()-1;e<=0?document.body.removeAttribute(z):document.body.setAttribute(z,e.toString())}},[])},Rn=function(e){var t=e.noRelative,n=e.noImportant,r=e.gapMode,a=r===void 0?"margin":r;Sn();var o=s.useMemo(function(){return En(a)},[a]);return s.createElement(Mn,{styles:wn(o,!t,a,n?"":"!important")})},ue=!1;if(typeof window<"u")try{var Z=Object.defineProperty({},"passive",{get:function(){return ue=!0,!0}});window.addEventListener("test",Z,Z),window.removeEventListener("test",Z,Z)}catch{ue=!1}var F=ue?{passive:!1}:!1,Pn=function(e){return e.tagName==="TEXTAREA"},Ge=function(e,t){if(!(e instanceof Element))return!1;var n=window.getComputedStyle(e);return n[t]!=="hidden"&&!(n.overflowY===n.overflowX&&!Pn(e)&&n[t]==="visible")},An=function(e){return Ge(e,"overflowY")},Nn=function(e){return Ge(e,"overflowX")},De=function(e,t){var n=t.ownerDocument,r=t;do{typeof ShadowRoot<"u"&&r instanceof ShadowRoot&&(r=r.host);var a=Xe(e,r);if(a){var o=Ye(e,r),i=o[1],c=o[2];if(i>c)return!0}r=r.parentNode}while(r&&r!==n.body);return!1},Dn=function(e){var t=e.scrollTop,n=e.scrollHeight,r=e.clientHeight;return[t,n,r]},On=function(e){var t=e.scrollLeft,n=e.scrollWidth,r=e.clientWidth;return[t,n,r]},Xe=function(e,t){return e==="v"?An(t):Nn(t)},Ye=function(e,t){return e==="v"?Dn(t):On(t)},Tn=function(e,t){return e==="h"&&t==="rtl"?-1:1},Ln=function(e,t,n,r,a){var o=Tn(e,window.getComputedStyle(t).direction),i=o*r,c=n.target,f=t.contains(c),u=!1,h=i>0,y=0,v=0;do{var k=Ye(e,c),E=k[0],d=k[1],p=k[2],g=d-p-o*E;(E||g)&&Xe(e,c)&&(y+=g,v+=E),c instanceof ShadowRoot?c=c.host:c=c.parentNode}while(!f&&c!==document.body||f&&(t.contains(c)||t===c));return(h&&(Math.abs(y)<1||!a)||!h&&(Math.abs(v)<1||!a))&&(u=!0),u},G=function(e){return"changedTouches"in e?[e.changedTouches[0].clientX,e.changedTouches[0].clientY]:[0,0]},Oe=function(e){return[e.deltaX,e.deltaY]},Te=function(e){return e&&"current"in e?e.current:e},In=function(e,t){return e[0]===t[0]&&e[1]===t[1]},_n=function(e){return`
  .block-interactivity-`.concat(e,` {pointer-events: none;}
  .allow-interactivity-`).concat(e,` {pointer-events: all;}
`)},jn=0,W=[];function Fn(e){var t=s.useRef([]),n=s.useRef([0,0]),r=s.useRef(),a=s.useState(jn++)[0],o=s.useState(Ze)[0],i=s.useRef(e);s.useEffect(function(){i.current=e},[e]),s.useEffect(function(){if(e.inert){document.body.classList.add("block-interactivity-".concat(a));var d=an([e.lockRef.current],(e.shards||[]).map(Te),!0).filter(Boolean);return d.forEach(function(p){return p.classList.add("allow-interactivity-".concat(a))}),function(){document.body.classList.remove("block-interactivity-".concat(a)),d.forEach(function(p){return p.classList.remove("allow-interactivity-".concat(a))})}}},[e.inert,e.lockRef.current,e.shards]);var c=s.useCallback(function(d,p){if("touches"in d&&d.touches.length===2||d.type==="wheel"&&d.ctrlKey)return!i.current.allowPinchZoom;var g=G(d),C=n.current,x="deltaX"in d?d.deltaX:C[0]-g[0],b="deltaY"in d?d.deltaY:C[1]-g[1],w,S=d.target,M=Math.abs(x)>Math.abs(b)?"h":"v";if("touches"in d&&M==="h"&&S.type==="range")return!1;var D=De(M,S);if(!D)return!0;if(D?w=M:(w=M==="v"?"h":"v",D=De(M,S)),!D)return!1;if(!r.current&&"changedTouches"in d&&(x||b)&&(r.current=w),!w)return!0;var B=r.current||w;return Ln(B,p,d,B==="h"?x:b,!0)},[]),f=s.useCallback(function(d){var p=d;if(!(!W.length||W[W.length-1]!==o)){var g="deltaY"in p?Oe(p):G(p),C=t.current.filter(function(w){return w.name===p.type&&(w.target===p.target||p.target===w.shadowParent)&&In(w.delta,g)})[0];if(C&&C.should){p.cancelable&&p.preventDefault();return}if(!C){var x=(i.current.shards||[]).map(Te).filter(Boolean).filter(function(w){return w.contains(p.target)}),b=x.length>0?c(p,x[0]):!i.current.noIsolation;b&&p.cancelable&&p.preventDefault()}}},[]),u=s.useCallback(function(d,p,g,C){var x={name:d,delta:p,target:g,should:C,shadowParent:Wn(g)};t.current.push(x),setTimeout(function(){t.current=t.current.filter(function(b){return b!==x})},1)},[]),h=s.useCallback(function(d){n.current=G(d),r.current=void 0},[]),y=s.useCallback(function(d){u(d.type,Oe(d),d.target,c(d,e.lockRef.current))},[]),v=s.useCallback(function(d){u(d.type,G(d),d.target,c(d,e.lockRef.current))},[]);s.useEffect(function(){return W.push(o),e.setCallbacks({onScrollCapture:y,onWheelCapture:y,onTouchMoveCapture:v}),document.addEventListener("wheel",f,F),document.addEventListener("touchmove",f,F),document.addEventListener("touchstart",h,F),function(){W=W.filter(function(d){return d!==o}),document.removeEventListener("wheel",f,F),document.removeEventListener("touchmove",f,F),document.removeEventListener("touchstart",h,F)}},[]);var k=e.removeScrollBar,E=e.inert;return s.createElement(s.Fragment,null,E?s.createElement(o,{styles:_n(a)}):null,k?s.createElement(Rn,{gapMode:e.gapMode}):null)}function Wn(e){for(var t=null;e!==null;)e instanceof ShadowRoot&&(t=e.host,e=e.host),e=e.parentNode;return t}const zn=yn(Ke,Fn);var Qe=s.forwardRef(function(e,t){return s.createElement(ee,A({},e,{ref:t,sideCar:zn}))});Qe.classNames=ee.classNames;var he="Dialog",[Je,za]=de(he),[Bn,P]=Je(he),et=e=>{const{__scopeDialog:t,children:n,open:r,defaultOpen:a,onOpenChange:o,modal:i=!0}=e,c=s.useRef(null),f=s.useRef(null),[u=!1,h]=ze({prop:r,defaultProp:a,onChange:o});return m.jsx(Bn,{scope:t,triggerRef:c,contentRef:f,contentId:X(),titleId:X(),descriptionId:X(),open:u,onOpenChange:h,onOpenToggle:s.useCallback(()=>h(y=>!y),[h]),modal:i,children:n})};et.displayName=he;var tt="DialogTrigger",nt=s.forwardRef((e,t)=>{const{__scopeDialog:n,...r}=e,a=P(tt,n),o=N(t,a.triggerRef);return m.jsx(R.button,{type:"button","aria-haspopup":"dialog","aria-expanded":a.open,"aria-controls":a.contentId,"data-state":ve(a.open),...r,ref:o,onClick:O(e.onClick,a.onOpenToggle)})});nt.displayName=tt;var ye="DialogPortal",[qn,rt]=Je(ye,{forceMount:void 0}),at=e=>{const{__scopeDialog:t,forceMount:n,children:r,container:a}=e,o=P(ye,t);return m.jsx(qn,{scope:t,forceMount:n,children:s.Children.map(r,i=>m.jsx(H,{present:n||o.open,children:m.jsx(We,{asChild:!0,container:a,children:i})}))})};at.displayName=ye;var J="DialogOverlay",ot=s.forwardRef((e,t)=>{const n=rt(J,e.__scopeDialog),{forceMount:r=n.forceMount,...a}=e,o=P(J,e.__scopeDialog);return o.modal?m.jsx(H,{present:r||o.open,children:m.jsx(Hn,{...a,ref:t})}):null});ot.displayName=J;var Un=q("DialogOverlay.RemoveScroll"),Hn=s.forwardRef((e,t)=>{const{__scopeDialog:n,...r}=e,a=P(J,n);return m.jsx(Qe,{as:Un,allowPinchZoom:!0,shards:[a.contentRef],children:m.jsx(R.div,{"data-state":ve(a.open),...r,ref:t,style:{pointerEvents:"auto",...r.style}})})}),_="DialogContent",st=s.forwardRef((e,t)=>{const n=rt(_,e.__scopeDialog),{forceMount:r=n.forceMount,...a}=e,o=P(_,e.__scopeDialog);return m.jsx(H,{present:r||o.open,children:o.modal?m.jsx(Vn,{...a,ref:t}):m.jsx($n,{...a,ref:t})})});st.displayName=_;var Vn=s.forwardRef((e,t)=>{const n=P(_,e.__scopeDialog),r=s.useRef(null),a=N(t,n.contentRef,r);return s.useEffect(()=>{const o=r.current;if(o)return rn(o)},[]),m.jsx(ct,{...e,ref:a,trapFocus:n.open,disableOutsidePointerEvents:!0,onCloseAutoFocus:O(e.onCloseAutoFocus,o=>{var i;o.preventDefault(),(i=n.triggerRef.current)==null||i.focus()}),onPointerDownOutside:O(e.onPointerDownOutside,o=>{const i=o.detail.originalEvent,c=i.button===0&&i.ctrlKey===!0;(i.button===2||c)&&o.preventDefault()}),onFocusOutside:O(e.onFocusOutside,o=>o.preventDefault())})}),$n=s.forwardRef((e,t)=>{const n=P(_,e.__scopeDialog),r=s.useRef(!1),a=s.useRef(!1);return m.jsx(ct,{...e,ref:t,trapFocus:!1,disableOutsidePointerEvents:!1,onCloseAutoFocus:o=>{var i,c;(i=e.onCloseAutoFocus)==null||i.call(e,o),o.defaultPrevented||(r.current||(c=n.triggerRef.current)==null||c.focus(),o.preventDefault()),r.current=!1,a.current=!1},onInteractOutside:o=>{var f,u;(f=e.onInteractOutside)==null||f.call(e,o),o.defaultPrevented||(r.current=!0,o.detail.originalEvent.type==="pointerdown"&&(a.current=!0));const i=o.target;((u=n.triggerRef.current)==null?void 0:u.contains(i))&&o.preventDefault(),o.detail.originalEvent.type==="focusin"&&a.current&&o.preventDefault()}})}),ct=s.forwardRef((e,t)=>{const{__scopeDialog:n,trapFocus:r,onOpenAutoFocus:a,onCloseAutoFocus:o,...i}=e,c=P(_,n),f=s.useRef(null),u=N(t,f);return $t(),m.jsxs(m.Fragment,{children:[m.jsx(qe,{asChild:!0,loop:!0,trapped:r,onMountAutoFocus:a,onUnmountAutoFocus:o,children:m.jsx(fe,{role:"dialog",id:c.contentId,"aria-describedby":c.descriptionId,"aria-labelledby":c.titleId,"data-state":ve(c.open),...i,ref:u,onDismiss:()=>c.onOpenChange(!1)})}),m.jsxs(m.Fragment,{children:[m.jsx(Kn,{titleId:c.titleId}),m.jsx(Gn,{contentRef:f,descriptionId:c.descriptionId})]})]})}),pe="DialogTitle",it=s.forwardRef((e,t)=>{const{__scopeDialog:n,...r}=e,a=P(pe,n);return m.jsx(R.h2,{id:a.titleId,...r,ref:t})});it.displayName=pe;var lt="DialogDescription",ut=s.forwardRef((e,t)=>{const{__scopeDialog:n,...r}=e,a=P(lt,n);return m.jsx(R.p,{id:a.descriptionId,...r,ref:t})});ut.displayName=lt;var dt="DialogClose",ft=s.forwardRef((e,t)=>{const{__scopeDialog:n,...r}=e,a=P(dt,n);return m.jsx(R.button,{type:"button",...r,ref:t,onClick:O(e.onClick,()=>a.onOpenChange(!1))})});ft.displayName=dt;function ve(e){return e?"open":"closed"}var ht="DialogTitleWarning",[Ba,yt]=Ct(ht,{contentName:_,titleName:pe,docsSlug:"dialog"}),Kn=({titleId:e})=>{const t=yt(ht),n=`\`${t.contentName}\` requires a \`${t.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${t.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${t.docsSlug}`;return s.useEffect(()=>{e&&(document.getElementById(e)||console.error(n))},[n,e]),null},Zn="DialogDescriptionWarning",Gn=({contentRef:e,descriptionId:t})=>{const r=`Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${yt(Zn).contentName}}.`;return s.useEffect(()=>{var o;const a=(o=e.current)==null?void 0:o.getAttribute("aria-describedby");t&&a&&(document.getElementById(t)||console.warn(r))},[r,e,t]),null},qa=et,Ua=nt,Ha=at,Va=ot,$a=st,Ka=it,Za=ut,Ga=ft,me="Collapsible",[Xn,Xa]=de(me),[Yn,ge]=Xn(me),pt=s.forwardRef((e,t)=>{const{__scopeCollapsible:n,open:r,defaultOpen:a,disabled:o,onOpenChange:i,...c}=e,[f=!1,u]=ze({prop:r,defaultProp:a,onChange:i});return m.jsx(Yn,{scope:n,disabled:o,contentId:X(),open:f,onOpenToggle:s.useCallback(()=>u(h=>!h),[u]),children:m.jsx(R.div,{"data-state":Ce(f),"data-disabled":o?"":void 0,...c,ref:t})})});pt.displayName=me;var vt="CollapsibleTrigger",Qn=s.forwardRef((e,t)=>{const{__scopeCollapsible:n,...r}=e,a=ge(vt,n);return m.jsx(R.button,{type:"button","aria-controls":a.contentId,"aria-expanded":a.open||!1,"data-state":Ce(a.open),"data-disabled":a.disabled?"":void 0,disabled:a.disabled,...r,ref:t,onClick:O(e.onClick,a.onOpenToggle)})});Qn.displayName=vt;var ke="CollapsibleContent",Jn=s.forwardRef((e,t)=>{const{forceMount:n,...r}=e,a=ge(ke,e.__scopeCollapsible);return m.jsx(H,{present:n||a.open,children:({present:o})=>m.jsx(er,{...r,ref:t,present:o})})});Jn.displayName=ke;var er=s.forwardRef((e,t)=>{const{__scopeCollapsible:n,present:r,children:a,...o}=e,i=ge(ke,n),[c,f]=s.useState(r),u=s.useRef(null),h=N(t,u),y=s.useRef(0),v=y.current,k=s.useRef(0),E=k.current,d=i.open||c,p=s.useRef(d),g=s.useRef(void 0);return s.useEffect(()=>{const C=requestAnimationFrame(()=>p.current=!1);return()=>cancelAnimationFrame(C)},[]),U(()=>{const C=u.current;if(C){g.current=g.current||{transitionDuration:C.style.transitionDuration,animationName:C.style.animationName},C.style.transitionDuration="0s",C.style.animationName="none";const x=C.getBoundingClientRect();y.current=x.height,k.current=x.width,p.current||(C.style.transitionDuration=g.current.transitionDuration,C.style.animationName=g.current.animationName),f(r)}},[i.open,r]),m.jsx(R.div,{"data-state":Ce(i.open),"data-disabled":i.disabled?"":void 0,id:i.contentId,hidden:!d,...o,ref:h,style:{"--radix-collapsible-content-height":v?`${v}px`:void 0,"--radix-collapsible-content-width":E?`${E}px`:void 0,...e.style},children:d&&a})});function Ce(e){return e?"open":"closed"}var Ya=pt;export{Aa as $,fr as A,sr as B,br as C,fe as D,Ir as E,qe as F,na as G,qr as H,ba as I,Sa as J,Kr as K,Yr as L,aa as M,Cr as N,Va as O,R as P,$a as Q,or as R,nr as S,Ra as T,Ga as U,Ka as V,Za as W,ja as X,Ha as Y,qa as Z,Ua as _,de as a,$r as a$,Rr as a0,jr as a1,Sr as a2,Dr as a3,oa as a4,La as a5,yr as a6,Ur as a7,Tr as a8,kr as a9,Pr as aA,ia as aB,dr as aC,Pa as aD,Jr as aE,Er as aF,Ar as aG,fa as aH,wa as aI,_a as aJ,Ia as aK,ga as aL,sa as aM,ua as aN,Ya as aO,Qn as aP,Jn as aQ,cr as aR,ur as aS,pr as aT,Zr as aU,Or as aV,Fa as aW,mr as aX,Ca as aY,ma as aZ,Br as a_,ra as aa,pa as ab,Fr as ac,Vr as ad,hr as ae,Lr as af,xa as ag,Ma as ah,Oa as ai,Ta as aj,ya as ak,lr as al,Na as am,Wr as an,la as ao,ea as ap,da as aq,gr as ar,zr as as,vr as at,ka as au,za as av,Ba as aw,Hr as ax,ca as ay,ir as az,ze as b,ha as b0,Gr as b1,Da as b2,Qr as b3,ta as b4,ar as c,H as d,I as e,O as f,We as g,U as h,Rt as i,rr as j,Ea as k,va as l,rn as m,$t as n,Qe as o,X as p,q,Wa as r,wr as s,xr as t,N as u,_r as v,Xr as w,Le as x,Mr as y,Nr as z};
