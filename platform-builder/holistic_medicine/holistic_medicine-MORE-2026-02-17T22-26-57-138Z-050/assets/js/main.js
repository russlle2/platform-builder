(function(){
  'use strict';
  // Scroll-triggered reveal
  function initReveal(){
    var prefersReduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    var items = document.querySelectorAll('.reveal');
    if(prefersReduced){
      items.forEach(function(i){i.classList.add('visible');});
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    },{threshold:0.12});
    items.forEach(function(i){io.observe(i);});
  }

  // Modal (guided exercise)
  var tryBtn = document.getElementById('try-btn');
  var modal = document.getElementById('exercise-modal');
  var backdrop = document.getElementById('modal-backdrop');
  var closeBtn = document.getElementById('exercise-close');
  var area = document.getElementById('exercise-area');

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    backdrop.setAttribute('aria-hidden','false');
    tryBtn.setAttribute('aria-expanded','true');
    area.innerHTML = '';
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    backdrop.setAttribute('aria-hidden','true');
    tryBtn.setAttribute('aria-expanded','false');
    document.body.style.overflow = '';
  }

  tryBtn.addEventListener('click',function(){openModal();});
  closeBtn.addEventListener('click',closeModal);
  backdrop.addEventListener('click',closeModal);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeModal();}});

  // Exercises
  function startBreathing(){
    area.innerHTML = '';
    var info = document.createElement('p');
    info.textContent = 'Find a comfortable seat. Follow the circle as it expands and contracts for 2 minutes.';
    var circle = document.createElement('div');
    circle.style.width = '120px';
    circle.style.height = '120px';
    circle.style.borderRadius = '50%';
    circle.style.margin = '12px auto';
    circle.style.background = 'radial-gradient(circle at 30% 30%, #f7f0ea, #e0c8a8)';
    circle.style.transition = 'transform 3s ease-in-out';
    area.appendChild(info);
    area.appendChild(circle);

    var cycles = 20; // about 2 minutes (3s inhale/3s exhale)
    var count = 0;
    var running = true;
    function step(){
      if(!running || count>=cycles){
        circle.style.transform = 'scale(1)';
        var done = document.createElement('p'); done.textContent = 'Completed a short breathing cycle.';area.appendChild(done);
        return;
      }
      // expand
      circle.style.transform = 'scale(1.3)';
      setTimeout(function(){
        circle.style.transform = 'scale(0.85)';
        count++;
        setTimeout(function(){if(running) step();},3000);
      },3000);
    }
    step();

    // provide stop control
    var stop = document.createElement('button'); stop.textContent = 'Stop'; stop.className='ex-btn'; stop.style.marginTop='10px';
    stop.addEventListener('click',function(){running=false;});
    area.appendChild(stop);
  }

  function startJournal(){
    area.innerHTML = '';
    var p = document.createElement('p');
    p.textContent = 'Set a timer for 5 minutes and write freely. Use this prompt to begin:';
    var q = document.createElement('blockquote'); q.textContent = 'What is one small change I can try this week to support my energy or mood?';
    var ta = document.createElement('textarea'); ta.rows=8; ta.style.width='100%'; ta.placeholder='Write here...';
    var save = document.createElement('button'); save.textContent='Save to file'; save.className='ex-btn';
    save.addEventListener('click',function(){
      var blob = new Blob([ta.value],{type:'text/plain'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href=url; a.download='journal.txt'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){URL.revokeObjectURL(url);},1000);
    });
    area.appendChild(p); area.appendChild(q); area.appendChild(ta); area.appendChild(save);
  }

  function startIntent(){
    area.innerHTML='';
    var p = document.createElement('p'); p.textContent='Pick one intention that is specific and small. Write it here and choose a cue that will remind you.';
    var inText = document.createElement('input'); inText.type='text'; inText.placeholder='My small intention (e.g., 10 min walk at lunch)'; inText.style.width='100%'; inText.style.marginBottom='8px';
    var cue = document.createElement('input'); cue.type='text'; cue.placeholder='Cue (e.g., after morning coffee)'; cue.style.width='100%';
    var save = document.createElement('button'); save.textContent='Record intention'; save.className='ex-btn';
    save.addEventListener('click',function(){
      area.innerHTML = '<p>Saved. Try pairing this intention with the chosen cue for 3 days and note what changed.</p>';
    });
    area.appendChild(p); area.appendChild(inText); area.appendChild(cue); area.appendChild(save);
  }

  // wire exercise buttons
  document.querySelectorAll('.ex-btn[data-ex]').forEach(function(b){
    b.addEventListener('click',function(){
      var ex = b.getAttribute('data-ex');
      if(ex==='breath') startBreathing();
      if(ex==='journal') startJournal();
      if(ex==='intent') startIntent();
    });
  });

  // primary CTA quick link
  var primary = document.getElementById('primary-cta');
  if(primary){ primary.addEventListener('click',function(e){
    var href = primary.getAttribute('data-href') || 'book.html';
    // redirect
    window.location.href = href;
  }); }

  // init
  document.addEventListener('DOMContentLoaded',function(){initReveal();});
})();