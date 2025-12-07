// ------------ Utilities ------------
function toast(msg, type='ok'){ console.log(`[${type}] ${msg}`); }
function fmt(iso){ try { return new Date(iso).toLocaleString(); } catch { return iso; } }
function registerServiceWorker(){
  if('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js');
}
function applyTheme(){
  const theme=localStorage.getItem('culturhub.theme')||'light';
  document.body.className=theme;
}
function toggleTheme(){
  const theme=document.body.className==='light'?'dark':'light';
  localStorage.setItem('culturhub.theme',theme);
  applyTheme();
}

// ------------ Data store ------------
const events = JSON.parse(localStorage.getItem('culturhub.events')||'[]');
function save(){ localStorage.setItem('culturhub.events', JSON.stringify(events)); }

// ------------ Monetization ------------
function isPremium(){ return localStorage.getItem('culturhub.premium')==='true'; }
function renderAds(){
  if(isPremium()) return;
  const slot = document.querySelector('#homeAdSlot');
  if(slot) slot.style.display='block';
}

// ------------ Leaderboard & Badges ------------
function updatePoints(userId, delta=10){
  const ptsMap = JSON.parse(localStorage.getItem('culturhub.pointsMap')||'{}');
  ptsMap[userId]=(ptsMap[userId]||0)+delta;
  localStorage.setItem('culturhub.pointsMap', JSON.stringify(ptsMap));

  const badgesMap = JSON.parse(localStorage.getItem('culturhub.badgesMap')||'{}');
  const pts = ptsMap[userId];
  const ensure = (name)=>{
    const list = badgesMap[userId]||[];
    if(!list.includes(name)) badgesMap[userId]=[...list, name];
  };
  if(pts>=50) ensure('Rising Star');
  if(pts>=100) ensure('Event Master');
  localStorage.setItem('culturhub.badgesMap', JSON.stringify(badgesMap));
}

function renderLeaderboard(){
  const wrap=document.querySelector('#leaderboard'); if(!wrap) return;
  const ptsMap=JSON.parse(localStorage.getItem('culturhub.pointsMap')||'{}');
  const badgesMap=JSON.parse(localStorage.getItem('culturhub.badgesMap')||'{}');
  const entries=Object.entries(ptsMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
  wrap.innerHTML='';
  entries.forEach(([user,pts],i)=>{
    const div=document.createElement('div');
    div.className='card';
    div.innerHTML=`<strong>#${i+1} ${user}</strong> – ${pts} pts<br>
      Badges: ${(badgesMap[user]||[]).join(', ')||'—'}`;
    wrap.appendChild(div);
  });
}

// ------------ Green Score & Eco Badge ------------
function calcGreenScore(ev){
  let score=0;
  if(ev.green?.publicTransport) score+=30;
  if(ev.green?.recycling) score+=30;
  if(ev.green?.lowWaste) score+=40;
  return score;
}
function renderEcoBadges(){
  const wrap=document.querySelector('#ecoBadges'); if(!wrap) return;
  const ecoEvents = events.filter(e=>calcGreenScore(e)>=70).length;
  wrap.innerHTML='';
  if(ecoEvents>=3){
    const badge=document.createElement('span');
    badge.className='btn'; badge.textContent='Eco Explorer';
    wrap.appendChild(badge);
  }
}

// ------------ Social: Chat & Polls & Share ------------
function loadChat(eventId){ return JSON.parse(localStorage.getItem(`culturhub.chat.${eventId}`)||'[]'); }
function saveChat(eventId,msgs){ localStorage.setItem(`culturhub.chat.${eventId}`, JSON.stringify(msgs)); }
function renderChat(eventId){
  const box=document.querySelector('#chatMessages'); if(!box) return;
  const msgs=loadChat(eventId); box.innerHTML='';
  msgs.forEach(m=>{
    const div=document.createElement('div');
    div.className='chat-msg';
    div.textContent=`${m.user||'Guest'}: ${m.text}`;
    box.appendChild(div);
  });
}
function initChat(eventId){
  const input=document.querySelector('#chatInput');
  const send=document.querySelector('#chatSend');
  if(!send) return;
  send.addEventListener('click',()=>{
    const text=(input.value||'').trim(); if(!text) return;
    const msgs=loadChat(eventId);
    msgs.push({user:'You',text,ts:Date.now()});
    saveChat(eventId,msgs); input.value=''; renderChat(eventId);
    updatePoints('You', 5);
  });
}

function getPoll(eventId){ const map=JSON.parse(localStorage.getItem('culturhub.polls')||'{}'); return map[eventId]; }
function savePoll(eventId,poll){
  const map=JSON.parse(localStorage.getItem('culturhub.polls')||'{}'); map[eventId]=poll;
  localStorage.setItem('culturhub.polls',JSON.stringify(map));
}
function votePoll(eventId,idx){
  const poll=getPoll(eventId); if(!poll) return;
  poll.votes[idx]=(poll.votes[idx]||0)+1; savePoll(eventId,poll);
}
function renderPoll(eventId){
  const wrap=document.querySelector('#pollWrap'); if(!wrap) return;
  const poll=getPoll(eventId); wrap.innerHTML='';
  if(!poll){ wrap.innerHTML='<p class="event-meta">No poll available.</p>'; return; }
  const total=poll.votes.reduce((a,b)=>a+b,0)||1;
  poll.options.forEach((opt,i)=>{
    const count=poll.votes[i]||0; const pct=Math.round(100*count/total);
    const row=document.createElement('div'); row.className='poll-option';
    row.innerHTML=`<span>${opt}</span>
      <div style="width:40%;background:var(--border);border-radius:8px;overflow:hidden">
        <div class="poll-bar" style="width:${pct}%"></div>
      </div>
      <button class="btn" data-vote="${i}">${pct}%</button>`;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll('[data-vote]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const idx=parseInt(btn.getAttribute('data-vote'),10);
      votePoll(eventId,idx); renderPoll(eventId); toast('Vote recorded','ok');
      updatePoints('You', 3);
    });
  });
}

