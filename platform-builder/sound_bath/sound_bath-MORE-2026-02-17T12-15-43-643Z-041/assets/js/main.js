/* Local interactive behaviors: planner, copy, seat selector, packing list generator */
(function(){
  function qs(s, el){ return (el||document).querySelector(s); }
  function qsa(s, el){ return (el||document).querySelectorAll(s); }

  // Planner
  var buildBtn = qs('#build-plan');
  var copyBtn = qs('#copy-plan');
  var result = qs('#plan-result');
  var form = qs('#planner-form');

  function buildSummary(){
    var data = new FormData(form);
    var focus = data.get('focus') || 'General rest';
    var length = data.get('length') || '45 minutes';
    var texture = data.get('texture') || 'Bowls';
    var anchor = data.get('anchor') || '';
    var when = data.get('when') || 'Unscheduled';

    var lines = [];
    lines.push('Session Plan');
    lines.push('-------------');
    lines.push('Focus: ' + focus);
    lines.push('Duration: ' + length);
    lines.push('Primary sound texture: ' + texture);
    if(anchor) lines.push('Mood anchors: ' + anchor);
    lines.push('Date: ' + when);
    lines.push('Notes: Arrive 10 minutes early; comfortable clothing; water available.');

    return lines.join('\n');
  }

  buildBtn && buildBtn.addEventListener('click', function(){
    result.value = buildSummary();
    result.focus();
    result.select();
  });

  copyBtn && copyBtn.addEventListener('click', function(){
    if(!result.value){ alert('Build a plan first.'); return; }
    navigator.clipboard && navigator.clipboard.writeText(result.value).then(function(){
      copyBtn.textContent = 'Copied!';
      setTimeout(function(){ copyBtn.textContent='Copy Summary'; },1500);
    }, function(){ alert('Copy failed — select and copy manually.'); });
  });

  // Seat selector and packing list
  function generatePacking(type, comfort, seats){
    // base items
    var items = ['Yoga mat or blanket','Water bottle','Comfortable clothing','Small pillow or neck support'];
    if(type==='evening') items.push('Light sweater or shawl');
    if(type==='meditative') items.push('Eye mask or light cloth');
    if(comfort==='cozy') items.push('Extra blanket');
    if(seats>1) items.push('Arrive together if reserving multiple seats');
    items.push('Optional: journal and pen');
    return items;
  }

  var eventCards = qsa('.event-card');
  eventCards.forEach(function(card){
    var btn = card.querySelector('.gen-list');
    var select = card.querySelector('.seat-select');
    var listWrap = card.querySelector('.packing-list');
    btn.addEventListener('click', function(){
      var seats = parseInt(select.value,10)||1;
      var type = card.getAttribute('data-type')||'evening';
      var comfort = card.getAttribute('data-comfort')||'standard';
      var items = generatePacking(type, comfort, seats);
      listWrap.setAttribute('aria-hidden','false');
      listWrap.innerHTML = '<strong>Packing list ('+seats+' seat'+(seats>1?'s':'')+'):</strong><ul>'+items.map(function(i){return '<li>'+i+'</li>'}).join('')+'</ul><button class="btn small reserve">Reserve</button> <button class="btn small copy-list">Copy text</button>';

      // attach event handlers to newly created buttons
      var reserveBtn = listWrap.querySelector('.reserve');
      var copyListBtn = listWrap.querySelector('.copy-list');

      reserveBtn.addEventListener('click', function(){
        // fake seat decrement
        var seatsLeftEl = card.querySelector('.seats-left');
        var current = parseInt(seatsLeftEl.textContent,10)||0;
        var newVal = Math.max(0,current - seats);
        seatsLeftEl.textContent = newVal;
        reserveBtn.textContent = 'Reserved';
        setTimeout(function(){ reserveBtn.textContent='Reserve'; },1400);
      });

      copyListBtn.addEventListener('click', function(){
        var text = 'Packing list for '+ (type==='evening'? 'Evening Assembly':'Midday Rest') +'\n\n' + items.map(function(i){return '- '+i}).join('\n');
        navigator.clipboard && navigator.clipboard.writeText(text).then(function(){
          copyListBtn.textContent = 'Copied';
          setTimeout(function(){ copyListBtn.textContent='Copy text'; },1200);
        }, function(){ alert('Unable to copy.'); });
      });
    });
  });

  // small preview seat counter update trick
  var previewSeats = qs('#preview-seats');
  if(previewSeats){
    var n = parseInt(previewSeats.textContent,10)||14;
    setInterval(function(){ if(n>5) n -= Math.floor(Math.random()*2); previewSeats.textContent = n; }, 8000);
  }

  // accessibility: keyboard focus for planner
  qs('#plan-result') && qs('#plan-result').addEventListener('focus', function(){ this.select(); });

})();
