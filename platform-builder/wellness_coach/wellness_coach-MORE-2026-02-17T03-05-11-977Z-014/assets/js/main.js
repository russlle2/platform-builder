(function(){
  // Basic interactive features: path map, rotating proof gallery, tooltips are CSS-based
  const form = document.getElementById('goals-form');
  const buildBtn = document.getElementById('build-path');
  const clearBtn = document.getElementById('clear-goals');
  const svg = document.getElementById('path-svg');
  const meterFill = document.querySelector('.meter-fill');
  const meterText = document.getElementById('meter-text');
  const miniTestimonial = document.getElementById('mini-testimonial');
  const badges = document.querySelectorAll('#badge-rotator .badge');

  // Testimonials rotation in the larger proof gallery
  const testimonials = Array.from(document.querySelectorAll('#testimonials .testimonial'));
  let testimonialIndex = 0;
  function rotateTestimonials(){
    testimonials.forEach((t,i)=>t.classList.toggle('active', i===testimonialIndex));
    testimonialIndex = (testimonialIndex + 1) % testimonials.length;
  }
  setInterval(rotateTestimonials,5000);
  rotateTestimonials();

  // mini badge rotator in hero
  let badgeIndex = 0;
  function rotateBadges(){
    badges.forEach((b,i)=>b.style.transform = `scale(${i===badgeIndex?1.05:0.95})`);
    badgeIndex = (badgeIndex + 1) % badges.length;
  }
  setInterval(rotateBadges,3500);
  rotateBadges();

  // Simple path generator for 30 days
  function generatePath(selectedGoals, selectedHabits){
    const days = 30;
    const points = [];
    // simple wave influenced by number of goals/habits
    const intensity = Math.min(3, Math.max(1, selectedGoals.length || 1)) + Math.min(2, selectedHabits.length || 0);
    for(let d=0; d<days; d++){
      const x = 20 + (d*(960/days));
      const y = 120 + Math.sin((d/30)*Math.PI*2*intensity)*40;
      points.push([x,y]);
    }
    return points;
  }

  // Render SVG path and milestone dots
  function renderPath(points){
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    // polyline
    const ns = 'http://www.w3.org/2000/svg';
    const poly = document.createElementNS(ns,'polyline');
    poly.setAttribute('fill','none');
    poly.setAttribute('stroke','#7c3aed');
    poly.setAttribute('stroke-width','4');
    poly.setAttribute('stroke-linecap','round');
    poly.setAttribute('stroke-linejoin','round');
    poly.setAttribute('points', points.map(p=>p.join(',')).join(' '));
    poly.setAttribute('opacity','0.95');
    svg.appendChild(poly);

    // Milestones at days 7,14,21,30
    [6,13,20,29].forEach((idx,i)=>{
      const g = document.createElementNS(ns,'g');
      const [x,y] = points[idx];
      const circle = document.createElementNS(ns,'circle');
      circle.setAttribute('cx',x);
      circle.setAttribute('cy',y);
      circle.setAttribute('r',14 - i*2);
      circle.setAttribute('fill','#fff');
      circle.setAttribute('stroke','#2b6cb0');
      circle.setAttribute('stroke-width','3');
      g.appendChild(circle);
      const label = document.createElementNS(ns,'text');
      label.setAttribute('x',x);
      label.setAttribute('y',y+5);
      label.setAttribute('text-anchor','middle');
      label.setAttribute('font-size','12');
      label.setAttribute('fill','#0f172a');
      label.textContent = ['wk1','wk2','wk3','wk4'][i];
      g.appendChild(label);
      svg.appendChild(g);
    });
  }

  // Calculate readiness percentage based on selections
  function readinessPercent(goalsCount,habitsCount){
    const max = 5; // 5 signals full readiness
    const score = Math.min(max, goalsCount + Math.floor(habitsCount/1));
    return Math.round((score/max)*100);
  }

  function updateMeter(percent){
    meterFill.style.width = percent + '%';
    meterText.textContent = percent + '% ready';
    const meter = document.querySelector('.meter');
    meter.setAttribute('aria-valuenow', String(percent));
  }

  // Pull selected goals and habits
  function collectSelections(){
    const selectedGoals = Array.from(document.querySelectorAll('input[name="goal"]:checked')).map(i=>i.value);
    const selectedHabits = Array.from(document.querySelectorAll('#micro-list input[type="checkbox"]:checked')).map(i=>i.getAttribute('data-habit'));
    return {selectedGoals,selectedHabits};
  }

  buildBtn.addEventListener('click', ()=>{
    const {selectedGoals, selectedHabits} = collectSelections();
    const points = generatePath(selectedGoals, selectedHabits);
    renderPath(points);
    const pct = readinessPercent(selectedGoals.length, selectedHabits.length);
    updateMeter(pct);
    // update mini testimonial to reflect chosen goal (simple heuristic)
    const mini = {
      energy: '"I felt steadier energy within a week of the plan."',
      sleep: '"Improved timing for sleep with a small evening routine."',
      focus: '"The plan sharpened my most productive hours."',
      movement: '"Daily movement became easy to commit to."',
      stress: '"Clear tactics for calmer reactivity."'
    };
    if(selectedGoals.length) miniTestimonial.textContent = mini[selectedGoals[0]] || '"A practical, testable plan to start."';
    else miniTestimonial.textContent = '"Choose goals to shape a tailored path."';
  });

  clearBtn.addEventListener('click', ()=>{
    // reset inputs
    form.querySelectorAll('input[type="checkbox"]').forEach(cb=>cb.checked=false);
    // clear svg
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    updateMeter(0);
    miniTestimonial.textContent = '"Choose goals to shape a tailored path."';
  });

  // Apply habits to the path (recalculate quickly)
  document.getElementById('apply-habits').addEventListener('click', ()=>{
    const {selectedGoals,selectedHabits} = collectSelections();
    const points = generatePath(selectedGoals, selectedHabits);
    renderPath(points);
    const pct = readinessPercent(selectedGoals.length, selectedHabits.length);
    updateMeter(pct);
  });

  // keyboard accessible testimonials switching
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowRight') rotateTestimonials();
  });

  // initial demo render
  const initialPoints = generatePath([],[]);
  renderPath(initialPoints);
  updateMeter(0);
})();