(function(){
  // Mood-to-Method mapping
  const methods = {
    stressed:{title:'Calm First',desc:'A short scaffold to clear bandwidth and make small, visible wins today.',bullets:['1-minute breathing check','Pick one tiny habit to complete now','Set a 30-minute low-stakes window'],cta:'Begin calming practice',anchorParam:'stressed'},
    flat:{title:'Energy Restore',desc:'Gentle activations to lift baseline energy without pushing into fatigue.',bullets:['Light movement for 3 minutes','One bright meal or snack','A single timed focus block'],cta:'Try an energy lift',anchorParam:'flat'},
    wired:{title:'Channel & Ground',desc:'Redirect excess energy into focused actions and short practices to smooth transitions.',bullets:['Fast physical reset','Clear a 25-minute sprint','Evening wind-down cue'],cta:'Channel this energy',anchorParam:'wired'},
    curious:{title:'Experiment Run',desc:'Small experiments that reveal what sticks; iterate over a week with data-light checks.',bullets:['Pick one variable to test','Short daily notes','Weekly micro-review'],cta:'Run an experiment',anchorParam:'curious'},
    recovering:{title:'Reset & Rebuild',desc:'Prioritize restoration and very small consistency windows to rebuild capacity.',bullets:['Prioritize sleep cues','1-2 gentle movement moments','A simplified food routine'],cta:'Start gentle rebuilding',anchorParam:'recovering'}
  };

  // Elements
  const moodSelect = document.getElementById('moodSelect');
  const methodTitle = document.getElementById('methodTitle');
  const methodDesc = document.getElementById('methodDesc');
  const methodBullets = document.getElementById('methodBullets');
  const moodCta = document.getElementById('moodCta');
  const primaryCta = document.getElementById('primaryCta');
  const finalCta = document.getElementById('finalCta');
  const methodCard = document.getElementById('methodCard');

  function renderMethod(key){
    const m = methods[key] || methods['curious'];
    methodTitle.textContent = m.title;
    methodDesc.textContent = m.desc;
    methodBullets.innerHTML = '';
    m.bullets.forEach(b=>{const li=document.createElement('li');li.textContent=b;methodBullets.appendChild(li)});
    // Update CTA labels and links
    const query = '?mood='+encodeURIComponent(m.anchorParam);
    moodCta.textContent = m.cta;
    moodCta.setAttribute('href', (primaryCta.getAttribute('href') || '/') + query);
    primaryCta.textContent = m.cta;
    finalCta.textContent = m.cta;
    primaryCta.setAttribute('href', (primaryCta.getAttribute('href').split('?')[0] || '/') + query);
    finalCta.setAttribute('href', (finalCta.getAttribute('href').split('?')[0] || '/') + query);
  }

  moodSelect.addEventListener('change', ()=>renderMethod(moodSelect.value));
  // initial render
  renderMethod(moodSelect.value || 'stressed');

  // Goal / Path Map logic
  const goalForm = document.getElementById('goalForm');
  const previewBtn = document.getElementById('previewPlan');
  const clearBtn = document.getElementById('clearGoals');
  const mapSummary = document.getElementById('mapSummary');
  const mapLegend = document.getElementById('mapLegend');
  const mapChart = document.getElementById('mapChart');
  const mapTips = document.getElementById('mapTips');

  function getSelectedGoals(){
    const picked = Array.from(goalForm.querySelectorAll('input[name="goal"]:checked')).map(i=>i.value);
    return picked.slice(0,3); // limit
  }

  function clearGoals(){
    goalForm.querySelectorAll('input[name="goal"]').forEach(i=>i.checked=false);
    renderMap([]);
  }

  function renderMap(goals){
    if(!goals || goals.length===0){
      mapSummary.textContent = 'No goals selected — choose up to three to see a path.';
      mapLegend.innerHTML = '';
      mapChart.innerHTML = '<div style="color:var(--muted)">30-day path will appear here</div>';
      mapTips.textContent = '';
      return;
    }
    mapSummary.textContent = `Sketch for: ${goals.join(', ')} — a simple progression to make change inevitable.`;
    // Legend
    mapLegend.innerHTML = goals.map((g,i)=>`<span style=\"display:inline-block;margin-right:10px;\"><strong style=\"color:var(--muted);\">●</strong>&nbsp;${g}</span>`).join('');
    // Create simple SVG timeline: 30 columns, color-coded thresholds
    const days = 30;
    const width = Math.min(900, window.innerWidth-120);
    const height = 120;
    const svgParts = [];
    svgParts.push(`<svg viewBox=\"0 0 ${width} ${height}\" width=\"100%\" height=\"${height}px\" xmlns=\"http://www.w3.org/2000/svg\">`);

    // background grid
    svgParts.push(`<rect x=\"0\" y=\"0\" width=\"${width}\" height=\"${height}\" rx=\"10\" fill=\"rgba(255,255,255,0.6)\" />`);
    const colW = Math.floor((width-20)/days);
    const padding = 10;

    goals.forEach((g,gi)=>{
      const hue = 120 - gi*30; // green -> blue
      for(let d=0; d<days; d++){
        // compute intensity: early days lighter, later days stronger for habit formation
        const intensity = Math.min(1, ((d+1)/days) * (0.5 + gi*0.25));
        const opacity = 0.08 + intensity*0.28;
        const x = padding + d*colW + gi*3;
        const y = 20 + gi*18;
        const h = 18;
        svgParts.push(`<rect x=\"${x}\" y=\"${y}\" width=\"${colW-4}\" height=\"${h}\" rx=\"4\" fill=\"hsla(${hue},70%,50%,${opacity})\" />`);
      }
    });

    // A guiding path line
    svgParts.push(`<path d=\"M10 ${height-30} C ${width/3} ${height-80}, ${width*0.66} ${height-10}, ${width-10} ${height-40}\" stroke=\"rgba(20,50,80,0.08)\" stroke-width=3 fill=\"none\" stroke-linecap=\"round\"/>`);
    svgParts.push('</svg>');
    mapChart.innerHTML = svgParts.join('');

    // Tips: map simple daily practice per selected goals
    const tips = goals.map((g,i)=>{
      if(g==='sleep') return 'Night anchor: consistent lights-out window — start by shifting 10 minutes tonight.';
      if(g==='movement') return 'Micro-movements: two 3-minute breaks at set times.';
      if(g==='stress') return 'Pause cue: 3-breath reset before meetings or transitions.';
      if(g==='focus') return '25-minute blocks: schedule one in the morning and one mid-day.';
      if(g==='nutrition') return 'Structured snack: protein + fiber between meals to avoid dips.';
      return '';
    }).filter(Boolean);
    mapTips.innerHTML = '<ul>'+tips.map(t=>`<li>${t}</li>`).join('')+'</ul>';
  }

  previewBtn.addEventListener('click', ()=>{
    const sel = getSelectedGoals();
    renderMap(sel);
  });
  clearBtn.addEventListener('click', ()=>clearGoals());

  // initial empty
  renderMap([]);

  // Accessibility: allow pressing Enter while focusing select to update quickly
  moodSelect.addEventListener('keyup', (e)=>{ if(e.key==='Enter') renderMethod(moodSelect.value); });

  // Small UI nicety: animate method card on change
  let lastMethod='';
  setInterval(()=>{
    const current = moodSelect.value;
    if(current!==lastMethod){
      methodCard.animate([{transform:'translateY(6px)',opacity:0.9},{transform:'translateY(0)',opacity:1}],{duration:300,easing:'ease-out'});
      lastMethod=current;
    }
  },350);
})();