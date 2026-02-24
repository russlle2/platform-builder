document.addEventListener('DOMContentLoaded',function(){
  // Timeline planner logic
  const weekInputs = document.querySelectorAll('.phase input.weeks');
  const timelineBar = document.getElementById('timelineBar');
  const timelineLabels = document.getElementById('timelineLabels');

  function renderTimeline(){
    const values = Array.from(weekInputs).map(i=>Math.max(1,parseInt(i.value)||1));
    const total = values.reduce((a,b)=>a+b,0);
    timelineBar.innerHTML = '';
    timelineLabels.innerHTML = '';
    values.forEach((val,idx)=>{
      const pct = Math.round((val/total)*100);
      const seg = document.createElement('div');
      seg.className = 'timeline-seg';
      seg.style.flex = String(val);
      seg.style.background = `linear-gradient(90deg, rgba(59,124,107,${0.08*(idx+1)}), rgba(255,209,102,${0.03*(idx+1)}))`;
      seg.textContent = `${pct}%`;
      timelineBar.appendChild(seg);

      const lab = document.createElement('div');
      lab.className = 'timeline-label';
      lab.textContent = `Phase ${idx+1}: ${val}w`;
      timelineLabels.appendChild(lab);
    });
  }
  weekInputs.forEach(i=>i.addEventListener('input',renderTimeline));
  renderTimeline();

  // Proof Gallery logic
  const testimonials = [
    {text:'"I finally had a plan I could test and measure — the slow approach worked for me."',author:'— M., Seattle'},
    {text:'"Helpful education and real, sustainable small changes that fit my schedule."',author:'— K., Austin'},
    {text:'"A clear roadmap that felt flexible. We tracked simple signals and it changed how I made choices."',author:'— R., Denver'}
  ];
  let current = 0;
  const tText = document.getElementById('testimonialText');
  const tAuthor = document.getElementById('testimonialAuthor');
  const prevBtn = document.getElementById('prevTestimonial');
  const nextBtn = document.getElementById('nextTestimonial');

  function showTestimonial(i){
    current = (i+testimonials.length)%testimonials.length;
    tText.textContent = testimonials[current].text;
    tAuthor.textContent = testimonials[current].author;
  }
  prevBtn.addEventListener('click',()=>showTestimonial(current-1));
  nextBtn.addEventListener('click',()=>showTestimonial(current+1));
  let rotate = setInterval(()=>showTestimonial(current+1),6000);
  [prevBtn,nextBtn,tText].forEach(el=>el.addEventListener('mouseenter',()=>clearInterval(rotate)));
  [prevBtn,nextBtn,tText].forEach(el=>el.addEventListener('mouseleave',()=>rotate=setInterval(()=>showTestimonial(current+1),6000)));
  showTestimonial(0);

  // Badge tooltips accessible enhancement (keyboard)
  const badges = document.querySelectorAll('.badge[data-tooltip]');
  badges.forEach(b=>{
    b.setAttribute('tabindex','0');
    b.addEventListener('focus',()=>b.classList.add('focused'));
    b.addEventListener('blur',()=>b.classList.remove('focused'));
  });

  // Simple URL placeholder substitution for client-side preview (not required for server)
  function injectPlaceholders(){
    const holders = document.body.innerHTML.match(/{{[A-Z_]+}}/g) || [];
    holders.forEach(key=>{
      // leave placeholders in place; no default injection for privacy
    });
  }
  injectPlaceholders();
});