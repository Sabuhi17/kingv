const $=i=>document.getElementById(i);
let fin=false,uid,room,decs=[],busy=false,ch,poll,tk,sel=null,built=false;
const show=id=>['lobby','wait','game','end'].forEach(x=>$(x).hidden=x!==id);
const N=()=>room.p1===uid?1:2;
const err=m=>{$('err').textContent=m||''};
async function rpc(n,a){const{data,error}=await sb.rpc(n,a);if(error){err(error.message);throw error}err();return data}
async function boot(){
 if(SUPABASE_URL.includes('YOUR-PROJECT'))return err('supabase.js faylında SUPABASE_URL və anon açarı yazılmayıb.');
 try{const{data:{session}}=await sb.auth.getSession();
 if(session)uid=session.user.id;else{const{data,error}=await sb.auth.signInAnonymously();if(error)throw error;uid=data.user.id}}
 catch(e){return err('Giriş xətası: '+e.message+' (Supabase → Authentication → Providers → Anonymous sign-ins aktiv olmalıdır)')}
 const c=sessionStorage.getItem('code');c?enter(c):show('lobby')}
function enter(code){sessionStorage.setItem('code',code);if(ch)sb.removeChannel(ch);
 ch=sb.channel('r'+code)
 .on('postgres_changes',{event:'*',schema:'public',table:'rooms',filter:'code=eq.'+code},refresh)
 .on('postgres_changes',{event:'*',schema:'public',table:'decisions',filter:'room_code=eq.'+code},refresh).subscribe();
 clearInterval(poll);poll=setInterval(refresh,4000);refresh()}
async function refresh(){const code=sessionStorage.getItem('code');if(!code)return;
 const{data:r}=await sb.from('rooms').select('*').eq('code',code).maybeSingle();
 if(!r){sessionStorage.removeItem('code');return show('lobby')}
 room=r;const{data:d}=await sb.from('decisions').select('*').eq('room_code',code);decs=d||[];render()}
function render(){clearInterval(tk);
 if(room.status==='lobby')return lobby();
 if(room.status==='finished')return end();
 game()}
$('create').onclick=async()=>enter(await rpc('create_room'));
$('join').onclick=async()=>enter(await rpc('join_room',{p_code:$('joinCode').value.trim()}));
function lobby(){show('wait');$('timer').hidden=true;$('code').textContent=room.code;const n=N(),mc=room['c'+n],rd=room['r'+n];
 $('players').textContent=`Oyunçu 1: ${room.p1?'qoşulub':'—'} ${room.r1?'✅':''} | Oyunçu 2: ${room.p2?'qoşulub':'gözlənilir…'} ${room.r2?'✅':''} | Sən: Oyunçu ${n}`;
 $('countries').innerHTML=Object.entries(COUNTRIES).map(([k,c])=>`<button class="cc ${mc===k?'sel':''}" data-k="${k}"><span>${c.f}</span>${c.n}</button>`).join('');
 document.querySelectorAll('.cc').forEach(b=>b.onclick=()=>rpc('set_ready',{p_code:room.code,p_country:b.dataset.k,p_ready:false}).then(refresh));
 $('ready').textContent=rd?'Hazırlığı ləğv et':'Hazıram';
 $('ready').onclick=()=>{if(!mc)return err('Əvvəlcə ölkə seç');rpc('set_ready',{p_code:room.code,p_country:mc,p_ready:!rd}).then(refresh)}}
