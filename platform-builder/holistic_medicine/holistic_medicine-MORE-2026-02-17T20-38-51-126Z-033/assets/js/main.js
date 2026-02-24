(function(){
  // Simple nav toggle
  var btn=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.nav');
  if(btn){btn.addEventListener('click',function(){
    var expanded = this.getAttribute('aria-expanded')==='true';
    this.setAttribute('aria-expanded',!expanded);
    if(nav.style.display==='flex'){nav.style.display='none'}else{nav.style.display='flex'}
  });}

  // Timeline planner logic
  var planner=document.getElementById('timelinePlanner');
  function calcRoadmap(){
    if(!planner) return;
    var phases=planner.querySelectorAll('.phase');
    var total=0; var names=[];
    phases.forEach(function(p){
      var weeks = parseInt(p.querySelector('.weeks').value||0,10);
      total += weeks;
      names.push(p.querySelector('h4').textContent.replace(' —',''));
    });
    var out = document.getElementById('roadmapOutput');
    if(out){ out.textContent = 'Total: '+total+' weeks • Focus: '+names.join(' → '); }
  }
  if(planner){planner.addEventListener('input',calcRoadmap);calcRoadmap();}

  // Testimonial rotator
  var testimonials = [
    {text: 'The checkpoints helped me move small things forward without overwhelm.', who: '— A patient in care'},
    {text: 'Clear instruction and real-world adaptions made the plan stick.', who: '— Program participant'},
    {text: 'Helpful listening and practical steps; we adjusted as new info emerged.', who: '— Client partner'}
  ];
  var tIndex=0;
  var view=document.getElementById('testimonialViewport');
  function renderTestimonial(i){
    if(!view) return;
    var t = testimonials[i%testimonials.length];
    view.innerHTML = '<blockquote>"'+t.text+'"<footer>'+t.who+'</footer></blockquote>';
  }
  renderTestimonial(0);
  document.getElementById('nextTest')?.addEventListener('click',function(){ tIndex=(tIndex+1)%testimonials.length; renderTestimonial(tIndex); });
  document.getElementById('prevTest')?.addEventListener('click',function(){ tIndex=(tIndex-1+testimonials.length)%testimonials.length; renderTestimonial(tIndex); });
  // auto-rotate
  setInterval(function(){ tIndex=(tIndex+1)%testimonials.length; renderTestimonial(tIndex); },6000);

  // Badges tooltip
  var badges = document.querySelectorAll('.badge');
  var tip = document.getElementById('badgeTooltip');
  badges.forEach(function(b){
    b.addEventListener('mouseenter',function(e){
      var text = b.getAttribute('data-tip');
      tip.textContent = text; tip.style.display='block'; tip.setAttribute('aria-hidden','false');
      var r = b.getBoundingClientRect();
      tip.style.top = (r.top + window.scrollY - r.height - 12) + 'px';
      tip.style.left = (r.left + window.scrollX) + 'px';
    });
    b.addEventListener('mouseleave',function(){ tip.style.display='none'; tip.setAttribute('aria-hidden','true'); });
  });

  // Small accessibility: allow click-to-focus on badges
  badges.forEach(function(b){ b.addEventListener('click',function(){ alert(b.getAttribute('data-tip')); }); });

  // Save planner state to localStorage (educational sketch)
  if(planner){
    function save(){
      var phases = [];
      planner.querySelectorAll('.phase').forEach(function(p){
        phases.push({weeks:p.querySelector('.weeks').value, activities: Array.from(p.querySelectorAll('.activity')).filter(a=>a.checked).map(a=>a.value)});
      });
      localStorage.setItem('timelineSketch', JSON.stringify(phases));
    }
    planner.addEventListener('change',save);
    // restore
    var saved = localStorage.getItem('timelineSketch');
    if(saved){ try{ var parsed=JSON.parse(saved); planner.querySelectorAll('.phase').forEach(function(p,i){ if(parsed[i]){ p.querySelector('.weeks').value = parsed[i].weeks; Array.from(p.querySelectorAll('.activity')).forEach(function(a){ a.checked = parsed[i].activities.indexOf(a.value)!==-1; }); }}); calcRoadmap(); }catch(e){}
    }
  }
})();
