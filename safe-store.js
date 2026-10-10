(function(root){
'use strict';
const KEY='my-chaldea-public-v1';
const clone=x=>JSON.parse(JSON.stringify(x));
function parseStrict(text){
 // Validate duplicate object keys before JSON.parse discards them.
 let i=0; const ws=()=>{while(/\s/.test(text[i]||'')&&i<text.length)i++;};
 function str(){const start=i++;while(i<text.length){if(text[i]==='\\'){i+=2;continue;}if(text[i++]==='"')return JSON.parse(text.slice(start,i));}throw Error('文字列が不正です');}
 function val(){ws();if(text[i]==='{'){i++;const keys=new Set();ws();if(text[i]==='}'){i++;return;}while(true){ws();if(text[i]!=='"')throw Error('JSON形式不正');const k=str();if(keys.has(k)||['__proto__','constructor','prototype'].includes(k))throw Error('重複/禁止キー: '+k);keys.add(k);ws();if(text[i++]!==':')throw Error('JSON形式不正');val();ws();const c=text[i++];if(c==='}')return;if(c!==',')throw Error('JSON形式不正');}}else if(text[i]==='['){i++;ws();if(text[i]===']'){i++;return;}while(true){val();ws();const c=text[i++];if(c===']')return;if(c!==',')throw Error('JSON形式不正');}}else if(text[i]==='"'){str();}else{const m=/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(i));if(!m)throw Error('JSON形式不正');i+=m[0].length;}}
 val();ws();if(i!==text.length)throw Error('JSON末尾が不正');return JSON.parse(text);
}
function create({storage,locks,digest,catalog,now=()=>new Date().toISOString()}){
 const dict=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const num=(x,min,max=Infinity)=>x===''||(Number.isSafeInteger(x)&&x>=min&&x<=max);
 function validate(s){
  if(!dict(s)||s.version!==1||!dict(s.roster))throw Error('バックアップ形式が不正です');
  for(const k of ['mysticCodes','craftEssences','inventory'])if(!dict(s[k]))throw Error(k+'が不正です');
  if(!dict(s.olgaMarie)||!dict(s.olgaMarie.records))throw Error('編成データが不正です');
  const normalized=new Set();for(const [id,r] of Object.entries(s.roster)){
   if(!/^\d+$/.test(id)||String(Number(id))!==id||!catalog[id]||normalized.has(Number(id)))throw Error('不正/重複ID '+id);normalized.add(Number(id));
   if(!dict(r)||r.owned!==true||!num(r.level,1,120)||!num(r.np,1,5)||!num(r.coins,0)||!num(r.hpEnhancement,0,2000)||!num(r.atkEnhancement,0,2000)||typeof r.notes!=='string')throw Error('属性が不正: '+id);
   if(!Array.isArray(r.skills)||r.skills.length!==3||!r.skills.every(x=>num(x,1,10))||!Array.isArray(r.appends)||r.appends.length!==5||!r.appends.every(x=>num(x,1,10)))throw Error('スキルが不正: '+id);
  }
  return s;
 }
 const summary=s=>{const ids=Object.keys(s.roster).sort();const classes={};for(const id of ids){const k=catalog[id].className;classes[k]=(classes[k]||0)+1;}return {count:ids.length,ids,classes};};
 function load(){const raw=storage.getItem(KEY);if(raw===null)return null;const e=parseStrict(raw);if(!dict(e)||e.schema!==1||!Number.isSafeInteger(e.revision)||e.revision<1||!Array.isArray(e.history)||e.history.length>5)throw Error('保存データが破損。書き込み停止');validate(e.data);return e;}
 function diff(a,b){const before=summary(a),after=summary(b);const missing=before.ids.filter(i=>!b.roster[i]);const classLoss={};for(const id of missing){const k=catalog[id].className;classLoss[k]=(classLoss[k]||0)+1;}return {before,after,missing,classLoss,added:after.ids.filter(i=>!a.roster[i])};}
 async function commit(proposal,base,{kind='save',allowDelete=null}={}){
  const proposed=clone(proposal);validate(proposed);
  if(!locks||typeof locks.request!=='function')throw Error('この環境は安全な排他保存に未対応です。保存を停止しました');
  return locks.request(KEY,{mode:'exclusive'},async()=>{
   const old=load();if((old?.revision||0)!==base)throw Error('別タブで更新済みです。保存せず再読込してください');
   const delta=old?diff(old.data,proposed):null;
   if(delta?.missing.length && !(kind==='delete'&&delta.missing.length===1&&delta.missing[0]===allowDelete))throw Error('ID消失を検知し保存拒否: '+delta.missing.length+'騎 '+JSON.stringify(delta.classLoss));
   const stamp=now();proposed.updatedAt=stamp;
   const snapshot=old?{revision:old.revision,savedAt:stamp,...summary(old.data),sha256:await digest(JSON.stringify(old.data)),data:clone(old.data)}:null;
   const history=old?[...(old.history||[]),snapshot].slice(-5):[];
   const countChanged=delta && (delta.added.length+delta.missing.length>=5);
   const envelope={schema:1,revision:base+1,data:proposed,history,beforeImport:kind==='import'?snapshot:(old?.beforeImport||null),beforeLargeChange:countChanged?snapshot:(old?.beforeLargeChange||null)};
   // A single localStorage write atomically stores state and pre-write generations.
   storage.setItem(KEY,JSON.stringify(envelope));return clone(envelope);
  });
 }
 function parseImport(text){const p=parseStrict(text);const s=clone(p.data||p);for(const k of ['mysticCodes','craftEssences','inventory'])if(s[k]===undefined)s[k]={};if(s.olgaMarie===undefined)s.olgaMarie={records:{},selectedQuest:'1',selectedMode:'通常'};validate(s);return s;}
 function exportPayload(){const e=load();if(!e)throw Error('保存済みデータがありません');return {app:'My Chaldea',exportedAt:now(),data:clone(e.data)};}
 return {key:KEY,load,commit,parseImport,exportPayload,validate,summary,diff};
}
const api={KEY,create,parseStrict};if(typeof module!=='undefined')module.exports=api;else root.FgoSafeStore=api;
})(typeof window==='undefined'?globalThis:window);
