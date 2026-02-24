(function(){
  // Mood-to-Method selector
  const moodButtons = document.querySelectorAll('.mood');
  const methodTitle = document.getElementById('methodTitle');
  const methodText = document.getElementById('methodText');
  const methodCta = document.getElementById('methodCta');
  const primaryCta = document.getElementById('primaryCta');
  const finalCta = document.getElementById('finalCta');

  const CTA_BASE = '{{PRIMARY_CTA_URL}}';
  const CTA_LABEL = '{{PRIMARY_CTA_LABEL}}';

  const moods = {
    stretched: {
      title: 'Stretched: prioritized mini-rewrites',
      text: 'Short micro-adjustments to reduce friction: 3 prioritized actions to reclaim minutes across your day and keep momentum. Focus on one anchor, two micro-checks.',
      ctaLabel: 'Book a quick reset',
      urlSuffix: '?mood=stretched'
    },
    drifting: {
      title: 'Drifting: simple anchors to re-center',
      text: 'When routine slips, we introduce anchor points that are both easy and repeatable — designed to be regained without overhauling your day.',
      ctaLabel: 'Start a gentle plan',
      urlSuffix: '?mood=drifting'
    },
    steady: {
      title: 'Steady: optimize what works',
      text: 'Tune the practices already supporting you. We apply small experiments to compound routine wins and improve sustainability.',
      ctaLabel: 'Tune my month',
      urlSuffix: '?mood=steady'
    },
    renewing: {
      title: 'Renewing: focused refresh',
      text: 'A short cycle of targeted shifts to help restore clear rhythms and rebuild consistent habits with minimal friction.',
      ctaLabel: 'Begin a refresh',
      urlSuffix: '?mood=renewing'
    }
  };

  function setActiveMood(key){
    moodButtons.forEach(b=>b.classList.toggle('active', b.dataset.key===key));
    const data = moods[key];
    if(!data) return;
    methodTitle.textContent = data.title;
    methodText.textContent = data.text;
    methodCta.textContent = data.ctaLabel;
    methodCta.href = CTA_BASE + data.urlSuffix;
    primaryCta.href = CTA_BASE + data.urlSuffix;
    finalCta.href = CTA_BASE + data.urlSuffix;
  }

  moodButtons.forEach(b=>{
    b.addEventListener('click', ()=>{
      setActiveMood(b.dataset.key);
    });
  });

  // Progress meter / 30-day path generator
  const planBtn = document.getElementById('planBtn');
  const pathSvg = document.getElementById('pathSvg');
  const mapLegend = document.getElementById('mapLegend');

  function clearSvg(){ while(pathSvg.firstChild) pathSvg.removeChild(pathSvg.firstChild); }

  function drawPath(selectedGoals){
    clearSvg();
    const days = 30;
    const width = 900; const height = 140;
    pathSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // color palette per goal
    const colors = {
      sleep:'#3a8d84', movement:'#6bb36b', focus:'#f0a43a', nutrition:'#d96d6d', calm:'#6b9bd6'
    };

    // compute lanes based on goals count
    const lanes = Object.keys(selectedGoals);
    const laneCount = Math.max(1, lanes.length);

    const laneSpacing = height / (laneCount + 1);

    // Draw day markers and dotted grid
    for(let d=0; d<days; d++){
      const x = 30 + (d*(width-60))/(days-1);
      const tick = document.createElementNS('http://www.w3.org/2000/svg','line');
      tick.setAttribute('x1',x); tick.setAttribute('x2',x);
      tick.setAttribute('y1',10); tick.setAttribute('y2',height-10);
      tick.setAttribute('stroke','#eef7f6'); tick.setAttribute('stroke-width','1');
      pathSvg.appendChild(tick);
    }

    // For each goal, place action dots across 30 days with a simple rhythm
    const legendItems = [];
    lanes.forEach((goal, idx)=>{
      const y = (idx+1)*laneSpacing;
      const g = document.createElementNS('http://www.w3.org/2000/svg','g');
      // path line
      const line = document.createElementNS('http://www.w3.org/2000/svg','path');
      let dattr = '';
      for(let day=0; day<days; day++){
        const x = 30 + (day*(width-60))/(days-1);
        const jitter = Math.sin((day+idx)*0.5)*6;
        const yy = y + jitter;
        dattr += (day===0?`M ${x} ${yy}`:` L ${x} ${yy}`);
      }
      line.setAttribute('d',dattr);
      line.setAttribute('fill','none');
      line.setAttribute('stroke',colors[goal]||'#9bb');
      line.setAttribute('stroke-width','2');
      line.setAttribute('opacity','0.85');
      g.appendChild(line);

      // Markers for suggested action days depending on goal intensity
      const intensity = selectedGoals[goal]; // 1-3
      for(let day=0; day<days; day++){
        // simple spacing rule: frequency based on intensity
        const freq = Math.max(1, Math.round(4 / intensity));
        if(day % freq === 0){
          const x = 30 + (day*(width-60))/(days-1);
          const jitter = Math.sin((day+idx)*0.5)*6;
          const yy = y + jitter;
          const dot = document.createElementNS('http://www.w3.org/2000/svg','circle');
          dot.setAttribute('cx',x);
          dot.setAttribute('cy',yy);
          dot.setAttribute('r',4);
          dot.setAttribute('fill',colors[goal]||'#9bb');
          dot.setAttribute('stroke','#fff');
          dot.setAttribute('stroke-width','1');
          g.appendChild(dot);
        }
      }

      pathSvg.appendChild(g);
      legendItems.push({goal:goal,color:colors[goal]||'#9bb',intensity:intensity});
    });

    // Summary in legend
    mapLegend.innerHTML = legendItems.map(it=>`<span style="display:inline-block;margin-right:12px"><strong style="color:${it.color}">●</strong> ${it.goal} · intensity ${it.intensity}</span>`).join('');
  }

  planBtn.addEventListener('click', ()=>{
    const checked = document.querySelectorAll('.goals-list input[type=checkbox]:checked');
    const selected = {};
    checked.forEach((cb, i) => {
      // propose intensity based on order selected
      const val = cb.value;
      const intensity = Math.min(3, Math.max(1, 3 - Math.floor(i/2)));
      selected[val] = intensity;
    });
    if(Object.keys(selected).length===0){
      mapLegend.textContent = 'Select at least one goal to generate a plan.';
      clearSvg();
      return;
    }
    drawPath(selected);
  });

  // initialize year
  document.getElementById('year').textContent = new Date().getFullYear();

  // optional: set default mood based on time of day
  const hour = new Date().getHours();
  if(hour<6 || hour>21) setActiveMood('renewing');
  else if(hour<11) setActiveMood('steady');
  else setActiveMood('stretched');
})();