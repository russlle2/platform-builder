(function(){
  // Basic utilities
  function el(id){return document.getElementById(id)}
  function $(selector){return Array.from(document.querySelectorAll(selector))}

  // Year in footer
  var yearEl = el('year'); if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Mood-to-Method selector
  var moodInputs = document.querySelectorAll('input[name="mood"]');
  var methodRecommendation = el('methodRecommendation');
  var primaryCta = el('primaryCta');
  var finalPrimary = el('finalPrimary');

  var moodMap = {
    overwhelmed: {
      text: 'Short stabilizers: choose two anchors (morning + evening) and a single decision-free block. Focus on containment rather than optimization for 7 days.',
      cta: 'Start a 7-day stabilizer'
    },
    flat: {
      text: 'Boost by micro-engagements: three 5-minute prompts across the day and a gentle evening reset to seed energy without friction.',
      cta: 'Try energy microshifts'
    },
    busy: {
      text: 'Consolidate priorities: set two non-negotiables, collapse low-value tasks, and design a 90-minute focus window each day you can protect.',
      cta: 'Build a focus scaffold'
    },
    steady: {
      text: 'Tune and layer: keep what works, add one new cue per week, and run a short review to keep momentum predictable.',
      cta: 'Layer a sustainable cue'
    }
  };

  function updateMethodForMood(value){
    var m = moodMap[value] || moodMap.steady;
    if(methodRecommendation) methodRecommendation.textContent = m.text;
    if(primaryCta) primaryCta.textContent = m.cta;
    if(finalPrimary) finalPrimary.textContent = m.cta;
  }

  moodInputs.forEach(function(input){
    input.addEventListener('change', function(e){ updateMethodForMood(e.target.value); });
    if(input.checked){ updateMethodForMood(input.value); }
  });

  // 30-day path map generator
  var goalInputs = document.querySelectorAll('input[name="goal"]');
  var pathMapEl = el('pathMap');

  function getSelectedGoals(){ return Array.from(goalInputs).filter(function(i){return i.checked}).map(function(i){return i.value}); }

  function drawPathMap(goals){
    var days = 30;
    var width = Math.min(960, Math.max(320, days * 14));
    var height = 120;

    var svgParts = [];
    svgParts.push('<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'">');
    svgParts.push('<defs>');
    svgParts.push('<linearGradient id="g1" x1="0" x2="1">');
    svgParts.push('<stop offset="0" stop-color="#e6fbf4" />');
    svgParts.push('<stop offset="1" stop-color="#f7fffb" />');
    svgParts.push('</linearGradient>');
    svgParts.push('</defs>');

    // background
    svgParts.push('<rect x="0" y="0" width="'+width+'" height="'+height+'" rx="10" fill="url(#g1)" />');

    // compute lanes per goal
    var lanes = goals.length || 1;
    var laneHeight = (height - 20) / lanes;

    for(var g=0; g<lanes; g++){
      var laneTop = 10 + g * laneHeight;
      // path line
      var path = [];
      for(var d=0; d<days; d++){
        var x = 12 + (d * (width - 24) / (days-1));
        // simple rhythm: ramp up in first third, maintain, then small taper
        var intensity = 0.4 + 0.6 * Math.sin((d / days) * Math.PI);
        var y = laneTop + laneHeight/2 + (1 - intensity) * (laneHeight/2 - 8);
        path.push(x+','+y);
      }
      svgParts.push('<polyline points="'+path.join(' ')+'" fill="none" stroke="#cfeee0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />');

      // dots for days
      for(var d=0; d<days; d++){
        var x = 12 + (d * (width - 24) / (days-1));
        var phase = (d % 7) ;
        var dotSize = 4 + (phase==0?3: (phase>4?1:2));
        var y = laneTop + laneHeight/2 + (Math.random()-0.5)*6;
        var color = ['#7fcf9b','#ffd28a','#8fc3ff','#e8b3ff'][g%4];
        svgParts.push('<circle cx="'+x+'" cy="'+y+'" r="'+dotSize+'" fill="'+color+'" opacity="0.95"/>');
      }

      // lane label
      var label = goals[g] || 'Primary focus';
      svgParts.push('<text x="12" y="'+(laneTop + 14)+'" font-size="11" fill="#465" font-family="'+(''+ (Math.random()>0.5? 'Verdana':'Helvetica'))+'">'+label+'</text>');
    }

    svgParts.push('</svg>');
    pathMapEl.innerHTML = svgParts.join('\n');
  }

  function refreshPathMap(){
    var selected = getSelectedGoals();
    // limit to 3 to keep map readable
    if(selected.length > 3) selected = selected.slice(0,3);
    drawPathMap(selected);
  }

  goalInputs.forEach(function(i){i.addEventListener('change', refreshPathMap)});
  // initial draw
  refreshPathMap();

  // accessibility: allow keyboard quick mood switch via number keys
  document.addEventListener('keydown', function(e){
    if(document.activeElement && (document.activeElement.tagName==='INPUT' || document.activeElement.tagName==='TEXTAREA')) return;
    if(['1','2','3','4'].indexOf(e.key) !== -1){
      var idx = parseInt(e.key,10)-1;
      var radios = Array.from(moodInputs);
      if(radios[idx]){ radios[idx].checked = true; radios[idx].dispatchEvent(new Event('change')); }
    }
  });

})();
