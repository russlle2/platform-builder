(function(){
  // Testimonials rotation and badge tooltips
  const testimonials = [
    {text:'"I learned how to shape a weekly plan that actually fits my life."', author:'— Member S.'},
    {text:'"Small prompts and shared check-ins kept me consistent for months."', author:'— Member L.'},
    {text:'"The frameworks uncluttered my mornings and gave me reliable focus time."', author:'— Member R.'}
  ];
  let ti = 0;
  const tEl = document.getElementById('testimonials');
  function showTestimonial(i){
    if(!tEl) return;
    tEl.innerHTML = '<blockquote class="quote">'+testimonials[i].text+'</blockquote><cite class="author">'+testimonials[i].author+'</cite>';
  }
  showTestimonial(0);
  setInterval(()=>{ti=(ti+1)%testimonials.length;showTestimonial(ti);},4500);

  // Path map generator
  const mapBtn = document.getElementById('mapBtn');
  const pathMap = document.getElementById('pathMap');
  const dayList = document.getElementById('dayList');
  function makePlan(goals,intensity){
    const days = 30;
    // heuristics for difficulty
    const effort = intensity==='low'?0.5: intensity==='med'?1:1.5;
    // baseline micro-tasks by goal
    const goalTasks = {
      sleep: ['bedtime wind-down','consistent sleep window','no screens 30m before bed'],
      energy: ['midday reset','hydration check','mini-walk or stretch'],
      movement: ['10-minute movement','short walk','mobility set'],
      focus: ['deep work block','single-task stretch','task batch']
    };
    // build day items
    const items = [];
    for(let d=1; d<=days; d++){
      const day = {day:d,items:[]};
      goals.forEach(g=>{
        // pick a task based on day and effort
        const list = goalTasks[g]||[];
        const pick = list[(d-1)%list.length] || 'small practice';
        // scale intensity: every nth day add micro-challenge
        const challenge = (d % Math.max(1,Math.round(7/effort)) ===0) ? 'plus: small challenge' : '';
        day.items.push(pick + (challenge?(' — '+challenge):''));
      });
      // if no goals selected, give a gentle default
      if(goals.length===0){
        day.items.push(d%3? 'micro-check: morning set':'micro-check: evening reflect');
      }
      items.push(day);
    }
    return items;
  }

  function renderMap(plan){
    // create an SVG with 30 nodes in a sine path for visual interest
    const days = plan.length;
    const w = Math.max(800, window.innerWidth-80);
    const h = 120;
    const padding = 24;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS,'svg');
    svg.setAttribute('width','100%');
    svg.setAttribute('viewBox','0 0 '+w+' '+h);
    // create path points
    const points = [];
    for(let i=0;i<days;i++){
      const x = padding + (i*(w-2*padding)/(days-1));
      const y = h/2 + Math.sin(i/3)*20;
      points.push({x,y});
    }
    // connectors
    for(let i=0;i<days-1;i++){
      const line = document.createElementNS(svgNS,'line');
      line.setAttribute('x1',points[i].x);
      line.setAttribute('y1',points[i].y);
      line.setAttribute('x2',points[i+1].x);
      line.setAttribute('y2',points[i+1].y);
      line.setAttribute('class','connector');
      svg.appendChild(line);
    }
    // nodes
    points.forEach((p,idx)=>{
      const circle = document.createElementNS(svgNS,'circle');
      circle.setAttribute('cx',p.x);
      circle.setAttribute('cy',p.y);
      circle.setAttribute('r',8);
      circle.setAttribute('class','node');
      circle.setAttribute('data-day',idx+1);
      circle.style.cursor='pointer';
      circle.addEventListener('click',()=>{
        // toggle complete
        circle.classList.toggle('active');
        const key = 'wellness_plan_progress';
        const stored = JSON.parse(localStorage.getItem(key)||'{}');
        stored['d'+(idx+1)] = circle.classList.contains('active');
        localStorage.setItem(key,JSON.stringify(stored));
        updateDayList(plan);
      });
      svg.appendChild(circle);
    });
    pathMap.innerHTML='';
    pathMap.appendChild(svg);
    pathMap.setAttribute('aria-hidden','false');
    updateDayList(plan);
  }

  function updateDayList(plan){
    const key='wellness_plan_progress';
    const stored = JSON.parse(localStorage.getItem(key)||'{}');
    const lines = plan.map(d=>{
      const done = stored['d'+d.day] ? '✓ ' : '';
      const text = d.items.join(' • ');
      return '<div class="day-item"><strong>Day '+d.day+'</strong>: '+done+text+'</div>';
    });
    dayList.innerHTML = lines.join('');
    // update nodes from storage
    const circles = document.querySelectorAll('.path-map svg circle');
    circles.forEach(c=>{
      const n = 'd'+c.getAttribute('data-day');
      if(stored[n]) c.classList.add('active'); else c.classList.remove('active');
    });
  }

  if(mapBtn){
    mapBtn.addEventListener('click',()=>{
      const checked = Array.from(document.querySelectorAll('input[name="goals"]:checked')).map(i=>i.value);
      const intensity = document.getElementById('intensity').value;
      const plan = makePlan(checked,intensity);
      renderMap(plan);
    });
  }

  // accessibility: seed an example plan for first time visitors
  document.addEventListener('DOMContentLoaded',()=>{
    const seeded = localStorage.getItem('wellness_plan_seeded');
    if(!seeded){
      const plan = makePlan(['sleep','energy'],'med');
      renderMap(plan);
      localStorage.setItem('wellness_plan_seeded','1');
    }
  });

  // Small interactive: allow pressing numbers 1-9 to toggle correspond node
  document.addEventListener('keydown',(e)=>{
    const n = parseInt(e.key,10);
    if(n>=1 && n<=9){
      const circle = document.querySelector('.path-map svg circle[data-day="'+n+'"]');
      if(circle) circle.click();
    }
  });
})();