function buildShareText(e){ return `${e.title} · ${fmt(e.date)} · ${e.location}`; }
function initShare(e){
  const text=buildShareText(e); const url=location.href;
  document.querySelector('#shareBtn')?.addEventListener('click',()=>{
    if(navigator.share){ navigator.share({title:e.title,text,url}).catch(()=>toast('Share canceled','warn')); }
    else toast('Native share not supported','warn');
  });
  document.querySelector('#waBtn')?.addEventListener('click',()=>window.open(`https://wa.me/?text=${encodeURIComponent(text)}%20${encodeURIComponent(url)}`,'_blank'));
  document.querySelector('#fbBtn')?.addEventListener('click',()=>window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,'_blank'));
  document.querySelector('#twBtn')?.addEventListener('click',()=>window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,'_blank'));
  document.querySelector('#lnBtn')?.addEventListener('click',()=>window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,'_blank'));
}

function getDeepLink(e){ return `deeplink://event?id=${encodeURIComponent(e.id)}`; }
function showDeepLink(e){ const wrap=document.querySelector('#deepLinkWrap'); if(wrap) wrap.textContent=`Deep link: ${getDeepLink(e)}`; }

// ------------ Notifications & Reminders ------------
async function notifyUser(title, body){
  if(!('Notification' in window)){ toast(`${title}: ${body}`, 'warn'); return; }
  if(Notification.permission==='granted'){ new Notification(title,{body}); }
  else if(Notification.permission!=='denied'){
    const p=await Notification.requestPermission();
    if(p==='granted') new Notification(title,{body});
  }
}
function scheduleReminder(e){
  const start=new Date(e.date).getTime();
  const notifyTime=start-12*60*60*1000;
  const delay=notifyTime - Date.now();
  if(delay>0) setTimeout(()=>notifyUser('Reminder', `${e.title} starts in 12 hours`), delay);
}
function organizerNotify(msg){ notifyUser('Organizer Alert', msg); }

