(function(){
  // Session Planner
  var form = document.getElementById('planner-form');
  var output = document.getElementById('plan-output');
  var gen = document.getElementById('generate-plan');
  var copyBtn = document.getElementById('copy-plan');

  function buildPlan(){
    var data = new FormData(form);
    var title = data.get('title') || 'Session';
    var length = data.get('length');
    var focus = data.get('focus');
    var notes = data.get('notes') || '';
    var instr = data.getAll('instr');
    var now = new Date();
    var plan = [];
    plan.push(title);
    plan.push('Date: ' + now.toLocaleDateString());
    plan.push('Duration: ' + length + ' minutes');
    plan.push('Focus: ' + focus);
    plan.push('Instruments: ' + (instr.length?instr.join(', '):'none selected'));
    plan.push('Structure:');
    // simple structural logic
    var mins = parseInt(length,10);
    if(mins<=20){
      plan.push('- 2 min arrival & settle');
      plan.push('- 12 min single sound field');
      plan.push('- 4 min close and breathing');
    } else if(mins<=60){
      plan.push('- 5 min grounding and intention setting');
      plan.push('- ' + Math.max(12,Math.floor(mins*0.6)) + ' min layered sound segments');
      plan.push('- 10 min gentle reintegration');
    } else {
      plan.push('- VIP flow: intention, deep listening, guided integration, and takeaways');
      plan.push('- Breakouts or journaling supported');
    }
    if(notes) plan.push('Notes: ' + notes);
    return plan.join('\n');
  }

  gen.addEventListener('click',function(){
    output.textContent = buildPlan();
  });

  copyBtn.addEventListener('click',function(){
    var text = output.textContent || buildPlan();
    navigator.clipboard && navigator.clipboard.writeText(text).then(function(){
      copyBtn.textContent = 'Copied';
      setTimeout(function(){ copyBtn.textContent = 'Copy summary'; },1500);
    },function(){
      // fallback
      var ta = document.createElement('textarea');ta.value = text;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');copyBtn.textContent='Copied';}catch(e){}ta.remove();
    });
  });

  // Seat selector & packing list generator
  var seatsModal = document.getElementById('seats-modal');
  var openSeats = document.getElementById('open-seats');
  var closeSeats = document.getElementById('close-seats');
  var seatGrid = document.getElementById('seat-grid');
  var selectedCount = document.getElementById('selected-count');
  var generatePacking = document.getElementById('generate-packing');
  var packingOutput = document.getElementById('packing-output');
  var reserveBtn = document.getElementById('reserve-fake');

  // create 30 seats, with some unavailable
  var total = 30; var unavailable = {3:true,7:true,12:true,19:true};
  var seats = [];
  for(var i=1;i<=total;i++){
    var el = document.createElement('button');
    el.className = 'seat';
    el.type='button';
    el.textContent = i;
    if(unavailable[i]){ el.classList.add('unavailable'); el.setAttribute('aria-disabled','true'); }
    el.dataset.index = i;
    seatGrid.appendChild(el);
    seats.push(el);
  }

  function countSelected(){
    return seats.filter(function(s){return s.classList.contains('selected')}).length;
  }

  seatGrid.addEventListener('click',function(e){
    var t = e.target;
    if(!t.classList.contains('seat') || t.classList.contains('unavailable')) return;
    t.classList.toggle('selected');
    selectedCount.textContent = countSelected();
  });

  openSeats.addEventListener('click',function(){ seatsModal.setAttribute('aria-hidden','false'); });
  closeSeats.addEventListener('click',function(){ seatsModal.setAttribute('aria-hidden','true'); });

  generatePacking.addEventListener('click',function(){
    var sel = seats.filter(function(s){return s.classList.contains('selected')}).map(function(s){return s.dataset.index});
    if(sel.length===0){ packingOutput.textContent = 'No seats selected — choose at least one seat.'; return; }
    // Basic adaptive packing list based on selection size
    var list = [];
    list.push('Packing list for ' + sel.length + ' person(s):');
    list.push('- Comfortable layers (sweater, socks)');
    if(sel.length>1) list.push('- Shared blanket or light throw (optional)');
    list.push('- Floor mat or small cushion (we provide extras)');
    list.push('- Water bottle');
    list.push('- Optional: eye mask or small towel');
    list.push('Recommended arrival: 10–15 minutes before start for setup.');
    packingOutput.textContent = list.join('\n');
  });

  reserveBtn.addEventListener('click',function(){
    var n = countSelected();
    if(n===0){ alert('Select seats first (demo).'); return; }
    alert('This is a demo reserve. In production you would be directed to booking with selected seats. ' + n + ' seats marked.');
  });

  // small accessibility: allow escape to close seats
  document.addEventListener('keydown',function(ev){ if(ev.key==='Escape'){ seatsModal.setAttribute('aria-hidden','true'); } });
})();
