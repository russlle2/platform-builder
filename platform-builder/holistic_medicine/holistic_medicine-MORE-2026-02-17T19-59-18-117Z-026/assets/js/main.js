(function(){
  // Inventory logic: builds agenda and cadence based on checked areas
  function summarizeAreas(areas){
    const agenda = [];
    const cadence = [];
    const map = {
      sleep: ['Review sleep timing and wind-down habits','Try a 2-week sleep log'],
      energy: ['Assess midday routines and small movement breaks','Check-in 1 week after adjustments'],
      digestion: ['Note meal timing and stress-meal links','Follow-up after 2 weeks with symptom diary'],
      stress: ['Introduce short breathing tools and boundary micro-practices','Weekly check-ins until stable'],
      movement: ['Set 10-15 minute daily movement experiments','Bi-weekly progress review'],
      mood: ['Identify triggers and a mood-check routine','Short check-in in 10 days'],
      relationships: ['Map one boundary or connection to try','Follow-up in 2 sessions'],
      work: ['Create a tiny planning ritual for mornings','Review after 2 weeks']
    };
    const followMap = {
      sleep: 'Phone check at 7 days; 30-minute follow-up in 2 weeks',
      energy: 'Message check in 5 days; brief visit in 1 week',
      digestion: 'Food log review in 2 weeks',
      stress: 'Weekly 15-min touchpoint for 3 weeks',
      movement: 'Bi-weekly accountability check',
      mood: '10-day reflection and journaling review',
      relationships: '2-session review of boundary experiments',
      work: '2-week review; adjust rituals as needed'
    };

    areas.forEach(a=>{
      if(map[a]) agenda.push(map[a][0]);
      if(map[a]) cadence.push(followMap[a]);
    });

    // build a compact plan
    const plan = {
      agenda: agenda.length?agenda:["Quick review of daily routine and priorities"],
      cadence: cadence.length?cadence:["Follow-up suggestion: 1 check-in in 1 week and a 30-minute plan in 2 weeks"]
    };
    return plan;
  }

  document.addEventListener('DOMContentLoaded',function(){
    var form = document.getElementById('inventoryForm');
    var output = document.getElementById('inventoryOutput');
    var clearBtn = document.getElementById('clearInventory');
    var openInventoryBtn = document.getElementById('openInventory');

    form.addEventListener('submit',function(e){
      e.preventDefault();
      var checked = Array.from(form.querySelectorAll('input[name="areas"]:checked')).map(i=>i.value);
      var plan = summarizeAreas(checked);
      var html = '<strong>Suggested consultation agenda</strong>\n<ol>' + plan.agenda.map(a=>' <li>'+escapeHtml(a)+'</li>').join('') + '</ol>' +
                 '<strong>Recommended follow-up cadence</strong>\n<ul>' + plan.cadence.map(c=>' <li>'+escapeHtml(c)+'</li>').join('') + '</ul>';
      output.innerHTML = html.replace(/\n/g,'<br>');
    });

    clearBtn.addEventListener('click',function(){
      Array.from(form.querySelectorAll('input[name="areas"]')).forEach(i=>i.checked=false);
      output.innerHTML = '';
    });

    openInventoryBtn && openInventoryBtn.addEventListener('click',function(){
      document.getElementById('inventorySection').scrollIntoView({behavior:'smooth'});
    });

    // Guided exercise modal
    var exerciseModal = document.getElementById('exerciseModal');
    var openExercise = document.getElementById('openExercise');
    var closeExercise = document.getElementById('closeExercise');
    var exerciseArea = document.getElementById('exerciseArea');

    function setModal(open){
      exerciseModal.setAttribute('aria-hidden', open? 'false':'true');
    }
    openExercise && openExercise.addEventListener('click',function(){ setModal(true); });
    closeExercise && closeExercise.addEventListener('click',function(){ setModal(false); exerciseArea.innerHTML=''; });

    document.querySelectorAll('.ex-btn').forEach(function(btn){
      btn.addEventListener('click',function(){
        var type = btn.getAttribute('data-type');
        startExercise(type);
      });
    });

    function startExercise(type){
      exerciseArea.innerHTML = '';
      if(type==='breath') runBreathing(exerciseArea);
      if(type==='journaling') runJournaling(exerciseArea);
      if(type==='intention') runIntention(exerciseArea);
    }

    // Breathing: simple 4-4-6 cycle timer with visuals
    function runBreathing(container){
      var el = document.createElement('div'); el.className='breath';
      el.innerHTML = '<div class="bubble">Ready</div><div class="countdown"></div><div class="controls"><button class="stop">Stop</button></div>';
      container.appendChild(el);
      var bubble = el.querySelector('.bubble');
      var cd = el.querySelector('.countdown');
      var stop = el.querySelector('.stop');
      var running = true;
      stop.addEventListener('click',function(){ running=false; container.innerHTML=''; });

      var cycle = [ ['Breathe in',4], ['Hold',4], ['Exhale',6] ];
      var rounds = 3; // three cycles (~42s)
      var currentRound = 0;

      function step(i,sec){
        if(!running) return;
        if(currentRound>=rounds){ bubble.textContent='Complete'; cd.textContent=''; return; }
        bubble.textContent = cycle[i][0];
        var t = cycle[i][1];
        cd.textContent = t;
        var timer = setInterval(function(){
          t--; cd.textContent = t;
          if(t<=0){ clearInterval(timer); i = (i+1)%cycle.length; if(i===0) currentRound++; step(i,cycle[i][1]); }
        },1000);
      }
      step(0,cycle[0][1]);
    }

    // Journaling: two prompts and 2 minutes countdown per prompt
    function runJournaling(container){
      var el = document.createElement('div'); el.className='journ';
      container.appendChild(el);
      var prompts = ['What is one small change I could try this week?','What is a support I can ask for today?'];
      var index = 0;
      function showPrompt(){
        el.innerHTML = '<div class="prompt">'+escapeHtml(prompts[index])+'</div><textarea placeholder="Write freely for 2 minutes..." rows="6"></textarea><div class="timer">2:00</div><button class="next">Next</button>';
        var textarea = el.querySelector('textarea');
        var timer = el.querySelector('.timer');
        var next = el.querySelector('.next');
        var secs = 120;
        var tId = setInterval(function(){ secs--; timer.textContent = Math.floor(secs/60)+':' + (secs%60).toString().padStart(2,'0'); if(secs<=0){ clearInterval(tId); next.disabled=false; } },1000);
        next.disabled = true;
        next.addEventListener('click',function(){ index++; if(index<prompts.length) showPrompt(); else el.innerHTML = '<div class="done">All done — gently close this box when ready.</div>'; });
      }
      showPrompt();
    }

    // Intention: quick selector and persistent note
    function runIntention(container){
      var el = document.createElement('div'); el.className='intend';
      el.innerHTML = '<div class="options"><button data-i="focus">Focus on one task</button><button data-i="kindness">Kindness to self</button><button data-i="gratitude">Notice one small good thing</button></div><div class="set"></div>';
      container.appendChild(el);
      el.querySelectorAll('button[data-i]').forEach(function(b){ b.addEventListener('click',function(){ var v=b.getAttribute('data-i'); var set = el.querySelector('.set'); set.innerHTML = '<div class="selected">Intention saved: <strong>'+escapeHtml(b.textContent)+'</strong>. Keep it visible today.</div>'; localStorage.setItem('lastIntention',b.textContent); }); });
      var last = localStorage.getItem('lastIntention'); if(last){ el.querySelector('.set').innerHTML = '<div class="selected">Last intention: <em>'+escapeHtml(last)+'</em></div>'; }
    }

    function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  });
})();