function mine(){return decs.filter(d=>d.player===uid).sort((a,b)=>a.round-b.round)}
function game(){show('game');const n=N(),cc=room['c'+n],rd=room.round,sc=SC[rd-1];
 const done=mine().filter(d=>d.round<rd).map(d=>d.choice),s=sim(cc,done),sub=mine().some(d=>d.round===rd);
 $('stage').textContent=STAGES[sc.st];$('rnd').textContent=`Raund ${rd}/${TOTAL} · ${COUNTRIES[cc].f} ${COUNTRIES[cc].n}`;
 $('prog').firstChild.style.width=(rd-1)/TOTAL*100+'%';
 if(!built){$('dash').innerHTML=Object.entries(KEYS).map(([k,l])=>`<div class="kpi">${l}<b id="v${k}"></b><div class="bar"><i id="b${k}"></i></div></div>`).join('');built=true}
 for(const k in KEYS){$('v'+k).textContent=s[k];const w=k==='b'?Math.max(0,Math.min(100,s.b/1.5)):s[k];const i=$('b'+k);i.style.width=w+'%';i.style.background=(LOWGOOD.includes(k)?w>50:w<35)?'#e74c3c':'#2ecc71'}
 $('card').innerHTML=`<span class="tag">${sc.st===4?'⚠️ Böhran':'Ssenari'}</span><h2>${sc.t}</h2><p>${sc.x}</p>`+
 sc.o.map((o,i)=>`<button class="opt" data-i="${i}" ${sub?'disabled':''}><b>${o[0]}</b><br><span class="muted">${o[1]}</span></button>`).join('')+
 (sub?'<p>⏳ Qərarınız göndərildi. Rəqib gözlənilir…</p>':'');
 document.querySelectorAll('.opt').forEach(b=>b.onclick=async()=>{if(busy)return;busy=true;
  try{await rpc('submit_decision',{p_code:room.code,p_round:rd,p_choice:+b.dataset.i})}finally{busy=false}refresh()});
 $('timer').hidden=false;const t=()=>{const l=Math.max(0,new Date(room.ends_at)-Date.now()),m=Math.floor(l/60000),sec=Math.floor(l/1000)%60;
  $('timer').textContent=`${m}:${String(sec).padStart(2,'0')}`;$('timer').classList.toggle('low',l<120000);
  if(l<=0&&!fin){fin=true;rpc('finish_room',{p_code:room.code}).then(refresh).finally(()=>setTimeout(()=>fin=false,3000))}};t();tk=setInterval(t,1000)}
function end(){show('end');$('timer').hidden=true;const n=N(),A=mine(),B=decs.filter(d=>d.player!==uid).sort((a,b)=>a.round-b.round),k=Math.min(A.length,B.length);
 const S=[sim(room['c'+n],A.slice(0,k).map(d=>d.choice)),sim(room['c'+(3-n)],B.slice(0,k).map(d=>d.choice))],C=[room['c'+n],room['c'+(3-n)]],R=S.map(score);
 const nm=i=>COUNTRIES[C[i]].f+' '+COUNTRIES[C[i]].n+(i?'':' (sən)');
 const best=f=>R[0].m&&(f(0)>=f(1)?0:1);const sum=(i,ks)=>ks.reduce((a,x)=>a+R[i].m[x],0);
 const aw=[['Ən yaxşı sosial dövlət',best(i=>sum(i,['soc','hl','edu']))],['Ən yaxşı böhran meneceri',best(i=>R[i].m.cri)],['Ən yaxşı iqtisadi strategiya',best(i=>R[i].m.eco)],['Ən yaxşı sosial bərabərlik',best(i=>R[i].m.eq)],['Ən yaxşı ümumi prezident',best(i=>R[i].t)]];
 const L={soc:'Sosial müdafiə',edu:'Təhsil',hl:'Səhiyyə',emp:'Məşğulluq',eq:'Bərabərlik',coh:'Birlik',env:'Ekologiya',dig:'Rəqəmsal',eco:'İqtisadi dayanıqlılıq',cri:'Böhran idarəsi'};
 $('results').innerHTML=`<p class="muted">${k} raund tamamlandı.</p><table><tr><th></th><th>${nm(0)}</th><th>${nm(1)}</th></tr>`+
 Object.keys(L).map(x=>`<tr><td>${L[x]}</td><td>${R[0].m[x].toFixed(0)}</td><td>${R[1].m[x].toFixed(0)}</td></tr>`).join('')+
 `<tr class="win"><td>YEKUN (çəkili)</td><td>${R[0].t.toFixed(1)}</td><td>${R[1].t.toFixed(1)}</td></tr></table><h3>🏆 Mükafatlar</h3>`+aw.map(a=>`<p>${a[0]}: <b class="win">${nm(a[1])}</b></p>`).join('')}
$('restart').onclick=()=>{built=false;rpc('restart_room',{p_code:room.code}).then(refresh)};
boot();
