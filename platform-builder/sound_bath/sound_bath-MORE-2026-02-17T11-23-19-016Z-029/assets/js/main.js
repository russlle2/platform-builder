(function(){
  // Document-ready
  function q(s){return document.querySelector(s)}
  function qa(s){return document.querySelectorAll(s)}

  // Year in footer
  var yr=q('#yr'); if(yr) yr.textContent=new Date().getFullYear();

  // Mock next-event data (would be seeded server-side)
  var nextEvent = {title:'Resonance Intensive — Evening', date:'Mar 10, 2026', desc:'An hour of guided tones and practical integration.'};
  var neTitle=q('#next-event-title'); var neDate=q('#next-event-date'); var neDesc=q('#next-event-desc');
  if(neTitle) neTitle.textContent=nextEvent.title;
  if(neDate) neDate.textContent=nextEvent.date;
  if(neDesc) neDesc.textContent=nextEvent.desc;

  // Pricing Comparator (works for any .comparator)
  function initComparators(){
    var comps = document.querySelectorAll('.comparator');
    comps.forEach(function(comp){
      var targetsAttr = comp.getAttribute('data-targets');
      var targets = targetsAttr ? JSON.parse(targetsAttr) : {monthly:30,package:250};
      var toggles = [];
      var els = comp.querySelectorAll('.cmp-toggle');
      els.forEach(function(btn){ toggles.push(btn); btn.addEventListener('click',function(){
          // set pressed
          els.forEach(function(b){b.setAttribute('aria-pressed','false')});
          btn.setAttribute('aria-pressed','true');
          var label = btn.textContent.trim().toLowerCase();
          var val = targets[label] || targets['package'];
          animateNumber(comp.querySelector('.price-number'),val);
        })});
      // initialize: find pressed or default to package
      var active = comp.querySelector('.cmp-toggle[aria-pressed="true"]') || els[els.length-1];
      if(active){ var lab=active.textContent.trim().toLowerCase(); animateNumber(comp.querySelector('.price-number'), targets[lab] || targets['package']); }
    });
  }

  function animateNumber(el, to){ if(!el) return; var from = parseFloat(el.textContent)||0; var duration=500; var start=performance.now();
    function step(ts){ var p=Math.min(1,(ts-start)/duration); var val = Math.round(from + (to-from)*ease(p)); el.textContent=val; if(p<1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  function ease(t){ return t<0.5?2*t*t: -1+(4-2*t)*t }

  // Testimonials rotator + badges tooltips
  var testimonials = [
    {quote:'I arrived distracted and left with a practical reset — the clarity lasted days.',who:'— M.S., educator',badges:['Mindful Harbor']},
    {quote:'Thoughtful facilitation and a respectful, calm room. Great for teams.',who:'— R.T., product lead',badges:['Studio Collective']},
    {quote:'A contained, precise practice that works with how my nervous system actually responds.',who:'— L.K., therapist',badges:['WellPath Clinicians']}
  ];

  function renderTestimonial(i){
    var wrap=q('#testimonial-rotator'); if(!wrap) return;
    var t=testimonials[i];
    wrap.innerHTML='';
    var div=document.createElement('div'); div.className='testimonial';
    div.innerHTML='<p>"'+t.quote+'"</p><div class="who">'+t.who+'</div>';
    wrap.appendChild(div);
    // highlight badges list items that match
    var badgeEls = document.querySelectorAll('#cred-badges .badge');
    badgeEls.forEach(function(b){
      var tip = b.getAttribute('data-tip')||b.textContent;
      if(t.badges && t.badges.indexOf(b.textContent.trim())>-1){ b.style.boxShadow='0 0 0 2px rgba(183,227,215,0.12)'; }
      else b.style.boxShadow='none';
    });
  }

  var cur=0; function cycleTestimonials(){ renderTestimonial(cur); cur=(cur+1)%testimonials.length; }
  cycleTestimonials(); var rot=setInterval(cycleTestimonials,5000);

  // Badge tooltips (simple)
  var tooltip=q('#tooltip');
  document.addEventListener('mouseover',function(e){
    var el = e.target.closest('.badge'); if(!el) return;
    var txt = el.getAttribute('data-tip')||el.textContent;
    tooltip.textContent=txt; tooltip.hidden=false;
    var r = el.getBoundingClientRect(); tooltip.style.top = (r.bottom + 8)+'px'; tooltip.style.left = (r.left)+'px';
  });
  document.addEventListener('mouseout',function(e){ if(e.target.closest && e.target.closest('.badge')){ tooltip.hidden=true; }});

  // Keyboard accessibility: pause rotator on focus
  document.addEventListener('focusin',function(e){ if(e.target.closest && e.target.closest('#testimonial-rotator')) clearInterval(rot); });

  // Init comparators
  initComparators();

  // Simple safety note console log (visible to site maintainers)
  console.info('Site initialized. Reminder: enforce contraindications and contact clinicians when necessary.');
})();
