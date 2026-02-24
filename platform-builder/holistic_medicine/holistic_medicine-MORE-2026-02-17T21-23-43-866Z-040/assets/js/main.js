(function(){
  // Scroll reveal with prefers-reduced-motion support
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function revealSetup(){
    var nodes = document.querySelectorAll('.reveal');
    if(prefersReduced){
      nodes.forEach(function(n){n.classList.add('visible')});
      return;
    }
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    },{root:null,threshold:0.12});
    nodes.forEach(function(n){obs.observe(n)});
  }
  document.addEventListener('DOMContentLoaded',revealSetup);

  // Modal logic for guided exercises
  var tryBtn = document.getElementById('try-btn');
  var modal = document.getElementById('exercise-modal');
  var closeBtn = document.getElementById('modal-close');
  var options = document.querySelectorAll('.exercise-option');
  var area = document.getElementById('exercise-area');
  var activeTimer = null;

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    area.hidden = true;
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    clearActive();
  }
  function clearActive(){
    if(activeTimer){clearInterval(activeTimer);activeTimer=null}
    area.innerHTML = '';
  }

  tryBtn && tryBtn.addEventListener('click',openModal);
  closeBtn && closeBtn.addEventListener('click',closeModal);
  modal.addEventListener('click',function(e){if(e.target===modal)closeModal()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal()});

  options.forEach(function(btn){
    btn.addEventListener('click',function(){
      var type = btn.getAttribute('data-type');
      startExercise(type);
    });
  });

  function startExercise(type){
    clearActive();
    area.hidden = false;
    if(type==='breath'){
      startBreathing();
    } else if(type==='journaling'){
      startJournaling();
    } else if(type==='intention'){
      startIntention();
    }
  }

  function startBreathing(){
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var container = document.createElement('div');
    var circle = document.createElement('div');
    var text = document.createElement('div');
    container.className='breath-wrap';
    circle.style.width='120px';
    circle.style.height='120px';
    circle.style.margin='8px auto';
    circle.style.borderRadius='50%';
    circle.style.background='radial-gradient(circle at 30% 30%, rgba(126,231,199,0.2), rgba(168,216,255,0.08))';
    text.style.textAlign='center';
    text.style.color='var(--muted)';
    container.appendChild(circle);
    container.appendChild(text);
    area.appendChild(container);

    if(prefersReduced){
      text.textContent='Take three slow breaths. Inhale for 4, exhale for 6. Pause if you need.';
      return;
    }
    var phases = [ {label:'Inhale',ms:4000},{label:'Hold',ms:2000},{label:'Exhale',ms:6000} ];
    var i=0;
    function cycle(){
      var p=phases[i%phases.length];
      text.textContent=p.label;
      // animate circle
      if(p.label==='Inhale'){
        circle.animate([{transform:'scale(.6)'},{transform:'scale(1.15)'}],{duration:p.ms,fill:'forwards'});
      } else if(p.label==='Hold'){
        circle.animate([{transform:'scale(1.15)'},{transform:'scale(1.15)'}],{duration:p.ms,fill:'forwards'});
      } else {
        circle.animate([{transform:'scale(1.15)'},{transform:'scale(.6)'}],{duration:p.ms,fill:'forwards'});
      }
      i++;
    }
    cycle();
    activeTimer = setInterval(cycle,  (4000+2000+6000) );
  }

  function startJournaling(){
    var container = document.createElement('div');
    var prompt = document.createElement('div');
    var textarea = document.createElement('textarea');
    var timer = document.createElement('div');
    container.className='journ-wrap';
    prompt.textContent='Prompt: What would make the next 24 hours feel a little kinder to you? 5 minutes.';
    prompt.style.color='var(--muted)';
    textarea.style.width='100%';
    textarea.style.minHeight='120px';
    textarea.style.marginTop='8px';
    timer.style.marginTop='8px';
    container.appendChild(prompt);
    container.appendChild(textarea);
    container.appendChild(timer);
    area.appendChild(container);

    var seconds = 300; // 5 minutes
    function render(){
      var mins = Math.floor(seconds/60); var secs = seconds%60; timer.textContent='Time left: '+mins+':'+(secs<10?('0'+secs):secs);
    }
    render();
    activeTimer = setInterval(function(){
      seconds--; if(seconds<=0){clearInterval(activeTimer);activeTimer=null;timer.textContent='Time. Take a breath.';} else {render()}
    },1000);
  }

  function startIntention(){
    var container = document.createElement('div');
    var label = document.createElement('div');
    var input = document.createElement('input');
    var save = document.createElement('button');
    label.textContent='Write a short intention (one sentence)';
    label.style.color='var(--muted)';
    input.type='text'; input.style.width='100%'; input.style.marginTop='8px'; input.placeholder='E.g. Today I will notice when I need a pause.';
    save.textContent='Save to my recap'; save.className='button'; save.style.marginTop='8px';
    container.appendChild(label); container.appendChild(input); container.appendChild(save); area.appendChild(container);

    save.addEventListener('click',function(){
      var val = input.value.trim();
      if(!val) return;
      try{ localStorage.setItem('last_intention', val); }catch(e){}
      var ok = document.createElement('div'); ok.textContent='Saved — your intention is stored locally.'; ok.style.color='var(--accent1)'; ok.style.marginTop='8px'; container.appendChild(ok);
    });
  }

})();