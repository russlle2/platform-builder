(function(){
  // Utilities
  function byId(id){return document.getElementById(id)}

  // Modal logic
  var modal = byId('exercise-modal');
  var openBtn = byId('open-exercise');
  var closeBtn = byId('close-exercise');
  var tabs = document.querySelectorAll('.exercise-tabs .tab');
  var content = byId('exercise-content');
  var currentMode = 'breathing';

  function openModal(){modal.setAttribute('aria-hidden','false');renderMode(currentMode)}
  function closeModal(){modal.setAttribute('aria-hidden','true');stopBreathingCycle()}

  openBtn && openBtn.addEventListener('click',openModal);
  closeBtn && closeBtn.addEventListener('click',closeModal);

  tabs.forEach(function(tab){tab.addEventListener('click',function(){tabs.forEach(t=>t.classList.remove('active'));tab.classList.add('active');currentMode=tab.dataset.mode;renderMode(currentMode)});});

  // Guided breathing cycle
  var breathingTimer = null; var breathingStep = 0;
  function renderMode(mode){
    if(mode==='breathing'){
      content.innerHTML='\n        <div class="breathing-visual">\n          <div class="breath-circle" id="breath-circle" aria-hidden="true"></div>\n        </div>\n        <div class="controls">\n          <div id="breath-instruction">Get ready</div>\n          <div style="margin-top:8px"><button id="start-breath">Start 1-minute practice</button> <button id="stop-breath">Stop</button></div>\n        </div>';
      byId('start-breath').addEventListener('click',startBreathingCycle);
      byId('stop-breath').addEventListener('click',stopBreathingCycle);
    } else if(mode==='journaling'){
      content.innerHTML='\n        <div class="journal-area">\n          <p><em>Prompt:</em> Name one small win from today and one next step.</p>\n          <textarea id="journal-input" placeholder="Write for 5 minutes..."></textarea>\n          <div style="margin-top:8px"><button id="save-journal">Save note</button> <button id="start-journal-timer">5-min timer</button> <span id="journal-countdown"></span></div>\n        </div>';
      byId('save-journal').addEventListener('click',function(){localStorage.setItem('lastJournal',byId('journal-input').value);alert('Saved to local notes.');});
      byId('start-journal-timer').addEventListener('click',function(){startCountdown(300,byId('journal-countdown'))});
    } else if(mode==='intention'){
      content.innerHTML='\n        <div class="intention-area">\n          <p>Three quick steps to set an intention:</p>\n          <ol>\n            <li>Name one focus for today (30s)</li>\n            <li>Choose a first tiny action (30s)</li>\n            <li>Affirm it aloud (15s)</li>\n          </ol>\n          <div><input id="intention-text" placeholder="My focus for today..." style="width:70%"><button id="save-intent">Save</button></div>\n        </div>';
      byId('save-intent').addEventListener('click',function(){localStorage.setItem('todayIntent',byId('intention-text').value);alert('Intention saved.');});
    }
  }

  // Breathing functions
  function startBreathingCycle(){
    var circle = byId('breath-circle');
    var label = byId('breath-instruction');
    if(breathingTimer) clearInterval(breathingTimer);
    breathingStep = 0;
    var cycle = ['Breathe in','Hold','Breathe out','Hold'];
    var durations = [4,4,6,2]; // seconds
    var stepTime = 0;
    var totalSeconds = 60; // 1 minute session
    var elapsed = 0;
    label.textContent = cycle[0];
    breathingTimer = setInterval(function(){
      stepTime++;
      elapsed++;
      // animate circle
      if(cycle[breathingStep].startsWith('Breathe in')){
        circle.style.transform = 'scale(1.25)';
      } else if(cycle[breathingStep].startsWith('Breathe out')){
        circle.style.transform = 'scale(0.7)';
      }
      if(stepTime>=durations[breathingStep]){
        breathingStep = (breathingStep+1) % cycle.length; stepTime = 0; label.textContent = cycle[breathingStep];
      }
      if(elapsed>=totalSeconds){stopBreathingCycle();label.textContent='Complete — well done.'}
    },1000);
  }
  function stopBreathingCycle(){ if(breathingTimer){clearInterval(breathingTimer);breathingTimer=null;} var circle=byId('breath-circle'); if(circle)circle.style.transform='scale(1)'; }

  // Simple countdown for journaling
  function startCountdown(seconds,display){
    var remaining = seconds; display.textContent = formatTime(remaining);
    var t = setInterval(function(){remaining--; display.textContent = formatTime(remaining); if(remaining<=0)clearInterval(t);},1000);
  }
  function formatTime(s){var m=Math.floor(s/60);var sec=s%60;return m+':'+(sec<10?'0'+sec:sec)}

  // Habit generator and printable checklist
  var openChallenge = byId('open-challenge');
  var hbSection = byId('habit-builder');
  var genBtn = byId('generate-challenge');
  var printBtn = byId('print-challenge');
  var output = byId('challenge-output');

  openChallenge && openChallenge.addEventListener('click',function(){hbSection.setAttribute('aria-hidden','false');hbSection.scrollIntoView({behavior:'smooth'});});

  genBtn && genBtn.addEventListener('click',function(){
    var name = byId('habit-name').value || 'Daily practice';
    var intensity = byId('habit-intensity').value;
    var start = byId('start-date').value? new Date(byId('start-date').value): new Date();
    var days = [];
    for(var i=0;i<7;i++){var d = new Date(start.getTime()); d.setDate(start.getDate()+i); days.push(d);}
    var durationText = intensity==='low'? '2–5 min': intensity==='med'? '6–12 min':'15+ min';
    // build checklist HTML
    var html = '<div class="print-only"><h3>'+escapeHtml(name)+' — 7-day checklist</h3><p>Estimated: '+durationText+'</p></div>';
    html += '<ul class="checklist">';
    days.forEach(function(dd,idx){html += '<li><label><input type="checkbox"> '+(idx+1)+'. '+formatDate(dd)+' — '+escapeHtml(name)+'</label></li>';});
    html += '</ul>';
    output.innerHTML = html;
  });

  printBtn && printBtn.addEventListener('click',function(){
    var name = byId('habit-name').value || 'Daily practice';
    var intensity = byId('habit-intensity').value;
    var start = byId('start-date').value? new Date(byId('start-date').value): new Date();
    var days = [];
    for(var i=0;i<7;i++){var d = new Date(start.getTime()); d.setDate(start.getDate()+i); days.push(d);}
    var durationText = intensity==='low'? '2–5 min': intensity==='med'? '6–12 min':'15+ min';
    var doc = window.open('','_blank');
    var content = '<!doctype html><html><head><meta charset="utf-8"><title>Checklist</title><style>body{font-family:system-ui;padding:20px}h3{color:#134727}ul{list-style:none;padding:0}li{margin:8px 0}</style></head><body>';
    content += '<h3>'+escapeHtml(name)+' — 7-day checklist</h3><p>Estimated: '+durationText+'</p><ul>';
    days.forEach(function(dd,idx){content += '<li><input type="checkbox"> '+(idx+1)+'. '+formatDate(dd)+'</li>';});
    content += '</ul><script>window.onload=function(){window.print();}</script></body></html>';
    doc.documentElement.innerHTML = content;
  });

  function formatDate(d){return d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}
  function escapeHtml(s){return s.replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  // Close modal on overlay click
  modal.addEventListener('click',function(e){if(e.target===modal)closeModal();});

  // Initialize default mode
  renderMode(currentMode);
})();