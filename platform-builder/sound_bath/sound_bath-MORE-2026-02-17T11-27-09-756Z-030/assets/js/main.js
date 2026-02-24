(function(){
  // Utilities
  function $(sel,root=document){return root.querySelector(sel)}
  function $all(sel,root=document){return Array.from(root.querySelectorAll(sel))}

  // Fill current year
  document.getElementById('year').textContent = new Date().getFullYear();

  // SESSION PLANNER
  var buildBtn = $('#buildPlan');
  var copyBtn = $('#copyPlan');
  var output = $('#planOutput');

  function composePlan(){
    var intent = $('#intent').value;
    var duration = $('#duration').value;
    var instruments = Array.from($('#instruments').selectedOptions).map(o=>o.value);
    var exp = $('#experience').value;
    var lines = [];
    lines.push('Session Plan — ' + new Date().toLocaleDateString());
    lines.push('Intention: ' + intent);
    lines.push('Duration: ' + duration);
    lines.push('Experience level: ' + exp);
    if(instruments.length) lines.push('Instruments: ' + instruments.join(', '));
    lines.push('Structure:');
    lines.push('- 0–5 min: arrival and orientation (gentle settling)');
    lines.push('- main: 60–80% of session: guided breath, steady tonal overlays');
    lines.push('- 5–10 min: transition back and short integration prompts');
    lines.push('\nNotes: Bring comfortable layers and a personal mat or cushion. This plan is a suggested structure; adapt during facilitation.');
    return lines.join('\n');
  }

  buildBtn.addEventListener('click',function(){
    output.textContent = composePlan();
  });

  copyBtn.addEventListener('click',function(){
    var text = output.textContent;
    if(!text) return;
    navigator.clipboard.writeText(text).then(function(){
      copyBtn.textContent = 'Copied';
      setTimeout(()=>copyBtn.textContent='Copy summary',1200);
    });
  });

  // UPCOMING EVENTS MODULE (demo data)
  var calendarEl = $('#calendar');
  var nextDateEl = $('#nextEventDate');
  var capacityEl = $('#capacity');

  var demoEvents = (function(){
    var base = new Date(); base.setDate(base.getDate()+3);
    var events=[];
    for(var i=0;i<6;i++){
      var d = new Date(base); d.setDate(base.getDate()+i*3);
      events.push({date:d.toISOString(),title:'Gathering — Ground & Tone',capacity:16});
    }
    return events;
  })();

  function renderEvents(){
    calendarEl.innerHTML = '';
    demoEvents.forEach((ev,i)=>{
      var li = document.createElement('li');
      var dd = new Date(ev.date);
      li.textContent = dd.toDateString() + ' — ' + ev.title;
      calendarEl.appendChild(li);
      if(i===0){
        nextDateEl.textContent = dd.toDateString();
        capacityEl.textContent = ev.capacity;
      }
    });
  }
  renderEvents();

  // SEAT SELECTOR + PACKING LIST
  var seatMap = $('#seatMap');
  var packingOut = $('#packingOutput');
  var genPacking = $('#genPacking');
  var copyPacking = $('#copyPacking');

  var seats = [];
  function initSeats(rows,cols){
    seatMap.innerHTML = '';
    seats = [];
    var total = rows*cols;
    for(var i=0;i<total;i++){
      var btn = document.createElement('button');
      btn.className = 'seat';
      btn.type = 'button';
      btn.textContent = i+1;
      // Randomly mark some seats as taken to simulate occupancy
      if(Math.random() < 0.2){ btn.classList.add('taken'); btn.disabled = true; }
      seatMap.appendChild(btn);
      seats.push({el:btn,selected:false,taken:btn.disabled,index:i+1});
    }
  }

  initSeats(2,8);

  seatMap.addEventListener('click',function(e){
    if(!e.target.classList.contains('seat')) return;
    if(e.target.classList.contains('taken')) return;
    e.target.classList.toggle('selected');
    var idx = parseInt(e.target.textContent,10);
    var record = seats.find(s=>s.index===idx);
    record.selected = e.target.classList.contains('selected');
    updatePackingPreview();
  });

  function updatePackingPreview(){
    var chosen = seats.filter(s=>s.selected).map(s=>s.index);
    if(chosen.length===0){
      packingOut.textContent = 'Select seats to generate a simple packing list.';
      return;
    }
    var lines = [];
    lines.push('Seats: ' + chosen.join(', '));
    lines.push('Suggested packing:');
    lines.push('- Comfortable mat or cushion');
    lines.push('- Light blanket (for warmth and grounding)');
    lines.push('- Water bottle');
    if(chosen.length>1) lines.push('- Small personal pillow for longer comfort');
    if(chosen.length>3) lines.push('- Earplugs for deeper focus (optional)');
    lines.push('\nArrival: plan to arrive 10 minutes early to settle. This seat selection is a local demo, not a confirmed booking.');
    packingOut.textContent = lines.join('\n');
  }

  genPacking.addEventListener('click',updatePackingPreview);

  copyPacking.addEventListener('click',function(){
    var txt = packingOut.textContent;
    if(!txt) return;
    navigator.clipboard.writeText(txt).then(function(){
      copyPacking.textContent = 'Copied';
      setTimeout(()=>copyPacking.textContent='Copy packing',1200);
    });
  });

  // small accessibility touch: focus outline for keyboard nav
  document.addEventListener('keydown',function(e){
    if(e.key==='Tab') document.body.classList.add('show-focus');
  });

})();