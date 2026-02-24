(function(){
  // Session Planner
  var buildBtn = document.getElementById('build-plan');
  var copyBtn = document.getElementById('copy-plan');
  var downloadLink = document.getElementById('download-plan');
  var output = document.getElementById('plan-output');

  function sanitize(s){ return String(s||'').trim(); }

  function buildPlan(){
    var goal = sanitize(document.getElementById('goal').value);
    var length = sanitize(document.getElementById('length').value);
    var format = sanitize(document.getElementById('format').value);
    var vibe = sanitize(document.getElementById('vibe').value);
    if(!goal){ output.value = 'Please add a short goal to generate a plan.'; return; }

    var rhythmSuggestions = {
      calm: ['gentle inhalation for 6 breaths','brief grounding body-scan (1–2 min)','diffuse a soft floral or resin note'],
      focus: ['three short inhalations before a task','micro-breaks every 25 mins','use a crisp citrus-wood blend'],
      uplift: ['five mindful inhales','stretch and sip water','rotate a bright citrus with an herbaceous base'],
      sleep: ['lower lights, slow breath','inhaler at bedside','use a low-odour, sleep-friendly base']
    };

    var picks = rhythmSuggestions[vibe] || [];
    var sessionLines = [];
    sessionLines.push('Intent: '+goal);
    sessionLines.push('Length: '+length+' minutes');
    sessionLines.push('Format: '+format);
    sessionLines.push('Vibe: '+vibe);
    sessionLines.push('');
    sessionLines.push('Session outline:');
    sessionLines.push('- Start: Set a gentle timer and take 3 slow inhales.');
    picks.forEach(function(p){ sessionLines.push('- '+p); });
    sessionLines.push('- Close: note one small change (mood, breath, posture).');
    sessionLines.push('');
    sessionLines.push('Safety reminders (non-medical):');
    sessionLines.push('- Use low dilution for skin products (see blend guide).');
    sessionLines.push('- Perform a patch test before topical use.');
    sessionLines.push('- If pregnant, nursing, or with significant health conditions, consult a licensed provider before use.');
    sessionLines.push('- Keep concentrated oils away from pets and children; some oils are not pet-safe.');

    var text = sessionLines.join('\n');
    output.value = text;
    // prepare download
    var blob = new Blob([text],{type:'text/plain'});
    var url = URL.createObjectURL(blob);
    downloadLink.href = url;
  }

  function copyPlan(){
    if(!output.value) return;
    navigator.clipboard && navigator.clipboard.writeText(output.value).then(function(){
      copyBtn.textContent = 'Copied';
      setTimeout(function(){ copyBtn.textContent = 'Copy'; },1500);
    }, function(){
      // fallback
      output.select();
      try{ document.execCommand('copy'); copyBtn.textContent='Copied'; setTimeout(function(){copyBtn.textContent='Copy';},1500);}catch(e){}
    });
  }

  buildBtn && buildBtn.addEventListener('click', buildPlan);
  copyBtn && copyBtn.addEventListener('click', copyPlan);

  // Blend Builder
  var blendContainer = document.createElement('div');
  blendContainer.className = 'blend-builder';
  blendContainer.innerHTML = '\n    <div class="wrap">\n      <h2>Blend Builder</h2>\n      <p class="lede">Choose a simple vibe and get a small, safety-minded dilution guide plus a printable blend card. This is non-medical guidance.</p>\n      <div class="blend-controls">\n        <label>Vibe: <select id="blend-vibe">\n          <option value="calm">Calm</option>\n          <option value="focus">Focus</option>\n          <option value="uplift">Uplift</option>\n          <option value="sleep">Sleep</option>\n        </select></label>\n        <label>Container size: <select id="blend-size">\n          <option value="10">10 ml</option>\n          <option value="5">5 ml</option>\n          <option value="2">2 ml</option>\n        </select></label>\n        <label>Sensitivity: <select id="blend-sensitivity">\n          <option value="normal">Normal</option>\n          <option value="sensitive">Sensitive (lower dilution)</option>\n        </select></label>\n        <div class="blend-actions">\n          <button id="make-blend" class="btn">Make Blend</button>\n        </div>\n      </div>\n      <div id="blend-output" class="blend-output" style="margin-top:12px"></div>\n    </div>\n  ';
  // insert blend builder after offers
  var offers = document.getElementById('offers');
  offers.parentNode.insertBefore(blendContainer, offers.nextSibling);

  function gramsToDrops(ml){ return Math.round(ml*20); } // approx 20 drops/ml

  function makeBlend(){
    var vibe = document.getElementById('blend-vibe').value;
    var size = parseFloat(document.getElementById('blend-size').value); // ml
    var sensitivity = document.getElementById('blend-sensitivity').value;

    var recipes = {
      calm: [{oil:'Lavender',pct:40},{oil:'Bergamot',pct:30},{oil:'Frankincense',pct:30}],
      focus: [{oil:'Rosemary',pct:40},{oil:'Lemon',pct:35},{oil:'Cedarwood',pct:25}],
      uplift: [{oil:'Sweet Orange',pct:45},{oil:'Grapefruit',pct:35},{oil:'Spearmint',pct:20}],
      sleep: [{oil:'Chamomile',pct:50},{oil:'Lavender',pct:35},{oil:'Vetiver',pct:15}]
    };

    var baseDilution = (sensitivity==='sensitive')?0.5:1.5; // percent
    // safety caps for small containers
    if(size<=2) baseDilution = Math.min(baseDilution,1.0);

    var recipe = recipes[vibe] || recipes.calm;
    var outputEl = document.getElementById('blend-output');
    // calculate total drops of essential oil for desired dilution
    // total drops in ml approx: size * 20
    var totalDrops = gramsToDrops(size);
    var eoDrops = Math.round(totalDrops * (baseDilution/100));
    if(eoDrops<1) eoDrops = 1;

    // distribute eoDrops according to recipe pct
    var parts = recipe.map(function(r){ return {oil:r.oil, drops:Math.max(1, Math.round(eoDrops * (r.pct/100)))}; });
    // adjust to sum to eoDrops
    var sum = parts.reduce(function(a,b){return a+b.drops},0);
    var diff = eoDrops - sum;
    if(diff!==0){ parts[0].drops += diff; }

    var html = ['<div class="card">','<h3>Blend Card — '+(vibe.charAt(0).toUpperCase()+vibe.slice(1))+'</h3>','<p>Container: '+size+' ml — Target dilution: '+baseDilution+'% (safety-minded)</p>','<ul>'];
    parts.forEach(function(p){ html.push('<li>'+p.oil+': '+p.drops+' drops</li>'); });
    html.push('</ul>');
    html.push('<p>Instructions: Add the listed drops of essential oil to carrier (fractionated coconut, jojoba). Roll or bottle and label clearly. Patch test a small skin area and wait 24 hours before extended topical use.</p>');
    html.push('<p class="note">Pregnancy & pets: some oils are not recommended. If pregnant, nursing, or around sensitive animals, consult specialized resources before use.</p>');
    html.push('<div class="blend-exports"><button id="copy-blend" class="btn">Copy Blend Text</button> <a id="download-blend" class="btn ghost" href="#" download="blend-card.txt">Download</a></div>');
    html.push('</div>');
    outputEl.innerHTML = html.join('');

    // prepare text version
    var textLines = [];
    textLines.push('Blend: '+vibe);
    textLines.push('Size: '+size+' ml');
    textLines.push('Dilution: '+baseDilution+'%');
    textLines.push('Ingredients:');
    parts.forEach(function(p){ textLines.push('- '+p.oil+': '+p.drops+' drops'); });
    textLines.push('Instructions: Mix drops into carrier, label, patch test before topical use. Non-medical guidance.');
    var text = textLines.join('\n');
    var blob = new Blob([text],{type:'text/plain'});
    var url = URL.createObjectURL(blob);
    var dl = document.getElementById('download-blend');
    dl.href = url;

    document.getElementById('copy-blend').addEventListener('click', function(){
      navigator.clipboard && navigator.clipboard.writeText(text).then(function(){
        this.textContent='Copied'; var self=this; setTimeout(function(){ self.textContent='Copy Blend Text'; },1500);
      }.bind(this));
    });
  }

  document.getElementById('make-blend').addEventListener('click', makeBlend);

})();