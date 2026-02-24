// Session Planner and Habit Builder
(function(){
  // Helpers
  function el(id){return document.getElementById(id)}
  function textEscape(s){return s.replace(/\n/g,'\\n')}

  // Session Planner
  var form = el('sessionForm');
  var generateBtn = el('generatePlan');
  var clearBtn = el('clearPlan');
  var output = el('planOutput');
  var copyBtn = el('copyPlan');
  var downloadLink = el('downloadPlan');

  function composePlan(){
    var focus = el('focus').value;
    var weeks = el('weeks').value;
    var freq = el('freq').value;
    var length = el('length').value;
    var outcome = el('outcome').value || 'Observable change you care about';
    var approaches = Array.from(form.querySelectorAll('input[type=checkbox]:checked')).map(function(i){return i.value});
    var now = new Date().toISOString().slice(0,10);

    var lines = [];
    lines.push('{{BUSINESS_NAME}} — Session Plan');
    lines.push('Generated: ' + now);
    lines.push('Focus: ' + focus);
    lines.push('Outcome to track: ' + outcome);
    lines.push('Commitment: ' + weeks + ' weeks, ' + freq + ' session(s) per week, ' + length);
    lines.push('Approaches: ' + (approaches.length?approaches.join(', '):'custom'));
    lines.push('---');
    lines.push('Week-by-week guide:');

    for(var w=1; w<=Math.min(12,Math.max(1,parseInt(weeks)||1)); w++){
      var note = 'Week ' + w + ': ' + (w===1? 'Start with one micro-habit and one reflection.':'' ) + ' Focus on small wins and tracking.';
      lines.push(note);
    }
    lines.push('Practice prompts:');
    lines.push('- Brief check-in before each session (2 min)');
    lines.push('- One measurable micro-habit tied to the outcome');
    lines.push('\nShare notes with your coach or save in a journal.');

    var full = lines.join('\n');
    output.value = full;

    // prepare download
    var blob = new Blob([full],{type:'text/plain'});
    var url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = 'session-plan.txt';
  }

  generateBtn.addEventListener('click',function(e){composePlan();});
  clearBtn.addEventListener('click',function(){form.reset();output.value='';downloadLink.href='#';});

  copyBtn.addEventListener('click',function(){
    output.select();
    try{document.execCommand('copy');copyBtn.textContent='Copied';setTimeout(function(){copyBtn.textContent='Copy summary'},1200);}catch(e){alert('Select and copy the text manually.');}
  });

  // Diagnostic quick UI (simple interactions)
  var energyBtns = document.querySelectorAll('#energyScale button');
  energyBtns.forEach(function(b){b.addEventListener('click',function(){energyBtns.forEach(function(x){x.classList.remove('active')});b.classList.add('active');});});
  var sleepBtns = document.querySelectorAll('#sleepScale button');
  sleepBtns.forEach(function(b){b.addEventListener('click',function(){sleepBtns.forEach(function(x){x.classList.remove('active')});b.classList.add('active');});});

  // Habit Builder (7-day checklist)
  var habitForm = el('habitForm');
  var genHabit = el('generateHabit');
  var printHabit = el('printHabit');
  var checklist = el('checklist');

  function weekdayIndex(day){var map={Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6,Sunday:0};return map[day]||1}
  function makeChecklist(){
    var name = el('habitName').value.trim() || 'Daily habit';
    var goal = el('habitGoal').value;
    var start = el('startDay').value;
    var startIdx = weekdayIndex(start);
    checklist.innerHTML = '';
    var names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    for(var i=0;i<7;i++){
      var idx = (startIdx + i) % 7;
      var li = document.createElement('li');
      li.innerHTML = '<label><input type="checkbox"> <strong>' + names[idx] + '</strong> — ' + name + ' — ' + goal + '</label>';
      checklist.appendChild(li);
    }
  }

  genHabit.addEventListener('click',function(){makeChecklist();});

  printHabit.addEventListener('click',function(){
    if(!checklist.children.length) makeChecklist();
    var w = window.open('','habit','width=600,height=700');
    var title = (el('habitName').value.trim() || '7-Day Habit');
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>'+title+'</title>'+
      '<style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}h1{color:#234}ol{padding-left:20px}li{margin:10px 0}</style>'+
      '</head><body><h1>'+title+'</h1><ol>';
    Array.from(checklist.children).forEach(function(li){html += '<li>'+li.textContent.trim()+'</li>';});
    html += '</ol><p>Generated from {{BUSINESS_NAME}} — keep a copy with your planner.</p></body></html>';
    w.document.write(html); w.document.close(); w.focus(); setTimeout(function(){w.print();},600);
  });

  // Accessibility: allow Enter on key form buttons
  [generateBtn, genHabit].forEach(function(btn){btn.addEventListener('keypress',function(e){if(e.key==='Enter'){btn.click();}})});
})();