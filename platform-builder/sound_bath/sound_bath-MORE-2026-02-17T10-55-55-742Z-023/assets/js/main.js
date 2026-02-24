// Main interactivity for sound_bath template
document.addEventListener('DOMContentLoaded',function(){
  // Year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Recommendations data keyed by intensity
  const recData = {
    gentle: {
      title: 'Gentle track — low resonance',
      bullets: ['Soft-chime introductions','Low-pitch sustained bowls','Short guided breath returns (10–12 minutes)'],
      suggest: 'Ripple or Current memberships fit most gentle listeners.'
    },
    medium: {
      title: 'Medium track — steady resonance',
      bullets: ['Layered bowls and chimes','Movement-informed sonics','20–40 minute guided sessions'],
      suggest: 'Current is designed for steady practice; try a month.'
    },
    intense: {
      title: 'Immersive track — deeper spectrum',
      bullets: ['Extended low-range vibrations','Intentional silence windows','Integrated private alignment options'],
      suggest: 'Deep membership or private series recommended; intake required.'
    }
  };

  // Populate initial recs
  const recContainer = document.getElementById('recommendations');
  function renderRecs(key){
    const d = recData[key];
    recContainer.innerHTML = '';
    const h = document.createElement('h4'); h.textContent = d.title;
    const ul = document.createElement('ul');
    d.bullets.forEach(b=>{const li=document.createElement('li');li.textContent=b;ul.appendChild(li)});
    const p = document.createElement('p'); p.className='muted small'; p.textContent = d.suggest;
    recContainer.appendChild(h); recContainer.appendChild(ul); recContainer.appendChild(p);
  }

  // Hook up radio buttons
  document.querySelectorAll('input[name="intensity"]').forEach(radio=>{
    radio.addEventListener('change',e=>{renderRecs(e.target.value)});
  });
  // initial
  renderRecs(document.querySelector('input[name="intensity"]:checked').value);

  // Testimonials rotation
  const quotes = Array.from(document.querySelectorAll('.testimonials .quote'));
  let current = 0;
  function showQuote(i){
    quotes.forEach((q,idx)=>{q.style.display = idx===i ? 'block':'none';});
  }
  if(quotes.length){
    showQuote(0);
    setInterval(()=>{ current = (current+1)%quotes.length; showQuote(current); },4500);
  }

  // Badges tooltips / hover behavior
  const badges = document.querySelectorAll('.badge');
  badges.forEach(badge=>{
    const tip = badge.getAttribute('data-tip');
    if(!tip) return;
    // store tip text for accessibility
    badge.setAttribute('aria-label', tip);
    // on mouseenter, flip data-show-tip
    badge.addEventListener('mouseenter', ()=> badge.setAttribute('data-show-tip','true'));
    badge.addEventListener('mouseleave', ()=> badge.setAttribute('data-show-tip','false'));
    // on focus for keyboard
    badge.addEventListener('focus', ()=> badge.setAttribute('data-show-tip','true'));
    badge.addEventListener('blur', ()=> badge.setAttribute('data-show-tip','false'));
  });

  // Events module: create next-event + calendar list
  const events = [
    {id:1,title:'Morning Gather: Breath & Bowls',date:'2026-03-01T09:00:00',type:'group',location:'Studio A',price:20},
    {id:2,title:'Evening Wave: Resting Spectrum',date:'2026-03-05T18:30:00',type:'group',location:'Studio B',price:20},
    {id:3,title:'Seasonal Deep: Extended Practice',date:'2026-03-21T14:00:00',type:'intensive',location:'Main Hall',price:60}
  ];

  function isoToLocal(iso){const d=new Date(iso);return d.toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});} 
  // pick next event after now
  const now = new Date();
  const upcoming = events.filter(e=>new Date(e.date) > now).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const nextEventNode = document.getElementById('nextEvent');
  const calendarListNode = document.getElementById('calendarList');
  if(nextEventNode){
    if(upcoming.length){
      const ne = upcoming[0];
      nextEventNode.innerHTML = `<h4>${ne.title}</h4><p class=\"muted\">${isoToLocal(ne.date)} — ${ne.location}</p><p><a class=\"btn primary\" href=\"events.html#${ne.id}\">RSVP</a></p>`;
    } else {
      nextEventNode.innerHTML = '<p class=\"muted\">No upcoming events — check back soon or sign up for announcements.</p>';
    }
  }
  if(calendarListNode){
    calendarListNode.innerHTML = upcoming.map((ev,idx)=>{
      const cls = idx===0? 'calendar-item next':'calendar-item';
      return `<div class=\"${cls}\"><strong>${ev.title}</strong><div class=\"muted\">${isoToLocal(ev.date)} — ${ev.location}</div></div>`;
    }).join('');
  }

  // Small UX: highlight recommended membership on intensity change
  const tierEls = document.querySelectorAll('.tier');
  function highlightTierByKey(key){
    tierEls.forEach(el=>el.style.outline='none');
    if(key==='gentle'){ document.querySelector('[data-tier="ripple"]').style.outline='3px solid rgba(61,179,158,0.14)'; }
    if(key==='medium'){ document.querySelector('[data-tier="current"]').style.outline='3px solid rgba(71,102,255,0.12)'; }
    if(key==='intense'){ document.querySelector('[data-tier="deep"]').style.outline='3px solid rgba(71,102,255,0.18)'; }
  }
  // initial
  highlightTierByKey(document.querySelector('input[name="intensity"]:checked').value);
  document.querySelectorAll('input[name="intensity"]').forEach(r=>r.addEventListener('change', e=>{ highlightTierByKey(e.target.value); }));

  // Accessibility: ensure badges are focusable
  badges.forEach(b=>{ b.setAttribute('tabindex','0'); });
});