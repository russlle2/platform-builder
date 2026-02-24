(function(){
  // Mobile nav toggle
  document.addEventListener('click',function(e){
    if(e.target && e.target.classList && e.target.classList.contains('mobile-toggle')){
      document.querySelectorAll('.nav a').forEach(function(a){a.style.display = a.style.display === 'inline-block' ? 'none' : 'inline-block'});
    }
  });

  // Session Planner
  var spGenerate = document.getElementById('sp-generate');
  var spCopy = document.getElementById('sp-copy');
  var spDownload = document.getElementById('sp-download');
  var spOutput = document.getElementById('sp-output');

  function buildPlan(){
    var name = document.getElementById('sp-name').value.trim() || 'Client';
    var goal = document.getElementById('sp-goal').value.trim() || 'Clarify outcome';
    var length = document.getElementById('sp-length').value;
    var count = parseInt(document.getElementById('sp-count').value,10) || 4;
    var checks = Array.from(document.querySelectorAll('#session-planner .chips input:checked')).map(function(i){return i.value});
    if(checks.length===0) checks.push('General rhythm');

    var header = name + " — Session plan\n";
    header += "Goal: " + goal + "\nFocus: " + checks.join(', ') + "\nSession length: " + length + "\nNumber of sessions: " + count + "\n\n";

    var body = '';
    for(var i=1;i<=count;i++){
      body += "Session " + i + ":\n";
      body += "  - Review: 5–10 min check-in on last week\n";
      body += "  - Micro-action: Pick 1 micro-habit to test (suggested: " + generateMicro(goal) + ")\n";
      body += "  - Strategy: one adjustment to the cues or the environment\n";
      body += "  - Measurement: simple checkpoint (time, count, mood)\n\n";
    }

    var footer = "Notes: Keep micro-actions under 5 minutes when possible. Re-assess after session " + Math.min(4,count) + ".\n";

    var plan = header + body + footer;
    spOutput.textContent = plan;
    spDownload.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(plan);
  }

  function generateMicro(goal){
    var verbs = ['1-minute pause','10-minute walk','single deep-breath habit','glass of water on waking','5-minute journaling','screen-free wind-down'];
    var idx = Math.abs(hashCode(goal)) % verbs.length;
    return verbs[idx];
  }

  function hashCode(str){
    var h=0;for(var i=0;i<str.length;i++){h = ((h<<5)-h) + str.charCodeAt(i);h |= 0}return h;
  }

  if(spGenerate){spGenerate.addEventListener('click',function(){buildPlan()})}
  if(spCopy){spCopy.addEventListener('click',function(){
    var txt = spOutput.textContent || '';
    navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(txt).then(function(){
      spCopy.textContent = 'Copied'; setTimeout(function(){spCopy.textContent='Copy summary'},1500);
    }) : fallbackCopy(txt);
  })}

  function fallbackCopy(text){
    var ta = document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');}catch(e){};document.body.removeChild(ta);
  }

  // Habit Builder
  var hbGen = document.getElementById('hb-generate');
  var hbPrint = document.getElementById('hb-print');
  var hbCopy = document.getElementById('hb-copy');
  var hbOutput = document.getElementById('hb-output');

  function buildChecklist(){
    var habit = document.getElementById('hb-habit').value.trim() || 'New habit';
    var action = document.getElementById('hb-action').value.trim() || 'Micro-action';
    var start = document.getElementById('hb-start').value;
    var title = habit + ' — 7 day checklist (' + start + ')';
    var now = new Date();
    var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var list = '<div class="checklist"><h4>' + escapeHtml(title) + '</h4><ol>';
    for(var d=0;d<7;d++){
      var dayIndex = (now.getDay() + d) % 7;
      list += '<li><label><input type="checkbox"> <strong>' + days[dayIndex] + ':</strong> ' + escapeHtml(action) + '</label></li>';
    }
    list += '</ol><p style="font-size:0.9rem;color:#466">Tip: Repeat this week three times to form a rhythm.</p></div>';
    hbOutput.innerHTML = list;
  }

  function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

  if(hbGen){hbGen.addEventListener('click',buildChecklist)}
  if(hbPrint){hbPrint.addEventListener('click',function(){
    var newWin = window.open('','_blank');
    if(!newWin) return alert('Pop-up blocked. Copy the checklist instead.');
    newWin.document.write('<!doctype html><html><head><title>Checklist</title><style>body{font-family:system-ui,poppins,Arial;padding:1rem}h4{margin-top:0}</style></head><body>' + hbOutput.innerHTML + '</body></html>');
    newWin.document.close();
    setTimeout(function(){newWin.print()},200);
  })}

  if(hbCopy){hbCopy.addEventListener('click',function(){
    var els = hbOutput.querySelectorAll('li');
    if(els.length===0) return;
    var txt = '';
    els.forEach(function(li,i){txt += (i+1) + '. ' + li.innerText.trim() + '\n'});
    navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(txt).then(function(){
      hbCopy.textContent='Copied'; setTimeout(function(){hbCopy.textContent='Copy text'},1200);
    }) : fallbackCopy(txt);
  })}

})();