// ------------ Calendar Sync ------------
function downloadIcs({title,startIso,location,description}){
  const dtStart=new Date(startIso);
  const dtEnd=new Date(dtStart.getTime()+2*60*60*1000);
  const fmtD=d=>d.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const ics=[
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CulturHub//EN','BEGIN:VEVENT',
    `DTSTAMP:${fmtD(new Date())}`,`DTSTART:${fmtD(dtStart)}`,`DTEND:${fmtD(dtEnd)}`,
    `SUMMARY:${title}`,`LOCATION:${location||''}`,`DESCRIPTION:${(description||'').replace(/\n/g,' ')}`,
    'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
  const blob=new Blob([ics],{type:'text/calendar'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`${title.replace(/\s+/g,'_')}.ics`; a.click();
  URL.revokeObjectURL(url); toast('Calendar file downloaded','ok');
}
function addToGoogleCalendar(e){
  const start=new Date(e.date).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const end=new Date(new Date(e.date).getTime()+2*60*60*1000).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const url=`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${start}/${end}&details=${encodeURIComponent(e.description||'')}&location=${encodeURIComponent(e.location||'')}`;
  window.open(url,'_blank');
}
function addToOutlookCalendar(e){
  const start=new Date(e.date).toISOString();
  const end=new Date(new Date(e.date).getTime()+2*60*60*1000).toISOString();
  const url=`https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(e.title)}&body=${encodeURIComponent(e.description||'')}&startdt=${start}&enddt=${end}&location=${encodeURIComponent(e.location||'')}`;
  window.open(url,'_blank');
}
function syncToConnectedCalendars(e){
  if(localStorage.getItem('culturhub.googleConnected')) addToGoogleCalendar(e);
  if(localStorage.getItem('culturhub.outlookConnected')) addToOutlookCalendar(e);
}

// ------------ Globalization ------------
async function convertCurrency(amount, from, to){
  try {
    const res = await fetch(`https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=${amount}`);
    const data = await res.json(); return data.result;
  } catch {
    return amount; // fallback
  }
}
function applyRegionalRules(e){
  const region = localStorage.getItem('culturhub.region') || 'EU';
  if(region==='EU' && typeof e.price==='number') e.price = +(e.price*1.2).toFixed(2); // VAT
  if(region==='CH') e.autoDeleteHours = 12;
}

// ------------ AI Personalization ------------
function recommendEvents(userId){
  const history = JSON.parse(localStorage.getItem(`culturhub.history.${userId}`)||'[]');
  const favCats={}; history.forEach(x=>favCats[x.category]=(favCats[x.category]||0)+1);
  const topCat=Object.entries(favCats).sort((a,b)=>b[1]-a[1])[0]?.[0];
  return events.filter(e=>!topCat || e.category===topCat).slice(0,3);
}
function renderRecommendations(userId){
  const wrap=document.querySelector('#recommendations'); if(!wrap) return;
  const recs=recommendEvents(userId); wrap.innerHTML='';
  recs.forEach(e=>{
    const div=document.createElement('div');
    div.className='card';
    div.innerHTML=`<strong>${e.title}</strong><br>${fmt(e.date)} · ${e.location}`;
    wrap.appendChild(div);
  });
}
function notifyRecommendations(userId){
  const recs=recommendEvents(userId);
  if(recs.length) notifyUser('New Event',`New ${recs[0].category} event: ${recs[0].title}`);
}

// ------------ Analytics (Dashboard) ------------
function renderTrendChart(){
  const ctx=document.getElementById('trendChart'); if(!ctx) return;
  const today=new Date(); const days=30;
  const labels=[]; const counts=Array(days).fill(0);
  events.forEach(e=>{
    const d=new Date(e.date);
    const diff=Math.floor((d - today) / (1000*60*60*24));
    const idx=days-1 - diff;
    if(idx>=0 && idx<days) counts[idx]++;
  });
  for(let i=0;i<days;i++){
    const date=new Date(today.getTime() + (i-days+1)*24*60*60*1000);
    labels.push(date.toLocaleDateString());
  }
  new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Events per day',data:counts,borderColor:'#ff6f61',backgroundColor:'rgba(255,111,97,0.3)',fill:true,tension:0.3}]},options:{responsive:true,scales:{y:{beginAtZero:true}}}});
}
function renderCategoryChart(){
  const ctx=document.getElementById('categoryChart'); if(!ctx) return;
  const counts={music:0,art:0,sport:0,other:0};
  events.forEach(e=>{ if(counts[e.category]!=null) counts[e.category]++; else counts.other++; });
  new Chart(ctx,{type:'pie',data:{labels:Object.keys(counts),datasets:[{data:Object.values(counts),backgroundColor:['#ff6f61','#4a90e2','#50e3c2','#999']}] }});
}
function renderSecurityLogs(){
  const wrap=document.querySelector('#securityLogs'); if(!wrap) return;
  wrap.innerHTML='<p class="event-meta">Security logs placeholder (attach backend logs).</p>';
}

// ------------ Home ------------
async function renderEvents(){
  const wrap=document.querySelector('#eventList'); if(!wrap) return;
  wrap.innerHTML='';
  const userCurrency = localStorage.getItem('culturhub.currency') || 'CHF';
  for(const e of events){
    applyRegionalRules(e);
    const div=document.createElement('div'); div.className='card';
    let priceHtml='';
    if(typeof e.price === 'number'){
      const converted = await convertCurrency(e.price, 'EUR', userCurrency);
      priceHtml = `<div class="event-meta">Price: ${converted} ${userCurrency}</div>`;
    }
    const green = calcGreenScore(e);
    div.innerHTML=`<strong>${e.title}</strong><br>${fmt(e.date)}<br>${e.location}
      ${priceHtml}
      <div class="event-meta">Green Score: ${green}/100</div>
      ${e.sponsor ? `<div class="event-meta">Sponsored by ${e.sponsor}</div>` : ''}
      <br><a href="/event.html?id=${e.id}" class="btn">View</a>`;
    wrap.appendChild(div);
  }
}

// ------------ Event detail controller ------------
function renderEventDetail(){
  const id=new URLSearchParams(location.search).get('id');
  const e=events.find(ev=>String(ev.id)===String(id)); if(!e){ toast('Event not found','warn'); return; }
  document.querySelector('#eventTitle').textContent=e.title;
  document.querySelector('#eventMeta').textContent=`${fmt(e.date)} · ${e.location}`;
  document.querySelector('#eventDesc').textContent=e.description||'';
  document.querySelector('#registerBtn').addEventListener('click',()=>{
    toast(`Registered for ${e.title}`,'ok');
    scheduleReminder(e);
    syncToConnectedCalendars(e);
    updatePoints('You', 10);
    const hist = JSON.parse(localStorage.getItem('culturhub.history.You')||'[]');
    hist.push({id:e.id, category:e.category}); localStorage.setItem('culturhub.history.You', JSON.stringify(hist));
  });
  document.querySelector('#googleCalBtn').addEventListener('click',()=>addToGoogleCalendar(e));
  document.querySelector('#outlookCalBtn').addEventListener('click',()=>addToOutlookCalendar(e));
  document.querySelector('#icsBtn').addEventListener('click',()=>downloadIcs({title:e.title,startIso:e.date,location:e.location,description:e.description}));
  initShare(e);
  showDeepLink(e);
  renderChat(e.id); initChat(e.id);
  renderPoll(e.id);
}

// ------------ Organizer controller ------------
function randomPalette(){
  const palettes=[['#ff6f61','#ff9a76','#fff'],['#4a90e2','#50e3c2','#fff'],['#7b4397','#dc2430','#fff'],['#1d976c','#93f9b9','#fff']];
  return palettes[Math.floor(Math.random()*palettes.length)];
}
function drawPoster(e){
  const ctx=document.querySelector('#posterCanvas').getContext('2d');
  const [c1,c2,textColor]=randomPalette();
  const grad=ctx.createLinearGradient(0,0,400,600); grad.addColorStop(0,c1); grad.addColorStop(1,c2);
  ctx.fillStyle=grad; ctx.fillRect(0,0,400,600);
  for(let i=0;i<10;i++){ ctx.beginPath(); ctx.arc(Math.random()*400,Math.random()*600,Math.random()*40,0,Math.PI*2); ctx.fillStyle=`rgba(255,255,255,${Math.random()*0.2})`; ctx.fill(); }
  ctx.fillStyle=textColor; ctx.font='bold 28px Poppins, sans-serif'; ctx.textAlign='center'; ctx.fillText(e.title,200,300);
  ctx.font='20px Poppins, sans-serif'; ctx.fillText(fmt(e.date),200,340); ctx.fillText(e.location,200,370);
}
function initOrganizer(){
  const form=document.getElementById('organizerForm'); const list=document.getElementById('organizerEvents');
  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const f=ev.target;
    const id=String(Date.now());
    const green = { publicTransport: f.g_public.checked, recycling: f.g_recycle.checked, lowWaste: f.g_waste.checked };
    const pollQ = (f.poll_q.value||'').trim();
    const opts=[f.poll_o1.value,f.poll_o2.value,f.poll_o3.value].map(x=>(x||'').trim()).filter(Boolean);
    const e = {
      id, title:f.title.value.trim(), date:f.date.value, location:f.location.value.trim(),
      category:f.category.value, description:f.description.value.trim(), price: parseFloat(f.price.value||''),
      sponsor:(f.sponsor.value||'').trim(), green
    };
    events.push(e); save();
    if(pollQ && opts.length>=2) savePoll(id,{question:pollQ, options:opts, votes:Array(opts.length).fill(0)});
    toast('Event created','ok'); updatePoints('You', 15);
    renderEvents(); renderOrganizerEvents();
  });
  document.querySelector('#posterBtn')?.addEventListener('click',()=>{
    const e=events[events.length-1]; if(!e){ toast('No event found','warn'); return; }
    drawPoster(e); toast('Poster generated','ok');
  });
  document.querySelector('#orgNotifyBtn')?.addEventListener('click',()=>{
    const msg=document.querySelector('#orgMsg').value.trim(); if(msg) organizerNotify(msg);
  });
  function renderOrganizerEvents(){
    if(!list) return; list.innerHTML='';
    events.slice().reverse().forEach(e=>{
      const div=document.createElement('div'); div.className='card';
      div.innerHTML=`<strong>${e.title}</strong><br>${fmt(e.date)} · ${e.location} · <em>${e.category}</em>`;
      list.appendChild(div);
    });
  }
  renderOrganizerEvents();
}

// ------------ Profile controller ------------
function connectGoogle(){
  localStorage.setItem('culturhub.googleConnected','true');
  document.querySelector('#connectStatus').textContent='Google account connected';
  toast('Google connected','ok');
}
function connectOutlook(){
  localStorage.setItem('culturhub.outlookConnected','true');
  document.querySelector('#connectStatus').textContent='Outlook account connected';
  toast('Outlook connected','ok');
}
function renderProfile(){
  const status=document.querySelector('#profileStatus'); if(!status) return;
  const ptsMap=JSON.parse(localStorage.getItem('culturhub.pointsMap')||'{}');
  const points=ptsMap['You']||0;
  status.textContent=`You have ${points} points`;
  const badgesWrap=document.querySelector('#badges');
  const badgesMap=JSON.parse(localStorage.getItem('culturhub.badgesMap')||'{}');
  badgesWrap.textContent=(badgesMap['You']||[]).join(', ') || '—';
  const g=localStorage.getItem('culturhub.googleConnected');
  const o=localStorage.getItem('culturhub.outlookConnected');
  document.querySelector('#connectStatus').textContent=`${g?'Google connected. ':''}${o?'Outlook connected. ':''}`.trim() || 'No connected accounts';
}
function bindPrivacyActions(){
  document.querySelector('#exportData')?.addEventListener('click',()=>{
    const data={events, points: JSON.parse(localStorage.getItem('culturhub.pointsMap')||'{}'), badges: JSON.parse(localStorage.getItem('culturhub.badgesMap')||'{}')};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='mydata.json'; a.click(); URL.revokeObjectURL(url);
  });
  document.querySelector('#deleteAccount')?.addEventListener('click',()=>{
    localStorage.clear(); toast('Account data cleared locally','warn'); location.reload();
  });
}