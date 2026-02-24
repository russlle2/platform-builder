(function(){
  // Basic scripts for planner and blend builders
  document.getElementById('year').textContent = new Date().getFullYear();

  // Session Planner
  function buildPlan(){
    var focus = document.getElementById('sp-focus').value;
    var length = document.getElementById('sp-length').value;
    var format = document.getElementById('sp-format').value;
    var freq = document.getElementById('sp-frequency').value;
    var lines = [];
    lines.push('Session Plan');
    lines.push('-------------');
    lines.push('Primary focus: ' + focus);
    lines.push('Length: ' + length + ' minutes');
    lines.push('Format: ' + format);
    lines.push('Suggested cadence: ' + freq);
    lines.push('Takeaway: a short written plan and a blend card. All suggestions are informational and safety-focused.');
    lines.push('\nSafety notes: perform a patch test before topical use; use caution around pets, children, and pregnancy.');
    return lines.join('\n');
  }

  document.getElementById('sp-build').addEventListener('click', function(){
    var out = buildPlan();
    document.getElementById('sp-output').textContent = out;
  });
  document.getElementById('sp-copy').addEventListener('click', function(){
    var text = document.getElementById('sp-output').textContent;
    if(!text) return;
    navigator.clipboard && navigator.clipboard.writeText(text).then(function(){
      alert('Plan copied to clipboard');
    }, function(){
      alert('Copy failed — select and copy manually.');
    });
  });

  // Quick Blend builder
  var vibes = {
    calm: {name:'Calm', oils:['Lavender','Roman Chamomile','Bergamot']},
    focus: {name:'Focus', oils:['Rosemary','Basil','Grapefruit']},
    sleep: {name:'Sleep', oils:['Lavender','Cedarwood','Marjoram']},
    uplift: {name:'Uplift', oils:['Sweet Orange','Grapefruit','Peppermint']}
  };

  function dilutionGuide(format){
    // Return safe dilution percentages by format
    if(format==='diffuser') return 'Diffuser: 3-8 drops per 100ml water (no direct skin application).';
    if(format==='roll-on') return 'Roll-on (10ml carrier): 2-6% dilution. 2% = ~6 drops; 5% = ~15 drops. Start low and patch test.';
    if(format==='spray') return 'Room spray (100ml bottle): 20-30 drops total (approx 0.5-1% overall). Shake before use.';
    return '';
  }

  function renderQuick(){
    var vibeKey = document.getElementById('bq-vibe').value;
    var format = document.getElementById('bq-format').value;
    var info = vibes[vibeKey];
    var oils = info.oils.slice(0,3).join(', ');
    var dil = dilutionGuide(format);
    var html = '';
    html += '<strong>' + info.name + ' — Quick Blend</strong><br/>';
    html += '<em>Suggested oils:</em> ' + oils + '<br/>';
    html += '<em>Format:</em> ' + format + '<br/>';
    html += '<em>Dilution guide:</em> ' + dil + '<br/>';
    html += '<div style="margin-top:8px;font-size:13px;color:#444">Notes: perform a patch test; discontinue if irritation occurs. Be cautious with pets and pregnancy.</div>';
    document.getElementById('bq-output').innerHTML = html;
  }

  document.getElementById('bq-build').addEventListener('click', renderQuick);

  // Deep Mix builder: includes intensity multiplier and a small blend card
  function intensityFactor(level){
    if(level==='low') return 0.7;
    if(level==='medium') return 1;
    if(level==='high') return 1.4;
    return 1;
  }

  function renderDeep(){
    var vibeKey = document.getElementById('bd-vibe').value;
    var intensity = document.getElementById('bd-intensity').value;
    var info = vibes[vibeKey];
    var factor = intensityFactor(intensity);
    var oils = info.oils;
    // Create a 10ml roll-on suggestion as one example to compute drops
    var baseCarrierMl = 10;
    var baseDropsPerMl = 20; // approximate
    var total_drops = Math.round(baseCarrierMl * baseDropsPerMl * 0.03 * factor); // 3% baseline
    // Distribute drops among top 3 oils
    var perOil = Math.max(1, Math.round(total_drops / oils.length));
    var card = '';
    card += '<strong>' + info.name + ' — Detailed Blend Card</strong><br/>';
    card += '<em>Format example:</em> 10ml roll-on (carrier oil)<br/>';
    card += '<em>Suggested dilution:</em> approx ' + Math.round(3 * factor) + '% (adjust lower for sensitive skin).<br/>';
    card += '<em>Rough drops for 10ml:</em> total ~' + total_drops + ' drops<br/>';
    card += '<em>Proportions:</em><ul style="margin:6px 0 6px 18px;padding:0">';
    for(var i=0;i<oils.length;i++){
      card += '<li>' + oils[i] + ': ' + perOil + ' drops</li>';
    }
    card += '</ul>';
    card += '<div style="font-size:13px;color:#444">Guidance: Always patch test; keep out of reach of children and pets; consult a specialist for pregnancy or serious health conditions. This is informational and safety-focused, not medical advice.</div>';
    document.getElementById('bd-output').innerHTML = card;
  }

  document.getElementById('bd-build').addEventListener('click', renderDeep);

})();
