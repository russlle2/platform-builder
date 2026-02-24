(function(){
  // Session Planner
  function $(s){return document.querySelector(s)}
  function $all(s){return Array.from(document.querySelectorAll(s))}

  var plannerLength = $('#planner-length');
  var plannerFocus = $('#planner-focus');
  var plannerIntensity = $('#planner-intensity');
  var plannerExtras = $all('.planner-extra');
  var plannerBuild = $('#planner-build');
  var plannerOutput = $('#planner-output');
  var plannerCopy = $('#planner-copy');
  var plannerBook = $('#planner-book');

  function buildPlan(){
    var length = plannerLength.value;
    var focus = plannerFocus.options[plannerFocus.selectedIndex].text;
    var intensity = plannerIntensity.value;
    var extras = plannerExtras.filter(function(el){return el.checked}).map(function(el){return el.value});
    var intensityLabel = intensity<4? 'soft': intensity<7? 'balanced':'resonant';
    var lines = [];
    lines.push('{{BUSINESS_NAME}} — Personalized Session Plan');
    lines.push('Length: '+length+' minutes');
    lines.push('Focus: '+focus);
    lines.push('Sound: '+intensityLabel+' (level '+intensity+')');
    if(extras.length) lines.push('Extras: '+extras.join(', '));
    lines.push('Notes: Arrive 10 minutes early; mats & blankets provided.');
    var text = lines.join('\n');
    plannerOutput.textContent = text;
    plannerBook.setAttribute('href','book.html?plan='+encodeURIComponent(text));
  }

  plannerBuild.addEventListener('click',function(e){buildPlan();});
  plannerCopy.addEventListener('click',function(){
    var text = plannerOutput.textContent || '';
    if(!text) return alert('Build the plan first.');
    navigator.clipboard && navigator.clipboard.writeText(text).then(function(){
      plannerCopy.textContent = 'Copied!';
      setTimeout(function(){plannerCopy.textContent='Copy Summary'},1300);
    });
  });

  // Seat selector + packing generator
  var seatMap = $('#seat-map');
  var packingItems = $('#packing-items');
  var packingCopy = $('#packing-copy');
  var seats = [];
  function createSeats(){
    // 24 seats grid (6x4)
    for(var i=1;i<=24;i++){
      var div = document.createElement('button');
      div.className='seat';
      div.type='button';
      div.dataset.seat=i;
      div.textContent=i;
      // fake some booked seats
      if([3,7,8,12,19].indexOf(i)!==-1){div.classList.add('booked');div.disabled=true}
      div.addEventListener('click',function(){
        if(this.classList.contains('booked'))return;
        $all('.seat.selected').forEach(function(s){s.classList.remove('selected')});
        this.classList.add('selected');
        generatePacking();
      });
      seatMap.appendChild(div);
      seats.push(div);
    }
  }

  function generatePacking(){
    var selected = seatMap.querySelector('.seat.selected');
    var list = [];
    list.push('Mat (provided) — we also recommend a personal yoga mat if you prefer');
    list.push('Blanket or shawl — for warmth and grounding');
    list.push('Pillow or folded towel — for neck support');
    list.push('Water bottle — hydrate softly before and after');
    var intensity = plannerIntensity?plannerIntensity.value:5;
    if(intensity>7) list.push('Ear-rest option — if loud tones are challenging');
    if(plannerFocus && plannerFocus.value==='sleep') list.push('Eye mask — to encourage deeper drift');
    // if seat near edge, suggest extra cushion (fake rule: odd seats suggest cushion)
    if(selected && (parseInt(selected.dataset.seat)%2===1)) list.push('Extra cushioning recommended for side seats');
    packingItems.innerHTML = '';
    list.forEach(function(it){
      var li = document.createElement('li'); li.textContent = it; packingItems.appendChild(li);
    });
  }

  packingCopy.addEventListener('click',function(){
    var items = Array.from(packingItems.querySelectorAll('li')).map(function(li){return '- '+li.textContent}).join('\n');
    if(!items) return alert('Select a seat to generate a packing list.');
    navigator.clipboard && navigator.clipboard.writeText(items).then(function(){
      packingCopy.textContent='Copied!'; setTimeout(function(){packingCopy.textContent='Copy List'},1200);
    });
  });

  createSeats();

  // Small Next-Event module for other pages (fake calendar list) for progressive enhancement
  function renderUpcoming(){
    var container = document.createElement('div');
    container.className='upcoming';
    var h = document.createElement('h4'); h.textContent='Next Wave'; container.appendChild(h);
    var ul = document.createElement('ul');
    var now = new Date();
    for(var i=1;i<=6;i++){
      var dt = new Date(); dt.setDate(now.getDate() + i*3);
      var li = document.createElement('li');
      li.innerHTML = dt.toDateString() + ' — ' + (i%2? 'Evening Wave' : 'Midday Wave') + ' • <a href="events.html">Reserve</a>';
      ul.appendChild(li);
    }
    container.appendChild(ul);
    // append to footer for quick access
    document.querySelector('.site-footer .wrap') && document.querySelector('.site-footer .wrap').appendChild(container);
  }

  // Wait until DOM loaded to attempt footer append
  document.addEventListener('DOMContentLoaded',function(){
    // build initial plan preview
    buildPlan();
    generatePacking();
    renderUpcoming();
  });
})();