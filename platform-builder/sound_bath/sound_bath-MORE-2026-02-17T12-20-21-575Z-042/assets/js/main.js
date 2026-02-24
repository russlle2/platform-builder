// Main interactive behaviors for site: session planner + seat selector + packing list
(function(){
  // Utility
  function qs(sel,root=document){return root.querySelector(sel)}
  function qsa(sel,root=document){return Array.from(root.querySelectorAll(sel))}

  // Mini calendar on index
  function populateMiniCalendar(){
    const container = qs('#mini-calendar');
    if(!container) return;
    container.innerHTML = '';
    const base = new Date();
    for(let i=1;i<=6;i++){
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i*3);
      const el = document.createElement('div');
      el.className = 'date';
      el.textContent = d.toLocaleDateString(undefined,{month:'short',day:'numeric'});
      container.appendChild(el);
    }
  }

  // Session Planner
  function sessionPlannerInit(){
    const out = qs('#planner-output');
    const form = qs('#planner-form');
    const btnGen = qs('#planner-generate');
    const btnCopy = qs('#planner-copy');

    function buildPlan(){
      const focus = qs('#planner-focus').value;
      const duration = qs('#planner-duration').value;
      const tone = qs('#planner-tone').value;
      const instrumentNodes = qsa('#planner-instruments input:checked');
      const instruments = instrumentNodes.map(n=>n.value);

      const lines = [];
      lines.push('{{BUSINESS_NAME}} — Personalized session plan');
      lines.push('Focus: '+focus);
      lines.push('Duration: '+duration+' minutes');
      lines.push('Tone: '+tone);
      if(instruments.length) lines.push('Instruments: '+instruments.join(', '));
      else lines.push('Instruments: minimal — primarily guided silence');

      lines.push('\nStructure:');
      lines.push('- 5–10 min arrival & breath tuning');
      if(duration>40) lines.push('- 10–20 min layered bowls with intermittent silence');
      lines.push('- 10–15 min single-tone wash for integration');
      lines.push('- Gentle return & grounding cues');

      lines.push('\nNotes for facilitator:');
      if(focus==='sleep') lines.push('- Emphasize low frequencies and long sustain; avoid abrupt transitions.');
      if(focus==='clarity') lines.push('- Use brighter bowls and short pauses to invite alertness.');
      if(tone==='warm') lines.push('- Favor rounded, slow sweeps; keep voice minimal.');

      lines.push('\nPrepared by session planner.');

      const text = lines.join('\n');
      out.textContent = text;
      return text;
    }

    btnGen.addEventListener('click', function(e){
      e.preventDefault();
      buildPlan();
    });

    btnCopy.addEventListener('click', function(e){
      e.preventDefault();
      const text = out.textContent || buildPlan();
      if(!navigator.clipboard) {
        alert('Copy not supported in this browser');
        return;
      }
      navigator.clipboard.writeText(text).then(()=>{
        btnCopy.textContent = 'Copied!';
        setTimeout(()=>btnCopy.textContent='Copy summary',1500);
      });
    });

    // initial
    out.textContent = 'Your personalized session summary will appear here.';
  }

  // Seat selector + packing list
  function seatSelectorInit(){
    const container = qs('#seating-area');
    const packingContainer = qs('#packing-list');
    const selectedNote = qs('#selected-seat-note');
    const genBtn = qs('#packing-generate');
    if(!container) return;

    // Create seat grid
    const grid = document.createElement('div');
    grid.className = 'seat-grid';
    container.appendChild(grid);

    const rows = 5; const cols = 6;
    const seats = [];
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const idx = r*cols+c+1;
        const seat = document.createElement('button');
        seat.className = 'seat';
        seat.setAttribute('data-seat', idx);
        seat.setAttribute('aria-label','Seat '+idx);
        // Randomly mark some as taken
        if(Math.random() < 0.18){
          seat.classList.add('taken');
          seat.textContent = '×';
        } else {
          seat.textContent = idx;
        }
        grid.appendChild(seat);
        seats.push(seat);
      }
    }

    let selected = null;
    function updateSelected(el){
      seats.forEach(s=>s.classList.remove('selected'));
      if(el && !el.classList.contains('taken')){
        el.classList.add('selected');
        selected = el.getAttribute('data-seat');
        selectedNote.textContent = 'Selected seat: '+selected;
      } else {
        selected = null;
        selectedNote.textContent = 'No seat selected';
      }
    }

    grid.addEventListener('click', function(e){
      const seat = e.target.closest('.seat');
      if(!seat) return;
      if(seat.classList.contains('taken')) return;
      updateSelected(seat);
    });

    function generatePacking(){
      const baseList = [
        'Yoga mat or thick blanket (for lying)',
        'Cushion or bolster',
        'Bottle of water',
        'Light wrap or shawl',
        'Eye mask or scarf'
      ];
      // Add items based on seat position and mini-rules
      let extras = [];
      if(!selected){
        packingContainer.textContent = 'Please select a seat to get a tailored list.';
        return;
      }
      const n = Number(selected);
      if(n % 6 === 1){ extras.push('Prefer aisle? bring an extra sweater.'); }
      if(n <= 6){ extras.push('Front-row note: shorter sustain suggested; bring earplugs if sensitive to high volume.'); }
      if(n%2===0){ extras.push('Even-numbered seat friendly tip: bring a small pillow for neck support.'); }

      // If session duration from planner is long, recommend more
      const durationNode = qs('#planner-duration');
      const duration = durationNode ? Number(durationNode.value) : 60;
      if(duration >= 90) extras.push('For longer sessions: a thicker blanket + an extra pillow for comfort.');

      const list = baseList.concat(extras);
      packingContainer.innerHTML = '<strong>Suggested packing:</strong><ul>' + list.map(i=>' <li>'+i+'</li>').join('') + '</ul>';
    }

    genBtn.addEventListener('click', function(){ generatePacking(); });
  }

  // Initialize all
  document.addEventListener('DOMContentLoaded', function(){
    populateMiniCalendar();
    sessionPlannerInit();
    seatSelectorInit();
  });
})();
