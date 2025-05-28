(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function t(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(i){if(i.ep)return;i.ep=!0;const r=t(i);fetch(i.href,r)}})();const Rr={apiKey:"AIzaSyBUU7d47ylh23s4dROjLlD4QV_LJn1kqUw",authDomain:"willqrsite.firebaseapp.com",databaseURL:"https://willqrsite-default-rtdb.firebaseio.com",projectId:"willqrsite",storageBucket:"willqrsite.firebasestorage.app",messagingSenderId:"1009488518183",appId:"1:1009488518183:web:a0b37e2622183d3e4a8202",measurementId:"G-6TTPNT3CYM"},Nr=()=>{};var Yn={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zs={NODE_ADMIN:!1,SDK_VERSION:"${JSCORE_VERSION}"};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const f=function(n,e){if(!n)throw Ie(e)},Ie=function(n){return new Error("Firebase Database ("+zs.SDK_VERSION+") INTERNAL ASSERT FAILED: "+n)};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vs=function(n){const e=[];let t=0;for(let s=0;s<n.length;s++){let i=n.charCodeAt(s);i<128?e[t++]=i:i<2048?(e[t++]=i>>6|192,e[t++]=i&63|128):(i&64512)===55296&&s+1<n.length&&(n.charCodeAt(s+1)&64512)===56320?(i=65536+((i&1023)<<10)+(n.charCodeAt(++s)&1023),e[t++]=i>>18|240,e[t++]=i>>12&63|128,e[t++]=i>>6&63|128,e[t++]=i&63|128):(e[t++]=i>>12|224,e[t++]=i>>6&63|128,e[t++]=i&63|128)}return e},Ar=function(n){const e=[];let t=0,s=0;for(;t<n.length;){const i=n[t++];if(i<128)e[s++]=String.fromCharCode(i);else if(i>191&&i<224){const r=n[t++];e[s++]=String.fromCharCode((i&31)<<6|r&63)}else if(i>239&&i<365){const r=n[t++],o=n[t++],a=n[t++],l=((i&7)<<18|(r&63)<<12|(o&63)<<6|a&63)-65536;e[s++]=String.fromCharCode(55296+(l>>10)),e[s++]=String.fromCharCode(56320+(l&1023))}else{const r=n[t++],o=n[t++];e[s++]=String.fromCharCode((i&15)<<12|(r&63)<<6|o&63)}}return e.join("")},pn={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(n,e){if(!Array.isArray(n))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,s=[];for(let i=0;i<n.length;i+=3){const r=n[i],o=i+1<n.length,a=o?n[i+1]:0,l=i+2<n.length,c=l?n[i+2]:0,u=r>>2,h=(r&3)<<4|a>>4;let d=(a&15)<<2|c>>6,p=c&63;l||(p=64,o||(d=64)),s.push(t[u],t[h],t[d],t[p])}return s.join("")},encodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(n):this.encodeByteArray(Vs(n),e)},decodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(n):Ar(this.decodeStringToByteArray(n,e))},decodeStringToByteArray(n,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,s=[];for(let i=0;i<n.length;){const r=t[n.charAt(i++)],a=i<n.length?t[n.charAt(i)]:0;++i;const c=i<n.length?t[n.charAt(i)]:64;++i;const h=i<n.length?t[n.charAt(i)]:64;if(++i,r==null||a==null||c==null||h==null)throw new Dr;const d=r<<2|a>>4;if(s.push(d),c!==64){const p=a<<4&240|c>>2;if(s.push(p),h!==64){const m=c<<6&192|h;s.push(m)}}}return s},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let n=0;n<this.ENCODED_VALS.length;n++)this.byteToCharMap_[n]=this.ENCODED_VALS.charAt(n),this.charToByteMap_[this.byteToCharMap_[n]]=n,this.byteToCharMapWebSafe_[n]=this.ENCODED_VALS_WEBSAFE.charAt(n),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[n]]=n,n>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(n)]=n,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(n)]=n)}}};class Dr extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const Gs=function(n){const e=Vs(n);return pn.encodeByteArray(e,!0)},at=function(n){return Gs(n).replace(/\./g,"")},Xt=function(n){try{return pn.decodeString(n,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Mr(n){return js(void 0,n)}function js(n,e){if(!(e instanceof Object))return e;switch(e.constructor){case Date:const t=e;return new Date(t.getTime());case Object:n===void 0&&(n={});break;case Array:n=[];break;default:return e}for(const t in e)!e.hasOwnProperty(t)||!kr(t)||(n[t]=js(n[t],e[t]));return n}function kr(n){return n!=="__proto__"}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xr(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pr=()=>xr().__FIREBASE_DEFAULTS__,Lr=()=>{if(typeof process>"u"||typeof Yn>"u")return;const n=Yn.__FIREBASE_DEFAULTS__;if(n)return JSON.parse(n)},Or=()=>{if(typeof document>"u")return;let n;try{n=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=n&&Xt(n[1]);return e&&JSON.parse(e)},Ys=()=>{try{return Nr()||Pr()||Lr()||Or()}catch(n){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${n}`);return}},Fr=n=>{var e,t;return(t=(e=Ys())===null||e===void 0?void 0:e.emulatorHosts)===null||t===void 0?void 0:t[n]},Br=n=>{const e=Fr(n);if(!e)return;const t=e.lastIndexOf(":");if(t<=0||t+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const s=parseInt(e.substring(t+1),10);return e[0]==="["?[e.substring(1,t-1),s]:[e.substring(0,t),s]},Ks=()=>{var n;return(n=Ys())===null||n===void 0?void 0:n.config};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wt{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,s)=>{t?this.reject(t):this.resolve(s),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,s))}}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qr(n,e){if(n.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},s=e||"demo-project",i=n.iat||0,r=n.sub||n.user_id;if(!r)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o=Object.assign({iss:`https://securetoken.google.com/${s}`,aud:s,iat:i,exp:i+3600,auth_time:i,sub:r,user_id:r,firebase:{sign_in_provider:"custom",identities:{}}},n);return[at(JSON.stringify(t)),at(JSON.stringify(o)),""].join(".")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Hr(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function Qs(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(Hr())}function $r(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function Wr(){return zs.NODE_ADMIN===!0}function Ur(){try{return typeof indexedDB=="object"}catch{return!1}}function zr(){return new Promise((n,e)=>{try{let t=!0;const s="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(s);i.onsuccess=()=>{i.result.close(),t||self.indexedDB.deleteDatabase(s),n(!0)},i.onupgradeneeded=()=>{t=!1},i.onerror=()=>{var r;e(((r=i.error)===null||r===void 0?void 0:r.message)||"")}}catch(t){e(t)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vr="FirebaseError";class Ye extends Error{constructor(e,t,s){super(t),this.code=e,this.customData=s,this.name=Vr,Object.setPrototypeOf(this,Ye.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Xs.prototype.create)}}class Xs{constructor(e,t,s){this.service=e,this.serviceName=t,this.errors=s}create(e,...t){const s=t[0]||{},i=`${this.service}/${e}`,r=this.errors[e],o=r?Gr(r,s):"Error",a=`${this.serviceName}: ${o} (${i}).`;return new Ye(i,a,s)}}function Gr(n,e){return n.replace(jr,(t,s)=>{const i=e[s];return i!=null?String(i):`<${s}?>`})}const jr=/\{\$([^}]+)}/g;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Oe(n){return JSON.parse(n)}function R(n){return JSON.stringify(n)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Js=function(n){let e={},t={},s={},i="";try{const r=n.split(".");e=Oe(Xt(r[0])||""),t=Oe(Xt(r[1])||""),i=r[2],s=t.d||{},delete t.d}catch{}return{header:e,claims:t,data:s,signature:i}},Yr=function(n){const e=Js(n),t=e.claims;return!!t&&typeof t=="object"&&t.hasOwnProperty("iat")},Kr=function(n){const e=Js(n).claims;return typeof e=="object"&&e.admin===!0};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function z(n,e){return Object.prototype.hasOwnProperty.call(n,e)}function Ce(n,e){if(Object.prototype.hasOwnProperty.call(n,e))return n[e]}function Kn(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}function lt(n,e,t){const s={};for(const i in n)Object.prototype.hasOwnProperty.call(n,i)&&(s[i]=e.call(t,n[i],i,n));return s}function ct(n,e){if(n===e)return!0;const t=Object.keys(n),s=Object.keys(e);for(const i of t){if(!s.includes(i))return!1;const r=n[i],o=e[i];if(Qn(r)&&Qn(o)){if(!ct(r,o))return!1}else if(r!==o)return!1}for(const i of s)if(!t.includes(i))return!1;return!0}function Qn(n){return n!==null&&typeof n=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Qr(n){const e=[];for(const[t,s]of Object.entries(n))Array.isArray(s)?s.forEach(i=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(i))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(s));return e.length?"&"+e.join("&"):""}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xr{constructor(){this.chain_=[],this.buf_=[],this.W_=[],this.pad_=[],this.inbuf_=0,this.total_=0,this.blockSize=512/8,this.pad_[0]=128;for(let e=1;e<this.blockSize;++e)this.pad_[e]=0;this.reset()}reset(){this.chain_[0]=1732584193,this.chain_[1]=4023233417,this.chain_[2]=2562383102,this.chain_[3]=271733878,this.chain_[4]=3285377520,this.inbuf_=0,this.total_=0}compress_(e,t){t||(t=0);const s=this.W_;if(typeof e=="string")for(let h=0;h<16;h++)s[h]=e.charCodeAt(t)<<24|e.charCodeAt(t+1)<<16|e.charCodeAt(t+2)<<8|e.charCodeAt(t+3),t+=4;else for(let h=0;h<16;h++)s[h]=e[t]<<24|e[t+1]<<16|e[t+2]<<8|e[t+3],t+=4;for(let h=16;h<80;h++){const d=s[h-3]^s[h-8]^s[h-14]^s[h-16];s[h]=(d<<1|d>>>31)&4294967295}let i=this.chain_[0],r=this.chain_[1],o=this.chain_[2],a=this.chain_[3],l=this.chain_[4],c,u;for(let h=0;h<80;h++){h<40?h<20?(c=a^r&(o^a),u=1518500249):(c=r^o^a,u=1859775393):h<60?(c=r&o|a&(r|o),u=2400959708):(c=r^o^a,u=3395469782);const d=(i<<5|i>>>27)+c+l+u+s[h]&4294967295;l=a,a=o,o=(r<<30|r>>>2)&4294967295,r=i,i=d}this.chain_[0]=this.chain_[0]+i&4294967295,this.chain_[1]=this.chain_[1]+r&4294967295,this.chain_[2]=this.chain_[2]+o&4294967295,this.chain_[3]=this.chain_[3]+a&4294967295,this.chain_[4]=this.chain_[4]+l&4294967295}update(e,t){if(e==null)return;t===void 0&&(t=e.length);const s=t-this.blockSize;let i=0;const r=this.buf_;let o=this.inbuf_;for(;i<t;){if(o===0)for(;i<=s;)this.compress_(e,i),i+=this.blockSize;if(typeof e=="string"){for(;i<t;)if(r[o]=e.charCodeAt(i),++o,++i,o===this.blockSize){this.compress_(r),o=0;break}}else for(;i<t;)if(r[o]=e[i],++o,++i,o===this.blockSize){this.compress_(r),o=0;break}}this.inbuf_=o,this.total_+=t}digest(){const e=[];let t=this.total_*8;this.inbuf_<56?this.update(this.pad_,56-this.inbuf_):this.update(this.pad_,this.blockSize-(this.inbuf_-56));for(let i=this.blockSize-1;i>=56;i--)this.buf_[i]=t&255,t/=256;this.compress_(this.buf_);let s=0;for(let i=0;i<5;i++)for(let r=24;r>=0;r-=8)e[s]=this.chain_[i]>>r&255,++s;return e}}function mn(n,e){return`${n} failed: ${e} argument `}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Jr=function(n){const e=[];let t=0;for(let s=0;s<n.length;s++){let i=n.charCodeAt(s);if(i>=55296&&i<=56319){const r=i-55296;s++,f(s<n.length,"Surrogate pair missing trail surrogate.");const o=n.charCodeAt(s)-56320;i=65536+(r<<10)+o}i<128?e[t++]=i:i<2048?(e[t++]=i>>6|192,e[t++]=i&63|128):i<65536?(e[t++]=i>>12|224,e[t++]=i>>6&63|128,e[t++]=i&63|128):(e[t++]=i>>18|240,e[t++]=i>>12&63|128,e[t++]=i>>6&63|128,e[t++]=i&63|128)}return e},St=function(n){let e=0;for(let t=0;t<n.length;t++){const s=n.charCodeAt(t);s<128?e++:s<2048?e+=2:s>=55296&&s<=56319?(e+=4,t++):e+=3}return e};/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ie(n){return n&&n._delegate?n._delegate:n}class Fe{constructor(e,t,s){this.name=e,this.instanceFactory=t,this.type=s,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const oe="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zr{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const s=new wt;if(this.instancesDeferred.set(t,s),this.isInitialized(t)||this.shouldAutoInitialize())try{const i=this.getOrInitializeService({instanceIdentifier:t});i&&s.resolve(i)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){var t;const s=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),i=(t=e==null?void 0:e.optional)!==null&&t!==void 0?t:!1;if(this.isInitialized(s)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:s})}catch(r){if(i)return null;throw r}else{if(i)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(to(e))try{this.getOrInitializeService({instanceIdentifier:oe})}catch{}for(const[t,s]of this.instancesDeferred.entries()){const i=this.normalizeInstanceIdentifier(t);try{const r=this.getOrInitializeService({instanceIdentifier:i});s.resolve(r)}catch{}}}}clearInstance(e=oe){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=oe){return this.instances.has(e)}getOptions(e=oe){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,s=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(s))throw Error(`${this.name}(${s}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const i=this.getOrInitializeService({instanceIdentifier:s,options:t});for(const[r,o]of this.instancesDeferred.entries()){const a=this.normalizeInstanceIdentifier(r);s===a&&o.resolve(i)}return i}onInit(e,t){var s;const i=this.normalizeInstanceIdentifier(t),r=(s=this.onInitCallbacks.get(i))!==null&&s!==void 0?s:new Set;r.add(e),this.onInitCallbacks.set(i,r);const o=this.instances.get(i);return o&&e(o,i),()=>{r.delete(e)}}invokeOnInitCallbacks(e,t){const s=this.onInitCallbacks.get(t);if(s)for(const i of s)try{i(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let s=this.instances.get(e);if(!s&&this.component&&(s=this.component.instanceFactory(this.container,{instanceIdentifier:eo(e),options:t}),this.instances.set(e,s),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(s,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,s)}catch{}return s||null}normalizeInstanceIdentifier(e=oe){return this.component?this.component.multipleInstances?e:oe:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function eo(n){return n===oe?void 0:n}function to(n){return n.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class no{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new Zr(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var I;(function(n){n[n.DEBUG=0]="DEBUG",n[n.VERBOSE=1]="VERBOSE",n[n.INFO=2]="INFO",n[n.WARN=3]="WARN",n[n.ERROR=4]="ERROR",n[n.SILENT=5]="SILENT"})(I||(I={}));const so={debug:I.DEBUG,verbose:I.VERBOSE,info:I.INFO,warn:I.WARN,error:I.ERROR,silent:I.SILENT},io=I.INFO,ro={[I.DEBUG]:"log",[I.VERBOSE]:"log",[I.INFO]:"info",[I.WARN]:"warn",[I.ERROR]:"error"},oo=(n,e,...t)=>{if(e<n.logLevel)return;const s=new Date().toISOString(),i=ro[e];if(i)console[i](`[${s}]  ${n.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class Zs{constructor(e){this.name=e,this._logLevel=io,this._logHandler=oo,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in I))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?so[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,I.DEBUG,...e),this._logHandler(this,I.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,I.VERBOSE,...e),this._logHandler(this,I.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,I.INFO,...e),this._logHandler(this,I.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,I.WARN,...e),this._logHandler(this,I.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,I.ERROR,...e),this._logHandler(this,I.ERROR,...e)}}const ao=(n,e)=>e.some(t=>n instanceof t);let Xn,Jn;function lo(){return Xn||(Xn=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function co(){return Jn||(Jn=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const ei=new WeakMap,Jt=new WeakMap,ti=new WeakMap,Ft=new WeakMap,gn=new WeakMap;function ho(n){const e=new Promise((t,s)=>{const i=()=>{n.removeEventListener("success",r),n.removeEventListener("error",o)},r=()=>{t(Q(n.result)),i()},o=()=>{s(n.error),i()};n.addEventListener("success",r),n.addEventListener("error",o)});return e.then(t=>{t instanceof IDBCursor&&ei.set(t,n)}).catch(()=>{}),gn.set(e,n),e}function uo(n){if(Jt.has(n))return;const e=new Promise((t,s)=>{const i=()=>{n.removeEventListener("complete",r),n.removeEventListener("error",o),n.removeEventListener("abort",o)},r=()=>{t(),i()},o=()=>{s(n.error||new DOMException("AbortError","AbortError")),i()};n.addEventListener("complete",r),n.addEventListener("error",o),n.addEventListener("abort",o)});Jt.set(n,e)}let Zt={get(n,e,t){if(n instanceof IDBTransaction){if(e==="done")return Jt.get(n);if(e==="objectStoreNames")return n.objectStoreNames||ti.get(n);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return Q(n[e])},set(n,e,t){return n[e]=t,!0},has(n,e){return n instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in n}};function fo(n){Zt=n(Zt)}function po(n){return n===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const s=n.call(Bt(this),e,...t);return ti.set(s,e.sort?e.sort():[e]),Q(s)}:co().includes(n)?function(...e){return n.apply(Bt(this),e),Q(ei.get(this))}:function(...e){return Q(n.apply(Bt(this),e))}}function mo(n){return typeof n=="function"?po(n):(n instanceof IDBTransaction&&uo(n),ao(n,lo())?new Proxy(n,Zt):n)}function Q(n){if(n instanceof IDBRequest)return ho(n);if(Ft.has(n))return Ft.get(n);const e=mo(n);return e!==n&&(Ft.set(n,e),gn.set(e,n)),e}const Bt=n=>gn.get(n);function go(n,e,{blocked:t,upgrade:s,blocking:i,terminated:r}={}){const o=indexedDB.open(n,e),a=Q(o);return s&&o.addEventListener("upgradeneeded",l=>{s(Q(o.result),l.oldVersion,l.newVersion,Q(o.transaction),l)}),t&&o.addEventListener("blocked",l=>t(l.oldVersion,l.newVersion,l)),a.then(l=>{r&&l.addEventListener("close",()=>r()),i&&l.addEventListener("versionchange",c=>i(c.oldVersion,c.newVersion,c))}).catch(()=>{}),a}const _o=["get","getKey","getAll","getAllKeys","count"],yo=["put","add","delete","clear"],qt=new Map;function Zn(n,e){if(!(n instanceof IDBDatabase&&!(e in n)&&typeof e=="string"))return;if(qt.get(e))return qt.get(e);const t=e.replace(/FromIndex$/,""),s=e!==t,i=yo.includes(t);if(!(t in(s?IDBIndex:IDBObjectStore).prototype)||!(i||_o.includes(t)))return;const r=async function(o,...a){const l=this.transaction(o,i?"readwrite":"readonly");let c=l.store;return s&&(c=c.index(a.shift())),(await Promise.all([c[t](...a),i&&l.done]))[0]};return qt.set(e,r),r}fo(n=>({...n,get:(e,t,s)=>Zn(e,t)||n.get(e,t,s),has:(e,t)=>!!Zn(e,t)||n.has(e,t)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vo{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(Co(t)){const s=t.getImmediate();return`${s.library}/${s.version}`}else return null}).filter(t=>t).join(" ")}}function Co(n){const e=n.getComponent();return(e==null?void 0:e.type)==="VERSION"}const en="@firebase/app",es="0.11.4";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const j=new Zs("@firebase/app"),Eo="@firebase/app-compat",bo="@firebase/analytics-compat",Io="@firebase/analytics",wo="@firebase/app-check-compat",So="@firebase/app-check",To="@firebase/auth",Ro="@firebase/auth-compat",No="@firebase/database",Ao="@firebase/data-connect",Do="@firebase/database-compat",Mo="@firebase/functions",ko="@firebase/functions-compat",xo="@firebase/installations",Po="@firebase/installations-compat",Lo="@firebase/messaging",Oo="@firebase/messaging-compat",Fo="@firebase/performance",Bo="@firebase/performance-compat",qo="@firebase/remote-config",Ho="@firebase/remote-config-compat",$o="@firebase/storage",Wo="@firebase/storage-compat",Uo="@firebase/firestore",zo="@firebase/vertexai",Vo="@firebase/firestore-compat",Go="firebase",jo="11.6.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tn="[DEFAULT]",Yo={[en]:"fire-core",[Eo]:"fire-core-compat",[Io]:"fire-analytics",[bo]:"fire-analytics-compat",[So]:"fire-app-check",[wo]:"fire-app-check-compat",[To]:"fire-auth",[Ro]:"fire-auth-compat",[No]:"fire-rtdb",[Ao]:"fire-data-connect",[Do]:"fire-rtdb-compat",[Mo]:"fire-fn",[ko]:"fire-fn-compat",[xo]:"fire-iid",[Po]:"fire-iid-compat",[Lo]:"fire-fcm",[Oo]:"fire-fcm-compat",[Fo]:"fire-perf",[Bo]:"fire-perf-compat",[qo]:"fire-rc",[Ho]:"fire-rc-compat",[$o]:"fire-gcs",[Wo]:"fire-gcs-compat",[Uo]:"fire-fst",[Vo]:"fire-fst-compat",[zo]:"fire-vertex","fire-js":"fire-js",[Go]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ht=new Map,Ko=new Map,nn=new Map;function ts(n,e){try{n.container.addComponent(e)}catch(t){j.debug(`Component ${e.name} failed to register with FirebaseApp ${n.name}`,t)}}function ut(n){const e=n.name;if(nn.has(e))return j.debug(`There were multiple attempts to register component ${e}.`),!1;nn.set(e,n);for(const t of ht.values())ts(t,n);for(const t of Ko.values())ts(t,n);return!0}function Qo(n,e){const t=n.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),n.container.getProvider(e)}function Xo(n){return n==null?!1:n.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Jo={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},X=new Xs("app","Firebase",Jo);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zo{constructor(e,t,s){this._isDeleted=!1,this._options=Object.assign({},e),this._config=Object.assign({},t),this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=s,this.container.addComponent(new Fe("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw X.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ea=jo;function ni(n,e={}){let t=n;typeof e!="object"&&(e={name:e});const s=Object.assign({name:tn,automaticDataCollectionEnabled:!1},e),i=s.name;if(typeof i!="string"||!i)throw X.create("bad-app-name",{appName:String(i)});if(t||(t=Ks()),!t)throw X.create("no-options");const r=ht.get(i);if(r){if(ct(t,r.options)&&ct(s,r.config))return r;throw X.create("duplicate-app",{appName:i})}const o=new no(i);for(const l of nn.values())o.addComponent(l);const a=new Zo(t,s,o);return ht.set(i,a),a}function ta(n=tn){const e=ht.get(n);if(!e&&n===tn&&Ks())return ni();if(!e)throw X.create("no-app",{appName:n});return e}function ye(n,e,t){var s;let i=(s=Yo[n])!==null&&s!==void 0?s:n;t&&(i+=`-${t}`);const r=i.match(/\s|\//),o=e.match(/\s|\//);if(r||o){const a=[`Unable to register library "${i}" with version "${e}":`];r&&a.push(`library name "${i}" contains illegal characters (whitespace or "/")`),r&&o&&a.push("and"),o&&a.push(`version name "${e}" contains illegal characters (whitespace or "/")`),j.warn(a.join(" "));return}ut(new Fe(`${i}-version`,()=>({library:i,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const na="firebase-heartbeat-database",sa=1,Be="firebase-heartbeat-store";let Ht=null;function si(){return Ht||(Ht=go(na,sa,{upgrade:(n,e)=>{switch(e){case 0:try{n.createObjectStore(Be)}catch(t){console.warn(t)}}}}).catch(n=>{throw X.create("idb-open",{originalErrorMessage:n.message})})),Ht}async function ia(n){try{const t=(await si()).transaction(Be),s=await t.objectStore(Be).get(ii(n));return await t.done,s}catch(e){if(e instanceof Ye)j.warn(e.message);else{const t=X.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});j.warn(t.message)}}}async function ns(n,e){try{const s=(await si()).transaction(Be,"readwrite");await s.objectStore(Be).put(e,ii(n)),await s.done}catch(t){if(t instanceof Ye)j.warn(t.message);else{const s=X.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});j.warn(s.message)}}}function ii(n){return`${n.name}!${n.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ra=1024,oa=30;class aa{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new ca(t),this._heartbeatsCachePromise=this._storage.read().then(s=>(this._heartbeatsCache=s,s))}async triggerHeartbeat(){var e,t;try{const i=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),r=ss();if(((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)===null||t===void 0?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===r||this._heartbeatsCache.heartbeats.some(o=>o.date===r))return;if(this._heartbeatsCache.heartbeats.push({date:r,agent:i}),this._heartbeatsCache.heartbeats.length>oa){const o=ha(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(s){j.warn(s)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=ss(),{heartbeatsToSend:s,unsentEntries:i}=la(this._heartbeatsCache.heartbeats),r=at(JSON.stringify({version:2,heartbeats:s}));return this._heartbeatsCache.lastSentHeartbeatDate=t,i.length>0?(this._heartbeatsCache.heartbeats=i,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),r}catch(t){return j.warn(t),""}}}function ss(){return new Date().toISOString().substring(0,10)}function la(n,e=ra){const t=[];let s=n.slice();for(const i of n){const r=t.find(o=>o.agent===i.agent);if(r){if(r.dates.push(i.date),is(t)>e){r.dates.pop();break}}else if(t.push({agent:i.agent,dates:[i.date]}),is(t)>e){t.pop();break}s=s.slice(1)}return{heartbeatsToSend:t,unsentEntries:s}}class ca{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Ur()?zr().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await ia(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){var t;if(await this._canUseIndexedDBPromise){const i=await this.read();return ns(this.app,{lastSentHeartbeatDate:(t=e.lastSentHeartbeatDate)!==null&&t!==void 0?t:i.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){var t;if(await this._canUseIndexedDBPromise){const i=await this.read();return ns(this.app,{lastSentHeartbeatDate:(t=e.lastSentHeartbeatDate)!==null&&t!==void 0?t:i.lastSentHeartbeatDate,heartbeats:[...i.heartbeats,...e.heartbeats]})}else return}}function is(n){return at(JSON.stringify({version:2,heartbeats:n})).length}function ha(n){if(n.length===0)return-1;let e=0,t=n[0].date;for(let s=1;s<n.length;s++)n[s].date<t&&(t=n[s].date,e=s);return e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ua(n){ut(new Fe("platform-logger",e=>new vo(e),"PRIVATE")),ut(new Fe("heartbeat",e=>new aa(e),"PRIVATE")),ye(en,es,n),ye(en,es,"esm2017"),ye("fire-js","")}ua("");var da="firebase",fa="11.6.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ye(da,fa,"app");var rs={};const os="@firebase/database",as="1.0.14";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ri="";function pa(n){ri=n}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ma{constructor(e){this.domStorage_=e,this.prefix_="firebase:"}set(e,t){t==null?this.domStorage_.removeItem(this.prefixedName_(e)):this.domStorage_.setItem(this.prefixedName_(e),R(t))}get(e){const t=this.domStorage_.getItem(this.prefixedName_(e));return t==null?null:Oe(t)}remove(e){this.domStorage_.removeItem(this.prefixedName_(e))}prefixedName_(e){return this.prefix_+e}toString(){return this.domStorage_.toString()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ga{constructor(){this.cache_={},this.isInMemoryStorage=!0}set(e,t){t==null?delete this.cache_[e]:this.cache_[e]=t}get(e){return z(this.cache_,e)?this.cache_[e]:null}remove(e){delete this.cache_[e]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const oi=function(n){try{if(typeof window<"u"&&typeof window[n]<"u"){const e=window[n];return e.setItem("firebase:sentinel","cache"),e.removeItem("firebase:sentinel"),new ma(e)}}catch{}return new ga},le=oi("localStorage"),_a=oi("sessionStorage");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ve=new Zs("@firebase/database"),ya=function(){let n=1;return function(){return n++}}(),ai=function(n){const e=Jr(n),t=new Xr;t.update(e);const s=t.digest();return pn.encodeByteArray(s)},Ke=function(...n){let e="";for(let t=0;t<n.length;t++){const s=n[t];Array.isArray(s)||s&&typeof s=="object"&&typeof s.length=="number"?e+=Ke.apply(null,s):typeof s=="object"?e+=R(s):e+=s,e+=" "}return e};let Me=null,ls=!0;const va=function(n,e){f(!0,"Can't turn on custom loggers persistently."),ve.logLevel=I.VERBOSE,Me=ve.log.bind(ve)},x=function(...n){if(ls===!0&&(ls=!1,Me===null&&_a.get("logging_enabled")===!0&&va()),Me){const e=Ke.apply(null,n);Me(e)}},Qe=function(n){return function(...e){x(n,...e)}},sn=function(...n){const e="FIREBASE INTERNAL ERROR: "+Ke(...n);ve.error(e)},Y=function(...n){const e=`FIREBASE FATAL ERROR: ${Ke(...n)}`;throw ve.error(e),new Error(e)},O=function(...n){const e="FIREBASE WARNING: "+Ke(...n);ve.warn(e)},Ca=function(){typeof window<"u"&&window.location&&window.location.protocol&&window.location.protocol.indexOf("https:")!==-1&&O("Insecure Firebase access from a secure page. Please use https in calls to new Firebase().")},_n=function(n){return typeof n=="number"&&(n!==n||n===Number.POSITIVE_INFINITY||n===Number.NEGATIVE_INFINITY)},Ea=function(n){if(document.readyState==="complete")n();else{let e=!1;const t=function(){if(!document.body){setTimeout(t,Math.floor(10));return}e||(e=!0,n())};document.addEventListener?(document.addEventListener("DOMContentLoaded",t,!1),window.addEventListener("load",t,!1)):document.attachEvent&&(document.attachEvent("onreadystatechange",()=>{document.readyState==="complete"&&t()}),window.attachEvent("onload",t))}},ue="[MIN_NAME]",ee="[MAX_NAME]",we=function(n,e){if(n===e)return 0;if(n===ue||e===ee)return-1;if(e===ue||n===ee)return 1;{const t=cs(n),s=cs(e);return t!==null?s!==null?t-s===0?n.length-e.length:t-s:-1:s!==null?1:n<e?-1:1}},ba=function(n,e){return n===e?0:n<e?-1:1},Re=function(n,e){if(e&&n in e)return e[n];throw new Error("Missing required key ("+n+") in object: "+R(e))},yn=function(n){if(typeof n!="object"||n===null)return R(n);const e=[];for(const s in n)e.push(s);e.sort();let t="{";for(let s=0;s<e.length;s++)s!==0&&(t+=","),t+=R(e[s]),t+=":",t+=yn(n[e[s]]);return t+="}",t},li=function(n,e){const t=n.length;if(t<=e)return[n];const s=[];for(let i=0;i<t;i+=e)i+e>t?s.push(n.substring(i,t)):s.push(n.substring(i,i+e));return s};function F(n,e){for(const t in n)n.hasOwnProperty(t)&&e(t,n[t])}const ci=function(n){f(!_n(n),"Invalid JSON number");const e=11,t=52,s=(1<<e-1)-1;let i,r,o,a,l;n===0?(r=0,o=0,i=1/n===-1/0?1:0):(i=n<0,n=Math.abs(n),n>=Math.pow(2,1-s)?(a=Math.min(Math.floor(Math.log(n)/Math.LN2),s),r=a+s,o=Math.round(n*Math.pow(2,t-a)-Math.pow(2,t))):(r=0,o=Math.round(n/Math.pow(2,1-s-t))));const c=[];for(l=t;l;l-=1)c.push(o%2?1:0),o=Math.floor(o/2);for(l=e;l;l-=1)c.push(r%2?1:0),r=Math.floor(r/2);c.push(i?1:0),c.reverse();const u=c.join("");let h="";for(l=0;l<64;l+=8){let d=parseInt(u.substr(l,8),2).toString(16);d.length===1&&(d="0"+d),h=h+d}return h.toLowerCase()},Ia=function(){return!!(typeof window=="object"&&window.chrome&&window.chrome.extension&&!/^chrome/.test(window.location.href))},wa=function(){return typeof Windows=="object"&&typeof Windows.UI=="object"};function Sa(n,e){let t="Unknown Error";n==="too_big"?t="The data requested exceeds the maximum size that can be accessed with a single request.":n==="permission_denied"?t="Client doesn't have permission to access the desired data.":n==="unavailable"&&(t="The service is unavailable");const s=new Error(n+" at "+e._path.toString()+": "+t);return s.code=n.toUpperCase(),s}const Ta=new RegExp("^-?(0*)\\d{1,10}$"),Ra=-2147483648,Na=2147483647,cs=function(n){if(Ta.test(n)){const e=Number(n);if(e>=Ra&&e<=Na)return e}return null},Se=function(n){try{n()}catch(e){setTimeout(()=>{const t=e.stack||"";throw O("Exception was thrown by user callback.",t),e},Math.floor(0))}},Aa=function(){return(typeof window=="object"&&window.navigator&&window.navigator.userAgent||"").search(/googlebot|google webmaster tools|bingbot|yahoo! slurp|baiduspider|yandexbot|duckduckbot/i)>=0},ke=function(n,e){const t=setTimeout(n,e);return typeof t=="number"&&typeof Deno<"u"&&Deno.unrefTimer?Deno.unrefTimer(t):typeof t=="object"&&t.unref&&t.unref(),t};/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Da{constructor(e,t){this.appCheckProvider=t,this.appName=e.name,Xo(e)&&e.settings.appCheckToken&&(this.serverAppAppCheckToken=e.settings.appCheckToken),this.appCheck=t==null?void 0:t.getImmediate({optional:!0}),this.appCheck||t==null||t.get().then(s=>this.appCheck=s)}getToken(e){if(this.serverAppAppCheckToken){if(e)throw new Error("Attempted reuse of `FirebaseServerApp.appCheckToken` after previous usage failed.");return Promise.resolve({token:this.serverAppAppCheckToken})}return this.appCheck?this.appCheck.getToken(e):new Promise((t,s)=>{setTimeout(()=>{this.appCheck?this.getToken(e).then(t,s):t(null)},0)})}addTokenChangeListener(e){var t;(t=this.appCheckProvider)===null||t===void 0||t.get().then(s=>s.addTokenListener(e))}notifyForInvalidToken(){O(`Provided AppCheck credentials for the app named "${this.appName}" are invalid. This usually indicates your app was not initialized correctly.`)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ma{constructor(e,t,s){this.appName_=e,this.firebaseOptions_=t,this.authProvider_=s,this.auth_=null,this.auth_=s.getImmediate({optional:!0}),this.auth_||s.onInit(i=>this.auth_=i)}getToken(e){return this.auth_?this.auth_.getToken(e).catch(t=>t&&t.code==="auth/token-not-initialized"?(x("Got auth/token-not-initialized error.  Treating as null token."),null):Promise.reject(t)):new Promise((t,s)=>{setTimeout(()=>{this.auth_?this.getToken(e).then(t,s):t(null)},0)})}addTokenChangeListener(e){this.auth_?this.auth_.addAuthTokenListener(e):this.authProvider_.get().then(t=>t.addAuthTokenListener(e))}removeTokenChangeListener(e){this.authProvider_.get().then(t=>t.removeAuthTokenListener(e))}notifyForInvalidToken(){let e='Provided authentication credentials for the app named "'+this.appName_+'" are invalid. This usually indicates your app was not initialized correctly. ';"credential"in this.firebaseOptions_?e+='Make sure the "credential" property provided to initializeApp() is authorized to access the specified "databaseURL" and is from the correct project.':"serviceAccount"in this.firebaseOptions_?e+='Make sure the "serviceAccount" property provided to initializeApp() is authorized to access the specified "databaseURL" and is from the correct project.':e+='Make sure the "apiKey" and "databaseURL" properties provided to initializeApp() match the values provided for your app at https://console.firebase.google.com/.',O(e)}}class ot{constructor(e){this.accessToken=e}getToken(e){return Promise.resolve({accessToken:this.accessToken})}addTokenChangeListener(e){e(this.accessToken)}removeTokenChangeListener(e){}notifyForInvalidToken(){}}ot.OWNER="owner";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vn="5",hi="v",ui="s",di="r",fi="f",pi=/(console\.firebase|firebase-console-\w+\.corp|firebase\.corp)\.google\.com/,mi="ls",gi="p",rn="ac",_i="websocket",yi="long_polling";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vi{constructor(e,t,s,i,r=!1,o="",a=!1,l=!1,c=null){this.secure=t,this.namespace=s,this.webSocketOnly=i,this.nodeAdmin=r,this.persistenceKey=o,this.includeNamespaceInQueryParams=a,this.isUsingEmulator=l,this.emulatorOptions=c,this._host=e.toLowerCase(),this._domain=this._host.substr(this._host.indexOf(".")+1),this.internalHost=le.get("host:"+e)||this._host}isCacheableHost(){return this.internalHost.substr(0,2)==="s-"}isCustomHost(){return this._domain!=="firebaseio.com"&&this._domain!=="firebaseio-demo.com"}get host(){return this._host}set host(e){e!==this.internalHost&&(this.internalHost=e,this.isCacheableHost()&&le.set("host:"+this._host,this.internalHost))}toString(){let e=this.toURLString();return this.persistenceKey&&(e+="<"+this.persistenceKey+">"),e}toURLString(){const e=this.secure?"https://":"http://",t=this.includeNamespaceInQueryParams?`?ns=${this.namespace}`:"";return`${e}${this.host}/${t}`}}function ka(n){return n.host!==n.internalHost||n.isCustomHost()||n.includeNamespaceInQueryParams}function Ci(n,e,t){f(typeof e=="string","typeof type must == string"),f(typeof t=="object","typeof params must == object");let s;if(e===_i)s=(n.secure?"wss://":"ws://")+n.internalHost+"/.ws?";else if(e===yi)s=(n.secure?"https://":"http://")+n.internalHost+"/.lp?";else throw new Error("Unknown connection type: "+e);ka(n)&&(t.ns=n.namespace);const i=[];return F(t,(r,o)=>{i.push(r+"="+o)}),s+i.join("&")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xa{constructor(){this.counters_={}}incrementCounter(e,t=1){z(this.counters_,e)||(this.counters_[e]=0),this.counters_[e]+=t}get(){return Mr(this.counters_)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $t={},Wt={};function Cn(n){const e=n.toString();return $t[e]||($t[e]=new xa),$t[e]}function Pa(n,e){const t=n.toString();return Wt[t]||(Wt[t]=e()),Wt[t]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class La{constructor(e){this.onMessage_=e,this.pendingResponses=[],this.currentResponseNum=0,this.closeAfterResponse=-1,this.onClose=null}closeAfter(e,t){this.closeAfterResponse=e,this.onClose=t,this.closeAfterResponse<this.currentResponseNum&&(this.onClose(),this.onClose=null)}handleResponse(e,t){for(this.pendingResponses[e]=t;this.pendingResponses[this.currentResponseNum];){const s=this.pendingResponses[this.currentResponseNum];delete this.pendingResponses[this.currentResponseNum];for(let i=0;i<s.length;++i)s[i]&&Se(()=>{this.onMessage_(s[i])});if(this.currentResponseNum===this.closeAfterResponse){this.onClose&&(this.onClose(),this.onClose=null);break}this.currentResponseNum++}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hs="start",Oa="close",Fa="pLPCommand",Ba="pRTLPCB",Ei="id",bi="pw",Ii="ser",qa="cb",Ha="seg",$a="ts",Wa="d",Ua="dframe",wi=1870,Si=30,za=wi-Si,Va=25e3,Ga=3e4;class _e{constructor(e,t,s,i,r,o,a){this.connId=e,this.repoInfo=t,this.applicationId=s,this.appCheckToken=i,this.authToken=r,this.transportSessionId=o,this.lastSessionId=a,this.bytesSent=0,this.bytesReceived=0,this.everConnected_=!1,this.log_=Qe(e),this.stats_=Cn(t),this.urlFn=l=>(this.appCheckToken&&(l[rn]=this.appCheckToken),Ci(t,yi,l))}open(e,t){this.curSegmentNum=0,this.onDisconnect_=t,this.myPacketOrderer=new La(e),this.isClosed_=!1,this.connectTimeoutTimer_=setTimeout(()=>{this.log_("Timed out trying to connect."),this.onClosed_(),this.connectTimeoutTimer_=null},Math.floor(Ga)),Ea(()=>{if(this.isClosed_)return;this.scriptTagHolder=new En((...r)=>{const[o,a,l,c,u]=r;if(this.incrementIncomingBytes_(r),!!this.scriptTagHolder)if(this.connectTimeoutTimer_&&(clearTimeout(this.connectTimeoutTimer_),this.connectTimeoutTimer_=null),this.everConnected_=!0,o===hs)this.id=a,this.password=l;else if(o===Oa)a?(this.scriptTagHolder.sendNewPolls=!1,this.myPacketOrderer.closeAfter(a,()=>{this.onClosed_()})):this.onClosed_();else throw new Error("Unrecognized command received: "+o)},(...r)=>{const[o,a]=r;this.incrementIncomingBytes_(r),this.myPacketOrderer.handleResponse(o,a)},()=>{this.onClosed_()},this.urlFn);const s={};s[hs]="t",s[Ii]=Math.floor(Math.random()*1e8),this.scriptTagHolder.uniqueCallbackIdentifier&&(s[qa]=this.scriptTagHolder.uniqueCallbackIdentifier),s[hi]=vn,this.transportSessionId&&(s[ui]=this.transportSessionId),this.lastSessionId&&(s[mi]=this.lastSessionId),this.applicationId&&(s[gi]=this.applicationId),this.appCheckToken&&(s[rn]=this.appCheckToken),typeof location<"u"&&location.hostname&&pi.test(location.hostname)&&(s[di]=fi);const i=this.urlFn(s);this.log_("Connecting via long-poll to "+i),this.scriptTagHolder.addTag(i,()=>{})})}start(){this.scriptTagHolder.startLongPoll(this.id,this.password),this.addDisconnectPingFrame(this.id,this.password)}static forceAllow(){_e.forceAllow_=!0}static forceDisallow(){_e.forceDisallow_=!0}static isAvailable(){return _e.forceAllow_?!0:!_e.forceDisallow_&&typeof document<"u"&&document.createElement!=null&&!Ia()&&!wa()}markConnectionHealthy(){}shutdown_(){this.isClosed_=!0,this.scriptTagHolder&&(this.scriptTagHolder.close(),this.scriptTagHolder=null),this.myDisconnFrame&&(document.body.removeChild(this.myDisconnFrame),this.myDisconnFrame=null),this.connectTimeoutTimer_&&(clearTimeout(this.connectTimeoutTimer_),this.connectTimeoutTimer_=null)}onClosed_(){this.isClosed_||(this.log_("Longpoll is closing itself"),this.shutdown_(),this.onDisconnect_&&(this.onDisconnect_(this.everConnected_),this.onDisconnect_=null))}close(){this.isClosed_||(this.log_("Longpoll is being closed."),this.shutdown_())}send(e){const t=R(e);this.bytesSent+=t.length,this.stats_.incrementCounter("bytes_sent",t.length);const s=Gs(t),i=li(s,za);for(let r=0;r<i.length;r++)this.scriptTagHolder.enqueueSegment(this.curSegmentNum,i.length,i[r]),this.curSegmentNum++}addDisconnectPingFrame(e,t){this.myDisconnFrame=document.createElement("iframe");const s={};s[Ua]="t",s[Ei]=e,s[bi]=t,this.myDisconnFrame.src=this.urlFn(s),this.myDisconnFrame.style.display="none",document.body.appendChild(this.myDisconnFrame)}incrementIncomingBytes_(e){const t=R(e).length;this.bytesReceived+=t,this.stats_.incrementCounter("bytes_received",t)}}class En{constructor(e,t,s,i){this.onDisconnect=s,this.urlFn=i,this.outstandingRequests=new Set,this.pendingSegs=[],this.currentSerial=Math.floor(Math.random()*1e8),this.sendNewPolls=!0;{this.uniqueCallbackIdentifier=ya(),window[Fa+this.uniqueCallbackIdentifier]=e,window[Ba+this.uniqueCallbackIdentifier]=t,this.myIFrame=En.createIFrame_();let r="";this.myIFrame.src&&this.myIFrame.src.substr(0,11)==="javascript:"&&(r='<script>document.domain="'+document.domain+'";<\/script>');const o="<html><body>"+r+"</body></html>";try{this.myIFrame.doc.open(),this.myIFrame.doc.write(o),this.myIFrame.doc.close()}catch(a){x("frame writing exception"),a.stack&&x(a.stack),x(a)}}}static createIFrame_(){const e=document.createElement("iframe");if(e.style.display="none",document.body){document.body.appendChild(e);try{e.contentWindow.document||x("No IE domain setting required")}catch{const s=document.domain;e.src="javascript:void((function(){document.open();document.domain='"+s+"';document.close();})())"}}else throw"Document body has not initialized. Wait to initialize Firebase until after the document is ready.";return e.contentDocument?e.doc=e.contentDocument:e.contentWindow?e.doc=e.contentWindow.document:e.document&&(e.doc=e.document),e}close(){this.alive=!1,this.myIFrame&&(this.myIFrame.doc.body.textContent="",setTimeout(()=>{this.myIFrame!==null&&(document.body.removeChild(this.myIFrame),this.myIFrame=null)},Math.floor(0)));const e=this.onDisconnect;e&&(this.onDisconnect=null,e())}startLongPoll(e,t){for(this.myID=e,this.myPW=t,this.alive=!0;this.newRequest_(););}newRequest_(){if(this.alive&&this.sendNewPolls&&this.outstandingRequests.size<(this.pendingSegs.length>0?2:1)){this.currentSerial++;const e={};e[Ei]=this.myID,e[bi]=this.myPW,e[Ii]=this.currentSerial;let t=this.urlFn(e),s="",i=0;for(;this.pendingSegs.length>0&&this.pendingSegs[0].d.length+Si+s.length<=wi;){const o=this.pendingSegs.shift();s=s+"&"+Ha+i+"="+o.seg+"&"+$a+i+"="+o.ts+"&"+Wa+i+"="+o.d,i++}return t=t+s,this.addLongPollTag_(t,this.currentSerial),!0}else return!1}enqueueSegment(e,t,s){this.pendingSegs.push({seg:e,ts:t,d:s}),this.alive&&this.newRequest_()}addLongPollTag_(e,t){this.outstandingRequests.add(t);const s=()=>{this.outstandingRequests.delete(t),this.newRequest_()},i=setTimeout(s,Math.floor(Va)),r=()=>{clearTimeout(i),s()};this.addTag(e,r)}addTag(e,t){setTimeout(()=>{try{if(!this.sendNewPolls)return;const s=this.myIFrame.doc.createElement("script");s.type="text/javascript",s.async=!0,s.src=e,s.onload=s.onreadystatechange=function(){const i=s.readyState;(!i||i==="loaded"||i==="complete")&&(s.onload=s.onreadystatechange=null,s.parentNode&&s.parentNode.removeChild(s),t())},s.onerror=()=>{x("Long-poll script failed to load: "+e),this.sendNewPolls=!1,this.close()},this.myIFrame.doc.body.appendChild(s)}catch{}},Math.floor(1))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ja=16384,Ya=45e3;let dt=null;typeof MozWebSocket<"u"?dt=MozWebSocket:typeof WebSocket<"u"&&(dt=WebSocket);class q{constructor(e,t,s,i,r,o,a){this.connId=e,this.applicationId=s,this.appCheckToken=i,this.authToken=r,this.keepaliveTimer=null,this.frames=null,this.totalFrames=0,this.bytesSent=0,this.bytesReceived=0,this.log_=Qe(this.connId),this.stats_=Cn(t),this.connURL=q.connectionURL_(t,o,a,i,s),this.nodeAdmin=t.nodeAdmin}static connectionURL_(e,t,s,i,r){const o={};return o[hi]=vn,typeof location<"u"&&location.hostname&&pi.test(location.hostname)&&(o[di]=fi),t&&(o[ui]=t),s&&(o[mi]=s),i&&(o[rn]=i),r&&(o[gi]=r),Ci(e,_i,o)}open(e,t){this.onDisconnect=t,this.onMessage=e,this.log_("Websocket connecting to "+this.connURL),this.everConnected_=!1,le.set("previous_websocket_failure",!0);try{let s;Wr(),this.mySock=new dt(this.connURL,[],s)}catch(s){this.log_("Error instantiating WebSocket.");const i=s.message||s.data;i&&this.log_(i),this.onClosed_();return}this.mySock.onopen=()=>{this.log_("Websocket connected."),this.everConnected_=!0},this.mySock.onclose=()=>{this.log_("Websocket connection was disconnected."),this.mySock=null,this.onClosed_()},this.mySock.onmessage=s=>{this.handleIncomingFrame(s)},this.mySock.onerror=s=>{this.log_("WebSocket error.  Closing connection.");const i=s.message||s.data;i&&this.log_(i),this.onClosed_()}}start(){}static forceDisallow(){q.forceDisallow_=!0}static isAvailable(){let e=!1;if(typeof navigator<"u"&&navigator.userAgent){const t=/Android ([0-9]{0,}\.[0-9]{0,})/,s=navigator.userAgent.match(t);s&&s.length>1&&parseFloat(s[1])<4.4&&(e=!0)}return!e&&dt!==null&&!q.forceDisallow_}static previouslyFailed(){return le.isInMemoryStorage||le.get("previous_websocket_failure")===!0}markConnectionHealthy(){le.remove("previous_websocket_failure")}appendFrame_(e){if(this.frames.push(e),this.frames.length===this.totalFrames){const t=this.frames.join("");this.frames=null;const s=Oe(t);this.onMessage(s)}}handleNewFrameCount_(e){this.totalFrames=e,this.frames=[]}extractFrameCount_(e){if(f(this.frames===null,"We already have a frame buffer"),e.length<=6){const t=Number(e);if(!isNaN(t))return this.handleNewFrameCount_(t),null}return this.handleNewFrameCount_(1),e}handleIncomingFrame(e){if(this.mySock===null)return;const t=e.data;if(this.bytesReceived+=t.length,this.stats_.incrementCounter("bytes_received",t.length),this.resetKeepAlive(),this.frames!==null)this.appendFrame_(t);else{const s=this.extractFrameCount_(t);s!==null&&this.appendFrame_(s)}}send(e){this.resetKeepAlive();const t=R(e);this.bytesSent+=t.length,this.stats_.incrementCounter("bytes_sent",t.length);const s=li(t,ja);s.length>1&&this.sendString_(String(s.length));for(let i=0;i<s.length;i++)this.sendString_(s[i])}shutdown_(){this.isClosed_=!0,this.keepaliveTimer&&(clearInterval(this.keepaliveTimer),this.keepaliveTimer=null),this.mySock&&(this.mySock.close(),this.mySock=null)}onClosed_(){this.isClosed_||(this.log_("WebSocket is closing itself"),this.shutdown_(),this.onDisconnect&&(this.onDisconnect(this.everConnected_),this.onDisconnect=null))}close(){this.isClosed_||(this.log_("WebSocket is being closed"),this.shutdown_())}resetKeepAlive(){clearInterval(this.keepaliveTimer),this.keepaliveTimer=setInterval(()=>{this.mySock&&this.sendString_("0"),this.resetKeepAlive()},Math.floor(Ya))}sendString_(e){try{this.mySock.send(e)}catch(t){this.log_("Exception thrown from WebSocket.send():",t.message||t.data,"Closing connection."),setTimeout(this.onClosed_.bind(this),0)}}}q.responsesRequiredToBeHealthy=2;q.healthyTimeout=3e4;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qe{static get ALL_TRANSPORTS(){return[_e,q]}static get IS_TRANSPORT_INITIALIZED(){return this.globalTransportInitialized_}constructor(e){this.initTransports_(e)}initTransports_(e){const t=q&&q.isAvailable();let s=t&&!q.previouslyFailed();if(e.webSocketOnly&&(t||O("wss:// URL used, but browser isn't known to support websockets.  Trying anyway."),s=!0),s)this.transports_=[q];else{const i=this.transports_=[];for(const r of qe.ALL_TRANSPORTS)r&&r.isAvailable()&&i.push(r);qe.globalTransportInitialized_=!0}}initialTransport(){if(this.transports_.length>0)return this.transports_[0];throw new Error("No transports available")}upgradeTransport(){return this.transports_.length>1?this.transports_[1]:null}}qe.globalTransportInitialized_=!1;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ka=6e4,Qa=5e3,Xa=10*1024,Ja=100*1024,Ut="t",us="d",Za="s",ds="r",el="e",fs="o",ps="a",ms="n",gs="p",tl="h";class nl{constructor(e,t,s,i,r,o,a,l,c,u){this.id=e,this.repoInfo_=t,this.applicationId_=s,this.appCheckToken_=i,this.authToken_=r,this.onMessage_=o,this.onReady_=a,this.onDisconnect_=l,this.onKill_=c,this.lastSessionId=u,this.connectionCount=0,this.pendingDataMessages=[],this.state_=0,this.log_=Qe("c:"+this.id+":"),this.transportManager_=new qe(t),this.log_("Connection created"),this.start_()}start_(){const e=this.transportManager_.initialTransport();this.conn_=new e(this.nextTransportId_(),this.repoInfo_,this.applicationId_,this.appCheckToken_,this.authToken_,null,this.lastSessionId),this.primaryResponsesRequired_=e.responsesRequiredToBeHealthy||0;const t=this.connReceiver_(this.conn_),s=this.disconnReceiver_(this.conn_);this.tx_=this.conn_,this.rx_=this.conn_,this.secondaryConn_=null,this.isHealthy_=!1,setTimeout(()=>{this.conn_&&this.conn_.open(t,s)},Math.floor(0));const i=e.healthyTimeout||0;i>0&&(this.healthyTimeout_=ke(()=>{this.healthyTimeout_=null,this.isHealthy_||(this.conn_&&this.conn_.bytesReceived>Ja?(this.log_("Connection exceeded healthy timeout but has received "+this.conn_.bytesReceived+" bytes.  Marking connection healthy."),this.isHealthy_=!0,this.conn_.markConnectionHealthy()):this.conn_&&this.conn_.bytesSent>Xa?this.log_("Connection exceeded healthy timeout but has sent "+this.conn_.bytesSent+" bytes.  Leaving connection alive."):(this.log_("Closing unhealthy connection after timeout."),this.close()))},Math.floor(i)))}nextTransportId_(){return"c:"+this.id+":"+this.connectionCount++}disconnReceiver_(e){return t=>{e===this.conn_?this.onConnectionLost_(t):e===this.secondaryConn_?(this.log_("Secondary connection lost."),this.onSecondaryConnectionLost_()):this.log_("closing an old connection")}}connReceiver_(e){return t=>{this.state_!==2&&(e===this.rx_?this.onPrimaryMessageReceived_(t):e===this.secondaryConn_?this.onSecondaryMessageReceived_(t):this.log_("message on old connection"))}}sendRequest(e){const t={t:"d",d:e};this.sendData_(t)}tryCleanupConnection(){this.tx_===this.secondaryConn_&&this.rx_===this.secondaryConn_&&(this.log_("cleaning up and promoting a connection: "+this.secondaryConn_.connId),this.conn_=this.secondaryConn_,this.secondaryConn_=null)}onSecondaryControl_(e){if(Ut in e){const t=e[Ut];t===ps?this.upgradeIfSecondaryHealthy_():t===ds?(this.log_("Got a reset on secondary, closing it"),this.secondaryConn_.close(),(this.tx_===this.secondaryConn_||this.rx_===this.secondaryConn_)&&this.close()):t===fs&&(this.log_("got pong on secondary."),this.secondaryResponsesRequired_--,this.upgradeIfSecondaryHealthy_())}}onSecondaryMessageReceived_(e){const t=Re("t",e),s=Re("d",e);if(t==="c")this.onSecondaryControl_(s);else if(t==="d")this.pendingDataMessages.push(s);else throw new Error("Unknown protocol layer: "+t)}upgradeIfSecondaryHealthy_(){this.secondaryResponsesRequired_<=0?(this.log_("Secondary connection is healthy."),this.isHealthy_=!0,this.secondaryConn_.markConnectionHealthy(),this.proceedWithUpgrade_()):(this.log_("sending ping on secondary."),this.secondaryConn_.send({t:"c",d:{t:gs,d:{}}}))}proceedWithUpgrade_(){this.secondaryConn_.start(),this.log_("sending client ack on secondary"),this.secondaryConn_.send({t:"c",d:{t:ps,d:{}}}),this.log_("Ending transmission on primary"),this.conn_.send({t:"c",d:{t:ms,d:{}}}),this.tx_=this.secondaryConn_,this.tryCleanupConnection()}onPrimaryMessageReceived_(e){const t=Re("t",e),s=Re("d",e);t==="c"?this.onControl_(s):t==="d"&&this.onDataMessage_(s)}onDataMessage_(e){this.onPrimaryResponse_(),this.onMessage_(e)}onPrimaryResponse_(){this.isHealthy_||(this.primaryResponsesRequired_--,this.primaryResponsesRequired_<=0&&(this.log_("Primary connection is healthy."),this.isHealthy_=!0,this.conn_.markConnectionHealthy()))}onControl_(e){const t=Re(Ut,e);if(us in e){const s=e[us];if(t===tl){const i=Object.assign({},s);this.repoInfo_.isUsingEmulator&&(i.h=this.repoInfo_.host),this.onHandshake_(i)}else if(t===ms){this.log_("recvd end transmission on primary"),this.rx_=this.secondaryConn_;for(let i=0;i<this.pendingDataMessages.length;++i)this.onDataMessage_(this.pendingDataMessages[i]);this.pendingDataMessages=[],this.tryCleanupConnection()}else t===Za?this.onConnectionShutdown_(s):t===ds?this.onReset_(s):t===el?sn("Server Error: "+s):t===fs?(this.log_("got pong on primary."),this.onPrimaryResponse_(),this.sendPingOnPrimaryIfNecessary_()):sn("Unknown control packet command: "+t)}}onHandshake_(e){const t=e.ts,s=e.v,i=e.h;this.sessionId=e.s,this.repoInfo_.host=i,this.state_===0&&(this.conn_.start(),this.onConnectionEstablished_(this.conn_,t),vn!==s&&O("Protocol version mismatch detected"),this.tryStartUpgrade_())}tryStartUpgrade_(){const e=this.transportManager_.upgradeTransport();e&&this.startUpgrade_(e)}startUpgrade_(e){this.secondaryConn_=new e(this.nextTransportId_(),this.repoInfo_,this.applicationId_,this.appCheckToken_,this.authToken_,this.sessionId),this.secondaryResponsesRequired_=e.responsesRequiredToBeHealthy||0;const t=this.connReceiver_(this.secondaryConn_),s=this.disconnReceiver_(this.secondaryConn_);this.secondaryConn_.open(t,s),ke(()=>{this.secondaryConn_&&(this.log_("Timed out trying to upgrade."),this.secondaryConn_.close())},Math.floor(Ka))}onReset_(e){this.log_("Reset packet received.  New host: "+e),this.repoInfo_.host=e,this.state_===1?this.close():(this.closeConnections_(),this.start_())}onConnectionEstablished_(e,t){this.log_("Realtime connection established."),this.conn_=e,this.state_=1,this.onReady_&&(this.onReady_(t,this.sessionId),this.onReady_=null),this.primaryResponsesRequired_===0?(this.log_("Primary connection is healthy."),this.isHealthy_=!0):ke(()=>{this.sendPingOnPrimaryIfNecessary_()},Math.floor(Qa))}sendPingOnPrimaryIfNecessary_(){!this.isHealthy_&&this.state_===1&&(this.log_("sending ping on primary."),this.sendData_({t:"c",d:{t:gs,d:{}}}))}onSecondaryConnectionLost_(){const e=this.secondaryConn_;this.secondaryConn_=null,(this.tx_===e||this.rx_===e)&&this.close()}onConnectionLost_(e){this.conn_=null,!e&&this.state_===0?(this.log_("Realtime connection failed."),this.repoInfo_.isCacheableHost()&&(le.remove("host:"+this.repoInfo_.host),this.repoInfo_.internalHost=this.repoInfo_.host)):this.state_===1&&this.log_("Realtime connection lost."),this.close()}onConnectionShutdown_(e){this.log_("Connection shutdown command received. Shutting down..."),this.onKill_&&(this.onKill_(e),this.onKill_=null),this.onDisconnect_=null,this.close()}sendData_(e){if(this.state_!==1)throw"Connection is not connected";this.tx_.send(e)}close(){this.state_!==2&&(this.log_("Closing realtime connection."),this.state_=2,this.closeConnections_(),this.onDisconnect_&&(this.onDisconnect_(),this.onDisconnect_=null))}closeConnections_(){this.log_("Shutting down all connections"),this.conn_&&(this.conn_.close(),this.conn_=null),this.secondaryConn_&&(this.secondaryConn_.close(),this.secondaryConn_=null),this.healthyTimeout_&&(clearTimeout(this.healthyTimeout_),this.healthyTimeout_=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ti{put(e,t,s,i){}merge(e,t,s,i){}refreshAuthToken(e){}refreshAppCheckToken(e){}onDisconnectPut(e,t,s){}onDisconnectMerge(e,t,s){}onDisconnectCancel(e,t){}reportStats(e){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ri{constructor(e){this.allowedEvents_=e,this.listeners_={},f(Array.isArray(e)&&e.length>0,"Requires a non-empty array")}trigger(e,...t){if(Array.isArray(this.listeners_[e])){const s=[...this.listeners_[e]];for(let i=0;i<s.length;i++)s[i].callback.apply(s[i].context,t)}}on(e,t,s){this.validateEventType_(e),this.listeners_[e]=this.listeners_[e]||[],this.listeners_[e].push({callback:t,context:s});const i=this.getInitialEvent(e);i&&t.apply(s,i)}off(e,t,s){this.validateEventType_(e);const i=this.listeners_[e]||[];for(let r=0;r<i.length;r++)if(i[r].callback===t&&(!s||s===i[r].context)){i.splice(r,1);return}}validateEventType_(e){f(this.allowedEvents_.find(t=>t===e),"Unknown event: "+e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ft extends Ri{static getInstance(){return new ft}constructor(){super(["online"]),this.online_=!0,typeof window<"u"&&typeof window.addEventListener<"u"&&!Qs()&&(window.addEventListener("online",()=>{this.online_||(this.online_=!0,this.trigger("online",!0))},!1),window.addEventListener("offline",()=>{this.online_&&(this.online_=!1,this.trigger("online",!1))},!1))}getInitialEvent(e){return f(e==="online","Unknown event type: "+e),[this.online_]}currentlyOnline(){return this.online_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _s=32,ys=768;class b{constructor(e,t){if(t===void 0){this.pieces_=e.split("/");let s=0;for(let i=0;i<this.pieces_.length;i++)this.pieces_[i].length>0&&(this.pieces_[s]=this.pieces_[i],s++);this.pieces_.length=s,this.pieceNum_=0}else this.pieces_=e,this.pieceNum_=t}toString(){let e="";for(let t=this.pieceNum_;t<this.pieces_.length;t++)this.pieces_[t]!==""&&(e+="/"+this.pieces_[t]);return e||"/"}}function C(){return new b("")}function v(n){return n.pieceNum_>=n.pieces_.length?null:n.pieces_[n.pieceNum_]}function te(n){return n.pieces_.length-n.pieceNum_}function w(n){let e=n.pieceNum_;return e<n.pieces_.length&&e++,new b(n.pieces_,e)}function Ni(n){return n.pieceNum_<n.pieces_.length?n.pieces_[n.pieces_.length-1]:null}function sl(n){let e="";for(let t=n.pieceNum_;t<n.pieces_.length;t++)n.pieces_[t]!==""&&(e+="/"+encodeURIComponent(String(n.pieces_[t])));return e||"/"}function Ai(n,e=0){return n.pieces_.slice(n.pieceNum_+e)}function Di(n){if(n.pieceNum_>=n.pieces_.length)return null;const e=[];for(let t=n.pieceNum_;t<n.pieces_.length-1;t++)e.push(n.pieces_[t]);return new b(e,0)}function N(n,e){const t=[];for(let s=n.pieceNum_;s<n.pieces_.length;s++)t.push(n.pieces_[s]);if(e instanceof b)for(let s=e.pieceNum_;s<e.pieces_.length;s++)t.push(e.pieces_[s]);else{const s=e.split("/");for(let i=0;i<s.length;i++)s[i].length>0&&t.push(s[i])}return new b(t,0)}function _(n){return n.pieceNum_>=n.pieces_.length}function P(n,e){const t=v(n),s=v(e);if(t===null)return e;if(t===s)return P(w(n),w(e));throw new Error("INTERNAL ERROR: innerPath ("+e+") is not within outerPath ("+n+")")}function Mi(n,e){if(te(n)!==te(e))return!1;for(let t=n.pieceNum_,s=e.pieceNum_;t<=n.pieces_.length;t++,s++)if(n.pieces_[t]!==e.pieces_[s])return!1;return!0}function H(n,e){let t=n.pieceNum_,s=e.pieceNum_;if(te(n)>te(e))return!1;for(;t<n.pieces_.length;){if(n.pieces_[t]!==e.pieces_[s])return!1;++t,++s}return!0}class il{constructor(e,t){this.errorPrefix_=t,this.parts_=Ai(e,0),this.byteLength_=Math.max(1,this.parts_.length);for(let s=0;s<this.parts_.length;s++)this.byteLength_+=St(this.parts_[s]);ki(this)}}function rl(n,e){n.parts_.length>0&&(n.byteLength_+=1),n.parts_.push(e),n.byteLength_+=St(e),ki(n)}function ol(n){const e=n.parts_.pop();n.byteLength_-=St(e),n.parts_.length>0&&(n.byteLength_-=1)}function ki(n){if(n.byteLength_>ys)throw new Error(n.errorPrefix_+"has a key path longer than "+ys+" bytes ("+n.byteLength_+").");if(n.parts_.length>_s)throw new Error(n.errorPrefix_+"path specified exceeds the maximum depth that can be written ("+_s+") or object contains a cycle "+ae(n))}function ae(n){return n.parts_.length===0?"":"in property '"+n.parts_.join(".")+"'"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bn extends Ri{static getInstance(){return new bn}constructor(){super(["visible"]);let e,t;typeof document<"u"&&typeof document.addEventListener<"u"&&(typeof document.hidden<"u"?(t="visibilitychange",e="hidden"):typeof document.mozHidden<"u"?(t="mozvisibilitychange",e="mozHidden"):typeof document.msHidden<"u"?(t="msvisibilitychange",e="msHidden"):typeof document.webkitHidden<"u"&&(t="webkitvisibilitychange",e="webkitHidden")),this.visible_=!0,t&&document.addEventListener(t,()=>{const s=!document[e];s!==this.visible_&&(this.visible_=s,this.trigger("visible",s))},!1)}getInitialEvent(e){return f(e==="visible","Unknown event type: "+e),[this.visible_]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ne=1e3,al=60*5*1e3,vs=30*1e3,ll=1.3,cl=3e4,hl="server_kill",Cs=3;class G extends Ti{constructor(e,t,s,i,r,o,a,l){if(super(),this.repoInfo_=e,this.applicationId_=t,this.onDataUpdate_=s,this.onConnectStatus_=i,this.onServerInfoUpdate_=r,this.authTokenProvider_=o,this.appCheckTokenProvider_=a,this.authOverride_=l,this.id=G.nextPersistentConnectionId_++,this.log_=Qe("p:"+this.id+":"),this.interruptReasons_={},this.listens=new Map,this.outstandingPuts_=[],this.outstandingGets_=[],this.outstandingPutCount_=0,this.outstandingGetCount_=0,this.onDisconnectRequestQueue_=[],this.connected_=!1,this.reconnectDelay_=Ne,this.maxReconnectDelay_=al,this.securityDebugCallback_=null,this.lastSessionId=null,this.establishConnectionTimer_=null,this.visible_=!1,this.requestCBHash_={},this.requestNumber_=0,this.realtime_=null,this.authToken_=null,this.appCheckToken_=null,this.forceTokenRefresh_=!1,this.invalidAuthTokenCount_=0,this.invalidAppCheckTokenCount_=0,this.firstConnection_=!0,this.lastConnectionAttemptTime_=null,this.lastConnectionEstablishedTime_=null,l)throw new Error("Auth override specified in options, but not supported on non Node.js platforms");bn.getInstance().on("visible",this.onVisible_,this),e.host.indexOf("fblocal")===-1&&ft.getInstance().on("online",this.onOnline_,this)}sendRequest(e,t,s){const i=++this.requestNumber_,r={r:i,a:e,b:t};this.log_(R(r)),f(this.connected_,"sendRequest call when we're not connected not allowed."),this.realtime_.sendRequest(r),s&&(this.requestCBHash_[i]=s)}get(e){this.initConnection_();const t=new wt,i={action:"g",request:{p:e._path.toString(),q:e._queryObject},onComplete:o=>{const a=o.d;o.s==="ok"?t.resolve(a):t.reject(a)}};this.outstandingGets_.push(i),this.outstandingGetCount_++;const r=this.outstandingGets_.length-1;return this.connected_&&this.sendGet_(r),t.promise}listen(e,t,s,i){this.initConnection_();const r=e._queryIdentifier,o=e._path.toString();this.log_("Listen called for "+o+" "+r),this.listens.has(o)||this.listens.set(o,new Map),f(e._queryParams.isDefault()||!e._queryParams.loadsAllData(),"listen() called for non-default but complete query"),f(!this.listens.get(o).has(r),"listen() called twice for same path/queryId.");const a={onComplete:i,hashFn:t,query:e,tag:s};this.listens.get(o).set(r,a),this.connected_&&this.sendListen_(a)}sendGet_(e){const t=this.outstandingGets_[e];this.sendRequest("g",t.request,s=>{delete this.outstandingGets_[e],this.outstandingGetCount_--,this.outstandingGetCount_===0&&(this.outstandingGets_=[]),t.onComplete&&t.onComplete(s)})}sendListen_(e){const t=e.query,s=t._path.toString(),i=t._queryIdentifier;this.log_("Listen on "+s+" for "+i);const r={p:s},o="q";e.tag&&(r.q=t._queryObject,r.t=e.tag),r.h=e.hashFn(),this.sendRequest(o,r,a=>{const l=a.d,c=a.s;G.warnOnListenWarnings_(l,t),(this.listens.get(s)&&this.listens.get(s).get(i))===e&&(this.log_("listen response",a),c!=="ok"&&this.removeListen_(s,i),e.onComplete&&e.onComplete(c,l))})}static warnOnListenWarnings_(e,t){if(e&&typeof e=="object"&&z(e,"w")){const s=Ce(e,"w");if(Array.isArray(s)&&~s.indexOf("no_index")){const i='".indexOn": "'+t._queryParams.getIndex().toString()+'"',r=t._path.toString();O(`Using an unspecified index. Your data will be downloaded and filtered on the client. Consider adding ${i} at ${r} to your security rules for better performance.`)}}}refreshAuthToken(e){this.authToken_=e,this.log_("Auth token refreshed"),this.authToken_?this.tryAuth():this.connected_&&this.sendRequest("unauth",{},()=>{}),this.reduceReconnectDelayIfAdminCredential_(e)}reduceReconnectDelayIfAdminCredential_(e){(e&&e.length===40||Kr(e))&&(this.log_("Admin auth credential detected.  Reducing max reconnect time."),this.maxReconnectDelay_=vs)}refreshAppCheckToken(e){this.appCheckToken_=e,this.log_("App check token refreshed"),this.appCheckToken_?this.tryAppCheck():this.connected_&&this.sendRequest("unappeck",{},()=>{})}tryAuth(){if(this.connected_&&this.authToken_){const e=this.authToken_,t=Yr(e)?"auth":"gauth",s={cred:e};this.authOverride_===null?s.noauth=!0:typeof this.authOverride_=="object"&&(s.authvar=this.authOverride_),this.sendRequest(t,s,i=>{const r=i.s,o=i.d||"error";this.authToken_===e&&(r==="ok"?this.invalidAuthTokenCount_=0:this.onAuthRevoked_(r,o))})}}tryAppCheck(){this.connected_&&this.appCheckToken_&&this.sendRequest("appcheck",{token:this.appCheckToken_},e=>{const t=e.s,s=e.d||"error";t==="ok"?this.invalidAppCheckTokenCount_=0:this.onAppCheckRevoked_(t,s)})}unlisten(e,t){const s=e._path.toString(),i=e._queryIdentifier;this.log_("Unlisten called for "+s+" "+i),f(e._queryParams.isDefault()||!e._queryParams.loadsAllData(),"unlisten() called for non-default but complete query"),this.removeListen_(s,i)&&this.connected_&&this.sendUnlisten_(s,i,e._queryObject,t)}sendUnlisten_(e,t,s,i){this.log_("Unlisten on "+e+" for "+t);const r={p:e},o="n";i&&(r.q=s,r.t=i),this.sendRequest(o,r)}onDisconnectPut(e,t,s){this.initConnection_(),this.connected_?this.sendOnDisconnect_("o",e,t,s):this.onDisconnectRequestQueue_.push({pathString:e,action:"o",data:t,onComplete:s})}onDisconnectMerge(e,t,s){this.initConnection_(),this.connected_?this.sendOnDisconnect_("om",e,t,s):this.onDisconnectRequestQueue_.push({pathString:e,action:"om",data:t,onComplete:s})}onDisconnectCancel(e,t){this.initConnection_(),this.connected_?this.sendOnDisconnect_("oc",e,null,t):this.onDisconnectRequestQueue_.push({pathString:e,action:"oc",data:null,onComplete:t})}sendOnDisconnect_(e,t,s,i){const r={p:t,d:s};this.log_("onDisconnect "+e,r),this.sendRequest(e,r,o=>{i&&setTimeout(()=>{i(o.s,o.d)},Math.floor(0))})}put(e,t,s,i){this.putInternal("p",e,t,s,i)}merge(e,t,s,i){this.putInternal("m",e,t,s,i)}putInternal(e,t,s,i,r){this.initConnection_();const o={p:t,d:s};r!==void 0&&(o.h=r),this.outstandingPuts_.push({action:e,request:o,onComplete:i}),this.outstandingPutCount_++;const a=this.outstandingPuts_.length-1;this.connected_?this.sendPut_(a):this.log_("Buffering put: "+t)}sendPut_(e){const t=this.outstandingPuts_[e].action,s=this.outstandingPuts_[e].request,i=this.outstandingPuts_[e].onComplete;this.outstandingPuts_[e].queued=this.connected_,this.sendRequest(t,s,r=>{this.log_(t+" response",r),delete this.outstandingPuts_[e],this.outstandingPutCount_--,this.outstandingPutCount_===0&&(this.outstandingPuts_=[]),i&&i(r.s,r.d)})}reportStats(e){if(this.connected_){const t={c:e};this.log_("reportStats",t),this.sendRequest("s",t,s=>{if(s.s!=="ok"){const r=s.d;this.log_("reportStats","Error sending stats: "+r)}})}}onDataMessage_(e){if("r"in e){this.log_("from server: "+R(e));const t=e.r,s=this.requestCBHash_[t];s&&(delete this.requestCBHash_[t],s(e.b))}else{if("error"in e)throw"A server-side error has occurred: "+e.error;"a"in e&&this.onDataPush_(e.a,e.b)}}onDataPush_(e,t){this.log_("handleServerMessage",e,t),e==="d"?this.onDataUpdate_(t.p,t.d,!1,t.t):e==="m"?this.onDataUpdate_(t.p,t.d,!0,t.t):e==="c"?this.onListenRevoked_(t.p,t.q):e==="ac"?this.onAuthRevoked_(t.s,t.d):e==="apc"?this.onAppCheckRevoked_(t.s,t.d):e==="sd"?this.onSecurityDebugPacket_(t):sn("Unrecognized action received from server: "+R(e)+`
Are you using the latest client?`)}onReady_(e,t){this.log_("connection ready"),this.connected_=!0,this.lastConnectionEstablishedTime_=new Date().getTime(),this.handleTimestamp_(e),this.lastSessionId=t,this.firstConnection_&&this.sendConnectStats_(),this.restoreState_(),this.firstConnection_=!1,this.onConnectStatus_(!0)}scheduleConnect_(e){f(!this.realtime_,"Scheduling a connect when we're already connected/ing?"),this.establishConnectionTimer_&&clearTimeout(this.establishConnectionTimer_),this.establishConnectionTimer_=setTimeout(()=>{this.establishConnectionTimer_=null,this.establishConnection_()},Math.floor(e))}initConnection_(){!this.realtime_&&this.firstConnection_&&this.scheduleConnect_(0)}onVisible_(e){e&&!this.visible_&&this.reconnectDelay_===this.maxReconnectDelay_&&(this.log_("Window became visible.  Reducing delay."),this.reconnectDelay_=Ne,this.realtime_||this.scheduleConnect_(0)),this.visible_=e}onOnline_(e){e?(this.log_("Browser went online."),this.reconnectDelay_=Ne,this.realtime_||this.scheduleConnect_(0)):(this.log_("Browser went offline.  Killing connection."),this.realtime_&&this.realtime_.close())}onRealtimeDisconnect_(){if(this.log_("data client disconnected"),this.connected_=!1,this.realtime_=null,this.cancelSentTransactions_(),this.requestCBHash_={},this.shouldReconnect_()){this.visible_?this.lastConnectionEstablishedTime_&&(new Date().getTime()-this.lastConnectionEstablishedTime_>cl&&(this.reconnectDelay_=Ne),this.lastConnectionEstablishedTime_=null):(this.log_("Window isn't visible.  Delaying reconnect."),this.reconnectDelay_=this.maxReconnectDelay_,this.lastConnectionAttemptTime_=new Date().getTime());const e=Math.max(0,new Date().getTime()-this.lastConnectionAttemptTime_);let t=Math.max(0,this.reconnectDelay_-e);t=Math.random()*t,this.log_("Trying to reconnect in "+t+"ms"),this.scheduleConnect_(t),this.reconnectDelay_=Math.min(this.maxReconnectDelay_,this.reconnectDelay_*ll)}this.onConnectStatus_(!1)}async establishConnection_(){if(this.shouldReconnect_()){this.log_("Making a connection attempt"),this.lastConnectionAttemptTime_=new Date().getTime(),this.lastConnectionEstablishedTime_=null;const e=this.onDataMessage_.bind(this),t=this.onReady_.bind(this),s=this.onRealtimeDisconnect_.bind(this),i=this.id+":"+G.nextConnectionId_++,r=this.lastSessionId;let o=!1,a=null;const l=function(){a?a.close():(o=!0,s())},c=function(h){f(a,"sendRequest call when we're not connected not allowed."),a.sendRequest(h)};this.realtime_={close:l,sendRequest:c};const u=this.forceTokenRefresh_;this.forceTokenRefresh_=!1;try{const[h,d]=await Promise.all([this.authTokenProvider_.getToken(u),this.appCheckTokenProvider_.getToken(u)]);o?x("getToken() completed but was canceled"):(x("getToken() completed. Creating connection."),this.authToken_=h&&h.accessToken,this.appCheckToken_=d&&d.token,a=new nl(i,this.repoInfo_,this.applicationId_,this.appCheckToken_,this.authToken_,e,t,s,p=>{O(p+" ("+this.repoInfo_.toString()+")"),this.interrupt(hl)},r))}catch(h){this.log_("Failed to get token: "+h),o||(this.repoInfo_.nodeAdmin&&O(h),l())}}}interrupt(e){x("Interrupting connection for reason: "+e),this.interruptReasons_[e]=!0,this.realtime_?this.realtime_.close():(this.establishConnectionTimer_&&(clearTimeout(this.establishConnectionTimer_),this.establishConnectionTimer_=null),this.connected_&&this.onRealtimeDisconnect_())}resume(e){x("Resuming connection for reason: "+e),delete this.interruptReasons_[e],Kn(this.interruptReasons_)&&(this.reconnectDelay_=Ne,this.realtime_||this.scheduleConnect_(0))}handleTimestamp_(e){const t=e-new Date().getTime();this.onServerInfoUpdate_({serverTimeOffset:t})}cancelSentTransactions_(){for(let e=0;e<this.outstandingPuts_.length;e++){const t=this.outstandingPuts_[e];t&&"h"in t.request&&t.queued&&(t.onComplete&&t.onComplete("disconnect"),delete this.outstandingPuts_[e],this.outstandingPutCount_--)}this.outstandingPutCount_===0&&(this.outstandingPuts_=[])}onListenRevoked_(e,t){let s;t?s=t.map(r=>yn(r)).join("$"):s="default";const i=this.removeListen_(e,s);i&&i.onComplete&&i.onComplete("permission_denied")}removeListen_(e,t){const s=new b(e).toString();let i;if(this.listens.has(s)){const r=this.listens.get(s);i=r.get(t),r.delete(t),r.size===0&&this.listens.delete(s)}else i=void 0;return i}onAuthRevoked_(e,t){x("Auth token revoked: "+e+"/"+t),this.authToken_=null,this.forceTokenRefresh_=!0,this.realtime_.close(),(e==="invalid_token"||e==="permission_denied")&&(this.invalidAuthTokenCount_++,this.invalidAuthTokenCount_>=Cs&&(this.reconnectDelay_=vs,this.authTokenProvider_.notifyForInvalidToken()))}onAppCheckRevoked_(e,t){x("App check token revoked: "+e+"/"+t),this.appCheckToken_=null,this.forceTokenRefresh_=!0,(e==="invalid_token"||e==="permission_denied")&&(this.invalidAppCheckTokenCount_++,this.invalidAppCheckTokenCount_>=Cs&&this.appCheckTokenProvider_.notifyForInvalidToken())}onSecurityDebugPacket_(e){this.securityDebugCallback_?this.securityDebugCallback_(e):"msg"in e&&console.log("FIREBASE: "+e.msg.replace(`
`,`
FIREBASE: `))}restoreState_(){this.tryAuth(),this.tryAppCheck();for(const e of this.listens.values())for(const t of e.values())this.sendListen_(t);for(let e=0;e<this.outstandingPuts_.length;e++)this.outstandingPuts_[e]&&this.sendPut_(e);for(;this.onDisconnectRequestQueue_.length;){const e=this.onDisconnectRequestQueue_.shift();this.sendOnDisconnect_(e.action,e.pathString,e.data,e.onComplete)}for(let e=0;e<this.outstandingGets_.length;e++)this.outstandingGets_[e]&&this.sendGet_(e)}sendConnectStats_(){const e={};let t="js";e["sdk."+t+"."+ri.replace(/\./g,"-")]=1,Qs()?e["framework.cordova"]=1:$r()&&(e["framework.reactnative"]=1),this.reportStats(e)}shouldReconnect_(){const e=ft.getInstance().currentlyOnline();return Kn(this.interruptReasons_)&&e}}G.nextPersistentConnectionId_=0;G.nextConnectionId_=0;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class y{constructor(e,t){this.name=e,this.node=t}static Wrap(e,t){return new y(e,t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tt{getCompare(){return this.compare.bind(this)}indexedValueChanged(e,t){const s=new y(ue,e),i=new y(ue,t);return this.compare(s,i)!==0}minPost(){return y.MIN}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let st;class xi extends Tt{static get __EMPTY_NODE(){return st}static set __EMPTY_NODE(e){st=e}compare(e,t){return we(e.name,t.name)}isDefinedOn(e){throw Ie("KeyIndex.isDefinedOn not expected to be called.")}indexedValueChanged(e,t){return!1}minPost(){return y.MIN}maxPost(){return new y(ee,st)}makePost(e,t){return f(typeof e=="string","KeyIndex indexValue must always be a string."),new y(e,st)}toString(){return".key"}}const he=new xi;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class it{constructor(e,t,s,i,r=null){this.isReverse_=i,this.resultGenerator_=r,this.nodeStack_=[];let o=1;for(;!e.isEmpty();)if(e=e,o=t?s(e.key,t):1,i&&(o*=-1),o<0)this.isReverse_?e=e.left:e=e.right;else if(o===0){this.nodeStack_.push(e);break}else this.nodeStack_.push(e),this.isReverse_?e=e.right:e=e.left}getNext(){if(this.nodeStack_.length===0)return null;let e=this.nodeStack_.pop(),t;if(this.resultGenerator_?t=this.resultGenerator_(e.key,e.value):t={key:e.key,value:e.value},this.isReverse_)for(e=e.left;!e.isEmpty();)this.nodeStack_.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack_.push(e),e=e.left;return t}hasNext(){return this.nodeStack_.length>0}peek(){if(this.nodeStack_.length===0)return null;const e=this.nodeStack_[this.nodeStack_.length-1];return this.resultGenerator_?this.resultGenerator_(e.key,e.value):{key:e.key,value:e.value}}}class D{constructor(e,t,s,i,r){this.key=e,this.value=t,this.color=s??D.RED,this.left=i??L.EMPTY_NODE,this.right=r??L.EMPTY_NODE}copy(e,t,s,i,r){return new D(e??this.key,t??this.value,s??this.color,i??this.left,r??this.right)}count(){return this.left.count()+1+this.right.count()}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||!!e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min_(){return this.left.isEmpty()?this:this.left.min_()}minKey(){return this.min_().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,s){let i=this;const r=s(e,i.key);return r<0?i=i.copy(null,null,null,i.left.insert(e,t,s),null):r===0?i=i.copy(null,t,null,null,null):i=i.copy(null,null,null,null,i.right.insert(e,t,s)),i.fixUp_()}removeMin_(){if(this.left.isEmpty())return L.EMPTY_NODE;let e=this;return!e.left.isRed_()&&!e.left.left.isRed_()&&(e=e.moveRedLeft_()),e=e.copy(null,null,null,e.left.removeMin_(),null),e.fixUp_()}remove(e,t){let s,i;if(s=this,t(e,s.key)<0)!s.left.isEmpty()&&!s.left.isRed_()&&!s.left.left.isRed_()&&(s=s.moveRedLeft_()),s=s.copy(null,null,null,s.left.remove(e,t),null);else{if(s.left.isRed_()&&(s=s.rotateRight_()),!s.right.isEmpty()&&!s.right.isRed_()&&!s.right.left.isRed_()&&(s=s.moveRedRight_()),t(e,s.key)===0){if(s.right.isEmpty())return L.EMPTY_NODE;i=s.right.min_(),s=s.copy(i.key,i.value,null,null,s.right.removeMin_())}s=s.copy(null,null,null,null,s.right.remove(e,t))}return s.fixUp_()}isRed_(){return this.color}fixUp_(){let e=this;return e.right.isRed_()&&!e.left.isRed_()&&(e=e.rotateLeft_()),e.left.isRed_()&&e.left.left.isRed_()&&(e=e.rotateRight_()),e.left.isRed_()&&e.right.isRed_()&&(e=e.colorFlip_()),e}moveRedLeft_(){let e=this.colorFlip_();return e.right.left.isRed_()&&(e=e.copy(null,null,null,null,e.right.rotateRight_()),e=e.rotateLeft_(),e=e.colorFlip_()),e}moveRedRight_(){let e=this.colorFlip_();return e.left.left.isRed_()&&(e=e.rotateRight_(),e=e.colorFlip_()),e}rotateLeft_(){const e=this.copy(null,null,D.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight_(){const e=this.copy(null,null,D.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip_(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth_(){const e=this.check_();return Math.pow(2,e)<=this.count()+1}check_(){if(this.isRed_()&&this.left.isRed_())throw new Error("Red node has red child("+this.key+","+this.value+")");if(this.right.isRed_())throw new Error("Right child of ("+this.key+","+this.value+") is red");const e=this.left.check_();if(e!==this.right.check_())throw new Error("Black depths differ");return e+(this.isRed_()?0:1)}}D.RED=!0;D.BLACK=!1;class ul{copy(e,t,s,i,r){return this}insert(e,t,s){return new D(e,t,null)}remove(e,t){return this}count(){return 0}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}check_(){return 0}isRed_(){return!1}}class L{constructor(e,t=L.EMPTY_NODE){this.comparator_=e,this.root_=t}insert(e,t){return new L(this.comparator_,this.root_.insert(e,t,this.comparator_).copy(null,null,D.BLACK,null,null))}remove(e){return new L(this.comparator_,this.root_.remove(e,this.comparator_).copy(null,null,D.BLACK,null,null))}get(e){let t,s=this.root_;for(;!s.isEmpty();){if(t=this.comparator_(e,s.key),t===0)return s.value;t<0?s=s.left:t>0&&(s=s.right)}return null}getPredecessorKey(e){let t,s=this.root_,i=null;for(;!s.isEmpty();)if(t=this.comparator_(e,s.key),t===0){if(s.left.isEmpty())return i?i.key:null;for(s=s.left;!s.right.isEmpty();)s=s.right;return s.key}else t<0?s=s.left:t>0&&(i=s,s=s.right);throw new Error("Attempted to find predecessor key for a nonexistent key.  What gives?")}isEmpty(){return this.root_.isEmpty()}count(){return this.root_.count()}minKey(){return this.root_.minKey()}maxKey(){return this.root_.maxKey()}inorderTraversal(e){return this.root_.inorderTraversal(e)}reverseTraversal(e){return this.root_.reverseTraversal(e)}getIterator(e){return new it(this.root_,null,this.comparator_,!1,e)}getIteratorFrom(e,t){return new it(this.root_,e,this.comparator_,!1,t)}getReverseIteratorFrom(e,t){return new it(this.root_,e,this.comparator_,!0,t)}getReverseIterator(e){return new it(this.root_,null,this.comparator_,!0,e)}}L.EMPTY_NODE=new ul;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function dl(n,e){return we(n.name,e.name)}function In(n,e){return we(n,e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let on;function fl(n){on=n}const Pi=function(n){return typeof n=="number"?"number:"+ci(n):"string:"+n},Li=function(n){if(n.isLeafNode()){const e=n.val();f(typeof e=="string"||typeof e=="number"||typeof e=="object"&&z(e,".sv"),"Priority must be a string or number.")}else f(n===on||n.isEmpty(),"priority of unexpected type.");f(n===on||n.getPriority().isEmpty(),"Priority nodes can't have a priority of their own.")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Es;class A{static set __childrenNodeConstructor(e){Es=e}static get __childrenNodeConstructor(){return Es}constructor(e,t=A.__childrenNodeConstructor.EMPTY_NODE){this.value_=e,this.priorityNode_=t,this.lazyHash_=null,f(this.value_!==void 0&&this.value_!==null,"LeafNode shouldn't be created with null/undefined value."),Li(this.priorityNode_)}isLeafNode(){return!0}getPriority(){return this.priorityNode_}updatePriority(e){return new A(this.value_,e)}getImmediateChild(e){return e===".priority"?this.priorityNode_:A.__childrenNodeConstructor.EMPTY_NODE}getChild(e){return _(e)?this:v(e)===".priority"?this.priorityNode_:A.__childrenNodeConstructor.EMPTY_NODE}hasChild(){return!1}getPredecessorChildName(e,t){return null}updateImmediateChild(e,t){return e===".priority"?this.updatePriority(t):t.isEmpty()&&e!==".priority"?this:A.__childrenNodeConstructor.EMPTY_NODE.updateImmediateChild(e,t).updatePriority(this.priorityNode_)}updateChild(e,t){const s=v(e);return s===null?t:t.isEmpty()&&s!==".priority"?this:(f(s!==".priority"||te(e)===1,".priority must be the last token in a path"),this.updateImmediateChild(s,A.__childrenNodeConstructor.EMPTY_NODE.updateChild(w(e),t)))}isEmpty(){return!1}numChildren(){return 0}forEachChild(e,t){return!1}val(e){return e&&!this.getPriority().isEmpty()?{".value":this.getValue(),".priority":this.getPriority().val()}:this.getValue()}hash(){if(this.lazyHash_===null){let e="";this.priorityNode_.isEmpty()||(e+="priority:"+Pi(this.priorityNode_.val())+":");const t=typeof this.value_;e+=t+":",t==="number"?e+=ci(this.value_):e+=this.value_,this.lazyHash_=ai(e)}return this.lazyHash_}getValue(){return this.value_}compareTo(e){return e===A.__childrenNodeConstructor.EMPTY_NODE?1:e instanceof A.__childrenNodeConstructor?-1:(f(e.isLeafNode(),"Unknown node type"),this.compareToLeafNode_(e))}compareToLeafNode_(e){const t=typeof e.value_,s=typeof this.value_,i=A.VALUE_TYPE_ORDER.indexOf(t),r=A.VALUE_TYPE_ORDER.indexOf(s);return f(i>=0,"Unknown leaf type: "+t),f(r>=0,"Unknown leaf type: "+s),i===r?s==="object"?0:this.value_<e.value_?-1:this.value_===e.value_?0:1:r-i}withIndex(){return this}isIndexed(){return!0}equals(e){if(e===this)return!0;if(e.isLeafNode()){const t=e;return this.value_===t.value_&&this.priorityNode_.equals(t.priorityNode_)}else return!1}}A.VALUE_TYPE_ORDER=["object","boolean","number","string"];/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Oi,Fi;function pl(n){Oi=n}function ml(n){Fi=n}class gl extends Tt{compare(e,t){const s=e.node.getPriority(),i=t.node.getPriority(),r=s.compareTo(i);return r===0?we(e.name,t.name):r}isDefinedOn(e){return!e.getPriority().isEmpty()}indexedValueChanged(e,t){return!e.getPriority().equals(t.getPriority())}minPost(){return y.MIN}maxPost(){return new y(ee,new A("[PRIORITY-POST]",Fi))}makePost(e,t){const s=Oi(e);return new y(t,new A("[PRIORITY-POST]",s))}toString(){return".priority"}}const T=new gl;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _l=Math.log(2);class yl{constructor(e){const t=r=>parseInt(Math.log(r)/_l,10),s=r=>parseInt(Array(r+1).join("1"),2);this.count=t(e+1),this.current_=this.count-1;const i=s(this.count);this.bits_=e+1&i}nextBitIsOne(){const e=!(this.bits_&1<<this.current_);return this.current_--,e}}const pt=function(n,e,t,s){n.sort(e);const i=function(l,c){const u=c-l;let h,d;if(u===0)return null;if(u===1)return h=n[l],d=t?t(h):h,new D(d,h.node,D.BLACK,null,null);{const p=parseInt(u/2,10)+l,m=i(l,p),E=i(p+1,c);return h=n[p],d=t?t(h):h,new D(d,h.node,D.BLACK,m,E)}},r=function(l){let c=null,u=null,h=n.length;const d=function(m,E){const k=h-m,me=h;h-=m;const nt=i(k+1,me),Ot=n[k],Tr=t?t(Ot):Ot;p(new D(Tr,Ot.node,E,null,nt))},p=function(m){c?(c.left=m,c=m):(u=m,c=m)};for(let m=0;m<l.count;++m){const E=l.nextBitIsOne(),k=Math.pow(2,l.count-(m+1));E?d(k,D.BLACK):(d(k,D.BLACK),d(k,D.RED))}return u},o=new yl(n.length),a=r(o);return new L(s||e,a)};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let zt;const ge={};class V{static get Default(){return f(ge&&T,"ChildrenNode.ts has not been loaded"),zt=zt||new V({".priority":ge},{".priority":T}),zt}constructor(e,t){this.indexes_=e,this.indexSet_=t}get(e){const t=Ce(this.indexes_,e);if(!t)throw new Error("No index defined for "+e);return t instanceof L?t:null}hasIndex(e){return z(this.indexSet_,e.toString())}addIndex(e,t){f(e!==he,"KeyIndex always exists and isn't meant to be added to the IndexMap.");const s=[];let i=!1;const r=t.getIterator(y.Wrap);let o=r.getNext();for(;o;)i=i||e.isDefinedOn(o.node),s.push(o),o=r.getNext();let a;i?a=pt(s,e.getCompare()):a=ge;const l=e.toString(),c=Object.assign({},this.indexSet_);c[l]=e;const u=Object.assign({},this.indexes_);return u[l]=a,new V(u,c)}addToIndexes(e,t){const s=lt(this.indexes_,(i,r)=>{const o=Ce(this.indexSet_,r);if(f(o,"Missing index implementation for "+r),i===ge)if(o.isDefinedOn(e.node)){const a=[],l=t.getIterator(y.Wrap);let c=l.getNext();for(;c;)c.name!==e.name&&a.push(c),c=l.getNext();return a.push(e),pt(a,o.getCompare())}else return ge;else{const a=t.get(e.name);let l=i;return a&&(l=l.remove(new y(e.name,a))),l.insert(e,e.node)}});return new V(s,this.indexSet_)}removeFromIndexes(e,t){const s=lt(this.indexes_,i=>{if(i===ge)return i;{const r=t.get(e.name);return r?i.remove(new y(e.name,r)):i}});return new V(s,this.indexSet_)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Ae;class g{static get EMPTY_NODE(){return Ae||(Ae=new g(new L(In),null,V.Default))}constructor(e,t,s){this.children_=e,this.priorityNode_=t,this.indexMap_=s,this.lazyHash_=null,this.priorityNode_&&Li(this.priorityNode_),this.children_.isEmpty()&&f(!this.priorityNode_||this.priorityNode_.isEmpty(),"An empty node cannot have a priority")}isLeafNode(){return!1}getPriority(){return this.priorityNode_||Ae}updatePriority(e){return this.children_.isEmpty()?this:new g(this.children_,e,this.indexMap_)}getImmediateChild(e){if(e===".priority")return this.getPriority();{const t=this.children_.get(e);return t===null?Ae:t}}getChild(e){const t=v(e);return t===null?this:this.getImmediateChild(t).getChild(w(e))}hasChild(e){return this.children_.get(e)!==null}updateImmediateChild(e,t){if(f(t,"We should always be passing snapshot nodes"),e===".priority")return this.updatePriority(t);{const s=new y(e,t);let i,r;t.isEmpty()?(i=this.children_.remove(e),r=this.indexMap_.removeFromIndexes(s,this.children_)):(i=this.children_.insert(e,t),r=this.indexMap_.addToIndexes(s,this.children_));const o=i.isEmpty()?Ae:this.priorityNode_;return new g(i,o,r)}}updateChild(e,t){const s=v(e);if(s===null)return t;{f(v(e)!==".priority"||te(e)===1,".priority must be the last token in a path");const i=this.getImmediateChild(s).updateChild(w(e),t);return this.updateImmediateChild(s,i)}}isEmpty(){return this.children_.isEmpty()}numChildren(){return this.children_.count()}val(e){if(this.isEmpty())return null;const t={};let s=0,i=0,r=!0;if(this.forEachChild(T,(o,a)=>{t[o]=a.val(e),s++,r&&g.INTEGER_REGEXP_.test(o)?i=Math.max(i,Number(o)):r=!1}),!e&&r&&i<2*s){const o=[];for(const a in t)o[a]=t[a];return o}else return e&&!this.getPriority().isEmpty()&&(t[".priority"]=this.getPriority().val()),t}hash(){if(this.lazyHash_===null){let e="";this.getPriority().isEmpty()||(e+="priority:"+Pi(this.getPriority().val())+":"),this.forEachChild(T,(t,s)=>{const i=s.hash();i!==""&&(e+=":"+t+":"+i)}),this.lazyHash_=e===""?"":ai(e)}return this.lazyHash_}getPredecessorChildName(e,t,s){const i=this.resolveIndex_(s);if(i){const r=i.getPredecessorKey(new y(e,t));return r?r.name:null}else return this.children_.getPredecessorKey(e)}getFirstChildName(e){const t=this.resolveIndex_(e);if(t){const s=t.minKey();return s&&s.name}else return this.children_.minKey()}getFirstChild(e){const t=this.getFirstChildName(e);return t?new y(t,this.children_.get(t)):null}getLastChildName(e){const t=this.resolveIndex_(e);if(t){const s=t.maxKey();return s&&s.name}else return this.children_.maxKey()}getLastChild(e){const t=this.getLastChildName(e);return t?new y(t,this.children_.get(t)):null}forEachChild(e,t){const s=this.resolveIndex_(e);return s?s.inorderTraversal(i=>t(i.name,i.node)):this.children_.inorderTraversal(t)}getIterator(e){return this.getIteratorFrom(e.minPost(),e)}getIteratorFrom(e,t){const s=this.resolveIndex_(t);if(s)return s.getIteratorFrom(e,i=>i);{const i=this.children_.getIteratorFrom(e.name,y.Wrap);let r=i.peek();for(;r!=null&&t.compare(r,e)<0;)i.getNext(),r=i.peek();return i}}getReverseIterator(e){return this.getReverseIteratorFrom(e.maxPost(),e)}getReverseIteratorFrom(e,t){const s=this.resolveIndex_(t);if(s)return s.getReverseIteratorFrom(e,i=>i);{const i=this.children_.getReverseIteratorFrom(e.name,y.Wrap);let r=i.peek();for(;r!=null&&t.compare(r,e)>0;)i.getNext(),r=i.peek();return i}}compareTo(e){return this.isEmpty()?e.isEmpty()?0:-1:e.isLeafNode()||e.isEmpty()?1:e===Xe?-1:0}withIndex(e){if(e===he||this.indexMap_.hasIndex(e))return this;{const t=this.indexMap_.addIndex(e,this.children_);return new g(this.children_,this.priorityNode_,t)}}isIndexed(e){return e===he||this.indexMap_.hasIndex(e)}equals(e){if(e===this)return!0;if(e.isLeafNode())return!1;{const t=e;if(this.getPriority().equals(t.getPriority()))if(this.children_.count()===t.children_.count()){const s=this.getIterator(T),i=t.getIterator(T);let r=s.getNext(),o=i.getNext();for(;r&&o;){if(r.name!==o.name||!r.node.equals(o.node))return!1;r=s.getNext(),o=i.getNext()}return r===null&&o===null}else return!1;else return!1}}resolveIndex_(e){return e===he?null:this.indexMap_.get(e.toString())}}g.INTEGER_REGEXP_=/^(0|[1-9]\d*)$/;class vl extends g{constructor(){super(new L(In),g.EMPTY_NODE,V.Default)}compareTo(e){return e===this?0:1}equals(e){return e===this}getPriority(){return this}getImmediateChild(e){return g.EMPTY_NODE}isEmpty(){return!1}}const Xe=new vl;Object.defineProperties(y,{MIN:{value:new y(ue,g.EMPTY_NODE)},MAX:{value:new y(ee,Xe)}});xi.__EMPTY_NODE=g.EMPTY_NODE;A.__childrenNodeConstructor=g;fl(Xe);ml(Xe);/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Cl=!0;function M(n,e=null){if(n===null)return g.EMPTY_NODE;if(typeof n=="object"&&".priority"in n&&(e=n[".priority"]),f(e===null||typeof e=="string"||typeof e=="number"||typeof e=="object"&&".sv"in e,"Invalid priority type found: "+typeof e),typeof n=="object"&&".value"in n&&n[".value"]!==null&&(n=n[".value"]),typeof n!="object"||".sv"in n){const t=n;return new A(t,M(e))}if(!(n instanceof Array)&&Cl){const t=[];let s=!1;if(F(n,(o,a)=>{if(o.substring(0,1)!=="."){const l=M(a);l.isEmpty()||(s=s||!l.getPriority().isEmpty(),t.push(new y(o,l)))}}),t.length===0)return g.EMPTY_NODE;const r=pt(t,dl,o=>o.name,In);if(s){const o=pt(t,T.getCompare());return new g(r,M(e),new V({".priority":o},{".priority":T}))}else return new g(r,M(e),V.Default)}else{let t=g.EMPTY_NODE;return F(n,(s,i)=>{if(z(n,s)&&s.substring(0,1)!=="."){const r=M(i);(r.isLeafNode()||!r.isEmpty())&&(t=t.updateImmediateChild(s,r))}}),t.updatePriority(M(e))}}pl(M);/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wn extends Tt{constructor(e){super(),this.indexPath_=e,f(!_(e)&&v(e)!==".priority","Can't create PathIndex with empty path or .priority key")}extractChild(e){return e.getChild(this.indexPath_)}isDefinedOn(e){return!e.getChild(this.indexPath_).isEmpty()}compare(e,t){const s=this.extractChild(e.node),i=this.extractChild(t.node),r=s.compareTo(i);return r===0?we(e.name,t.name):r}makePost(e,t){const s=M(e),i=g.EMPTY_NODE.updateChild(this.indexPath_,s);return new y(t,i)}maxPost(){const e=g.EMPTY_NODE.updateChild(this.indexPath_,Xe);return new y(ee,e)}toString(){return Ai(this.indexPath_,0).join("/")}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class El extends Tt{compare(e,t){const s=e.node.compareTo(t.node);return s===0?we(e.name,t.name):s}isDefinedOn(e){return!0}indexedValueChanged(e,t){return!e.equals(t)}minPost(){return y.MIN}maxPost(){return y.MAX}makePost(e,t){const s=M(e);return new y(t,s)}toString(){return".value"}}const Bi=new El;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qi(n){return{type:"value",snapshotNode:n}}function Ee(n,e){return{type:"child_added",snapshotNode:e,childName:n}}function He(n,e){return{type:"child_removed",snapshotNode:e,childName:n}}function $e(n,e,t){return{type:"child_changed",snapshotNode:e,childName:n,oldSnap:t}}function bl(n,e){return{type:"child_moved",snapshotNode:e,childName:n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sn{constructor(e){this.index_=e}updateChild(e,t,s,i,r,o){f(e.isIndexed(this.index_),"A node must be indexed if only a child is updated");const a=e.getImmediateChild(t);return a.getChild(i).equals(s.getChild(i))&&a.isEmpty()===s.isEmpty()||(o!=null&&(s.isEmpty()?e.hasChild(t)?o.trackChildChange(He(t,a)):f(e.isLeafNode(),"A child remove without an old child only makes sense on a leaf node"):a.isEmpty()?o.trackChildChange(Ee(t,s)):o.trackChildChange($e(t,s,a))),e.isLeafNode()&&s.isEmpty())?e:e.updateImmediateChild(t,s).withIndex(this.index_)}updateFullNode(e,t,s){return s!=null&&(e.isLeafNode()||e.forEachChild(T,(i,r)=>{t.hasChild(i)||s.trackChildChange(He(i,r))}),t.isLeafNode()||t.forEachChild(T,(i,r)=>{if(e.hasChild(i)){const o=e.getImmediateChild(i);o.equals(r)||s.trackChildChange($e(i,r,o))}else s.trackChildChange(Ee(i,r))})),t.withIndex(this.index_)}updatePriority(e,t){return e.isEmpty()?g.EMPTY_NODE:e.updatePriority(t)}filtersNodes(){return!1}getIndexedFilter(){return this}getIndex(){return this.index_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class We{constructor(e){this.indexedFilter_=new Sn(e.getIndex()),this.index_=e.getIndex(),this.startPost_=We.getStartPost_(e),this.endPost_=We.getEndPost_(e),this.startIsInclusive_=!e.startAfterSet_,this.endIsInclusive_=!e.endBeforeSet_}getStartPost(){return this.startPost_}getEndPost(){return this.endPost_}matches(e){const t=this.startIsInclusive_?this.index_.compare(this.getStartPost(),e)<=0:this.index_.compare(this.getStartPost(),e)<0,s=this.endIsInclusive_?this.index_.compare(e,this.getEndPost())<=0:this.index_.compare(e,this.getEndPost())<0;return t&&s}updateChild(e,t,s,i,r,o){return this.matches(new y(t,s))||(s=g.EMPTY_NODE),this.indexedFilter_.updateChild(e,t,s,i,r,o)}updateFullNode(e,t,s){t.isLeafNode()&&(t=g.EMPTY_NODE);let i=t.withIndex(this.index_);i=i.updatePriority(g.EMPTY_NODE);const r=this;return t.forEachChild(T,(o,a)=>{r.matches(new y(o,a))||(i=i.updateImmediateChild(o,g.EMPTY_NODE))}),this.indexedFilter_.updateFullNode(e,i,s)}updatePriority(e,t){return e}filtersNodes(){return!0}getIndexedFilter(){return this.indexedFilter_}getIndex(){return this.index_}static getStartPost_(e){if(e.hasStart()){const t=e.getIndexStartName();return e.getIndex().makePost(e.getIndexStartValue(),t)}else return e.getIndex().minPost()}static getEndPost_(e){if(e.hasEnd()){const t=e.getIndexEndName();return e.getIndex().makePost(e.getIndexEndValue(),t)}else return e.getIndex().maxPost()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Il{constructor(e){this.withinDirectionalStart=t=>this.reverse_?this.withinEndPost(t):this.withinStartPost(t),this.withinDirectionalEnd=t=>this.reverse_?this.withinStartPost(t):this.withinEndPost(t),this.withinStartPost=t=>{const s=this.index_.compare(this.rangedFilter_.getStartPost(),t);return this.startIsInclusive_?s<=0:s<0},this.withinEndPost=t=>{const s=this.index_.compare(t,this.rangedFilter_.getEndPost());return this.endIsInclusive_?s<=0:s<0},this.rangedFilter_=new We(e),this.index_=e.getIndex(),this.limit_=e.getLimit(),this.reverse_=!e.isViewFromLeft(),this.startIsInclusive_=!e.startAfterSet_,this.endIsInclusive_=!e.endBeforeSet_}updateChild(e,t,s,i,r,o){return this.rangedFilter_.matches(new y(t,s))||(s=g.EMPTY_NODE),e.getImmediateChild(t).equals(s)?e:e.numChildren()<this.limit_?this.rangedFilter_.getIndexedFilter().updateChild(e,t,s,i,r,o):this.fullLimitUpdateChild_(e,t,s,r,o)}updateFullNode(e,t,s){let i;if(t.isLeafNode()||t.isEmpty())i=g.EMPTY_NODE.withIndex(this.index_);else if(this.limit_*2<t.numChildren()&&t.isIndexed(this.index_)){i=g.EMPTY_NODE.withIndex(this.index_);let r;this.reverse_?r=t.getReverseIteratorFrom(this.rangedFilter_.getEndPost(),this.index_):r=t.getIteratorFrom(this.rangedFilter_.getStartPost(),this.index_);let o=0;for(;r.hasNext()&&o<this.limit_;){const a=r.getNext();if(this.withinDirectionalStart(a))if(this.withinDirectionalEnd(a))i=i.updateImmediateChild(a.name,a.node),o++;else break;else continue}}else{i=t.withIndex(this.index_),i=i.updatePriority(g.EMPTY_NODE);let r;this.reverse_?r=i.getReverseIterator(this.index_):r=i.getIterator(this.index_);let o=0;for(;r.hasNext();){const a=r.getNext();o<this.limit_&&this.withinDirectionalStart(a)&&this.withinDirectionalEnd(a)?o++:i=i.updateImmediateChild(a.name,g.EMPTY_NODE)}}return this.rangedFilter_.getIndexedFilter().updateFullNode(e,i,s)}updatePriority(e,t){return e}filtersNodes(){return!0}getIndexedFilter(){return this.rangedFilter_.getIndexedFilter()}getIndex(){return this.index_}fullLimitUpdateChild_(e,t,s,i,r){let o;if(this.reverse_){const h=this.index_.getCompare();o=(d,p)=>h(p,d)}else o=this.index_.getCompare();const a=e;f(a.numChildren()===this.limit_,"");const l=new y(t,s),c=this.reverse_?a.getFirstChild(this.index_):a.getLastChild(this.index_),u=this.rangedFilter_.matches(l);if(a.hasChild(t)){const h=a.getImmediateChild(t);let d=i.getChildAfterChild(this.index_,c,this.reverse_);for(;d!=null&&(d.name===t||a.hasChild(d.name));)d=i.getChildAfterChild(this.index_,d,this.reverse_);const p=d==null?1:o(d,l);if(u&&!s.isEmpty()&&p>=0)return r!=null&&r.trackChildChange($e(t,s,h)),a.updateImmediateChild(t,s);{r!=null&&r.trackChildChange(He(t,h));const E=a.updateImmediateChild(t,g.EMPTY_NODE);return d!=null&&this.rangedFilter_.matches(d)?(r!=null&&r.trackChildChange(Ee(d.name,d.node)),E.updateImmediateChild(d.name,d.node)):E}}else return s.isEmpty()?e:u&&o(c,l)>=0?(r!=null&&(r.trackChildChange(He(c.name,c.node)),r.trackChildChange(Ee(t,s))),a.updateImmediateChild(t,s).updateImmediateChild(c.name,g.EMPTY_NODE)):e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tn{constructor(){this.limitSet_=!1,this.startSet_=!1,this.startNameSet_=!1,this.startAfterSet_=!1,this.endSet_=!1,this.endNameSet_=!1,this.endBeforeSet_=!1,this.limit_=0,this.viewFrom_="",this.indexStartValue_=null,this.indexStartName_="",this.indexEndValue_=null,this.indexEndName_="",this.index_=T}hasStart(){return this.startSet_}isViewFromLeft(){return this.viewFrom_===""?this.startSet_:this.viewFrom_==="l"}getIndexStartValue(){return f(this.startSet_,"Only valid if start has been set"),this.indexStartValue_}getIndexStartName(){return f(this.startSet_,"Only valid if start has been set"),this.startNameSet_?this.indexStartName_:ue}hasEnd(){return this.endSet_}getIndexEndValue(){return f(this.endSet_,"Only valid if end has been set"),this.indexEndValue_}getIndexEndName(){return f(this.endSet_,"Only valid if end has been set"),this.endNameSet_?this.indexEndName_:ee}hasLimit(){return this.limitSet_}hasAnchoredLimit(){return this.limitSet_&&this.viewFrom_!==""}getLimit(){return f(this.limitSet_,"Only valid if limit has been set"),this.limit_}getIndex(){return this.index_}loadsAllData(){return!(this.startSet_||this.endSet_||this.limitSet_)}isDefault(){return this.loadsAllData()&&this.index_===T}copy(){const e=new Tn;return e.limitSet_=this.limitSet_,e.limit_=this.limit_,e.startSet_=this.startSet_,e.startAfterSet_=this.startAfterSet_,e.indexStartValue_=this.indexStartValue_,e.startNameSet_=this.startNameSet_,e.indexStartName_=this.indexStartName_,e.endSet_=this.endSet_,e.endBeforeSet_=this.endBeforeSet_,e.indexEndValue_=this.indexEndValue_,e.endNameSet_=this.endNameSet_,e.indexEndName_=this.indexEndName_,e.index_=this.index_,e.viewFrom_=this.viewFrom_,e}}function wl(n){return n.loadsAllData()?new Sn(n.getIndex()):n.hasLimit()?new Il(n):new We(n)}function Sl(n,e){const t=n.copy();return t.limitSet_=!0,t.limit_=e,t.viewFrom_="r",t}function Tl(n,e){const t=n.copy();return t.index_=e,t}function bs(n){const e={};if(n.isDefault())return e;let t;if(n.index_===T?t="$priority":n.index_===Bi?t="$value":n.index_===he?t="$key":(f(n.index_ instanceof wn,"Unrecognized index type!"),t=n.index_.toString()),e.orderBy=R(t),n.startSet_){const s=n.startAfterSet_?"startAfter":"startAt";e[s]=R(n.indexStartValue_),n.startNameSet_&&(e[s]+=","+R(n.indexStartName_))}if(n.endSet_){const s=n.endBeforeSet_?"endBefore":"endAt";e[s]=R(n.indexEndValue_),n.endNameSet_&&(e[s]+=","+R(n.indexEndName_))}return n.limitSet_&&(n.isViewFromLeft()?e.limitToFirst=n.limit_:e.limitToLast=n.limit_),e}function Is(n){const e={};if(n.startSet_&&(e.sp=n.indexStartValue_,n.startNameSet_&&(e.sn=n.indexStartName_),e.sin=!n.startAfterSet_),n.endSet_&&(e.ep=n.indexEndValue_,n.endNameSet_&&(e.en=n.indexEndName_),e.ein=!n.endBeforeSet_),n.limitSet_){e.l=n.limit_;let t=n.viewFrom_;t===""&&(n.isViewFromLeft()?t="l":t="r"),e.vf=t}return n.index_!==T&&(e.i=n.index_.toString()),e}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mt extends Ti{reportStats(e){throw new Error("Method not implemented.")}static getListenId_(e,t){return t!==void 0?"tag$"+t:(f(e._queryParams.isDefault(),"should have a tag if it's not a default query."),e._path.toString())}constructor(e,t,s,i){super(),this.repoInfo_=e,this.onDataUpdate_=t,this.authTokenProvider_=s,this.appCheckTokenProvider_=i,this.log_=Qe("p:rest:"),this.listens_={}}listen(e,t,s,i){const r=e._path.toString();this.log_("Listen called for "+r+" "+e._queryIdentifier);const o=mt.getListenId_(e,s),a={};this.listens_[o]=a;const l=bs(e._queryParams);this.restRequest_(r+".json",l,(c,u)=>{let h=u;if(c===404&&(h=null,c=null),c===null&&this.onDataUpdate_(r,h,!1,s),Ce(this.listens_,o)===a){let d;c?c===401?d="permission_denied":d="rest_error:"+c:d="ok",i(d,null)}})}unlisten(e,t){const s=mt.getListenId_(e,t);delete this.listens_[s]}get(e){const t=bs(e._queryParams),s=e._path.toString(),i=new wt;return this.restRequest_(s+".json",t,(r,o)=>{let a=o;r===404&&(a=null,r=null),r===null?(this.onDataUpdate_(s,a,!1,null),i.resolve(a)):i.reject(new Error(a))}),i.promise}refreshAuthToken(e){}restRequest_(e,t={},s){return t.format="export",Promise.all([this.authTokenProvider_.getToken(!1),this.appCheckTokenProvider_.getToken(!1)]).then(([i,r])=>{i&&i.accessToken&&(t.auth=i.accessToken),r&&r.token&&(t.ac=r.token);const o=(this.repoInfo_.secure?"https://":"http://")+this.repoInfo_.host+e+"?ns="+this.repoInfo_.namespace+Qr(t);this.log_("Sending REST request for "+o);const a=new XMLHttpRequest;a.onreadystatechange=()=>{if(s&&a.readyState===4){this.log_("REST Response for "+o+" received. status:",a.status,"response:",a.responseText);let l=null;if(a.status>=200&&a.status<300){try{l=Oe(a.responseText)}catch{O("Failed to parse JSON response for "+o+": "+a.responseText)}s(null,l)}else a.status!==401&&a.status!==404&&O("Got unsuccessful REST response for "+o+" Status: "+a.status),s(a.status);s=null}},a.open("GET",o,!0),a.send()})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rl{constructor(){this.rootNode_=g.EMPTY_NODE}getNode(e){return this.rootNode_.getChild(e)}updateSnapshot(e,t){this.rootNode_=this.rootNode_.updateChild(e,t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function gt(){return{value:null,children:new Map}}function Hi(n,e,t){if(_(e))n.value=t,n.children.clear();else if(n.value!==null)n.value=n.value.updateChild(e,t);else{const s=v(e);n.children.has(s)||n.children.set(s,gt());const i=n.children.get(s);e=w(e),Hi(i,e,t)}}function an(n,e,t){n.value!==null?t(e,n.value):Nl(n,(s,i)=>{const r=new b(e.toString()+"/"+s);an(i,r,t)})}function Nl(n,e){n.children.forEach((t,s)=>{e(s,t)})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Al{constructor(e){this.collection_=e,this.last_=null}get(){const e=this.collection_.get(),t=Object.assign({},e);return this.last_&&F(this.last_,(s,i)=>{t[s]=t[s]-i}),this.last_=e,t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ws=10*1e3,Dl=30*1e3,Ml=5*60*1e3;class kl{constructor(e,t){this.server_=t,this.statsToReport_={},this.statsListener_=new Al(e);const s=ws+(Dl-ws)*Math.random();ke(this.reportStats_.bind(this),Math.floor(s))}reportStats_(){const e=this.statsListener_.get(),t={};let s=!1;F(e,(i,r)=>{r>0&&z(this.statsToReport_,i)&&(t[i]=r,s=!0)}),s&&this.server_.reportStats(t),ke(this.reportStats_.bind(this),Math.floor(Math.random()*2*Ml))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var $;(function(n){n[n.OVERWRITE=0]="OVERWRITE",n[n.MERGE=1]="MERGE",n[n.ACK_USER_WRITE=2]="ACK_USER_WRITE",n[n.LISTEN_COMPLETE=3]="LISTEN_COMPLETE"})($||($={}));function $i(){return{fromUser:!0,fromServer:!1,queryId:null,tagged:!1}}function Rn(){return{fromUser:!1,fromServer:!0,queryId:null,tagged:!1}}function Nn(n){return{fromUser:!1,fromServer:!0,queryId:n,tagged:!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _t{constructor(e,t,s){this.path=e,this.affectedTree=t,this.revert=s,this.type=$.ACK_USER_WRITE,this.source=$i()}operationForChild(e){if(_(this.path)){if(this.affectedTree.value!=null)return f(this.affectedTree.children.isEmpty(),"affectedTree should not have overlapping affected paths."),this;{const t=this.affectedTree.subtree(new b(e));return new _t(C(),t,this.revert)}}else return f(v(this.path)===e,"operationForChild called for unrelated child."),new _t(w(this.path),this.affectedTree,this.revert)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ue{constructor(e,t){this.source=e,this.path=t,this.type=$.LISTEN_COMPLETE}operationForChild(e){return _(this.path)?new Ue(this.source,C()):new Ue(this.source,w(this.path))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class de{constructor(e,t,s){this.source=e,this.path=t,this.snap=s,this.type=$.OVERWRITE}operationForChild(e){return _(this.path)?new de(this.source,C(),this.snap.getImmediateChild(e)):new de(this.source,w(this.path),this.snap)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ze{constructor(e,t,s){this.source=e,this.path=t,this.children=s,this.type=$.MERGE}operationForChild(e){if(_(this.path)){const t=this.children.subtree(new b(e));return t.isEmpty()?null:t.value?new de(this.source,C(),t.value):new ze(this.source,C(),t)}else return f(v(this.path)===e,"Can't get a merge for a child not on the path of the operation"),new ze(this.source,w(this.path),this.children)}toString(){return"Operation("+this.path+": "+this.source.toString()+" merge: "+this.children.toString()+")"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ne{constructor(e,t,s){this.node_=e,this.fullyInitialized_=t,this.filtered_=s}isFullyInitialized(){return this.fullyInitialized_}isFiltered(){return this.filtered_}isCompleteForPath(e){if(_(e))return this.isFullyInitialized()&&!this.filtered_;const t=v(e);return this.isCompleteForChild(t)}isCompleteForChild(e){return this.isFullyInitialized()&&!this.filtered_||this.node_.hasChild(e)}getNode(){return this.node_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xl{constructor(e){this.query_=e,this.index_=this.query_._queryParams.getIndex()}}function Pl(n,e,t,s){const i=[],r=[];return e.forEach(o=>{o.type==="child_changed"&&n.index_.indexedValueChanged(o.oldSnap,o.snapshotNode)&&r.push(bl(o.childName,o.snapshotNode))}),De(n,i,"child_removed",e,s,t),De(n,i,"child_added",e,s,t),De(n,i,"child_moved",r,s,t),De(n,i,"child_changed",e,s,t),De(n,i,"value",e,s,t),i}function De(n,e,t,s,i,r){const o=s.filter(a=>a.type===t);o.sort((a,l)=>Ol(n,a,l)),o.forEach(a=>{const l=Ll(n,a,r);i.forEach(c=>{c.respondsTo(a.type)&&e.push(c.createEvent(l,n.query_))})})}function Ll(n,e,t){return e.type==="value"||e.type==="child_removed"||(e.prevName=t.getPredecessorChildName(e.childName,e.snapshotNode,n.index_)),e}function Ol(n,e,t){if(e.childName==null||t.childName==null)throw Ie("Should only compare child_ events.");const s=new y(e.childName,e.snapshotNode),i=new y(t.childName,t.snapshotNode);return n.index_.compare(s,i)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Rt(n,e){return{eventCache:n,serverCache:e}}function xe(n,e,t,s){return Rt(new ne(e,t,s),n.serverCache)}function Wi(n,e,t,s){return Rt(n.eventCache,new ne(e,t,s))}function yt(n){return n.eventCache.isFullyInitialized()?n.eventCache.getNode():null}function fe(n){return n.serverCache.isFullyInitialized()?n.serverCache.getNode():null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Vt;const Fl=()=>(Vt||(Vt=new L(ba)),Vt);class S{static fromObject(e){let t=new S(null);return F(e,(s,i)=>{t=t.set(new b(s),i)}),t}constructor(e,t=Fl()){this.value=e,this.children=t}isEmpty(){return this.value===null&&this.children.isEmpty()}findRootMostMatchingPathAndValue(e,t){if(this.value!=null&&t(this.value))return{path:C(),value:this.value};if(_(e))return null;{const s=v(e),i=this.children.get(s);if(i!==null){const r=i.findRootMostMatchingPathAndValue(w(e),t);return r!=null?{path:N(new b(s),r.path),value:r.value}:null}else return null}}findRootMostValueAndPath(e){return this.findRootMostMatchingPathAndValue(e,()=>!0)}subtree(e){if(_(e))return this;{const t=v(e),s=this.children.get(t);return s!==null?s.subtree(w(e)):new S(null)}}set(e,t){if(_(e))return new S(t,this.children);{const s=v(e),r=(this.children.get(s)||new S(null)).set(w(e),t),o=this.children.insert(s,r);return new S(this.value,o)}}remove(e){if(_(e))return this.children.isEmpty()?new S(null):new S(null,this.children);{const t=v(e),s=this.children.get(t);if(s){const i=s.remove(w(e));let r;return i.isEmpty()?r=this.children.remove(t):r=this.children.insert(t,i),this.value===null&&r.isEmpty()?new S(null):new S(this.value,r)}else return this}}get(e){if(_(e))return this.value;{const t=v(e),s=this.children.get(t);return s?s.get(w(e)):null}}setTree(e,t){if(_(e))return t;{const s=v(e),r=(this.children.get(s)||new S(null)).setTree(w(e),t);let o;return r.isEmpty()?o=this.children.remove(s):o=this.children.insert(s,r),new S(this.value,o)}}fold(e){return this.fold_(C(),e)}fold_(e,t){const s={};return this.children.inorderTraversal((i,r)=>{s[i]=r.fold_(N(e,i),t)}),t(e,this.value,s)}findOnPath(e,t){return this.findOnPath_(e,C(),t)}findOnPath_(e,t,s){const i=this.value?s(t,this.value):!1;if(i)return i;if(_(e))return null;{const r=v(e),o=this.children.get(r);return o?o.findOnPath_(w(e),N(t,r),s):null}}foreachOnPath(e,t){return this.foreachOnPath_(e,C(),t)}foreachOnPath_(e,t,s){if(_(e))return this;{this.value&&s(t,this.value);const i=v(e),r=this.children.get(i);return r?r.foreachOnPath_(w(e),N(t,i),s):new S(null)}}foreach(e){this.foreach_(C(),e)}foreach_(e,t){this.children.inorderTraversal((s,i)=>{i.foreach_(N(e,s),t)}),this.value&&t(e,this.value)}foreachChild(e){this.children.inorderTraversal((t,s)=>{s.value&&e(t,s.value)})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class W{constructor(e){this.writeTree_=e}static empty(){return new W(new S(null))}}function Pe(n,e,t){if(_(e))return new W(new S(t));{const s=n.writeTree_.findRootMostValueAndPath(e);if(s!=null){const i=s.path;let r=s.value;const o=P(i,e);return r=r.updateChild(o,t),new W(n.writeTree_.set(i,r))}else{const i=new S(t),r=n.writeTree_.setTree(e,i);return new W(r)}}}function Ss(n,e,t){let s=n;return F(t,(i,r)=>{s=Pe(s,N(e,i),r)}),s}function Ts(n,e){if(_(e))return W.empty();{const t=n.writeTree_.setTree(e,new S(null));return new W(t)}}function ln(n,e){return pe(n,e)!=null}function pe(n,e){const t=n.writeTree_.findRootMostValueAndPath(e);return t!=null?n.writeTree_.get(t.path).getChild(P(t.path,e)):null}function Rs(n){const e=[],t=n.writeTree_.value;return t!=null?t.isLeafNode()||t.forEachChild(T,(s,i)=>{e.push(new y(s,i))}):n.writeTree_.children.inorderTraversal((s,i)=>{i.value!=null&&e.push(new y(s,i.value))}),e}function J(n,e){if(_(e))return n;{const t=pe(n,e);return t!=null?new W(new S(t)):new W(n.writeTree_.subtree(e))}}function cn(n){return n.writeTree_.isEmpty()}function be(n,e){return Ui(C(),n.writeTree_,e)}function Ui(n,e,t){if(e.value!=null)return t.updateChild(n,e.value);{let s=null;return e.children.inorderTraversal((i,r)=>{i===".priority"?(f(r.value!==null,"Priority writes must always be leaf nodes"),s=r.value):t=Ui(N(n,i),r,t)}),!t.getChild(n).isEmpty()&&s!==null&&(t=t.updateChild(N(n,".priority"),s)),t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Nt(n,e){return ji(e,n)}function Bl(n,e,t,s,i){f(s>n.lastWriteId,"Stacking an older write on top of newer ones"),i===void 0&&(i=!0),n.allWrites.push({path:e,snap:t,writeId:s,visible:i}),i&&(n.visibleWrites=Pe(n.visibleWrites,e,t)),n.lastWriteId=s}function ql(n,e){for(let t=0;t<n.allWrites.length;t++){const s=n.allWrites[t];if(s.writeId===e)return s}return null}function Hl(n,e){const t=n.allWrites.findIndex(a=>a.writeId===e);f(t>=0,"removeWrite called with nonexistent writeId.");const s=n.allWrites[t];n.allWrites.splice(t,1);let i=s.visible,r=!1,o=n.allWrites.length-1;for(;i&&o>=0;){const a=n.allWrites[o];a.visible&&(o>=t&&$l(a,s.path)?i=!1:H(s.path,a.path)&&(r=!0)),o--}if(i){if(r)return Wl(n),!0;if(s.snap)n.visibleWrites=Ts(n.visibleWrites,s.path);else{const a=s.children;F(a,l=>{n.visibleWrites=Ts(n.visibleWrites,N(s.path,l))})}return!0}else return!1}function $l(n,e){if(n.snap)return H(n.path,e);for(const t in n.children)if(n.children.hasOwnProperty(t)&&H(N(n.path,t),e))return!0;return!1}function Wl(n){n.visibleWrites=zi(n.allWrites,Ul,C()),n.allWrites.length>0?n.lastWriteId=n.allWrites[n.allWrites.length-1].writeId:n.lastWriteId=-1}function Ul(n){return n.visible}function zi(n,e,t){let s=W.empty();for(let i=0;i<n.length;++i){const r=n[i];if(e(r)){const o=r.path;let a;if(r.snap)H(t,o)?(a=P(t,o),s=Pe(s,a,r.snap)):H(o,t)&&(a=P(o,t),s=Pe(s,C(),r.snap.getChild(a)));else if(r.children){if(H(t,o))a=P(t,o),s=Ss(s,a,r.children);else if(H(o,t))if(a=P(o,t),_(a))s=Ss(s,C(),r.children);else{const l=Ce(r.children,v(a));if(l){const c=l.getChild(w(a));s=Pe(s,C(),c)}}}else throw Ie("WriteRecord should have .snap or .children")}}return s}function Vi(n,e,t,s,i){if(!s&&!i){const r=pe(n.visibleWrites,e);if(r!=null)return r;{const o=J(n.visibleWrites,e);if(cn(o))return t;if(t==null&&!ln(o,C()))return null;{const a=t||g.EMPTY_NODE;return be(o,a)}}}else{const r=J(n.visibleWrites,e);if(!i&&cn(r))return t;if(!i&&t==null&&!ln(r,C()))return null;{const o=function(c){return(c.visible||i)&&(!s||!~s.indexOf(c.writeId))&&(H(c.path,e)||H(e,c.path))},a=zi(n.allWrites,o,e),l=t||g.EMPTY_NODE;return be(a,l)}}}function zl(n,e,t){let s=g.EMPTY_NODE;const i=pe(n.visibleWrites,e);if(i)return i.isLeafNode()||i.forEachChild(T,(r,o)=>{s=s.updateImmediateChild(r,o)}),s;if(t){const r=J(n.visibleWrites,e);return t.forEachChild(T,(o,a)=>{const l=be(J(r,new b(o)),a);s=s.updateImmediateChild(o,l)}),Rs(r).forEach(o=>{s=s.updateImmediateChild(o.name,o.node)}),s}else{const r=J(n.visibleWrites,e);return Rs(r).forEach(o=>{s=s.updateImmediateChild(o.name,o.node)}),s}}function Vl(n,e,t,s,i){f(s||i,"Either existingEventSnap or existingServerSnap must exist");const r=N(e,t);if(ln(n.visibleWrites,r))return null;{const o=J(n.visibleWrites,r);return cn(o)?i.getChild(t):be(o,i.getChild(t))}}function Gl(n,e,t,s){const i=N(e,t),r=pe(n.visibleWrites,i);if(r!=null)return r;if(s.isCompleteForChild(t)){const o=J(n.visibleWrites,i);return be(o,s.getNode().getImmediateChild(t))}else return null}function jl(n,e){return pe(n.visibleWrites,e)}function Yl(n,e,t,s,i,r,o){let a;const l=J(n.visibleWrites,e),c=pe(l,C());if(c!=null)a=c;else if(t!=null)a=be(l,t);else return[];if(a=a.withIndex(o),!a.isEmpty()&&!a.isLeafNode()){const u=[],h=o.getCompare(),d=r?a.getReverseIteratorFrom(s,o):a.getIteratorFrom(s,o);let p=d.getNext();for(;p&&u.length<i;)h(p,s)!==0&&u.push(p),p=d.getNext();return u}else return[]}function Kl(){return{visibleWrites:W.empty(),allWrites:[],lastWriteId:-1}}function vt(n,e,t,s){return Vi(n.writeTree,n.treePath,e,t,s)}function An(n,e){return zl(n.writeTree,n.treePath,e)}function Ns(n,e,t,s){return Vl(n.writeTree,n.treePath,e,t,s)}function Ct(n,e){return jl(n.writeTree,N(n.treePath,e))}function Ql(n,e,t,s,i,r){return Yl(n.writeTree,n.treePath,e,t,s,i,r)}function Dn(n,e,t){return Gl(n.writeTree,n.treePath,e,t)}function Gi(n,e){return ji(N(n.treePath,e),n.writeTree)}function ji(n,e){return{treePath:n,writeTree:e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xl{constructor(){this.changeMap=new Map}trackChildChange(e){const t=e.type,s=e.childName;f(t==="child_added"||t==="child_changed"||t==="child_removed","Only child changes supported for tracking"),f(s!==".priority","Only non-priority child changes can be tracked.");const i=this.changeMap.get(s);if(i){const r=i.type;if(t==="child_added"&&r==="child_removed")this.changeMap.set(s,$e(s,e.snapshotNode,i.snapshotNode));else if(t==="child_removed"&&r==="child_added")this.changeMap.delete(s);else if(t==="child_removed"&&r==="child_changed")this.changeMap.set(s,He(s,i.oldSnap));else if(t==="child_changed"&&r==="child_added")this.changeMap.set(s,Ee(s,e.snapshotNode));else if(t==="child_changed"&&r==="child_changed")this.changeMap.set(s,$e(s,e.snapshotNode,i.oldSnap));else throw Ie("Illegal combination of changes: "+e+" occurred after "+i)}else this.changeMap.set(s,e)}getChanges(){return Array.from(this.changeMap.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jl{getCompleteChild(e){return null}getChildAfterChild(e,t,s){return null}}const Yi=new Jl;class Mn{constructor(e,t,s=null){this.writes_=e,this.viewCache_=t,this.optCompleteServerCache_=s}getCompleteChild(e){const t=this.viewCache_.eventCache;if(t.isCompleteForChild(e))return t.getNode().getImmediateChild(e);{const s=this.optCompleteServerCache_!=null?new ne(this.optCompleteServerCache_,!0,!1):this.viewCache_.serverCache;return Dn(this.writes_,e,s)}}getChildAfterChild(e,t,s){const i=this.optCompleteServerCache_!=null?this.optCompleteServerCache_:fe(this.viewCache_),r=Ql(this.writes_,i,t,1,s,e);return r.length===0?null:r[0]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Zl(n){return{filter:n}}function ec(n,e){f(e.eventCache.getNode().isIndexed(n.filter.getIndex()),"Event snap not indexed"),f(e.serverCache.getNode().isIndexed(n.filter.getIndex()),"Server snap not indexed")}function tc(n,e,t,s,i){const r=new Xl;let o,a;if(t.type===$.OVERWRITE){const c=t;c.source.fromUser?o=hn(n,e,c.path,c.snap,s,i,r):(f(c.source.fromServer,"Unknown source."),a=c.source.tagged||e.serverCache.isFiltered()&&!_(c.path),o=Et(n,e,c.path,c.snap,s,i,a,r))}else if(t.type===$.MERGE){const c=t;c.source.fromUser?o=sc(n,e,c.path,c.children,s,i,r):(f(c.source.fromServer,"Unknown source."),a=c.source.tagged||e.serverCache.isFiltered(),o=un(n,e,c.path,c.children,s,i,a,r))}else if(t.type===$.ACK_USER_WRITE){const c=t;c.revert?o=oc(n,e,c.path,s,i,r):o=ic(n,e,c.path,c.affectedTree,s,i,r)}else if(t.type===$.LISTEN_COMPLETE)o=rc(n,e,t.path,s,r);else throw Ie("Unknown operation type: "+t.type);const l=r.getChanges();return nc(e,o,l),{viewCache:o,changes:l}}function nc(n,e,t){const s=e.eventCache;if(s.isFullyInitialized()){const i=s.getNode().isLeafNode()||s.getNode().isEmpty(),r=yt(n);(t.length>0||!n.eventCache.isFullyInitialized()||i&&!s.getNode().equals(r)||!s.getNode().getPriority().equals(r.getPriority()))&&t.push(qi(yt(e)))}}function Ki(n,e,t,s,i,r){const o=e.eventCache;if(Ct(s,t)!=null)return e;{let a,l;if(_(t))if(f(e.serverCache.isFullyInitialized(),"If change path is empty, we must have complete server data"),e.serverCache.isFiltered()){const c=fe(e),u=c instanceof g?c:g.EMPTY_NODE,h=An(s,u);a=n.filter.updateFullNode(e.eventCache.getNode(),h,r)}else{const c=vt(s,fe(e));a=n.filter.updateFullNode(e.eventCache.getNode(),c,r)}else{const c=v(t);if(c===".priority"){f(te(t)===1,"Can't have a priority with additional path components");const u=o.getNode();l=e.serverCache.getNode();const h=Ns(s,t,u,l);h!=null?a=n.filter.updatePriority(u,h):a=o.getNode()}else{const u=w(t);let h;if(o.isCompleteForChild(c)){l=e.serverCache.getNode();const d=Ns(s,t,o.getNode(),l);d!=null?h=o.getNode().getImmediateChild(c).updateChild(u,d):h=o.getNode().getImmediateChild(c)}else h=Dn(s,c,e.serverCache);h!=null?a=n.filter.updateChild(o.getNode(),c,h,u,i,r):a=o.getNode()}}return xe(e,a,o.isFullyInitialized()||_(t),n.filter.filtersNodes())}}function Et(n,e,t,s,i,r,o,a){const l=e.serverCache;let c;const u=o?n.filter:n.filter.getIndexedFilter();if(_(t))c=u.updateFullNode(l.getNode(),s,null);else if(u.filtersNodes()&&!l.isFiltered()){const p=l.getNode().updateChild(t,s);c=u.updateFullNode(l.getNode(),p,null)}else{const p=v(t);if(!l.isCompleteForPath(t)&&te(t)>1)return e;const m=w(t),k=l.getNode().getImmediateChild(p).updateChild(m,s);p===".priority"?c=u.updatePriority(l.getNode(),k):c=u.updateChild(l.getNode(),p,k,m,Yi,null)}const h=Wi(e,c,l.isFullyInitialized()||_(t),u.filtersNodes()),d=new Mn(i,h,r);return Ki(n,h,t,i,d,a)}function hn(n,e,t,s,i,r,o){const a=e.eventCache;let l,c;const u=new Mn(i,e,r);if(_(t))c=n.filter.updateFullNode(e.eventCache.getNode(),s,o),l=xe(e,c,!0,n.filter.filtersNodes());else{const h=v(t);if(h===".priority")c=n.filter.updatePriority(e.eventCache.getNode(),s),l=xe(e,c,a.isFullyInitialized(),a.isFiltered());else{const d=w(t),p=a.getNode().getImmediateChild(h);let m;if(_(d))m=s;else{const E=u.getCompleteChild(h);E!=null?Ni(d)===".priority"&&E.getChild(Di(d)).isEmpty()?m=E:m=E.updateChild(d,s):m=g.EMPTY_NODE}if(p.equals(m))l=e;else{const E=n.filter.updateChild(a.getNode(),h,m,d,u,o);l=xe(e,E,a.isFullyInitialized(),n.filter.filtersNodes())}}}return l}function As(n,e){return n.eventCache.isCompleteForChild(e)}function sc(n,e,t,s,i,r,o){let a=e;return s.foreach((l,c)=>{const u=N(t,l);As(e,v(u))&&(a=hn(n,a,u,c,i,r,o))}),s.foreach((l,c)=>{const u=N(t,l);As(e,v(u))||(a=hn(n,a,u,c,i,r,o))}),a}function Ds(n,e,t){return t.foreach((s,i)=>{e=e.updateChild(s,i)}),e}function un(n,e,t,s,i,r,o,a){if(e.serverCache.getNode().isEmpty()&&!e.serverCache.isFullyInitialized())return e;let l=e,c;_(t)?c=s:c=new S(null).setTree(t,s);const u=e.serverCache.getNode();return c.children.inorderTraversal((h,d)=>{if(u.hasChild(h)){const p=e.serverCache.getNode().getImmediateChild(h),m=Ds(n,p,d);l=Et(n,l,new b(h),m,i,r,o,a)}}),c.children.inorderTraversal((h,d)=>{const p=!e.serverCache.isCompleteForChild(h)&&d.value===null;if(!u.hasChild(h)&&!p){const m=e.serverCache.getNode().getImmediateChild(h),E=Ds(n,m,d);l=Et(n,l,new b(h),E,i,r,o,a)}}),l}function ic(n,e,t,s,i,r,o){if(Ct(i,t)!=null)return e;const a=e.serverCache.isFiltered(),l=e.serverCache;if(s.value!=null){if(_(t)&&l.isFullyInitialized()||l.isCompleteForPath(t))return Et(n,e,t,l.getNode().getChild(t),i,r,a,o);if(_(t)){let c=new S(null);return l.getNode().forEachChild(he,(u,h)=>{c=c.set(new b(u),h)}),un(n,e,t,c,i,r,a,o)}else return e}else{let c=new S(null);return s.foreach((u,h)=>{const d=N(t,u);l.isCompleteForPath(d)&&(c=c.set(u,l.getNode().getChild(d)))}),un(n,e,t,c,i,r,a,o)}}function rc(n,e,t,s,i){const r=e.serverCache,o=Wi(e,r.getNode(),r.isFullyInitialized()||_(t),r.isFiltered());return Ki(n,o,t,s,Yi,i)}function oc(n,e,t,s,i,r){let o;if(Ct(s,t)!=null)return e;{const a=new Mn(s,e,i),l=e.eventCache.getNode();let c;if(_(t)||v(t)===".priority"){let u;if(e.serverCache.isFullyInitialized())u=vt(s,fe(e));else{const h=e.serverCache.getNode();f(h instanceof g,"serverChildren would be complete if leaf node"),u=An(s,h)}u=u,c=n.filter.updateFullNode(l,u,r)}else{const u=v(t);let h=Dn(s,u,e.serverCache);h==null&&e.serverCache.isCompleteForChild(u)&&(h=l.getImmediateChild(u)),h!=null?c=n.filter.updateChild(l,u,h,w(t),a,r):e.eventCache.getNode().hasChild(u)?c=n.filter.updateChild(l,u,g.EMPTY_NODE,w(t),a,r):c=l,c.isEmpty()&&e.serverCache.isFullyInitialized()&&(o=vt(s,fe(e)),o.isLeafNode()&&(c=n.filter.updateFullNode(c,o,r)))}return o=e.serverCache.isFullyInitialized()||Ct(s,C())!=null,xe(e,c,o,n.filter.filtersNodes())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ac{constructor(e,t){this.query_=e,this.eventRegistrations_=[];const s=this.query_._queryParams,i=new Sn(s.getIndex()),r=wl(s);this.processor_=Zl(r);const o=t.serverCache,a=t.eventCache,l=i.updateFullNode(g.EMPTY_NODE,o.getNode(),null),c=r.updateFullNode(g.EMPTY_NODE,a.getNode(),null),u=new ne(l,o.isFullyInitialized(),i.filtersNodes()),h=new ne(c,a.isFullyInitialized(),r.filtersNodes());this.viewCache_=Rt(h,u),this.eventGenerator_=new xl(this.query_)}get query(){return this.query_}}function lc(n){return n.viewCache_.serverCache.getNode()}function cc(n){return yt(n.viewCache_)}function hc(n,e){const t=fe(n.viewCache_);return t&&(n.query._queryParams.loadsAllData()||!_(e)&&!t.getImmediateChild(v(e)).isEmpty())?t.getChild(e):null}function Ms(n){return n.eventRegistrations_.length===0}function uc(n,e){n.eventRegistrations_.push(e)}function ks(n,e,t){const s=[];if(t){f(e==null,"A cancel should cancel all event registrations.");const i=n.query._path;n.eventRegistrations_.forEach(r=>{const o=r.createCancelEvent(t,i);o&&s.push(o)})}if(e){let i=[];for(let r=0;r<n.eventRegistrations_.length;++r){const o=n.eventRegistrations_[r];if(!o.matches(e))i.push(o);else if(e.hasAnyCallback()){i=i.concat(n.eventRegistrations_.slice(r+1));break}}n.eventRegistrations_=i}else n.eventRegistrations_=[];return s}function xs(n,e,t,s){e.type===$.MERGE&&e.source.queryId!==null&&(f(fe(n.viewCache_),"We should always have a full cache before handling merges"),f(yt(n.viewCache_),"Missing event cache, even though we have a server cache"));const i=n.viewCache_,r=tc(n.processor_,i,e,t,s);return ec(n.processor_,r.viewCache),f(r.viewCache.serverCache.isFullyInitialized()||!i.serverCache.isFullyInitialized(),"Once a server snap is complete, it should never go back"),n.viewCache_=r.viewCache,Qi(n,r.changes,r.viewCache.eventCache.getNode(),null)}function dc(n,e){const t=n.viewCache_.eventCache,s=[];return t.getNode().isLeafNode()||t.getNode().forEachChild(T,(r,o)=>{s.push(Ee(r,o))}),t.isFullyInitialized()&&s.push(qi(t.getNode())),Qi(n,s,t.getNode(),e)}function Qi(n,e,t,s){const i=s?[s]:n.eventRegistrations_;return Pl(n.eventGenerator_,e,t,i)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let bt;class Xi{constructor(){this.views=new Map}}function fc(n){f(!bt,"__referenceConstructor has already been defined"),bt=n}function pc(){return f(bt,"Reference.ts has not been loaded"),bt}function mc(n){return n.views.size===0}function kn(n,e,t,s){const i=e.source.queryId;if(i!==null){const r=n.views.get(i);return f(r!=null,"SyncTree gave us an op for an invalid query."),xs(r,e,t,s)}else{let r=[];for(const o of n.views.values())r=r.concat(xs(o,e,t,s));return r}}function Ji(n,e,t,s,i){const r=e._queryIdentifier,o=n.views.get(r);if(!o){let a=vt(t,i?s:null),l=!1;a?l=!0:s instanceof g?(a=An(t,s),l=!1):(a=g.EMPTY_NODE,l=!1);const c=Rt(new ne(a,l,!1),new ne(s,i,!1));return new ac(e,c)}return o}function gc(n,e,t,s,i,r){const o=Ji(n,e,s,i,r);return n.views.has(e._queryIdentifier)||n.views.set(e._queryIdentifier,o),uc(o,t),dc(o,t)}function _c(n,e,t,s){const i=e._queryIdentifier,r=[];let o=[];const a=se(n);if(i==="default")for(const[l,c]of n.views.entries())o=o.concat(ks(c,t,s)),Ms(c)&&(n.views.delete(l),c.query._queryParams.loadsAllData()||r.push(c.query));else{const l=n.views.get(i);l&&(o=o.concat(ks(l,t,s)),Ms(l)&&(n.views.delete(i),l.query._queryParams.loadsAllData()||r.push(l.query)))}return a&&!se(n)&&r.push(new(pc())(e._repo,e._path)),{removed:r,events:o}}function Zi(n){const e=[];for(const t of n.views.values())t.query._queryParams.loadsAllData()||e.push(t);return e}function Z(n,e){let t=null;for(const s of n.views.values())t=t||hc(s,e);return t}function er(n,e){if(e._queryParams.loadsAllData())return At(n);{const s=e._queryIdentifier;return n.views.get(s)}}function tr(n,e){return er(n,e)!=null}function se(n){return At(n)!=null}function At(n){for(const e of n.views.values())if(e.query._queryParams.loadsAllData())return e;return null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let It;function yc(n){f(!It,"__referenceConstructor has already been defined"),It=n}function vc(){return f(It,"Reference.ts has not been loaded"),It}let Cc=1;class Ps{constructor(e){this.listenProvider_=e,this.syncPointTree_=new S(null),this.pendingWriteTree_=Kl(),this.tagToQueryMap=new Map,this.queryToTagMap=new Map}}function nr(n,e,t,s,i){return Bl(n.pendingWriteTree_,e,t,s,i),i?Ze(n,new de($i(),e,t)):[]}function ce(n,e,t=!1){const s=ql(n.pendingWriteTree_,e);if(Hl(n.pendingWriteTree_,e)){let r=new S(null);return s.snap!=null?r=r.set(C(),!0):F(s.children,o=>{r=r.set(new b(o),!0)}),Ze(n,new _t(s.path,r,t))}else return[]}function Je(n,e,t){return Ze(n,new de(Rn(),e,t))}function Ec(n,e,t){const s=S.fromObject(t);return Ze(n,new ze(Rn(),e,s))}function bc(n,e){return Ze(n,new Ue(Rn(),e))}function Ic(n,e,t){const s=Pn(n,t);if(s){const i=Ln(s),r=i.path,o=i.queryId,a=P(r,e),l=new Ue(Nn(o),a);return On(n,r,l)}else return[]}function sr(n,e,t,s,i=!1){const r=e._path,o=n.syncPointTree_.get(r);let a=[];if(o&&(e._queryIdentifier==="default"||tr(o,e))){const l=_c(o,e,t,s);mc(o)&&(n.syncPointTree_=n.syncPointTree_.remove(r));const c=l.removed;if(a=l.events,!i){const u=c.findIndex(d=>d._queryParams.loadsAllData())!==-1,h=n.syncPointTree_.findOnPath(r,(d,p)=>se(p));if(u&&!h){const d=n.syncPointTree_.subtree(r);if(!d.isEmpty()){const p=Rc(d);for(let m=0;m<p.length;++m){const E=p[m],k=E.query,me=ar(n,E);n.listenProvider_.startListening(Le(k),Ve(n,k),me.hashFn,me.onComplete)}}}!h&&c.length>0&&!s&&(u?n.listenProvider_.stopListening(Le(e),null):c.forEach(d=>{const p=n.queryToTagMap.get(Dt(d));n.listenProvider_.stopListening(Le(d),p)}))}Nc(n,c)}return a}function ir(n,e,t,s){const i=Pn(n,s);if(i!=null){const r=Ln(i),o=r.path,a=r.queryId,l=P(o,e),c=new de(Nn(a),l,t);return On(n,o,c)}else return[]}function wc(n,e,t,s){const i=Pn(n,s);if(i){const r=Ln(i),o=r.path,a=r.queryId,l=P(o,e),c=S.fromObject(t),u=new ze(Nn(a),l,c);return On(n,o,u)}else return[]}function Sc(n,e,t,s=!1){const i=e._path;let r=null,o=!1;n.syncPointTree_.foreachOnPath(i,(d,p)=>{const m=P(d,i);r=r||Z(p,m),o=o||se(p)});let a=n.syncPointTree_.get(i);a?(o=o||se(a),r=r||Z(a,C())):(a=new Xi,n.syncPointTree_=n.syncPointTree_.set(i,a));let l;r!=null?l=!0:(l=!1,r=g.EMPTY_NODE,n.syncPointTree_.subtree(i).foreachChild((p,m)=>{const E=Z(m,C());E&&(r=r.updateImmediateChild(p,E))}));const c=tr(a,e);if(!c&&!e._queryParams.loadsAllData()){const d=Dt(e);f(!n.queryToTagMap.has(d),"View does not exist, but we have a tag");const p=Ac();n.queryToTagMap.set(d,p),n.tagToQueryMap.set(p,d)}const u=Nt(n.pendingWriteTree_,i);let h=gc(a,e,t,u,r,l);if(!c&&!o&&!s){const d=er(a,e);h=h.concat(Dc(n,e,d))}return h}function xn(n,e,t){const i=n.pendingWriteTree_,r=n.syncPointTree_.findOnPath(e,(o,a)=>{const l=P(o,e),c=Z(a,l);if(c)return c});return Vi(i,e,r,t,!0)}function Tc(n,e){const t=e._path;let s=null;n.syncPointTree_.foreachOnPath(t,(c,u)=>{const h=P(c,t);s=s||Z(u,h)});let i=n.syncPointTree_.get(t);i?s=s||Z(i,C()):(i=new Xi,n.syncPointTree_=n.syncPointTree_.set(t,i));const r=s!=null,o=r?new ne(s,!0,!1):null,a=Nt(n.pendingWriteTree_,e._path),l=Ji(i,e,a,r?o.getNode():g.EMPTY_NODE,r);return cc(l)}function Ze(n,e){return rr(e,n.syncPointTree_,null,Nt(n.pendingWriteTree_,C()))}function rr(n,e,t,s){if(_(n.path))return or(n,e,t,s);{const i=e.get(C());t==null&&i!=null&&(t=Z(i,C()));let r=[];const o=v(n.path),a=n.operationForChild(o),l=e.children.get(o);if(l&&a){const c=t?t.getImmediateChild(o):null,u=Gi(s,o);r=r.concat(rr(a,l,c,u))}return i&&(r=r.concat(kn(i,n,s,t))),r}}function or(n,e,t,s){const i=e.get(C());t==null&&i!=null&&(t=Z(i,C()));let r=[];return e.children.inorderTraversal((o,a)=>{const l=t?t.getImmediateChild(o):null,c=Gi(s,o),u=n.operationForChild(o);u&&(r=r.concat(or(u,a,l,c)))}),i&&(r=r.concat(kn(i,n,s,t))),r}function ar(n,e){const t=e.query,s=Ve(n,t);return{hashFn:()=>(lc(e)||g.EMPTY_NODE).hash(),onComplete:i=>{if(i==="ok")return s?Ic(n,t._path,s):bc(n,t._path);{const r=Sa(i,t);return sr(n,t,null,r)}}}}function Ve(n,e){const t=Dt(e);return n.queryToTagMap.get(t)}function Dt(n){return n._path.toString()+"$"+n._queryIdentifier}function Pn(n,e){return n.tagToQueryMap.get(e)}function Ln(n){const e=n.indexOf("$");return f(e!==-1&&e<n.length-1,"Bad queryKey."),{queryId:n.substr(e+1),path:new b(n.substr(0,e))}}function On(n,e,t){const s=n.syncPointTree_.get(e);f(s,"Missing sync point for query tag that we're tracking");const i=Nt(n.pendingWriteTree_,e);return kn(s,t,i,null)}function Rc(n){return n.fold((e,t,s)=>{if(t&&se(t))return[At(t)];{let i=[];return t&&(i=Zi(t)),F(s,(r,o)=>{i=i.concat(o)}),i}})}function Le(n){return n._queryParams.loadsAllData()&&!n._queryParams.isDefault()?new(vc())(n._repo,n._path):n}function Nc(n,e){for(let t=0;t<e.length;++t){const s=e[t];if(!s._queryParams.loadsAllData()){const i=Dt(s),r=n.queryToTagMap.get(i);n.queryToTagMap.delete(i),n.tagToQueryMap.delete(r)}}}function Ac(){return Cc++}function Dc(n,e,t){const s=e._path,i=Ve(n,e),r=ar(n,t),o=n.listenProvider_.startListening(Le(e),i,r.hashFn,r.onComplete),a=n.syncPointTree_.subtree(s);if(i)f(!se(a.value),"If we're adding a query, it shouldn't be shadowed");else{const l=a.fold((c,u,h)=>{if(!_(c)&&u&&se(u))return[At(u).query];{let d=[];return u&&(d=d.concat(Zi(u).map(p=>p.query))),F(h,(p,m)=>{d=d.concat(m)}),d}});for(let c=0;c<l.length;++c){const u=l[c];n.listenProvider_.stopListening(Le(u),Ve(n,u))}}return o}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fn{constructor(e){this.node_=e}getImmediateChild(e){const t=this.node_.getImmediateChild(e);return new Fn(t)}node(){return this.node_}}class Bn{constructor(e,t){this.syncTree_=e,this.path_=t}getImmediateChild(e){const t=N(this.path_,e);return new Bn(this.syncTree_,t)}node(){return xn(this.syncTree_,this.path_)}}const Mc=function(n){return n=n||{},n.timestamp=n.timestamp||new Date().getTime(),n},Ls=function(n,e,t){if(!n||typeof n!="object")return n;if(f(".sv"in n,"Unexpected leaf node or priority contents"),typeof n[".sv"]=="string")return kc(n[".sv"],e,t);if(typeof n[".sv"]=="object")return xc(n[".sv"],e);f(!1,"Unexpected server value: "+JSON.stringify(n,null,2))},kc=function(n,e,t){switch(n){case"timestamp":return t.timestamp;default:f(!1,"Unexpected server value: "+n)}},xc=function(n,e,t){n.hasOwnProperty("increment")||f(!1,"Unexpected server value: "+JSON.stringify(n,null,2));const s=n.increment;typeof s!="number"&&f(!1,"Unexpected increment value: "+s);const i=e.node();if(f(i!==null&&typeof i<"u","Expected ChildrenNode.EMPTY_NODE for nulls"),!i.isLeafNode())return s;const o=i.getValue();return typeof o!="number"?s:o+s},Pc=function(n,e,t,s){return qn(e,new Bn(t,n),s)},lr=function(n,e,t){return qn(n,new Fn(e),t)};function qn(n,e,t){const s=n.getPriority().val(),i=Ls(s,e.getImmediateChild(".priority"),t);let r;if(n.isLeafNode()){const o=n,a=Ls(o.getValue(),e,t);return a!==o.getValue()||i!==o.getPriority().val()?new A(a,M(i)):n}else{const o=n;return r=o,i!==o.getPriority().val()&&(r=r.updatePriority(new A(i))),o.forEachChild(T,(a,l)=>{const c=qn(l,e.getImmediateChild(a),t);c!==l&&(r=r.updateImmediateChild(a,c))}),r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Hn{constructor(e="",t=null,s={children:{},childCount:0}){this.name=e,this.parent=t,this.node=s}}function $n(n,e){let t=e instanceof b?e:new b(e),s=n,i=v(t);for(;i!==null;){const r=Ce(s.node.children,i)||{children:{},childCount:0};s=new Hn(i,s,r),t=w(t),i=v(t)}return s}function Te(n){return n.node.value}function cr(n,e){n.node.value=e,dn(n)}function hr(n){return n.node.childCount>0}function Lc(n){return Te(n)===void 0&&!hr(n)}function Mt(n,e){F(n.node.children,(t,s)=>{e(new Hn(t,n,s))})}function ur(n,e,t,s){t&&e(n),Mt(n,i=>{ur(i,e,!0)})}function Oc(n,e,t){let s=n.parent;for(;s!==null;){if(e(s))return!0;s=s.parent}return!1}function et(n){return new b(n.parent===null?n.name:et(n.parent)+"/"+n.name)}function dn(n){n.parent!==null&&Fc(n.parent,n.name,n)}function Fc(n,e,t){const s=Lc(t),i=z(n.node.children,e);s&&i?(delete n.node.children[e],n.node.childCount--,dn(n)):!s&&!i&&(n.node.children[e]=t.node,n.node.childCount++,dn(n))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Bc=/[\[\].#$\/\u0000-\u001F\u007F]/,qc=/[\[\].#$\u0000-\u001F\u007F]/,Gt=10*1024*1024,dr=function(n){return typeof n=="string"&&n.length!==0&&!Bc.test(n)},fr=function(n){return typeof n=="string"&&n.length!==0&&!qc.test(n)},Hc=function(n){return n&&(n=n.replace(/^\/*\.info(\/|$)/,"/")),fr(n)},Os=function(n){return n===null||typeof n=="string"||typeof n=="number"&&!_n(n)||n&&typeof n=="object"&&z(n,".sv")},pr=function(n,e,t,s){s&&e===void 0||Wn(mn(n,"value"),e,t)},Wn=function(n,e,t){const s=t instanceof b?new il(t,n):t;if(e===void 0)throw new Error(n+"contains undefined "+ae(s));if(typeof e=="function")throw new Error(n+"contains a function "+ae(s)+" with contents = "+e.toString());if(_n(e))throw new Error(n+"contains "+e.toString()+" "+ae(s));if(typeof e=="string"&&e.length>Gt/3&&St(e)>Gt)throw new Error(n+"contains a string greater than "+Gt+" utf8 bytes "+ae(s)+" ('"+e.substring(0,50)+"...')");if(e&&typeof e=="object"){let i=!1,r=!1;if(F(e,(o,a)=>{if(o===".value")i=!0;else if(o!==".priority"&&o!==".sv"&&(r=!0,!dr(o)))throw new Error(n+" contains an invalid key ("+o+") "+ae(s)+`.  Keys must be non-empty strings and can't contain ".", "#", "$", "/", "[", or "]"`);rl(s,o),Wn(n,a,s),ol(s)}),i&&r)throw new Error(n+' contains ".value" child '+ae(s)+" in addition to actual children.")}},Un=function(n,e,t,s){if(!fr(t))throw new Error(mn(n,e)+'was an invalid path = "'+t+`". Paths must be non-empty strings and can't contain ".", "#", "$", "[", or "]"`)},$c=function(n,e,t,s){t&&(t=t.replace(/^\/*\.info(\/|$)/,"/")),Un(n,e,t)},mr=function(n,e){if(v(e)===".info")throw new Error(n+" failed = Can't modify data under /.info/")},Wc=function(n,e){const t=e.path.toString();if(typeof e.repoInfo.host!="string"||e.repoInfo.host.length===0||!dr(e.repoInfo.namespace)&&e.repoInfo.host.split(":")[0]!=="localhost"||t.length!==0&&!Hc(t))throw new Error(mn(n,"url")+`must be a valid firebase URL and the path can't contain ".", "#", "$", "[", or "]".`)};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Uc{constructor(){this.eventLists_=[],this.recursionDepth_=0}}function gr(n,e){let t=null;for(let s=0;s<e.length;s++){const i=e[s],r=i.getPath();t!==null&&!Mi(r,t.path)&&(n.eventLists_.push(t),t=null),t===null&&(t={events:[],path:r}),t.events.push(i)}t&&n.eventLists_.push(t)}function U(n,e,t){gr(n,t),zc(n,s=>H(s,e)||H(e,s))}function zc(n,e){n.recursionDepth_++;let t=!0;for(let s=0;s<n.eventLists_.length;s++){const i=n.eventLists_[s];if(i){const r=i.path;e(r)?(Vc(n.eventLists_[s]),n.eventLists_[s]=null):t=!1}}t&&(n.eventLists_=[]),n.recursionDepth_--}function Vc(n){for(let e=0;e<n.events.length;e++){const t=n.events[e];if(t!==null){n.events[e]=null;const s=t.getEventRunner();Me&&x("event: "+t.toString()),Se(s)}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gc="repo_interrupt",jc=25;class Yc{constructor(e,t,s,i){this.repoInfo_=e,this.forceRestClient_=t,this.authTokenProvider_=s,this.appCheckProvider_=i,this.dataUpdateCount=0,this.statsListener_=null,this.eventQueue_=new Uc,this.nextWriteId_=1,this.interceptServerDataCallback_=null,this.onDisconnect_=gt(),this.transactionQueueTree_=new Hn,this.persistentConnection_=null,this.key=this.repoInfo_.toURLString()}toString(){return(this.repoInfo_.secure?"https://":"http://")+this.repoInfo_.host}}function Kc(n,e,t){if(n.stats_=Cn(n.repoInfo_),n.forceRestClient_||Aa())n.server_=new mt(n.repoInfo_,(s,i,r,o)=>{Fs(n,s,i,r,o)},n.authTokenProvider_,n.appCheckProvider_),setTimeout(()=>Bs(n,!0),0);else{if(typeof t<"u"&&t!==null){if(typeof t!="object")throw new Error("Only objects are supported for option databaseAuthVariableOverride");try{R(t)}catch(s){throw new Error("Invalid authOverride provided: "+s)}}n.persistentConnection_=new G(n.repoInfo_,e,(s,i,r,o)=>{Fs(n,s,i,r,o)},s=>{Bs(n,s)},s=>{Qc(n,s)},n.authTokenProvider_,n.appCheckProvider_,t),n.server_=n.persistentConnection_}n.authTokenProvider_.addTokenChangeListener(s=>{n.server_.refreshAuthToken(s)}),n.appCheckProvider_.addTokenChangeListener(s=>{n.server_.refreshAppCheckToken(s.token)}),n.statsReporter_=Pa(n.repoInfo_,()=>new kl(n.stats_,n.server_)),n.infoData_=new Rl,n.infoSyncTree_=new Ps({startListening:(s,i,r,o)=>{let a=[];const l=n.infoData_.getNode(s._path);return l.isEmpty()||(a=Je(n.infoSyncTree_,s._path,l),setTimeout(()=>{o("ok")},0)),a},stopListening:()=>{}}),Vn(n,"connected",!1),n.serverSyncTree_=new Ps({startListening:(s,i,r,o)=>(n.server_.listen(s,r,i,(a,l)=>{const c=o(a,l);U(n.eventQueue_,s._path,c)}),[]),stopListening:(s,i)=>{n.server_.unlisten(s,i)}})}function _r(n){const t=n.infoData_.getNode(new b(".info/serverTimeOffset")).val()||0;return new Date().getTime()+t}function zn(n){return Mc({timestamp:_r(n)})}function Fs(n,e,t,s,i){n.dataUpdateCount++;const r=new b(e);t=n.interceptServerDataCallback_?n.interceptServerDataCallback_(e,t):t;let o=[];if(i)if(s){const l=lt(t,c=>M(c));o=wc(n.serverSyncTree_,r,l,i)}else{const l=M(t);o=ir(n.serverSyncTree_,r,l,i)}else if(s){const l=lt(t,c=>M(c));o=Ec(n.serverSyncTree_,r,l)}else{const l=M(t);o=Je(n.serverSyncTree_,r,l)}let a=r;o.length>0&&(a=xt(n,r)),U(n.eventQueue_,a,o)}function Bs(n,e){Vn(n,"connected",e),e===!1&&Zc(n)}function Qc(n,e){F(e,(t,s)=>{Vn(n,t,s)})}function Vn(n,e,t){const s=new b("/.info/"+e),i=M(t);n.infoData_.updateSnapshot(s,i);const r=Je(n.infoSyncTree_,s,i);U(n.eventQueue_,s,r)}function yr(n){return n.nextWriteId_++}function Xc(n,e,t){const s=Tc(n.serverSyncTree_,e);return s!=null?Promise.resolve(s):n.server_.get(e).then(i=>{const r=M(i).withIndex(e._queryParams.getIndex());Sc(n.serverSyncTree_,e,t,!0);let o;if(e._queryParams.loadsAllData())o=Je(n.serverSyncTree_,e._path,r);else{const a=Ve(n.serverSyncTree_,e);o=ir(n.serverSyncTree_,e._path,r,a)}return U(n.eventQueue_,e._path,o),sr(n.serverSyncTree_,e,t,null,!0),r},i=>(kt(n,"get for query "+R(e)+" failed: "+i),Promise.reject(new Error(i))))}function Jc(n,e,t,s,i){kt(n,"set",{path:e.toString(),value:t,priority:s});const r=zn(n),o=M(t,s),a=xn(n.serverSyncTree_,e),l=lr(o,a,r),c=yr(n),u=nr(n.serverSyncTree_,e,l,c,!0);gr(n.eventQueue_,u),n.server_.put(e.toString(),o.val(!0),(d,p)=>{const m=d==="ok";m||O("set at "+e+" failed: "+d);const E=ce(n.serverSyncTree_,c,!m);U(n.eventQueue_,e,E),th(n,i,d,p)});const h=Ir(n,e);xt(n,h),U(n.eventQueue_,h,[])}function Zc(n){kt(n,"onDisconnectEvents");const e=zn(n),t=gt();an(n.onDisconnect_,C(),(i,r)=>{const o=Pc(i,r,n.serverSyncTree_,e);Hi(t,i,o)});let s=[];an(t,C(),(i,r)=>{s=s.concat(Je(n.serverSyncTree_,i,r));const o=Ir(n,i);xt(n,o)}),n.onDisconnect_=gt(),U(n.eventQueue_,C(),s)}function eh(n){n.persistentConnection_&&n.persistentConnection_.interrupt(Gc)}function kt(n,...e){let t="";n.persistentConnection_&&(t=n.persistentConnection_.id+":"),x(t,...e)}function th(n,e,t,s){e&&Se(()=>{if(t==="ok")e(null);else{const i=(t||"error").toUpperCase();let r=i;s&&(r+=": "+s);const o=new Error(r);o.code=i,e(o)}})}function vr(n,e,t){return xn(n.serverSyncTree_,e,t)||g.EMPTY_NODE}function Gn(n,e=n.transactionQueueTree_){if(e||Pt(n,e),Te(e)){const t=Er(n,e);f(t.length>0,"Sending zero length transaction queue"),t.every(i=>i.status===0)&&nh(n,et(e),t)}else hr(e)&&Mt(e,t=>{Gn(n,t)})}function nh(n,e,t){const s=t.map(c=>c.currentWriteId),i=vr(n,e,s);let r=i;const o=i.hash();for(let c=0;c<t.length;c++){const u=t[c];f(u.status===0,"tryToSendTransactionQueue_: items in queue should all be run."),u.status=1,u.retryCount++;const h=P(e,u.path);r=r.updateChild(h,u.currentOutputSnapshotRaw)}const a=r.val(!0),l=e;n.server_.put(l.toString(),a,c=>{kt(n,"transaction put response",{path:l.toString(),status:c});let u=[];if(c==="ok"){const h=[];for(let d=0;d<t.length;d++)t[d].status=2,u=u.concat(ce(n.serverSyncTree_,t[d].currentWriteId)),t[d].onComplete&&h.push(()=>t[d].onComplete(null,!0,t[d].currentOutputSnapshotResolved)),t[d].unwatcher();Pt(n,$n(n.transactionQueueTree_,e)),Gn(n,n.transactionQueueTree_),U(n.eventQueue_,e,u);for(let d=0;d<h.length;d++)Se(h[d])}else{if(c==="datastale")for(let h=0;h<t.length;h++)t[h].status===3?t[h].status=4:t[h].status=0;else{O("transaction at "+l.toString()+" failed: "+c);for(let h=0;h<t.length;h++)t[h].status=4,t[h].abortReason=c}xt(n,e)}},o)}function xt(n,e){const t=Cr(n,e),s=et(t),i=Er(n,t);return sh(n,i,s),s}function sh(n,e,t){if(e.length===0)return;const s=[];let i=[];const o=e.filter(a=>a.status===0).map(a=>a.currentWriteId);for(let a=0;a<e.length;a++){const l=e[a],c=P(t,l.path);let u=!1,h;if(f(c!==null,"rerunTransactionsUnderNode_: relativePath should not be null."),l.status===4)u=!0,h=l.abortReason,i=i.concat(ce(n.serverSyncTree_,l.currentWriteId,!0));else if(l.status===0)if(l.retryCount>=jc)u=!0,h="maxretry",i=i.concat(ce(n.serverSyncTree_,l.currentWriteId,!0));else{const d=vr(n,l.path,o);l.currentInputSnapshot=d;const p=e[a].update(d.val());if(p!==void 0){Wn("transaction failed: Data returned ",p,l.path);let m=M(p);typeof p=="object"&&p!=null&&z(p,".priority")||(m=m.updatePriority(d.getPriority()));const k=l.currentWriteId,me=zn(n),nt=lr(m,d,me);l.currentOutputSnapshotRaw=m,l.currentOutputSnapshotResolved=nt,l.currentWriteId=yr(n),o.splice(o.indexOf(k),1),i=i.concat(nr(n.serverSyncTree_,l.path,nt,l.currentWriteId,l.applyLocally)),i=i.concat(ce(n.serverSyncTree_,k,!0))}else u=!0,h="nodata",i=i.concat(ce(n.serverSyncTree_,l.currentWriteId,!0))}U(n.eventQueue_,t,i),i=[],u&&(e[a].status=2,function(d){setTimeout(d,Math.floor(0))}(e[a].unwatcher),e[a].onComplete&&(h==="nodata"?s.push(()=>e[a].onComplete(null,!1,e[a].currentInputSnapshot)):s.push(()=>e[a].onComplete(new Error(h),!1,null))))}Pt(n,n.transactionQueueTree_);for(let a=0;a<s.length;a++)Se(s[a]);Gn(n,n.transactionQueueTree_)}function Cr(n,e){let t,s=n.transactionQueueTree_;for(t=v(e);t!==null&&Te(s)===void 0;)s=$n(s,t),e=w(e),t=v(e);return s}function Er(n,e){const t=[];return br(n,e,t),t.sort((s,i)=>s.order-i.order),t}function br(n,e,t){const s=Te(e);if(s)for(let i=0;i<s.length;i++)t.push(s[i]);Mt(e,i=>{br(n,i,t)})}function Pt(n,e){const t=Te(e);if(t){let s=0;for(let i=0;i<t.length;i++)t[i].status!==2&&(t[s]=t[i],s++);t.length=s,cr(e,t.length>0?t:void 0)}Mt(e,s=>{Pt(n,s)})}function Ir(n,e){const t=et(Cr(n,e)),s=$n(n.transactionQueueTree_,e);return Oc(s,i=>{jt(n,i)}),jt(n,s),ur(s,i=>{jt(n,i)}),t}function jt(n,e){const t=Te(e);if(t){const s=[];let i=[],r=-1;for(let o=0;o<t.length;o++)t[o].status===3||(t[o].status===1?(f(r===o-1,"All SENT items should be at beginning of queue."),r=o,t[o].status=3,t[o].abortReason="set"):(f(t[o].status===0,"Unexpected transaction status in abort"),t[o].unwatcher(),i=i.concat(ce(n.serverSyncTree_,t[o].currentWriteId,!0)),t[o].onComplete&&s.push(t[o].onComplete.bind(null,new Error("set"),!1,null))));r===-1?cr(e,void 0):t.length=r+1,U(n.eventQueue_,et(e),i);for(let o=0;o<s.length;o++)Se(s[o])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ih(n){let e="";const t=n.split("/");for(let s=0;s<t.length;s++)if(t[s].length>0){let i=t[s];try{i=decodeURIComponent(i.replace(/\+/g," "))}catch{}e+="/"+i}return e}function rh(n){const e={};n.charAt(0)==="?"&&(n=n.substring(1));for(const t of n.split("&")){if(t.length===0)continue;const s=t.split("=");s.length===2?e[decodeURIComponent(s[0])]=decodeURIComponent(s[1]):O(`Invalid query segment '${t}' in query '${n}'`)}return e}const qs=function(n,e){const t=oh(n),s=t.namespace;t.domain==="firebase.com"&&Y(t.host+" is no longer supported. Please use <YOUR FIREBASE>.firebaseio.com instead"),(!s||s==="undefined")&&t.domain!=="localhost"&&Y("Cannot parse Firebase url. Please use https://<YOUR FIREBASE>.firebaseio.com"),t.secure||Ca();const i=t.scheme==="ws"||t.scheme==="wss";return{repoInfo:new vi(t.host,t.secure,s,i,e,"",s!==t.subdomain),path:new b(t.pathString)}},oh=function(n){let e="",t="",s="",i="",r="",o=!0,a="https",l=443;if(typeof n=="string"){let c=n.indexOf("//");c>=0&&(a=n.substring(0,c-1),n=n.substring(c+2));let u=n.indexOf("/");u===-1&&(u=n.length);let h=n.indexOf("?");h===-1&&(h=n.length),e=n.substring(0,Math.min(u,h)),u<h&&(i=ih(n.substring(u,h)));const d=rh(n.substring(Math.min(n.length,h)));c=e.indexOf(":"),c>=0?(o=a==="https"||a==="wss",l=parseInt(e.substring(c+1),10)):c=e.length;const p=e.slice(0,c);if(p.toLowerCase()==="localhost")t="localhost";else if(p.split(".").length<=2)t=p;else{const m=e.indexOf(".");s=e.substring(0,m).toLowerCase(),t=e.substring(m+1),r=s}"ns"in d&&(r=d.ns)}return{host:e,port:l,domain:t,subdomain:s,secure:o,scheme:a,pathString:i,namespace:r}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Hs="-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz",ah=function(){let n=0;const e=[];return function(t){const s=t===n;n=t;let i;const r=new Array(8);for(i=7;i>=0;i--)r[i]=Hs.charAt(t%64),t=Math.floor(t/64);f(t===0,"Cannot push at time == 0");let o=r.join("");if(s){for(i=11;i>=0&&e[i]===63;i--)e[i]=0;e[i]++}else for(i=0;i<12;i++)e[i]=Math.floor(Math.random()*64);for(i=0;i<12;i++)o+=Hs.charAt(e[i]);return f(o.length===20,"nextPushId: Length should be 20."),o}}();/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lh{constructor(e,t,s,i){this.eventType=e,this.eventRegistration=t,this.snapshot=s,this.prevName=i}getPath(){const e=this.snapshot.ref;return this.eventType==="value"?e._path:e.parent._path}getEventType(){return this.eventType}getEventRunner(){return this.eventRegistration.getEventRunner(this)}toString(){return this.getPath().toString()+":"+this.eventType+":"+R(this.snapshot.exportVal())}}class ch{constructor(e,t,s){this.eventRegistration=e,this.error=t,this.path=s}getPath(){return this.path}getEventType(){return"cancel"}getEventRunner(){return this.eventRegistration.getEventRunner(this)}toString(){return this.path.toString()+":cancel"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hh{constructor(e,t){this.snapshotCallback=e,this.cancelCallback=t}onValue(e,t){this.snapshotCallback.call(null,e,t)}onCancel(e){return f(this.hasCancelCallback,"Raising a cancel event on a listener with no cancel callback"),this.cancelCallback.call(null,e)}get hasCancelCallback(){return!!this.cancelCallback}matches(e){return this.snapshotCallback===e.snapshotCallback||this.snapshotCallback.userCallback!==void 0&&this.snapshotCallback.userCallback===e.snapshotCallback.userCallback&&this.snapshotCallback.context===e.snapshotCallback.context}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tt{constructor(e,t,s,i){this._repo=e,this._path=t,this._queryParams=s,this._orderByCalled=i}get key(){return _(this._path)?null:Ni(this._path)}get ref(){return new K(this._repo,this._path)}get _queryIdentifier(){const e=Is(this._queryParams),t=yn(e);return t==="{}"?"default":t}get _queryObject(){return Is(this._queryParams)}isEqual(e){if(e=ie(e),!(e instanceof tt))return!1;const t=this._repo===e._repo,s=Mi(this._path,e._path),i=this._queryIdentifier===e._queryIdentifier;return t&&s&&i}toJSON(){return this.toString()}toString(){return this._repo.toString()+sl(this._path)}}function uh(n,e){if(n._orderByCalled===!0)throw new Error(e+": You can't combine multiple orderBy calls.")}function dh(n){let e=null,t=null;if(n.hasStart()&&(e=n.getIndexStartValue()),n.hasEnd()&&(t=n.getIndexEndValue()),n.getIndex()===he){const s="Query: When ordering by key, you may only pass one argument to startAt(), endAt(), or equalTo().",i="Query: When ordering by key, the argument passed to startAt(), startAfter(), endAt(), endBefore(), or equalTo() must be a string.";if(n.hasStart()){if(n.getIndexStartName()!==ue)throw new Error(s);if(typeof e!="string")throw new Error(i)}if(n.hasEnd()){if(n.getIndexEndName()!==ee)throw new Error(s);if(typeof t!="string")throw new Error(i)}}else if(n.getIndex()===T){if(e!=null&&!Os(e)||t!=null&&!Os(t))throw new Error("Query: When ordering by priority, the first argument passed to startAt(), startAfter() endAt(), endBefore(), or equalTo() must be a valid priority value (null, a number, or a string).")}else if(f(n.getIndex()instanceof wn||n.getIndex()===Bi,"unknown index type."),e!=null&&typeof e=="object"||t!=null&&typeof t=="object")throw new Error("Query: First argument passed to startAt(), startAfter(), endAt(), endBefore(), or equalTo() cannot be an object.")}class K extends tt{constructor(e,t){super(e,t,new Tn,!1)}get parent(){const e=Di(this._path);return e===null?null:new K(this._repo,e)}get root(){let e=this;for(;e.parent!==null;)e=e.parent;return e}}class Ge{constructor(e,t,s){this._node=e,this.ref=t,this._index=s}get priority(){return this._node.getPriority().val()}get key(){return this.ref.key}get size(){return this._node.numChildren()}child(e){const t=new b(e),s=je(this.ref,e);return new Ge(this._node.getChild(t),s,T)}exists(){return!this._node.isEmpty()}exportVal(){return this._node.val(!0)}forEach(e){return this._node.isLeafNode()?!1:!!this._node.forEachChild(this._index,(s,i)=>e(new Ge(i,je(this.ref,s),T)))}hasChild(e){const t=new b(e);return!this._node.getChild(t).isEmpty()}hasChildren(){return this._node.isLeafNode()?!1:!this._node.isEmpty()}toJSON(){return this.exportVal()}val(){return this._node.val()}}function re(n,e){return n=ie(n),n._checkNotDeleted("ref"),e!==void 0?je(n._root,e):n._root}function je(n,e){return n=ie(n),v(n._path)===null?$c("child","path",e):Un("child","path",e),new K(n._repo,N(n._path,e))}function Yt(n,e){n=ie(n),mr("push",n._path),pr("push",e,n._path,!0);const t=_r(n._repo),s=ah(t),i=je(n,s),r=je(n,s);let o;return o=Promise.resolve(r),i.then=o.then.bind(o),i.catch=o.then.bind(o,void 0),i}function rt(n,e){n=ie(n),mr("set",n._path),pr("set",e,n._path,!1);const t=new wt;return Jc(n._repo,n._path,e,null,t.wrapCallback(()=>{})),t.promise}function Kt(n){n=ie(n);const e=new hh(()=>{}),t=new jn(e);return Xc(n._repo,n,t).then(s=>new Ge(s,new K(n._repo,n._path),n._queryParams.getIndex()))}class jn{constructor(e){this.callbackContext=e}respondsTo(e){return e==="value"}createEvent(e,t){const s=t._queryParams.getIndex();return new lh("value",this,new Ge(e.snapshotNode,new K(t._repo,t._path),s))}getEventRunner(e){return e.getEventType()==="cancel"?()=>this.callbackContext.onCancel(e.error):()=>this.callbackContext.onValue(e.snapshot,null)}createCancelEvent(e,t){return this.callbackContext.hasCancelCallback?new ch(this,e,t):null}matches(e){return e instanceof jn?!e.callbackContext||!this.callbackContext?!0:e.callbackContext.matches(this.callbackContext):!1}hasAnyCallback(){return this.callbackContext!==null}}class wr{}class fh extends wr{constructor(e){super(),this._limit=e,this.type="limitToLast"}_apply(e){if(e._queryParams.hasLimit())throw new Error("limitToLast: Limit was already set (by another call to limitToFirst or limitToLast).");return new tt(e._repo,e._path,Sl(e._queryParams,this._limit),e._orderByCalled)}}function $s(n){if(typeof n!="number"||Math.floor(n)!==n||n<=0)throw new Error("limitToLast: First argument must be a positive integer.");return new fh(n)}class ph extends wr{constructor(e){super(),this._path=e,this.type="orderByChild"}_apply(e){uh(e,"orderByChild");const t=new b(this._path);if(_(t))throw new Error("orderByChild: cannot pass in empty path. Use orderByValue() instead.");const s=new wn(t),i=Tl(e._queryParams,s);return dh(i),new tt(e._repo,e._path,i,!0)}}function Ws(n){if(n==="$key")throw new Error('orderByChild: "$key" is invalid.  Use orderByKey() instead.');if(n==="$priority")throw new Error('orderByChild: "$priority" is invalid.  Use orderByPriority() instead.');if(n==="$value")throw new Error('orderByChild: "$value" is invalid.  Use orderByValue() instead.');return Un("orderByChild","path",n),new ph(n)}function Us(n,...e){let t=ie(n);for(const s of e)t=s._apply(t);return t}fc(K);yc(K);/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const mh="FIREBASE_DATABASE_EMULATOR_HOST",fn={};let gh=!1;function _h(n,e,t,s){n.repoInfo_=new vi(e,!1,n.repoInfo_.namespace,n.repoInfo_.webSocketOnly,n.repoInfo_.nodeAdmin,n.repoInfo_.persistenceKey,n.repoInfo_.includeNamespaceInQueryParams,!0,t),s&&(n.authTokenProvider_=s)}function yh(n,e,t,s,i){let r=s||n.options.databaseURL;r===void 0&&(n.options.projectId||Y("Can't determine Firebase Database URL. Be sure to include  a Project ID when calling firebase.initializeApp()."),x("Using default host for project ",n.options.projectId),r=`${n.options.projectId}-default-rtdb.firebaseio.com`);let o=qs(r,i),a=o.repoInfo,l;typeof process<"u"&&rs&&(l=rs[mh]),l?(r=`http://${l}?ns=${a.namespace}`,o=qs(r,i),a=o.repoInfo):o.repoInfo.secure;const c=new Ma(n.name,n.options,e);Wc("Invalid Firebase Database URL",o),_(o.path)||Y("Database URL must point to the root of a Firebase Database (not including a child path).");const u=Ch(a,n,c,new Da(n,t));return new Eh(u,n)}function vh(n,e){const t=fn[e];(!t||t[n.key]!==n)&&Y(`Database ${e}(${n.repoInfo_}) has already been deleted.`),eh(n),delete t[n.key]}function Ch(n,e,t,s){let i=fn[e.name];i||(i={},fn[e.name]=i);let r=i[n.toURLString()];return r&&Y("Database initialized multiple times. Please make sure the format of the database URL matches with each database() call."),r=new Yc(n,gh,t,s),i[n.toURLString()]=r,r}class Eh{constructor(e,t){this._repoInternal=e,this.app=t,this.type="database",this._instanceStarted=!1}get _repo(){return this._instanceStarted||(Kc(this._repoInternal,this.app.options.appId,this.app.options.databaseAuthVariableOverride),this._instanceStarted=!0),this._repoInternal}get _root(){return this._rootInternal||(this._rootInternal=new K(this._repo,C())),this._rootInternal}_delete(){return this._rootInternal!==null&&(vh(this._repo,this.app.name),this._repoInternal=null,this._rootInternal=null),Promise.resolve()}_checkNotDeleted(e){this._rootInternal===null&&Y("Cannot call "+e+" on a deleted database.")}}function bh(n=ta(),e){const t=Qo(n,"database").getImmediate({identifier:e});if(!t._instanceStarted){const s=Br("database");s&&Ih(t,...s)}return t}function Ih(n,e,t,s={}){n=ie(n),n._checkNotDeleted("useEmulator");const i=`${e}:${t}`,r=n._repoInternal;if(n._instanceStarted){if(i===n._repoInternal.repoInfo_.host&&ct(s,r.repoInfo_.emulatorOptions))return;Y("connectDatabaseEmulator() cannot initialize or alter the emulator configuration after the database instance has started.")}let o;if(r.repoInfo_.nodeAdmin)s.mockUserToken&&Y('mockUserToken is not supported by the Admin SDK. For client access with mock users, please use the "firebase" package instead of "firebase-admin".'),o=new ot(ot.OWNER);else if(s.mockUserToken){const a=typeof s.mockUserToken=="string"?s.mockUserToken:qr(s.mockUserToken,n.app.options.projectId);o=new ot(a)}_h(r,i,s,o)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function wh(n){pa(ea),ut(new Fe("database",(e,{instanceIdentifier:t})=>{const s=e.getProvider("app").getImmediate(),i=e.getProvider("auth-internal"),r=e.getProvider("app-check-internal");return yh(s,i,r,t)},"PUBLIC").setMultipleInstances(!0)),ye(os,as,n),ye(os,as,"esm2017")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Sh={".sv":"timestamp"};function Qt(){return Sh}G.prototype.simpleListen=function(n,e){this.sendRequest("q",{p:n},e)};G.prototype.echo=function(n,e){this.sendRequest("echo",{d:n},e)};wh();class Lt{constructor(){if(this.constructor===Lt)throw new Error("Cannot instantiate abstract class!")}async initialize(){throw new Error("Method 'initialize()' must be implemented.")}async saveData(e,t){throw new Error("Method 'saveData()' must be implemented.")}async loadData(e){throw new Error("Method 'loadData()' must be implemented.")}async logChange(e,t,s,i,r){throw new Error("Method 'logChange()' must be implemented.")}async loadChangeLog(e){throw new Error("Method 'loadChangeLog()' must be implemented.")}async saveMaintenanceRequest(e,t){throw new Error("Method 'saveMaintenanceRequest()' must be implemented.")}async loadMaintenanceRequests(e,t){throw new Error("Method 'loadMaintenanceRequests()' must be implemented.")}async saveSupplyRequest(e,t){throw new Error("Method 'saveSupplyRequest()' must be implemented.")}async loadSupplyRequests(e,t){throw new Error("Method 'loadSupplyRequests()' must be implemented.")}}class Th extends Lt{constructor(e){if(super(),!e)throw new Error("Firebase configuration is required for FirebaseAdapter.");this.firebaseConfig=e,this.app=null,this.database=null,console.log("FirebaseAdapter created.")}async initialize(){try{console.log("Initializing Firebase app..."),this.app=ni(this.firebaseConfig),console.log("Firebase app initialized."),console.log("Getting Firebase database instance..."),this.database=bh(this.app),console.log("Firebase database instance obtained."),console.log("FirebaseAdapter initialized successfully.")}catch(e){throw console.error("Firebase initialization failed:",e),new Error(`Firebase initialization failed: ${e.message}`)}}async saveData(e,t){if(!this.database)throw new Error("Firebase not initialized. Call initialize() first.");try{const s=re(this.database,e);await rt(s,t),console.log(`Data saved successfully at path: ${e}`)}catch(s){throw console.error(`Firebase saveData error at path ${e}:`,s),new Error("Failed to save data to Firebase.")}}async loadData(e){if(!this.database)throw new Error("Firebase not initialized. Call initialize() first.");try{const t=re(this.database,e);return(await Kt(t)).val()}catch(t){throw console.error(`Firebase loadData error at path ${e}:`,t),new Error("Failed to load data from Firebase.")}}async logChange(e,t,s,i,r){if(!this.database)throw new Error("Firebase not initialized. Call initialize() first.");try{const o=re(this.database,e),a=Yt(o);await rt(a,{timestamp:Qt(),time:t,dayIndex:s,oldValue:i,newValue:r}),console.log(`Change logged successfully at path: ${e}`)}catch(o){throw console.error(`Firebase logChange error at path ${e}:`,o),new Error("Failed to log change to Firebase.")}}async loadChangeLog(e){if(!this.database)throw new Error("Firebase not initialized. Call initialize() first.");try{const t=re(this.database,e),s=Us(t,Ws("timestamp"),$s(50));return(await Kt(s)).val()}catch(t){throw console.error(`Firebase loadChangeLog error at path ${e}:`,t),new Error("Failed to load change log from Firebase.")}}async getRecentItems(e,t){if(!this.database)throw new Error("Firebase not initialized. Call initialize() first.");try{const s=re(this.database,e),i=Us(s,Ws("firebaseTimestamp"),$s(t)),r=await Kt(i);if(r.exists()){const o=r.val();return Object.keys(o).map(l=>({id:l,...o[l]})).sort((l,c)=>(c.firebaseTimestamp||0)-(l.firebaseTimestamp||0))}else return[]}catch(s){throw console.error(`FirebaseAdapter: Error fetching recent items from ${e}:`,s),s}}async saveMaintenanceRequest(e,t){if(!this.database)throw new Error("Firebase not initialized. Call initialize() first.");try{const s=re(this.database,e),i=Yt(s),r={...t,firebaseTimestamp:Qt()};return await rt(i,r),console.log("Maintenance request saved with ID:",i.key),i.key}catch(s){throw console.error(`Firebase saveMaintenanceRequest error at path ${e}:`,s),new Error("Failed to save maintenance request to Firebase.")}}async saveSupplyRequest(e,t){if(!this.database)throw new Error("Firebase not initialized. Call initialize() first.");try{const s=re(this.database,e),i=Yt(s),r={...t,firebaseTimestamp:Qt()};return await rt(i,r),console.log("Supply request saved with ID:",i.key),i.key}catch(s){throw console.error(`Firebase saveSupplyRequest error at path ${e}:`,s),new Error("Failed to save supply request to Firebase.")}}}class Rh{constructor(e){if(!(e instanceof Lt))throw console.error("Provided databaseAdapter:",e),new Error("databaseAdapter does not conform to the expected DatabaseInterface structure.");this.databaseAdapter=e,this.scheduleBasePath="schedule",this.maintenanceRequestPath="maintenanceRequests",this.supplyRequestPath="supplyRequests",console.log("DataManager Initialized. Paths configured.")}async saveScheduleData(e,t,s,i){const r=`${e}/currentSchedule/${t}/${s}`;try{await this.databaseAdapter.saveData(r,i)}catch(o){throw console.error(`DataManager saveScheduleData error for path ${r}:`,o),new Error(`Failed to save schedule data for ${e}.`)}}async loadScheduleData(e){const t=`${e}/currentSchedule`;try{return await this.databaseAdapter.loadData(t)}catch(s){throw console.error(`DataManager loadScheduleData error for path ${t}:`,s),new Error(`Failed to load schedule data for ${e}.`)}}async logChange(e,t,s,i,r){const o=`${e}/changeLog`;try{await this.databaseAdapter.logChange(o,t,s,i,r)}catch(a){throw console.error(`DataManager logChange error for path ${o}:`,a),new Error(`Failed to log change for ${e}.`)}}async loadChangeLog(e="fesBike"){const t=`${e}/changeLog`;try{return await this.databaseAdapter.loadChangeLog(t)}catch(s){throw console.error(`DataManager loadChangeLog error for path ${t}:`,s),new Error(`Failed to load change log for ${e}.`)}}async saveMaintenanceRequest(e){try{const t={clientTimestamp:Date.now(),...e,status:e.status||"Submitted"};if(typeof this.databaseAdapter.saveListItem!="function")return console.warn("Database adapter might be missing a 'saveListItem' method. Trying generic 'saveData'."),await this.databaseAdapter.saveMaintenanceRequest(this.maintenanceRequestPath,t)}catch(t){throw console.error("DataManager saveMaintenanceRequest error:",t),new Error("Failed to save maintenance request.")}}async getRecentMaintenanceRequests(e=10){try{if(typeof this.databaseAdapter.getRecentItems!="function"){if(typeof this.databaseAdapter.loadMaintenanceRequests=="function")return console.warn("Database adapter missing 'getRecentItems', using 'loadMaintenanceRequests'."),await this.databaseAdapter.loadMaintenanceRequests(this.maintenanceRequestPath,e);throw new Error("Database adapter is missing a method to fetch recent maintenance requests.")}return await this.databaseAdapter.getRecentItems(this.maintenanceRequestPath,e)}catch(t){throw console.error("DataManager getRecentMaintenanceRequests error:",t),new Error("Failed to load recent maintenance requests.")}}async saveSupplyRequest(e){try{const t={clientTimestamp:Date.now(),...e,status:e.status||"Submitted"};if(typeof this.databaseAdapter.saveSupplyRequest!="function")throw new Error("Database adapter is missing the 'saveSupplyRequest' method.");return await this.databaseAdapter.saveSupplyRequest(this.supplyRequestPath,t)}catch(t){throw console.error("DataManager saveSupplyRequest error:",t),new Error("Failed to save supply request.")}}async getRecentSupplyRequests(e=10){try{if(typeof this.databaseAdapter.getRecentItems!="function"){if(typeof this.databaseAdapter.loadSupplyRequests=="function")return console.warn("Database adapter missing 'getRecentItems', using 'loadSupplyRequests'."),await this.databaseAdapter.loadSupplyRequests(this.supplyRequestPath,e);throw new Error("Database adapter is missing a method to fetch recent supply requests.")}return await this.databaseAdapter.getRecentItems(this.supplyRequestPath,e)}catch(t){throw console.error("DataManager getRecentSupplyRequests error:",t),new Error("Failed to load recent supply requests.")}}}class Nh{constructor(e,t){this.dataManager=e,this.confirmationModal=t,this.tableBody=document.querySelector("#schedule-table tbody"),this.timeSlots=["8am","9am","10am","11am","12pm","1pm","2pm","3pm","4pm"],this.daysOfWeek=["Monday","Tuesday","Wednesday","Thursday","Friday"],this.scheduleData=null}async initialize(){if(!this.tableBody){console.log("Scheduling table <tbody> not found, skipping schedule initialization.");return}if(!this.confirmationModal){console.error("ConfirmationModal instance not provided to ScheduleTable. Cannot initialize.");return}console.log("Initializing schedule table..."),this.tableBody.innerHTML="";try{console.log("Loading schedule data..."),this.scheduleData=await this.dataManager.loadScheduleData(),console.log("Schedule data loaded:",this.scheduleData),this.scheduleData||(this.scheduleData={},console.log("No existing schedule data found, initialized as empty.")),this.populateTableFromData(),this.setupEventListeners(),console.log("Schedule table initialized and listeners set up.")}catch(e){console.error("Failed to initialize schedule table:",e),this.tableBody.innerHTML=`<tr><td colspan="${this.daysOfWeek.length+1}" style="color: red; text-align: center;">Error loading schedule data. Please try again later.</td></tr>`}}populateTableFromData(){this.timeSlots.forEach(e=>{const t=document.createElement("tr"),s=document.createElement("td");s.textContent=e,t.appendChild(s),this.daysOfWeek.forEach((i,r)=>{var l,c;const o=document.createElement("td");o.contentEditable="true",o.dataset.time=e,o.dataset.day=r;const a=((c=(l=this.scheduleData)==null?void 0:l[e])==null?void 0:c[r])||"";o.textContent=a,o.dataset.valueBeforeEdit=a,t.appendChild(o)}),this.tableBody.appendChild(t)}),console.log("Schedule table populated from loaded data.")}setupEventListeners(){this.tableBody.addEventListener("focusin",e=>{const t=e.target.closest('td[contenteditable="true"]');t&&(t.dataset.valueBeforeEdit=t.textContent.trim())}),this.tableBody.addEventListener("focusout",e=>{const t=e.target.closest('td[contenteditable="true"]');if(t){const s=t.dataset.valueBeforeEdit||"";t.textContent.trim()!==s&&this.confirmationModal.showModal(t,s)}},!0),this.tableBody.addEventListener("keydown",e=>{const t=e.target.closest('td[contenteditable="true"]');t&&e.key==="Enter"&&(e.preventDefault(),t.blur())})}destroy(){console.log("ScheduleTable listeners potentially active if element persists.")}}function Ah(n,e){const t=document.getElementById(e);if(!t){console.error(`Target element with ID "${e}" not found.`);return}if(!n){console.error(`Button element not provided for target "${e}".`);return}n.classList.toggle("active"),t.classList.toggle("show");const s=n.classList.contains("active");n.setAttribute("aria-expanded",s),t.setAttribute("aria-hidden",!s)}function B(n){return typeof n!="string"?n:n.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function Dh(n,e){let t;return function(...i){const r=()=>{clearTimeout(t),n.apply(this,i)};clearTimeout(t),t=setTimeout(r,e)}}class Mh{constructor(e,t={}){this.dataManager=e;const s={modalId:"changelogModal",closeBtnId:"closeChangelogBtn",listId:"changelogList",openBtnId:"openChangelogBtn"};this.options={...s,...t},this.changelogModal=document.getElementById(this.options.modalId),this.closeChangelogBtn=document.getElementById(this.options.closeBtnId),this.changelogList=document.getElementById(this.options.listId),this.openChangelogBtn=document.getElementById(this.options.openBtnId),this.showModal=this.showModal.bind(this),this.hideModal=this.hideModal.bind(this),this.handleWindowClick=this.handleWindowClick.bind(this),this.loadChangeLog=this.loadChangeLog.bind(this)}initialize(){if(!this.changelogModal||!this.closeChangelogBtn||!this.changelogList){console.error(`Changelog modal elements (modal: ${this.options.modalId}, close: ${this.options.closeBtnId}, list: ${this.options.listId}) not found in the DOM.`);return}this.openChangelogBtn?this.openChangelogBtn.addEventListener("click",this.showModal):console.warn(`Changelog open button (id: ${this.options.openBtnId}) not found. Modal must be opened programmatically.`),this.closeChangelogBtn.addEventListener("click",this.hideModal),window.addEventListener("click",this.handleWindowClick),console.log("ChangeLogModal initialized.")}showModal(){this.changelogModal&&(this.changelogModal.classList.add("is-visible"),this.loadChangeLog())}hideModal(){this.changelogModal&&this.changelogModal.classList.remove("is-visible")}handleWindowClick(e){e.target===this.changelogModal&&this.hideModal()}async loadChangeLog(){if(this.changelogList){this.changelogList.innerHTML="<p>Loading changes...</p>";try{const e=await this.dataManager.loadChangeLog();if(e&&Object.keys(e).length>0){const t=Object.values(e).sort((i,r)=>(r.timestamp||0)-(i.timestamp||0));this.changelogList.innerHTML="";const s=["Mon","Tue","Wed","Thu","Fri"];t.forEach(i=>{const r=document.createElement("div");r.classList.add("changelog-item");const o=i.timestamp?new Date(i.timestamp).toLocaleString(void 0,{dateStyle:"short",timeStyle:"short"}):"Unknown Time",a=typeof i.dayIndex=="number"&&i.dayIndex>=0&&i.dayIndex<s.length?s[i.dayIndex]:"",l=B(i.oldValue||""),c=B(i.newValue||""),u=B(i.time||""),h=a&&u?`${a} ${u}: `:"";r.innerHTML=`
                        <strong class="changelog-timestamp">${o}</strong><br>
                        <span class="changelog-details">${h}"${l}" &rarr; "${c}"</span>
                    `,this.changelogList.appendChild(r)})}else this.changelogList.innerHTML="<p>No changes recorded yet.</p>"}catch(e){console.error("Error loading changelog:",e),this.changelogList.innerHTML="<p>Error loading changes. Please try again later.</p>"}}}destroy(){var e,t;(e=this.openChangelogBtn)==null||e.removeEventListener("click",this.showModal),(t=this.closeChangelogBtn)==null||t.removeEventListener("click",this.hideModal),window.removeEventListener("click",this.handleWindowClick),console.log("ChangeLogModal listeners removed.")}}class kh{constructor(e){this.dataManager=e,this.confirmModal=document.getElementById("confirmModal"),this.confirmBtn=document.getElementById("confirmBtn"),this.cancelBtn=document.getElementById("cancelBtn"),this.deleteBtn=document.createElement("button"),this.targetCell=null,this.valueBeforeEdit="",this.handleConfirm=this.handleConfirm.bind(this),this.handleCancel=this.handleCancel.bind(this),this.handleDelete=this.handleDelete.bind(this),this.handleWindowClick=this.handleWindowClick.bind(this)}initialize(){if(!this.confirmModal||!this.confirmBtn||!this.cancelBtn){console.error("Confirmation modal essential elements not found in the DOM.");return}this.deleteBtn.id="deleteBtn",this.deleteBtn.textContent="Delete",this.deleteBtn.classList.add("delete-button");const e=this.confirmModal.querySelector(".modal-buttons");e?e.appendChild(this.deleteBtn):console.error(".modal-buttons container not found for delete button."),this.confirmBtn.addEventListener("click",this.handleConfirm),this.cancelBtn.addEventListener("click",this.handleCancel),this.deleteBtn.addEventListener("click",this.handleDelete),window.addEventListener("click",this.handleWindowClick),console.log("ConfirmationModal initialized and listeners set up.")}showModal(e,t){this.targetCell=e,this.valueBeforeEdit=t,this.targetCell&&(this.targetCell.contentEditable="false"),this.confirmModal.classList.add("is-visible")}hideModal(){this.confirmModal.classList.remove("is-visible"),this.targetCell=null,this.valueBeforeEdit=""}async handleConfirm(){if(!this.targetCell){console.error("Target cell is missing in handleConfirm."),this.hideModal();return}const e=this.targetCell,t=e.dataset.time,s=e.dataset.day,i=this.valueBeforeEdit,r=e.textContent.trim();try{r!==i&&(await this.dataManager.saveScheduleData(t,s,r),await this.dataManager.logChange(t,s,i,r)),e.dataset.valueBeforeEdit=r}catch(o){console.error(`Error saving schedule data for [${t}, Day ${s}]:`,o)}finally{this.hideModal(),e.contentEditable="true"}}handleCancel(){if(!this.targetCell){console.warn("Target cell is missing in handleCancel."),this.hideModal();return}const e=this.targetCell;e.textContent=this.valueBeforeEdit,e.dataset.valueBeforeEdit=this.valueBeforeEdit,this.hideModal(),e.contentEditable="true"}async handleDelete(){if(!this.targetCell){console.error("Target cell is missing in handleDelete."),this.hideModal();return}const e=this.targetCell,t=e.dataset.time,s=e.dataset.day,i=this.valueBeforeEdit,r="";try{await this.dataManager.saveScheduleData(t,s,r),await this.dataManager.logChange(t,s,i,r),e.textContent="",e.dataset.valueBeforeEdit=""}catch(o){console.error(`Error deleting schedule data for [${t}, Day ${s}]:`,o)}finally{this.hideModal(),e.contentEditable="true"}}handleWindowClick(e){e.target===this.confirmModal&&this.handleCancel()}destroy(){var e,t,s,i;(e=this.confirmBtn)==null||e.removeEventListener("click",this.handleConfirm),(t=this.cancelBtn)==null||t.removeEventListener("click",this.handleCancel),(s=this.deleteBtn)==null||s.removeEventListener("click",this.handleDelete),window.removeEventListener("click",this.handleWindowClick),(i=this.deleteBtn)==null||i.remove(),console.log("ConfirmationModal listeners removed.")}}class xh{constructor(){this.collapseButtons=document.querySelectorAll(".collapse-button[data-target]")}initialize(){if(!this.collapseButtons.length){console.warn("No collapsible buttons with data-target found.");return}this.collapseButtons.forEach(e=>{const t=e.dataset.target;t?e.addEventListener("click",()=>{Ah(e,t)}):console.warn(`Button with ID "${e.id||"N/A"}" has an empty data-target attribute.`)})}}class Sr{constructor(e,t){if(!e||!t||!t.listElementId||!t.loadDataFunction||!t.renderItemFunction)throw new Error("RecentItemsList requires dataManager and options (listElementId, loadDataFunction, renderItemFunction)");this.dataManager=e,this.options={itemLimit:15,loadingMessage:"<p>Loading recent items...</p>",noItemsMessage:"<p>No recent items found.</p>",errorMessage:"<p>Could not load items. Please try again later.</p>",...t},this.listElement=document.getElementById(this.options.listElementId),this.displayItems=this.displayItems.bind(this)}initialize(){return this.listElement?(console.log(`RecentItemsList initialized for element #${this.options.listElementId}`),this.displayItems(),!0):(console.error(`RecentItemsList: Element with ID "${this.options.listElementId}" not found.`),!1)}async displayItems(){if(this.listElement){this.listElement.innerHTML=this.options.loadingMessage;try{const e=await this.options.loadDataFunction(this.options.itemLimit);if(e&&typeof e=="object"&&Object.keys(e).length>0){const t=Object.values(e).sort((s,i)=>(i.firebaseTimestamp||i.clientTimestamp||0)-(s.firebaseTimestamp||s.clientTimestamp||0));this.listElement.innerHTML="",t.forEach(s=>{const i=this.options.renderItemFunction(s);if(i instanceof HTMLElement)this.listElement.appendChild(i);else if(typeof i=="string"){const r=document.createElement("div");for(r.innerHTML=i;r.firstChild;)this.listElement.appendChild(r.firstChild)}})}else this.listElement.innerHTML=this.options.noItemsMessage}catch(e){console.error(`Error loading items for list #${this.options.listElementId}:`,e),this.listElement.innerHTML=this.options.errorMessage}}}refresh(){this.displayItems()}destroy(){this.listElement&&(this.listElement.innerHTML=""),console.log(`RecentItemsList for #${this.options.listElementId} destroyed.`)}}function Ph(n){const e=document.createElement("div");e.className="recent-item maintenance-request-item";const t=n.firebaseTimestamp||n.clientTimestamp,s=t?new Date(t).toLocaleString(void 0,{dateStyle:"short",timeStyle:"short"}):"No date",i=B(n.equipmentName||"N/A"),r=B(n.requestType||"N/A"),o=B(n.submitterName||"Unknown"),a=n.requestDetails||"",l=B(a.substring(0,100))+(a.length>100?"...":"");return e.innerHTML=`
        <strong>${i}</strong>
        <span class="item-details-preview" title="${B(a)}">${l}</span>
        <div class="item-meta">
            <span>Type: ${r}</span>
            <span>Submitted: ${s} by ${o}</span>
        </div>
    `,e}class Lh{constructor(e){if(!e)throw new Error("DataManager instance is required for MaintenanceRequestHandler.");this.dataManager=e,console.log("MaintenanceRequestHandler received DataManager."),this.form=document.getElementById("maintenanceRequestForm"),this.submitterNameInput=document.getElementById("submitterName"),this.requestTypeInput=document.getElementById("requestType"),this.equipmentNameInput=document.getElementById("equipmentName"),this.requestDetailsInput=document.getElementById("requestDetails"),this.formStatus=document.getElementById("formStatus"),this.submitButton=this.form?this.form.querySelector('button[type="submit"]'):null,this.elementsReady=!1,this.recentRequestsListComponent=null}initialize(){if(!this.form||!this.submitterNameInput||!this.requestTypeInput||!this.equipmentNameInput||!this.requestDetailsInput||!this.formStatus||!this.submitButton){console.error("Required DOM elements for Maintenance Request *form* not found during initialization."),this.formStatus&&this.showStatus("Page initialization failed. Required form elements missing.",!0),this.elementsReady=!1;return}this.elementsReady=!0,console.log("MaintenanceRequestHandler Form DOM elements found."),this.recentRequestsListComponent=new Sr(this.dataManager,{listElementId:"recentRequestsList",loadDataFunction:this.dataManager.getRecentMaintenanceRequests.bind(this.dataManager),renderItemFunction:Ph,loadingMessage:"<p>Loading recent maintenance requests...</p>",noItemsMessage:"<p>No recent maintenance requests found.</p>",errorMessage:"<p>Could not load maintenance requests. Please try again later.</p>"}),this.recentRequestsListComponent.initialize()||console.error("Failed to initialize the recent requests list component."),this.handleFormSubmit=this.handleFormSubmit.bind(this),this.showStatus=this.showStatus.bind(this),this.clearStatus=this.clearStatus.bind(this),this.form.addEventListener("submit",this.handleFormSubmit),console.log("MaintenanceRequestHandler initialized successfully.")}async handleFormSubmit(e){if(e.preventDefault(),!this.elementsReady)return;this.submitButton.disabled=!0,this.submitButton.textContent="Submitting...";const t=this.submitterNameInput.value.trim(),s=this.requestTypeInput.value.trim(),i=this.equipmentNameInput.value.trim(),r=this.requestDetailsInput.value.trim();if(!t||!s||!i||!r){this.showStatus("Please fill out all fields.",!0),this.submitButton.disabled=!1,this.submitButton.textContent="Submit Request";return}const o=38;if(i.length>o){this.showStatus(`Equipment Name must be ${o} characters or less.`,!0),this.submitButton.disabled=!1,this.submitButton.textContent="Submit Request",this.equipmentNameInput.focus();return}const a={submitterName:t,requestType:s,equipmentName:i,requestDetails:r,status:"Submitted"};this.showStatus("Submitting request...",!1);try{await this.dataManager.saveMaintenanceRequest(a),this.showStatus("Request submitted successfully!",!1),this.form.reset(),this.recentRequestsListComponent.refresh();try{const l=`https://docs.google.com/forms/d/e/1FAIpQLSdpFHLlkSwx0BckmGcwRcJ2tKDg1GyLmq3BHtyFfvVXdcEuMQ/formResponse?&submit=Submit?usp=pp_url&entry.1873077433=${encodeURIComponent(t)}&entry.2025085608=${encodeURIComponent(s)}&entry.1368078064=${encodeURIComponent(i)}&entry.1582753521=${encodeURIComponent(r)}`,c=await fetch(l,{method:"POST",body:new FormData,mode:"no-cors"});console.log("Data successfully submitted to Google Forms (no-cors).")}catch(l){console.error("Error submitting to Google Forms:",l)}setTimeout(()=>this.clearStatus(),5e3)}catch(l){console.error("Error submitting maintenance request:",l),this.showStatus(`Submission failed: ${l.message||"Please try again."}`,!0)}finally{this.submitButton.disabled=!1,this.submitButton.textContent="Submit Request"}}showStatus(e,t=!1){this.formStatus&&(this.formStatus.textContent=e,this.formStatus.classList.remove("success","error"),this.formStatus.classList.add(t?"error":"success"))}clearStatus(){this.formStatus&&(this.formStatus.textContent="",this.formStatus.classList.remove("success","error"))}destroy(){var e,t;(e=this.form)==null||e.removeEventListener("submit",this.handleFormSubmit),(t=this.recentRequestsListComponent)==null||t.destroy(),console.log("MaintenanceRequestHandler listeners removed and components destroyed.")}}function Oh(n){const e=document.createElement("div");e.className="recent-item supply-request-item";const t=n.firebaseTimestamp||n.clientTimestamp,s=t?new Date(t).toLocaleString(void 0,{dateStyle:"short",timeStyle:"short"}):"No date",i=B(n.submitterName||"Unknown");let r="N/A";if(Array.isArray(n.items)&&n.items.length>0){r=n.items.map(c=>`${B(c.name||"Unnamed Item")}`).join(", ");const l=100;r.length>l&&(r=r.substring(0,l-3)+"...")}const o=n.requestDetails||"",a=B(o.substring(0,100))+(o.length>100?"...":"");return e.innerHTML=`
        <strong>Requested Items: ${r}</strong>
        ${o?`<span class="item-details-preview" title="${B(o)}">${a}</span>`:""}
        <div class="item-meta">
            <span>Submitted: ${s} by ${i}</span>
            <span>Status: ${B(n.status||"Unknown")}</span>
        </div>
    `,e}class Fh{constructor(e){this.dataManager=e,this.supplyItemData=[],this.itemCounter=0,this.activeAutocompleteInput=null,this.activeSuggestionIndex=-1,this.elementsReady=!1,this.recentSupplyRequestsListComponent=null,this.form=document.getElementById("supplyRequestForm"),this.submitterNameInput=document.getElementById("submitterName"),this.supplyItemsContainer=document.getElementById("supplyItemsContainer"),this.addSupplyItemBtn=document.getElementById("addSupplyItemBtn"),this.requestDetailsInput=document.getElementById("requestDetails"),this.formStatus=document.getElementById("formStatus"),this.submitButton=this.form?this.form.querySelector('button[type="submit"]'):null,this.handleFormSubmit=this.handleFormSubmit.bind(this),this.addSupplyItemInput=this.addSupplyItemInput.bind(this),this.showStatus=this.showStatus.bind(this),this.clearStatus=this.clearStatus.bind(this),this.updateItemLabels=this.updateItemLabels.bind(this),this.handleItemInput=this.handleItemInput.bind(this),this.handleItemFocus=this.handleItemFocus.bind(this),this.handleItemKeydown=this.handleItemKeydown.bind(this),this.handleSuggestionClick=this.handleSuggestionClick.bind(this),this.boundHandleDocumentClick=this.handleDocumentClick.bind(this),this.debouncedHandleItemInput=Dh(this.handleItemInputLogic.bind(this),300)}async initialize(){var s;console.log("Initializing SupplyRequestHandler...");const e=document.getElementById("recentSupplyRequestsList");if(!this.form||!this.submitterNameInput||!this.supplyItemsContainer||!this.addSupplyItemBtn||!this.requestDetailsInput||!this.formStatus||!this.submitButton){if(console.error("Supply Request Error: One or more required form elements not found in the DOM."),this.elementsReady=!1,this.formStatus)this.showStatus("Error: Form could not be initialized correctly.",!0);else if(document.body){const i=document.createElement("p");i.textContent="Critical Error: Supply Request form elements missing.",i.style.color="red",i.style.fontWeight="bold",document.body.prepend(i)}return}this.elementsReady=!0,console.log("SupplyRequestHandler: Form DOM elements found."),console.log("SupplyRequestHandler: Initializing RecentItemsList...");const t=typeof((s=this.dataManager)==null?void 0:s.getRecentSupplyRequests)=="function";if(e&&this.dataManager&&t)try{this.recentSupplyRequestsListComponent=new Sr(this.dataManager,{listElementId:"recentSupplyRequestsList",loadDataFunction:this.dataManager.getRecentSupplyRequests.bind(this.dataManager),renderItemFunction:Oh,loadingMessage:"Loading recent supply requests...",errorMessage:"Could not load recent supply requests.",noItemsMessage:"No recent supply requests found."}),await this.recentSupplyRequestsListComponent.initialize(),console.log("SupplyRequestHandler: RecentItemsList initialized successfully.")}catch(i){console.error("SupplyRequestHandler: Error initializing RecentItemsList:",i),e&&(e.textContent="Error loading recent requests component.")}else console.warn("SupplyRequestHandler: Could not initialize RecentItemsList. Container, DataManager, or load method missing.",{hasContainer:!!e,hasDataManager:!!this.dataManager,hasLoadMethod:t}),e&&(e.textContent="Failed to load recent requests component (config error).");console.log("SupplyRequestHandler: Loading autocomplete data...");try{const i=await fetch("./data/supplyItems.json");if(!i.ok)throw i.status===404?new Error(`HTTP error! File not found at /will/data/supplyItems.json. Status: ${i.status}`):new Error(`HTTP error fetching supply items! Status: ${i.status}`);const r=i.headers.get("content-type");if(!r||!r.includes("application/json"))throw console.error("Received non-JSON response for supply items. Content-Type:",r),new TypeError("Received non-JSON response for supply items");if(this.supplyItemData=await i.json(),!Array.isArray(this.supplyItemData)||!this.supplyItemData.every(o=>typeof o=="string"))throw console.warn("Supply item data loaded but is not in the expected format (array of strings). Autocomplete might fail.",this.supplyItemData),this.supplyItemData=[],new Error("Invalid format for supply item data.");console.log(`SupplyRequestHandler: ${this.supplyItemData.length} supply items loaded for autocomplete.`)}catch(i){console.error("SupplyRequestHandler: Failed to load or process supply items from JSON:",i),this.showStatus(`Warning: Could not load supply item list. Autocomplete disabled. ${i.message}`,!0),this.supplyItemData=[]}this.supplyItemsContainer&&this.addSupplyItemInput(),this.elementsReady?(this.addSupplyItemBtn.addEventListener("click",this.addSupplyItemInput),this.form.addEventListener("submit",this.handleFormSubmit),this.supplyItemsContainer.addEventListener("click",i=>{if(i.target.matches(".autocomplete-suggestion"))this.handleSuggestionClick(i);else if(i.target.matches(".remove-item-btn")){const r=i.target.closest(".dynamic-item-group");r&&(r.remove(),this.updateItemLabels())}}),this.supplyItemsContainer.addEventListener("input",i=>{i.target.matches(".supply-name-input")&&this.handleItemInput(i)}),this.supplyItemsContainer.addEventListener("focusin",i=>{i.target.matches(".supply-name-input")&&this.handleItemFocus(i)}),this.supplyItemsContainer.addEventListener("keydown",i=>{i.target.matches(".supply-name-input")&&this.handleItemKeydown(i)}),document.addEventListener("click",this.boundHandleDocumentClick),console.log("SupplyRequestHandler: Event listeners added.")):console.warn("SupplyRequestHandler: Skipping event listener setup due to missing form elements."),console.log("SupplyRequestHandler: Initialization sequence complete.")}addSupplyItemInput(){if(!this.supplyItemsContainer)return;this.itemCounter++;const e=`supplyName_${this.itemCounter}`,t=`${e}_input`,s=`${e}_listbox`,i=document.createElement("div");if(i.className="form-group dynamic-item-group",i.innerHTML=`
            <label for="${t}">Supply Item:</label> <!-- Label updated by updateItemLabels -->
            <div class="input-with-remove-button">
                <input
                    type="text"
                    id="${t}"
                    name="supplyName[]"
                    class="supply-name-input"
                    required
                    placeholder="Type or select supply item"
                    autocomplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-controls="${s}"
                    aria-label="Supply Item Name"
                >
                <button type="button" class="button remove-item-btn" title="Remove This Item">&times;</button>
            </div>
            <div
                id="${s}"
                class="autocomplete-suggestions-container"
                role="listbox"
                aria-label="Supply item suggestions"
             ></div> <!-- Suggestions will be populated here -->
        `,this.supplyItemsContainer.appendChild(i),this.updateItemLabels(),this.itemCounter>1){const r=i.querySelector(`#${t}`);r==null||r.focus()}}updateItemLabels(){if(!this.supplyItemsContainer)return;const e=this.supplyItemsContainer.querySelectorAll(".dynamic-item-group");e.forEach((i,r)=>{const o=i.querySelector("label");o&&(o.textContent=`Supply Item #${r+1}:`)});const t=this.supplyItemsContainer.querySelectorAll(".remove-item-btn"),s=e.length<=1;t.forEach(i=>{i.disabled=s})}handleItemFocus(e){const t=e.target;this.activeAutocompleteInput&&this.activeAutocompleteInput!==t&&this.hideAutocompleteSuggestions(this.activeAutocompleteInput),this.activeAutocompleteInput=t,this.activeSuggestionIndex=-1,this.activeAutocompleteInput.value.trim().length>0?this.showAutocompleteSuggestions(this.activeAutocompleteInput):this.hideAutocompleteSuggestions(this.activeAutocompleteInput)}handleItemInput(e){this.activeAutocompleteInput=e.target,this.debouncedHandleItemInput(e.target)}handleItemInputLogic(e){e===this.activeAutocompleteInput&&this.showAutocompleteSuggestions(e)}showAutocompleteSuggestions(e){const t=e.value.trim().toLowerCase(),s=e.getAttribute("aria-controls"),i=s?document.getElementById(s):null;if(!i){console.error("Autocomplete Error: Could not find suggestions container (ID: "+s+") for input:",e.id);return}if(i.innerHTML="",this.activeSuggestionIndex=-1,e.removeAttribute("aria-activedescendant"),t.length<1||this.supplyItemData.length===0){this.hideAutocompleteSuggestions(e);return}const r=this.supplyItemData.filter(o=>o.toLowerCase().includes(t)).slice(0,10);if(r.length===0){this.hideAutocompleteSuggestions(e);return}r.forEach((o,a)=>{const l=document.createElement("div");l.textContent=o,l.className="autocomplete-suggestion",l.dataset.value=o,l.id=`${s}_option_${a}`,l.setAttribute("role","option"),l.setAttribute("aria-selected","false"),i.appendChild(l)}),i.style.display="block",e.setAttribute("aria-expanded","true")}hideAutocompleteSuggestions(e=null){const t=e||this.activeAutocompleteInput;if(!t&&this.supplyItemsContainer){this.supplyItemsContainer.querySelectorAll(".autocomplete-suggestions-container").forEach(s=>{s.style.display="none",s.innerHTML="";const i=s.id.replace("_listbox","_input"),r=document.getElementById(i);r&&(r.setAttribute("aria-expanded","false"),r.removeAttribute("aria-activedescendant"))});return}if(t){const s=t.getAttribute("aria-controls"),i=s?document.getElementById(s):null;i&&(i.style.display="none",i.innerHTML=""),t.setAttribute("aria-expanded","false"),t.removeAttribute("aria-activedescendant")}this.activeSuggestionIndex=-1}handleSuggestionClick(e){const t=e.target,s=t==null?void 0:t.dataset.value;s&&this.activeAutocompleteInput?(this.activeAutocompleteInput.value=s,this.hideAutocompleteSuggestions(this.activeAutocompleteInput),this.activeAutocompleteInput.focus()):console.warn("Suggestion click handled, but couldn't find value or active input.",{value:s,activeInput:this.activeAutocompleteInput})}handleItemKeydown(e){if(!this.activeAutocompleteInput)return;const t=this.activeAutocompleteInput.getAttribute("aria-controls"),s=t?document.getElementById(t):null,i=s&&s.style.display==="block",r=s?Array.from(s.querySelectorAll(".autocomplete-suggestion")):[];if(!i&&!["ArrowDown","ArrowUp","Escape","Enter","Tab"].includes(e.key)){this.activeSuggestionIndex=-1;return}if(r.length===0&&i&&!["Escape","Tab","Enter"].includes(e.key))return;let o=!1;switch(e.key){case"ArrowDown":r.length>0&&(o=!0,this.activeSuggestionIndex=this.activeSuggestionIndex<r.length-1?this.activeSuggestionIndex+1:0,this.updateSuggestionHighlight(r));break;case"ArrowUp":r.length>0&&(o=!0,this.activeSuggestionIndex>0?this.activeSuggestionIndex--:this.activeSuggestionIndex=r.length-1,this.updateSuggestionHighlight(r));break;case"Enter":if(this.activeSuggestionIndex>=0&&this.activeSuggestionIndex<r.length){o=!0;const a=r[this.activeSuggestionIndex];this.activeAutocompleteInput.value=a.dataset.value,this.hideAutocompleteSuggestions(this.activeAutocompleteInput)}else this.hideAutocompleteSuggestions(this.activeAutocompleteInput);break;case"Escape":o=!0,this.hideAutocompleteSuggestions(this.activeAutocompleteInput);break;case"Tab":this.hideAutocompleteSuggestions(this.activeAutocompleteInput);break;default:this.activeSuggestionIndex=-1;break}o&&e.preventDefault()}updateSuggestionHighlight(e){e.forEach((t,s)=>{t.classList.remove("active"),t.setAttribute("aria-selected","false"),s===this.activeSuggestionIndex&&(t.classList.add("active"),t.setAttribute("aria-selected","true"),this.activeAutocompleteInput.setAttribute("aria-activedescendant",t.id),t.scrollIntoView({block:"nearest",inline:"nearest"}))}),this.activeSuggestionIndex===-1&&this.activeAutocompleteInput.removeAttribute("aria-activedescendant")}handleDocumentClick(e){if(!this.activeAutocompleteInput)return;const t=this.activeAutocompleteInput.closest(".dynamic-item-group");t&&!t.contains(e.target)&&this.hideAutocompleteSuggestions(this.activeAutocompleteInput)}async handleFormSubmit(e){var h;if(e.preventDefault(),!this.elementsReady){console.error("Form submission blocked: Essential elements not ready."),this.showStatus("Cannot submit: Form initialization failed.",!0);return}this.hideAutocompleteSuggestions(),this.submitButton.disabled=!0,this.submitButton.textContent="Submitting...",this.clearStatus();const t=this.submitterNameInput.value.trim(),s=this.requestDetailsInput.value.trim(),i=this.supplyItemsContainer.querySelectorAll(".supply-name-input"),r=[];let o=!1,a=null;i.forEach(d=>{const p=d.value.trim();p?r.push({name:p}):(o=!0,a||(a=d))});let l=!1,c=null;if(t?r.length===0&&i.length>0?(this.showStatus("Please enter at least one supply item.",!0),l=!0,c=i[0]):r.length===0&&i.length===0?(this.showStatus("Please add and fill in at least one supply item.",!0),l=!0,this.addSupplyItemInput(),c=this.supplyItemsContainer.querySelector(".supply-name-input")):o&&(this.showStatus("Please fill in or remove the empty supply item field(s).",!0),l=!0,c=a):(this.showStatus("Please enter your name.",!0),l=!0,c=this.submitterNameInput),l){this.submitButton.disabled=!1,this.submitButton.textContent="Submit Request",c==null||c.focus();return}const u={submitterName:t,items:r,requestDetails:s,status:"Submitted",clientTimestamp:new Date().toISOString()};this.showStatus("Submitting request...",!1);try{await this.dataManager.saveSupplyRequest(u),this.showStatus("Supply request submitted successfully!",!1);try{const d=r.map(E=>E.name).join(", "),p=`https://docs.google.com/forms/d/e/1FAIpQLSfvS8kIubBTil6RBy1BLHfDlpT18FZ7S0LAb31WnNF7kMltDg/formResponse?&submit=Submit?usp=pp_url&entry.1179758086=${encodeURIComponent(t)}&entry.920261675=${encodeURIComponent(d)}&entry.1507415069=${encodeURIComponent(s)}`;console.log("Google Forms URL for Supply Request:",p);const m=await fetch(p,{method:"POST",body:new FormData,mode:"no-cors"});console.log("Supply Request Data successfully submitted to Google Forms (no-cors).")}catch(d){console.error("Error submitting Supply Request Data to Google Forms:",d)}this.form.reset(),this.supplyItemsContainer.innerHTML="",this.itemCounter=0,this.addSupplyItemInput(),(h=this.recentSupplyRequestsListComponent)==null||h.refresh(),setTimeout(()=>this.clearStatus(),5e3)}catch(d){console.error("Error submitting supply request via DataManager:",d),this.showStatus(`Submission failed: ${d.message||"An unknown error occurred. Please try again."}`,!0)}finally{this.submitButton.disabled=!1,this.submitButton.textContent="Submit Request"}}showStatus(e,t=!1){this.formStatus&&(this.formStatus.textContent=e,this.formStatus.className=`form-status-message ${t?"error":"success"}`,this.formStatus.setAttribute("aria-live",t?"assertive":"polite"))}clearStatus(){this.formStatus&&(this.formStatus.textContent="",this.formStatus.className="form-status-message",this.formStatus.removeAttribute("aria-live"))}destroy(){var e,t,s;console.log("Destroying SupplyRequestHandler and removing listeners..."),(e=this.form)==null||e.removeEventListener("submit",this.handleFormSubmit),(t=this.addSupplyItemBtn)==null||t.removeEventListener("click",this.addSupplyItemInput),document.removeEventListener("click",this.boundHandleDocumentClick),(s=this.recentSupplyRequestsListComponent)==null||s.destroy(),this.form=null,this.submitterNameInput=null,this.supplyItemsContainer=null,this.addSupplyItemBtn=null,this.requestDetailsInput=null,this.formStatus=null,this.submitButton=null,this.supplyItemData=[],this.activeAutocompleteInput=null,this.recentSupplyRequestsListComponent=null,this.dataManager=null,console.log("SupplyRequestHandler destroyed.")}}async function Bh(){console.log("Initializing application...");const n=new Th(Rr);try{await n.initialize(),console.log("Database Adapter initialized.");const e=new Rh(n);console.log("Data Manager initialized.");const t=window.location.pathname;if(console.log("Current page path:",t),document.getElementById("schedule-table")){console.log("Initializing Schedule components (e.g., FES Bike)...");const s=new kh(e),i=new Nh(e,s,"fesBike"),r=new Mh(e);await i.initialize(),r.initialize(),s.initialize(),console.log("Schedule components initialized.")}else document.getElementById("maintenanceRequestForm")?(console.log("Initializing Maintenance Request Handler..."),new Lh(e).initialize(),console.log("Maintenance Request Handler initialized.")):document.getElementById("supplyRequestForm")&&(console.log("Initializing Supply Request Handler..."),new Fh(e).initialize(),console.log("Supply Request Handler initialized."));document.querySelector(".collapse-button-container")?(console.log("Initializing Collapsible Sections..."),new xh().initialize(),console.log("Collapsible Sections initialized.")):console.log("No collapsible sections found on this page."),console.log("Application initialization complete.")}catch(e){console.error("Application Initialization Failed:",e);const t=document.querySelector("body");if(t){const s=document.createElement("p");s.textContent="Error initializing the application. Please check console or contact support.",s.style.color="red",s.style.fontWeight="bold",s.style.textAlign="center",s.style.padding="20px",t.prepend(s)}}}document.addEventListener("DOMContentLoaded",Bh);
