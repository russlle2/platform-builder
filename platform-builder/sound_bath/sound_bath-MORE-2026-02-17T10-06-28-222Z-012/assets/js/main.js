// Local interactive features for sound bath site
document.addEventListener('DOMContentLoaded',function(){
  // Planner modal toggling
  var openPlanner = document.getElementById('open-planner');
  var plannerSection = document.getElementById('session-planner');
  if(openPlanner){openPlanner.addEventListener('click',function(){plannerSection.classList.toggle('hidden');plannerSection.scrollIntoView({behavior:'smooth'});});}

  // Planner logic
  var genBtn = document.getElementById('generate-plan');
  var exportBtn = document.getElementById('export-plan');
  var output = document.getElementById('plan-output');
  genBtn && genBtn.addEventListener('click',function(){
    var aim = document.getElementById('plan-aim').value;
    var freq = document.getElementById('plan-frequency').value;
    var length = document.querySelector('input[name="length"]:checked').value;
    var notes = document.getElementById('plan-notes').value.trim();
    var checkboxes = Array.from(document.querySelectorAll('.checkboxes input[type=checkbox]'))
      .filter(function(c){return c.checked}).map(function(c){return c.parentNode.textContent.trim()});
    var textures = checkboxes.length?checkboxes.join(', '):'varied textures';

    var summary = [];
    summary.push('Plan summary');
    summary.push('--------------');
    summary.push('Aim: '+aim.replace(/-/g,' '));
    summary.push('Length: '+length+' minutes');
    summary.push('Frequency: '+freq);
    summary.push('Textures: '+textures);
    if(notes) summary.push('\nNotes for facilitator:\n'+notes);
    summary.push('\nPractical cues: arrive 10 minutes early; soft lighting; a brief exhalation count to settle.');

    output.textContent = summary.join('\n');
    exportBtn.disabled = false;
  });

  exportBtn && exportBtn.addEventListener('click',function(){
    var text = output.textContent || '';
    if(!text) return;
    navigator.clipboard && navigator.clipboard.writeText(text).then(function(){
      exportBtn.textContent = 'Copied';
      setTimeout(function(){ exportBtn.textContent = 'Copy summary'; },1500);
    }).catch(function(){
      // fallback
      var ta = document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
      exportBtn.textContent='Copied';setTimeout(function(){ exportBtn.textContent='Copy summary';},1500);
    });
  });

  // Seat selector (mock)
  var seatDec = document.querySelector('.seat-dec');
  var seatInc = document.querySelector('.seat-inc');
  var seatCount = document.querySelector('.seat-count');
  var seatsLeft = document.getElementById('seats-left');
  var reserveBtn = document.getElementById('reserve-seats');
  var capacity = parseInt(document.querySelector('.seat-selector').getAttribute('data-capacity')||12,10);
  var remaining = capacity - 1; // assume 1 already chosen
  seatsLeft && (seatsLeft.textContent = remaining);

  seatInc && seatInc.addEventListener('click',function(){
    var val = parseInt(seatCount.value,10)||1; if(val < capacity){val++; seatCount.value=val; seatsLeft.textContent = Math.max(0, capacity - val);}
  });
  seatDec && seatDec.addEventListener('click',function(){
    var val = parseInt(seatCount.value,10)||1; if(val>1){val--; seatCount.value=val; seatsLeft.textContent = Math.max(0, capacity - val);}  
  });
  reserveBtn && reserveBtn.addEventListener('click',function(){
    alert('This is a local demo reservation. To book, please visit the full booking page or contact via email.');
  });

  // Packing list generator
  var genPacking = document.getElementById('generate-packing');
  var packOut = document.getElementById('packing-output');
  genPacking && genPacking.addEventListener('click',function(){
    var items = [];
    if(document.getElementById('bring-mat').checked) items.push('- Mat or cushion');
    if(document.getElementById('bring-water').checked) items.push('- Water bottle');
    if(document.getElementById('bring-blanket').checked) items.push('- Small blanket or shawl');
    if(items.length===0) items.push('- Comfortable clothing\n- Open senses');
    packOut.textContent = 'Packing list:\n' + items.join('\n');
  });

  // Small enhancement: highlight next-event based on calendar list
  var calendar = document.getElementById('calendar-list');
  if(calendar){
    var first = calendar.querySelector('li');
    if(first){
      var d = first.getAttribute('data-date');
      var dateEl = document.getElementById('next-event-date');
      if(dateEl) dateEl.textContent = first.textContent.replace(/\s+/g,' ').trim();
    }
  }

});
