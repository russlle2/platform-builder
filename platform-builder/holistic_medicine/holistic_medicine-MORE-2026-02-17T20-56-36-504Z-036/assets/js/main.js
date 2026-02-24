(function(){
  // Timeline planner logic
  function addWeeks(date, weeks){
    const d = new Date(date);
    d.setDate(d.getDate() + weeks*7);
    return d;
  }
  function formatDate(d){
    return d.toLocaleDateString();
  }
  const planBtn = document.getElementById('planBtn');
  const startInput = document.getElementById('startDate');
  const speedSelect = document.getElementById('speed');
  const output = document.getElementById('timelineOutput');

  function computeTimeline(){
    const startVal = startInput.value;
    if(!startVal){
      alert('Pick a start date to plan your cycle.');
      return;
    }
    const speed = speedSelect.value;
    let weeks = [4,8,12];
    if(speed==='fast') weeks = [3,6,9];
    if(speed==='gentle') weeks = [6,12,18];

    const start = new Date(startVal);
    const p1End = addWeeks(start, weeks[0]);
    const p2End = addWeeks(p1End, weeks[1]);
    const p3End = addWeeks(p2End, weeks[2]);

    const phases = output.querySelectorAll('.phase');
    phases.forEach(function(el){
      const n = el.getAttribute('data-phase');
      if(n==='1') el.querySelector('.dates').textContent = formatDate(start) + ' → ' + formatDate(p1End);
      if(n==='2') el.querySelector('.dates').textContent = formatDate(p1End) + ' → ' + formatDate(p2End);
      if(n==='3') el.querySelector('.dates').textContent = formatDate(p2End) + ' → ' + formatDate(p3End);
    });
  }
  if(planBtn){ planBtn.addEventListener('click', computeTimeline); }

  // Proof Gallery: rotating testimonials and badges with tooltips
  const testimonials = [
    {text:'"The cohort helped me find tiny habits that actually stuck. The peer check-ins kept me honest." — A cohort member'},
    {text:'"I finally understood how to pace energy across my week. The clinician suggestions were practical and kind." — Participant'},
    {text:'"The short-cycle approach made change feel possible. I wasn\'t overwhelmed and I made measurable gains." — Member'}
  ];
  let tIndex = 0;
  const quoteEl = document.querySelector('#testimonials .quote');
  function showTestimonial(i){
    if(!quoteEl) return;
    quoteEl.style.opacity = 0; 
    setTimeout(function(){
      quoteEl.textContent = testimonials[i].text;
      quoteEl.style.opacity = 1;
    },300);
  }
  if(quoteEl){
    showTestimonial(tIndex);
    setInterval(function(){
      tIndex = (tIndex+1) % testimonials.length;
      showTestimonial(tIndex);
    },5000);
  }

  // Badges tooltip behavior
  const badges = document.querySelectorAll('#badges .badge');
  badges.forEach(function(b){
    const tip = b.getAttribute('data-tip');
    if(!tip) return;
    const tipEl = document.createElement('div');
    tipEl.className = 'badge-tip';
    tipEl.textContent = tip;
    tipEl.style.position = 'absolute';
    tipEl.style.padding = '6px 8px';
    tipEl.style.background = 'rgba(7,54,66,0.95)';
    tipEl.style.color = 'white';
    tipEl.style.fontSize = '13px';
    tipEl.style.borderRadius = '6px';
    tipEl.style.transform = 'translateY(-8px)';
    tipEl.style.whiteSpace = 'nowrap';
    tipEl.style.pointerEvents = 'none';
    tipEl.style.opacity = 0;
    tipEl.style.transition = 'opacity .18s ease, transform .18s ease';
    document.body.appendChild(tipEl);

    function pos(){
      const r = b.getBoundingClientRect();
      tipEl.style.left = (r.left + window.scrollX + r.width/2 - tipEl.offsetWidth/2) + 'px';
      tipEl.style.top = (r.top + window.scrollY - tipEl.offsetHeight - 8) + 'px';
    }
    b.addEventListener('mouseenter', function(){
      tipEl.style.opacity = 1;
      tipEl.style.transform = 'translateY(-12px)';
      pos();
    });
    b.addEventListener('mouseleave', function(){
      tipEl.style.opacity = 0; tipEl.style.transform = 'translateY(-8px)';
    });
    window.addEventListener('resize', pos);
  });

  // Small UX: phone toggle reveals contact on small screens
  const phoneToggle = document.getElementById('phoneToggle');
  if(phoneToggle){
    phoneToggle.addEventListener('click', function(){
      alert('Call us at: ' + '{{PHONE}}' + '\nOr email: ' + '{{EMAIL}}');
    });
  }
})();
