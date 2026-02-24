document.addEventListener('DOMContentLoaded',function(){
  // Testimonial rotator
  (function rotateTestimonials(){
    const items = Array.from(document.querySelectorAll('.testimonial'));
    if(!items.length) return;
    let idx = 0;
    setInterval(()=>{
      items.forEach((it,i)=> it.classList.toggle('active', i===idx));
      idx = (idx+1)%items.length;
    },4000);
  })();

  // Badges tooltips are implemented in CSS with data-tip attribute

  // Progress meter / 30-day path map
  const form = document.getElementById('goal-form');
  const svg = document.getElementById('path-map');
  const legend = document.getElementById('path-legend');

  function drawPath(selected){
    // Clear
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    legend.innerHTML = '';
    const days = 30;
    const margin = 12;
    const w = svg.viewBox.baseVal.width || svg.clientWidth || 700;
    const h = svg.viewBox.baseVal.height || svg.clientHeight || 120;
    const startX = margin;
    const endX = (w - margin);
    const gap = (endX - startX)/(days-1);

    // Map goal to color
    const palette = {
      sleep: '#7fc1a9',
      energy: '#f2b33d',
      focus: '#6ea8fe',
      movement: '#f08a8a'
    };

    const activeGoals = selected.slice();
    // Legend
    activeGoals.forEach(g=>{
      const el = document.createElement('div'); el.style.display='inline-block'; el.style.marginRight='12px'; el.innerHTML = `<strong style=\"color:${palette[g]}\">■</strong> ${g}`; legend.appendChild(el);
    });
    if(activeGoals.length===0){
      legend.textContent = 'No goals selected — pick a few to build your map.';
    }

    // Determine assignment of each day (a simple round-robin weighted by selected goals)
    const assignment = new Array(days).fill(null);
    if(activeGoals.length===0){
      for(let i=0;i<days;i++) assignment[i] = null;
    } else {
      for(let i=0;i<days;i++){
        assignment[i] = activeGoals[i % activeGoals.length];
      }
    }

    // Draw lines and circles
    const xmlns = 'http://www.w3.org/2000/svg';
    // polyline path
    const points = [];
    for(let i=0;i<days;i++){
      const x = startX + gap*i;
      // create a gentle wave for visual interest
      const y = h/2 + Math.sin(i/4)*18;
      points.push(x+','+y);
    }
    const poly = document.createElementNS(xmlns,'polyline');
    poly.setAttribute('points', points.join(' '));
    poly.setAttribute('fill','none');
    poly.setAttribute('stroke','#e6f2ee');
    poly.setAttribute('stroke-width','6');
    svg.appendChild(poly);

    // colored segments: draw circles and small dots colored by assignment
    for(let i=0;i<days;i++){
      const x = startX + gap*i;
      const y = h/2 + Math.sin(i/4)*18;
      const grp = document.createElementNS(xmlns,'g');

      const circle = document.createElementNS(xmlns,'circle');
      circle.setAttribute('cx',x);
      circle.setAttribute('cy',y);
      circle.setAttribute('r',8);
      circle.setAttribute('fill', assignment[i]? palette[assignment[i]] : '#fff');
      circle.setAttribute('stroke', assignment[i]? darken(palette[assignment[i]]) : '#e6f2ee');
      circle.setAttribute('stroke-width',2);
      grp.appendChild(circle);

      // tooltip on hover
      circle.addEventListener('mouseenter',()=>{
        showTooltip(svg, x, y, i+1, assignment[i]);
      });
      circle.addEventListener('mouseleave',hideTooltip);

      svg.appendChild(grp);
    }
  }

  function darken(hex){
    // simple darken
    const c = hex.replace('#','');
    const num = parseInt(c,16);
    const r = Math.max(0,((num>>16)-20)).toString(16).padStart(2,'0');
    const g = Math.max(0,(((num>>8)&255)-20)).toString(16).padStart(2,'0');
    const b = Math.max(0,((num&255)-20)).toString(16).padStart(2,'0');
    return '#'+r+g+b;
  }

  let tipEl = null;
  function showTooltip(container,x,y,day,goal){
    hideTooltip();
    tipEl = document.createElement('div');
    tipEl.className = 'map-tip';
    tipEl.style.position='absolute';
    tipEl.style.padding='8px 10px';
    tipEl.style.background='#234';
    tipEl.style.color='#fff';
    tipEl.style.borderRadius='6px';
    tipEl.style.fontSize='13px';
    tipEl.style.pointerEvents='none';
    tipEl.innerText = goal? `Day ${day}: focus on ${goal}` : `Day ${day}: routine catch-up`;
    // position relative to svg's bounding rect
    const rect = container.getBoundingClientRect();
    tipEl.style.left = (rect.left + x + 12) + 'px';
    tipEl.style.top = (rect.top + y - 12) + 'px';
    document.body.appendChild(tipEl);
  }
  function hideTooltip(){ if(tipEl){ document.body.removeChild(tipEl); tipEl=null; } }

  if(form){
    form.addEventListener('change',()=>{
      const selected = Array.from(form.querySelectorAll('input[name="goal"]:checked')).map(i=>i.value);
      drawPath(selected);
    });
    // initial draw
    drawPath([]);
  }

  // clicking a testimonial will pause rotation briefly (accessibility enhancement)
  const tests = document.querySelectorAll('.testimonial');
  tests.forEach(t=> t.addEventListener('click',()=>{
    t.classList.add('active');
  }));

});
