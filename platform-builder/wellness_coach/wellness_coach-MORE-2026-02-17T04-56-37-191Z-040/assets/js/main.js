// Local interactive features: 30-day path builder + rotating testimonials + export
document.addEventListener('DOMContentLoaded', function(){
  // Year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Build 30 day map container with placeholders
  const pathMap = document.getElementById('pathMap');
  for(let i=1;i<=30;i++){
    const tile = document.createElement('div');
    tile.className = 'day';
    tile.dataset.day = i;
    tile.innerHTML = i;
    pathMap.appendChild(tile);
  }

  const goalForm = document.getElementById('goalForm');
  const checkboxes = Array.from(goalForm.querySelectorAll('input[type="checkbox"]'));
  const progressPct = document.getElementById('progressPct');
  const exportBtn = document.getElementById('exportPlan');

  function makePlan(selected){
    // Reset all tiles
    const tiles = pathMap.querySelectorAll('.day');
    tiles.forEach(t=>{t.style.background='';t.innerHTML=t.dataset.day});

    if(selected.length===0){
      progressPct.textContent = 'Select goals to preview a plan';
      exportBtn.disabled = true;
      return;
    }

    exportBtn.disabled = false;
    // Simple algorithm: spread chosen anchors across 30 days; each goal gets a color code
    const colorMap = {
      'sleep':'p-sleep','movement':'p-move','mornings':'p-morn','focus':'p-focus','connection':'p-connect'
    };

    const tasks = []; // textual micro tasks per day
    for(let i=1;i<=30;i++){
      const assigned = [];
      selected.forEach((g,idx)=>{
        // Stagger by goal index and day
        if((i + idx) % (2 + idx) === 0){
          assigned.push(g);
        }
      });
      const el = pathMap.querySelector('.day[data-day="'+i+'"]');
      el.innerHTML = '';
      if(assigned.length===0){
        el.textContent = i;
        el.style.background = '';
      } else {
        // show small dots representing goals
        assigned.forEach(a=>{
          const d = document.createElement('span');
          d.className = 'dot '+(colorMap[a]||'');
          d.style.display='inline-block';d.style.margin='0 2px';
          el.appendChild(d);
        });
      }
      // Create a simple habit instruction
      tasks.push({day:i, items:assigned.map(a=>habitLine(a))});
    }

    // Show percent coverage roughly
    const coverage = Math.round((tasks.filter(t=>t.items.length>0).length/30)*100);
    progressPct.textContent = coverage + '% days include micro-tasks';

    // Attach export behaviour
    exportBtn.onclick = function(){
      const plan = {generated: new Date().toISOString(), goals:selected, days:tasks};
      const blob = new Blob([JSON.stringify(plan,null,2)],{type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'path-plan.json'; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    };
  }

  function habitLine(key){
    switch(key){
      case 'sleep': return 'Set a consistent bedtime cue: lights dim + phone away';
      case 'movement': return '10–15 minute movement: walk, stretch, or gentle yoga';
      case 'mornings': return 'A short morning anchor: water + 3-minute plan';
      case 'focus': return 'A 25-minute focused work block with one clear goal';
      case 'connection': return 'Send a short check-in message to someone you care about';
      default: return 'Micro task';
    }
  }

  // Handle goal changes
  checkboxes.forEach(cb=>cb.addEventListener('change', ()=>{
    const selected = checkboxes.filter(c=>c.checked).map(c=>c.value);
    makePlan(selected);
  }));

  // Simple rotating testimonials and controls
  const testimonials = [
    {quote:'I reshaped mornings into a five-minute routine that actually stuck. The month made a real difference.', name:'S. — project manager, {{CITY}}'},
    {quote:'Small tasks, consistent weeks. I finally feel like I can build on progress week to week.', name:'A. — teacher, {{STATE}}'},
    {quote:'The plan helped me recover without guilt after a rough week and get back on track fast.', name:'R. — freelancer'}
  ];
  let tIndex = 0;
  const holder = document.getElementById('testimonialHolder');
  const prevBtn = document.getElementById('prevTestimonial');
  const nextBtn = document.getElementById('nextTestimonial');

  function renderTestimonial(i){
    const t = testimonials[i];
    holder.innerHTML = '<blockquote>"'+t.quote+'"</blockquote><cite>— '+t.name+'</cite>';
  }
  renderTestimonial(tIndex);
  let rot = setInterval(()=>{ tIndex=(tIndex+1)%testimonials.length; renderTestimonial(tIndex); }, 4500);

  [prevBtn,nextBtn].forEach(b=>b.addEventListener('click',()=>{ clearInterval(rot); }))
  prevBtn.addEventListener('click', ()=>{ tIndex = (tIndex-1+testimonials.length)%testimonials.length; renderTestimonial(tIndex); });
  nextBtn.addEventListener('click', ()=>{ tIndex = (tIndex+1)%testimonials.length; renderTestimonial(tIndex); });

  // Accessibility: keyboard access to testimonial controls
  prevBtn.addEventListener('keydown', e=>{ if(e.key==='Enter') prevBtn.click(); });
  nextBtn.addEventListener('keydown', e=>{ if(e.key==='Enter') nextBtn.click(); });

});
