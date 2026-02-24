(function(){
  // Seat selector (local fake) and packing list generator
  var seatsLeft = 10;
  var seatCountEl = document.getElementById('seatCount');
  var inc = document.getElementById('incSeat');
  var dec = document.getElementById('decSeat');
  var seatsLeftEl = document.getElementById('seatsLeft');
  var packSelect = document.getElementById('packStyle');
  var makePackBtn = document.getElementById('makePack');
  var packOutput = document.getElementById('packOutput');

  function updateSeatsDisplay(){
    seatCountEl.value = Math.max(1, Math.min(6, Number(seatCountEl.value)));
    seatsLeftEl.textContent = (seatsLeft - Number(seatCountEl.value)) + ' seats left';
  }

  inc.addEventListener('click', function(){
    var n = Number(seatCountEl.value) + 1;
    if(n > 6) n = 6;
    if(n > seatsLeft) n = seatsLeft;
    seatCountEl.value = n;
    updateSeatsDisplay();
  });
  dec.addEventListener('click', function(){
    var n = Number(seatCountEl.value) - 1;
    if(n < 1) n = 1;
    seatCountEl.value = n;
    updateSeatsDisplay();
  });

  // Packing list generator
  var presets = {
    basic: ['Yoga mat or blanket','Travel pillow/neck roll','Water bottle','Comfortable clothes','Socks or slippers'],
    deep: ['Thick mat/bolster','Eye mask or scarf','Ear cover if needed','Notebook + pen','Extra blanket'],
    travel: ['Foldable mat','Small travel pillow','Earbuds for transit','Compact journal','Light scarf']
  };

  makePackBtn.addEventListener('click', function(){
    var style = packSelect.value;
    var items = presets[style] || presets.basic;
    packOutput.textContent = 'Suggested kit: ' + items.join(', ') + '.';
    // friendly tip
    var tip = '\nArrive 10–15 minutes early to settle and lay out your space.';
    packOutput.textContent += ' ' + tip;
  });

  updateSeatsDisplay();

  // Guided exercise modal
  var modal = document.getElementById('exerciseModal');
  var tryButtons = document.querySelectorAll('#tryNowBtn, #tryNowBtn2');
  var closeModal = document.getElementById('closeModal');
  var next = document.getElementById('nextStage');
  var prev = document.getElementById('prevStage');
  var stages = ['breathStage','journalStage','intentionStage'];
  var cur = 0;
  var breathCircle = document.getElementById('breathCircle');
  var breathHint = document.getElementById('breathHint');
  var journalStage = document.getElementById('journalStage');
  var journalInput = document.getElementById('journalInput');
  var saveNote = document.getElementById('saveNote');
  var intentionInput = document.getElementById('intentionInput');
  var finish = document.getElementById('finishPractice');
  var restart = document.getElementById('restartPractice');

  function showModal(){
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    cur = 0; renderStage();
  }
  function hideModal(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  tryButtons.forEach(function(b){b.addEventListener('click', showModal)});
  closeModal.addEventListener('click', hideModal);

  function renderStage(){
    stages.forEach(function(id,i){
      var el = document.getElementById(id);
      if(!el) return;
      if(i === cur) el.classList.remove('hidden'); else el.classList.add('hidden');
    });
    prev.disabled = (cur === 0);
    next.textContent = (cur === stages.length -1) ? 'Next' : (cur === 0 ? 'Start' : 'Continue');
    // breathing visual kicks when on first stage
    if(cur === 0){ startBreathCycle(); } else { stopBreathCycle(); }
  }

  prev.addEventListener('click', function(){ if(cur>0){cur--; renderStage();} });
  next.addEventListener('click', function(){
    if(cur < stages.length -1){ cur++; renderStage(); } else { // move forward behavior
      // if at final stage, advance to intention and close
      finish.focus();
    }
  });

  // simple breath animation: scale circle over timed loop (4-2-6 seconds pattern)
  var breathTimer = null;
  function startBreathCycle(){
    var phase = 0; // 0 inhale,1 hold,2 exhale
    var cycle = function(){
      if(phase===0){ // inhale 4
        breathCircle.style.transform = 'scale(1.18)';
        breathHint.textContent = 'Inhale 4 — Hold 2 — Exhale 6';
        phase = 1; breathTimer = setTimeout(cycle,4000);
      } else if(phase===1){ // hold 2
        breathCircle.style.transform = 'scale(1.18)';
        phase = 2; breathTimer = setTimeout(cycle,2000);
      } else { // exhale 6
        breathCircle.style.transform = 'scale(0.82)';
        phase = 0; breathTimer = setTimeout(cycle,6000);
      }
    };
    cycle();
  }
  function stopBreathCycle(){ if(breathTimer) { clearTimeout(breathTimer); breathTimer = null; breathCircle.style.transform = 'scale(1)'; } }

  // journaling save
  saveNote.addEventListener('click', function(){
    var v = journalInput.value.trim();
    if(!v){ alert('Write a short line — keep it simple.'); return; }
    journalInput.value = '';
    alert('Saved: "' + v + '". It will help anchor your practice.');
  });

  finish.addEventListener('click', function(){
    var intent = intentionInput.value.trim();
    if(!intent) intent = 'Presence';
    alert('Intention set: ' + intent + '. You can revisit this before or after a session.');
    hideModal();
  });
  restart.addEventListener('click', function(){ cur = 0; renderStage(); });

  // keyboard escape closes modal
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') hideModal(); });

  // safety: focus trap simple implementation (keeps focus inside modal when open)
  document.addEventListener('focusin', function(e){ if(modal.getAttribute('aria-hidden') === 'false' && !modal.contains(e.target)){ e.stopPropagation(); modal.querySelector('.modal-close').focus(); } });

})();