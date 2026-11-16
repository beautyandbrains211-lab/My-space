import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import {CONFIG} from './config.js';
const sb=createClient(CONFIG.url,CONFIG.key);
const TABLES=['tasks','goals','habits','habit_logs','transactions','fin_goals','state_entries','content_items'];
const NAV=[['home','🏠','Главная'],['plan','📅','Планирование'],['goals','🎯','Цели'],['money','💰','Финансы'],['habits','🔄','Привычки'],['state','🧠','Состояние'],['content','🎬','Контент']];
const BLOCKS={today:'Сегодня',goals:'Цели',money:'Финансы',habits:'Привычки',state:'Состояние',content:'Контент'};
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const today=()=>iso(new Date()),$=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let D={},P={name:'София',settings:{hide:[]}},user,tab={plan:'day'};
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2200)};
const theme=t=>{document.documentElement.dataset.theme=t;localStorage.theme=t};theme(localStorage.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));
const add=async(t,r)=>{const{data,error}=await sb.from(t).insert(r).select().single();if(error)return toast(error.message);D[t].push(data);render()};
const upd=async(t,id,r)=>{const{error}=await sb.from(t).update(r).eq('id',id);if(error)return toast(error.message);Object.assign(D[t].find(x=>x.id==id),r);render()};
const del=async(t,id)=>{const{error}=await sb.from(t).delete().eq('id',id);if(error)return toast(error.message);D[t]=D[t].filter(x=>x.id!=id);render()};
async function load(){const r=await Promise.all(TABLES.map(t=>sb.from(t).select('*').order('created_at')));TABLES.forEach((t,i)=>D[t]=r[i].data||[]);
 const{data}=await sb.from('profiles').select('*').maybeSingle();if(data)P={...P,...data,settings:{hide:[],...data.settings}};else await sb.from('profiles').insert({name:P.name,settings:P.settings})}
const saveP=async()=>{await sb.from('profiles').upsert({id:user.id,name:P.name,settings:P.settings});render()};
// ---- UI pieces
const empty=(t,s)=>`<div class="empty"><b>${t}</b><br>${s}</div>`;
const form=(t,fields,btn='Добавить',extra={})=>`<form data-add="${t}" data-extra='${JSON.stringify(extra)}'>${fields}<button class="b">${btn}</button></form>`;
const del_=(t,id)=>`<button class="x" data-del="${t}:${id}" aria-label="Удалить">×</button>`;
const prog=p=>`<div class="bar"><i style="width:${Math.min(100,p)}%"></i></div>`;
const taskRow=t=>`<div class="row"><button class="chk ${t.done?'on':''}" data-tog="tasks:${t.id}">${t.done?'✓':''}</button><div class="g"><span class="${t.done?'done':''}">${t.priority?'❗':''}${esc(t.title)}</span><div class="m">${[t.time,t.category,t.due&&'до '+t.due].filter(Boolean).map(esc).join(' · ')}</div></div>${del_('tasks',t.id)}</div>`;
const tasksFor=(d)=>D.tasks.filter(t=>t.day===d||(!t.done&&t.day&&t.day<d));
const habitDue=(h,d)=>!h.archived&&h.start_date<=d&&(h.days||[]).includes((new Date(d+'T12:00').getDay()||7));
const logged=(h,d)=>D.habit_logs.some(l=>l.habit_id===h.id&&l.day===d);
const habitRow=h=>`<div class="row"><button class="chk ${logged(h,today())?'on':''}" data-habit="${h.id}:${today()}">${logged(h,today())?'✓':''}</button><span class="g">${esc(h.title)}</span></div>`;
const goalRow=g=>{const p=g.target?Math.round(g.current/g.target*100):g.percent;return`<div class="row"><div class="g"><b>${esc(g.title)}</b> <span class="m">${esc(g.category||'')} ${g.deadline||''}</span>${prog(p||0)}</div><span class="m">${p||0}%</span>${del_('goals',g.id)}</div>`};
const money=()=>{const m=today().slice(0,7),s=k=>D.transactions.filter(x=>x.kind===k).reduce((a,x)=>a+ +x.amount,0),sm=k=>D.transactions.filter(x=>x.kind===k&&(x.day||'').startsWith(m)).reduce((a,x)=>a+ +x.amount,0);return{inc:sm('income'),exp:sm('expense'),bal:s('income')-s('expense')}};
const eur=n=>new Intl.NumberFormat('ru',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
const stateToday=()=>D.state_entries.find(e=>e.day===today())||{};
const scale=(k,em)=>`<div class="mood">${em.map((e,i)=>`<button class="${stateToday()[k]==i+1?'on':''}" data-st="${k}:${i+1}">${e}</button>`).join('')}</div>`;
const stateForm=()=>{const s=stateToday();return`<div class="m">Настроение</div>${scale('mood',['😞','😕','😐','🙂','😊'])}<div class="m">Энергия</div>${scale('energy',['🪫','🔅','⚡','🔋','🚀'])}<div class="m">Сон</div>${scale('sleep',['😵','😴','🛌','😌','🌙'])}<form data-state><input type="number" name="cycle_day" min="1" max="45" placeholder="День цикла" value="${s.cycle_day??''}" style="width:130px"><input name="note" maxlength="200" placeholder="Короткая рефлексия" value="${esc(s.note)}" style="flex:1"><button class="b">Сохранить</button></form>`};
const taskForm=(d)=>form('tasks',`<input name="title" placeholder="Новая задача" required style="flex:1"><input type="time" name="time"><input type="date" name="due" title="Дедлайн"><select name="priority"><option value="0">Обычная</option><option value="1">Важная</option></select><input name="category" placeholder="Категория" style="width:120px">`,'Добавить',{day:d});
// ---- views
const V={
home(){const h=P.settings.hide,n=new Date().getHours(),g=n<5?'Доброй ночи':n<12?'Доброе утро':n<18?'Добрый день':'Добрый вечер',m=money(),T=tasksFor(today()),H=D.habits.filter(x=>habitDue(x,today())),done=T.filter(t=>t.done).length;
 const B={today:`<h2>Сегодня</h2>${T.length?T.slice(0,6).map(taskRow).join('')+`<p class="m">${done} из ${T.length} выполнено</p>`:empty('Свободный день','Добавь задачу в «Планировании».')}`,
 goals:`<h2>Цели</h2>${D.goals.filter(x=>!x.archived).slice(0,3).map(goalRow).join('')||empty('Здесь пока пусто','Создай первую цель, чтобы начать.')}`,
 money:`<h2>Финансы</h2><p style="font-size:1.8rem;margin:0" class="serif">${eur(m.bal)}</p><p class="m">В этом месяце: +${eur(m.inc)} · −${eur(m.exp)}</p>`,
 habits:`<h2>Привычки</h2>${H.map(habitRow).join('')||empty('Здесь пока пусто','Добавь первую привычку.')}`,
 state:`<h2>Состояние</h2>${stateForm()}`,
 content:`<h2>Контент</h2>${D.content_items.filter(x=>x.status!=='Опубликовано').slice(0,4).map(contentRow).join('')||empty('Идей пока нет','Запиши первую идею в «Контенте».')}`};
 return`<h1>${g}, ${esc(P.name)}</h1><p class="m">${new Date().toLocaleDateString('ru',{weekday:'long',day:'numeric',month:'long'})} <a href="#settings" class="m">⚙️ Настроить</a></p><div class="grid">${Object.keys(B).filter(k=>!h.includes(k)).map(k=>`<section>${B[k]}</section>`).join('')}</div>`},
plan(){const t=tab.plan,tabs=`<div class="tabs">${[['day','Сегодня'],['week','Неделя'],['month','Месяц'],['year','Год']].map(([k,l])=>`<button class="b ${t===k?'':'s'}" data-tab="plan:${k}">${l}</button>`).join('')}</div>`;
 if(t==='day'){const T=tasksFor(today());return`<h1>Планирование</h1>${tabs}${taskForm(today())}${T.map(taskRow).join('')||empty('На сегодня пусто','Добавь первую задачу.')}`}
 const gs=D.goals.filter(g=>g.horizon===t&&!g.archived),up=t==='week'?D.tasks.filter(x=>x.day>today()&&x.day<=iso(new Date(Date.now()+7*864e5))):[];
 const parents={week:'month',month:'year'}[t],pOpts=parents?D.goals.filter(g=>g.horizon===parents&&!g.archived).map(g=>`<option value="${g.id}">${esc(g.title)}</option>`).join(''):'';
 return`<h1>Планирование</h1>${tabs}<h2>${{week:'Цели недели',month:'Цели месяца',year:'Цели года'}[t]}</h2>${form('goals',`<input name="title" placeholder="Цель" required style="flex:1">${parents?`<select name="parent_id"><option value="">Связать с целью…</option>${pOpts}</select>`:''}`,'Добавить',{horizon:t})}${gs.map(g=>goalRow(g)+(g.parent_id?`<div class="m">↳ ${esc(D.goals.find(x=>x.id===g.parent_id)?.title||'')}</div>`:'')).join('')||empty('Здесь пока пусто','Создай первую цель на этот срок.')}${t==='week'?`<h2 style="margin-top:1.5rem">Привычки недели</h2>${habitGrid()}<h2 style="margin-top:1.5rem">Ближайшие задачи</h2>${up.map(taskRow).join('')||'<div class="empty">Ничего не запланировано</div>'}`:''}`},
goals(){const cats=['Личное','Здоровье','Финансы','Карьера','Блог','Учёба'],hz={year:'Год',month:'Месяц',week:'Неделя',long:'Долгосрочная'},L=D.goals.filter(g=>!g.archived);
 return`<h1>Цели</h1>${form('goals',`<input name="title" placeholder="Новая цель" required style="flex:1"><select name="horizon">${Object.entries(hz).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><select name="category">${cats.map(c=>`<option>${c}</option>`).join('')}</select><input type="date" name="deadline"><input type="number" name="percent" min="0" max="100" placeholder="%" style="width:80px">`)}${L.map(g=>goalRow(g)+`<div class="m"><button class="x" data-arch="${g.id}">в архив</button> ${hz[g.horizon]}</div>`).join('')||empty('Здесь пока пусто','Создай первую цель, чтобы начать.')}`},
money(){const m=money(),cats=[...new Set(D.transactions.map(x=>x.category).filter(Boolean))];
 return`<h1>Финансы</h1><p style="font-size:2rem;margin:.5rem 0">${eur(m.bal)}</p><p class="m">Месяц: доход ${eur(m.inc)} · расходы ${eur(m.exp)}</p><datalist id="cats">${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</datalist>
 <form data-add="transactions"><select name="kind"><option value="expense">Расход</option><option value="income">Доход</option></select><input type="number" name="amount" step="0.01" required placeholder="Сумма"><input name="category" list="cats" placeholder="Категория"><input type="date" name="day" value="${today()}"><button class="b">Добавить</button></form>
 ${[...D.transactions].reverse().slice(0,25).map(x=>`<div class="row"><span class="g">${esc(x.category||'—')} <span class="m">${x.day}</span></span><b style="color:var(--${x.kind==='income'?'ok':'err'})">${x.kind==='income'?'+':'−'}${eur(x.amount)}</b>${del_('transactions',x.id)}</div>`).join('')||empty('Здесь пока пусто','Добавь первую операцию.')}
 <h2 style="margin-top:2rem">Накопления</h2>${form('fin_goals',`<input name="title" placeholder="На что" required><input type="number" name="target" placeholder="Цель, €" required>`)}${D.fin_goals.map(f=>`<div class="row"><div class="g"><b>${esc(f.title)}</b> <span class="m">${eur(f.saved)} из ${eur(f.target)}</span>${prog(f.saved/f.target*100)}</div><button class="b s" data-save="${f.id}">+ внести</button>${del_('fin_goals',f.id)}</div>`).join('')}`},
habits(){const days=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];return`<h1>Привычки</h1><form data-add="habits"><input name="title" placeholder="Новая привычка" required style="flex:1"><button class="b">Добавить</button></form>${habitGrid()||empty('Здесь пока пусто','Добавь первую привычку.')}<p class="m">Нажми на кружок, чтобы отметить день.</p>`},
state(){const hist=[...D.state_entries].reverse();return`<h1>Моё состояние</h1><div style="margin-top:1rem">${stateForm()}</div><h2 style="margin-top:2rem">История</h2>${hist.map(e=>`<div class="row"><span class="m" style="width:90px">${e.day}</span><span class="g">${['😞','😕','😐','🙂','😊'][e.mood-1]||'·'} ${e.energy?'⚡'+e.energy:''} ${e.sleep?'😴'+e.sleep:''} ${e.cycle_day?'🌸'+e.cycle_day:''}<div class="m">${esc(e.note)}</div></span></div>`).join('')||empty('История пуста','Отметь сегодняшний день выше.')}`},
content(){const P_=['YouTube','TikTok','Instagram Reels','Фото','Stories'];return`<h1>Контент</h1>${form('content_items',`<input name="title" placeholder="Идея или пост" required style="flex:1"><select name="platform"><option value="">Площадка</option>${P_.map(p=>`<option>${p}</option>`).join('')}</select><input type="date" name="day"><select name="status"><option value="">Статус</option>${['Идея','В работе','Запланировано','Опубликовано'].map(p=>`<option>${p}</option>`).join('')}</select>`)}${[...D.content_items].sort((a,b)=>(a.day||'9')>(b.day||'9')?1:-1).map(contentRow).join('')||empty('Идей пока нет','Запиши первую идею.')}`},
settings(){return`<h1>Настройки</h1><form data-name><input name="name" value="${esc(P.name)}" placeholder="Имя"><button class="b">Сохранить имя</button></form><h2>Тема</h2><button class="b s" data-theme="light">Светлая</button> <button class="b s" data-theme="dark">Тёмная</button><h2 style="margin-top:1.5rem">Блоки на главной</h2>${Object.entries(BLOCKS).map(([k,v])=>`<label style="display:block"><input type="checkbox" data-blk="${k}" ${P.settings.hide.includes(k)?'':'checked'}> ${v}</label>`).join('')}<h2 style="margin-top:1.5rem">Резервная копия</h2><button class="b" data-export>Скачать JSON</button> <label class="b s" style="display:inline-block;padding:.6rem">Загрузить копию<input type="file" accept=".json" data-import hidden></label><h2 style="margin-top:1.5rem">Аккаунт</h2><button class="b s" data-out>Выйти</button>`}};
const contentRow=c=>`<div class="row"><div class="g">${esc(c.title)}<div class="m">${[c.platform,c.day,c.status].filter(Boolean).map(esc).join(' · ')}</div></div>${del_('content_items',c.id)}</div>`;
function habitGrid(){const mon=new Date();mon.setDate(mon.getDate()-((mon.getDay()+6)%7));const ds=[...Array(7)].map((_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return iso(d)});
 return D.habits.filter(h=>!h.archived).map(h=>`<div class="row wk"><span>${esc(h.title)}</span>${ds.map(d=>habitDue(h,d)?`<button class="chk ${logged(h,d)?'on':''}" data-habit="${h.id}:${d}">${logged(h,d)?'✓':''}</button>`:'<span></span>').join('')}</div>`).join('')}
// ---- render & events
function render(){const r=location.hash.slice(1)||'home';$('#top').innerHTML=`<nav>${NAV.map(([k,i,l])=>`<a href="#${k}" class="${r===k?'on':''}">${i} ${l}</a>`).join('')}</nav><a class="ico" href="#settings">⚙️</a>`;$('#app').innerHTML=(V[r]||V.home)()}
function login(msg=''){$('#top').innerHTML='';$('#app').innerHTML=`<div class="login"><h1>Моё пространство</h1><p class="m">${msg}</p><form data-login style="flex-direction:column"><input name="email" type="email" placeholder="Email" required><input name="password" type="password" minlength="6" placeholder="Пароль" required><button class="b">Войти</button><button class="b s" type="button" data-signup>Создать аккаунт</button></form></div>`}
document.addEventListener('submit',async e=>{e.preventDefault();const f=e.target,fd=Object.fromEntries(new FormData(f));
 if(f.dataset.login!==undefined){const{error}=await sb.auth.signInWithPassword(fd);if(error)login(error.message);return}
 if(f.dataset.name!==undefined){P.name=fd.name||P.name;return saveP()}
 if(f.dataset.state!==undefined){return saveState({cycle_day:fd.cycle_day||null,note:fd.note})}
 const r={...JSON.parse(f.dataset.extra||'{}')};for(const[k,v]of Object.entries(fd)){if(v==='')continue;r[k]=f[k].type==='number'?Number(v):v}
 if(r.priority!==undefined)r.priority=+r.priority;if(f.dataset.add==='fin_goals'||f.dataset.add==='goals'&&r.percent===undefined){}
 await add(f.dataset.add,r)});
async function saveState(p){const s=stateToday(),row={...s,...p,day:today()};delete row.id;delete row.created_at;delete row.user_id;
 const{data,error}=await sb.from('state_entries').upsert(row,{onConflict:'user_id,day'}).select().single();if(error)return toast(error.message);D.state_entries=D.state_entries.filter(e=>e.day!==today());D.state_entries.push(data);toast('Сохранено');render()}
document.addEventListener('click',async e=>{const b=e.target.closest('button,a,input[data-blk]');if(!b)return;const d=b.dataset;
 if(d.signup!==undefined){const f=b.form,{error}=await sb.auth.signUp({email:f.email.value,password:f.password.value});return error?toast(error.message):toast('Проверь почту, если нужно подтверждение')}
 if(d.del){const[t,id]=d.del.split(':');if(confirm('Удалить?'))del(t,id)}
 else if(d.tog){const[t,id]=d.tog.split(':'),x=D[t].find(y=>y.id===id);upd(t,id,{done:!x.done})}
 else if(d.habit){const[id,day]=d.habit.split(':'),l=D.habit_logs.find(x=>x.habit_id===id&&x.day===day);if(l)del('habit_logs',l.id);else add('habit_logs',{habit_id:id,day})}
 else if(d.tab){const[k,v]=d.tab.split(':');tab[k]=v;render()}
 else if(d.arch)upd('goals',d.arch,{archived:true})
 else if(d.save){const f=D.fin_goals.find(x=>x.id===d.save),v=parseFloat(prompt('Сколько внести, €?'));if(v)upd('fin_goals',f.id,{saved:+f.saved+v})}
 else if(d.st){const[k,v]=d.st.split(':');saveState({[k]:+v})}
 else if(d.theme)theme(d.theme)
 else if(d.blk!==undefined){const h=P.settings.hide;P.settings.hide=b.checked?h.filter(x=>x!==d.blk):[...h,d.blk];saveP()}
 else if(d.export!==undefined){const blob=new Blob([JSON.stringify({exported_at:new Date().toISOString(),profile:P,...D},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`backup-${today()}.json`;a.click()}
 else if(d.out!==undefined)sb.auth.signOut()});
document.addEventListener('change',async e=>{if(e.target.dataset.import===undefined)return;const j=JSON.parse(await e.target.files[0].text());
 if(!confirm('Добавить данные из копии к текущим? Существующие данные не удаляются.'))return;
 for(const t of TABLES)if(j[t]?.length){const rows=j[t].map(({user_id,created_at,...r})=>r);const{error}=await sb.from(t).upsert(rows);if(error)return toast(t+': '+error.message)}
 await load();render();toast('Импортировано')});
addEventListener('hashchange',()=>{render();scrollTo(0,0)});
sb.auth.onAuthStateChange(async(ev,s)=>{if(ev==='INITIAL_SESSION'||ev==='SIGNED_IN'){if(!s)return login();if(user?.id===s.user.id)return;user=s.user;await load();render()}else if(ev==='SIGNED_OUT'){user=null;login()}});
