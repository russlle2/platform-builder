(function(){
  'use strict';
  document.addEventListener('DOMContentLoaded',function(){
    // NAV TOGGLE
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.nav ul');
    if(toggle){
      toggle.addEventListener('click',function(){
        var expanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!expanded));
        if(nav) nav.style.display = expanded ? '' : 'flex';
      });
    }

    // Scroll-triggered reveal
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var reveals = document.querySelectorAll('.reveal');
    if(prefersReduced){
      reveals.forEach(function(r){ r.classList.add('is-visible'); });
    } else if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },{threshold:0.12});
      reveals.forEach(function(r){ io.observe(r); });
    } else {
      // fallback
      reveals.forEach(function(r){ r.classList.add('is-visible'); });
    }

    // Planner - quick hero small
    function generateQuickSummary(formEl){
      var focus = formEl.querySelector('select[name="focus"]').value;
      var length = formEl.querySelector('select[name="length"]').value;
      var blend = (focus === 'Calm') ? 'Soft Resin & Lavender' : (focus === 'Uplift') ? 'Bright Citrus & Mint' : (focus === 'Grounding') ? 'Wood & Benzoin' : 'Mild Floral
';
      var summary = 'Plan summary:\nFocus: '+focus+'\nLength: '+length+'\nSuggested blend: '+blend+'\nUsage: inhale from a diffuser or personal inhaler; avoid direct undiluted skin contact.\nNotes: patch test recommended; lower dilution for sensitivity or children.';
      return summary;
    }

    document.querySelectorAll('.plan-btn').forEach(function(btn){
      btn.addEventListener('click',function(){
        var target = this.getAttribute('data-target');
        var root = document.getElementById(target);
        if(!root) return;
        var form = root.querySelector('form');
        var out = root.querySelector('.result');
        var text = generateQuickSummary(form);
        if(out) out.textContent = text;
      });
    });

    document.querySelectorAll('.copy-btn').forEach(function(btn){
      btn.addEventListener('click',function(){
        var target = this.getAttribute('data-target');
        var root = document.getElementById(target);
        if(!root) return;
        var out = root.querySelector('.result');
        var text = out && out.textContent ? out.textContent : '';
        if(!text) return;
        copyToClipboard(text, function(ok){
          var original = btn.textContent;
          btn.textContent = ok ? 'Copied' : 'Copy failed';
          setTimeout(function(){ btn.textContent = original; },1500);
        });
      });
    });

    // Full planner
    var buildBtn = document.getElementById('build-plan');
    var planOutput = document.getElementById('plan-output');
    function buildFullPlan(){
      var form = document.getElementById('planner-form');
      if(!form) return;
      var goal = form.elements['goal'].value || 'Support well-being';
      var tone = form.elements['tone'].value;
      var duration = form.elements['duration'].value;
      var sensitivity = form.elements['sensitivity'].value;
      var pregnancy = form.elements['pregnancy'].checked;
      var pets = form.elements['pets'].checked;

      var suggestedBlend = 'Custom: ' + (tone === 'Calming' ? 'Chamomile & Soft Wood' : tone === 'Bright' ? 'Mandarin & Litsea' : tone === 'Grounding' ? 'Cedar & Vetiver' : 'Subtle Mixed Floral');
      var dilution = (sensitivity === 'None') ? '2%' : (sensitivity === 'Mild') ? '1%' : '0.5%';
      var application = 'Diffusion or personal inhaler; topical only at diluted rate and with patch test.';

      var txt = '';
      txt += 'Session Plan\n';
      txt += 'Goal: '+goal+'\n';
      txt += 'Tone: '+tone+'\n';
      txt += 'Length: '+duration+' minutes\n';
      txt += 'Suggested blend: '+suggestedBlend+'\n';
      txt += 'Suggested dilution: '+dilution+' (topical use)\n';
      txt += 'Application: '+application+'\n';
      if(pregnancy) txt += 'Note: Contains pregnancy/breastfeeding considerations. Consult a provider before use.\n';
      if(pets) txt += 'Note: Pets in the household — avoid prolonged exposure and consult a veterinarian.\n';
      txt += 'Safety: Perform a patch test before topical use. Keep out of reach of children.\n';

      if(planOutput) planOutput.textContent = txt;
      return txt;
    }

    if(buildBtn){
      buildBtn.addEventListener('click',function(){ buildFullPlan(); });
    }

    // copy plan button
    var copyPlan = document.getElementById('copy-plan');
    if(copyPlan){
      copyPlan.addEventListener('click',function(){
        var txt = buildFullPlan() || (planOutput ? planOutput.textContent : '');
        if(!txt) return;
        copyToClipboard(txt,function(ok){
          var prior = copyPlan.textContent;
          copyPlan.textContent = ok ? 'Copied' : 'Copy failed';
          setTimeout(function(){ copyPlan.textContent = prior; },1400);
        });
      });
    }

    // download
    var downloadBtn = document.getElementById('download-plan');
    if(downloadBtn){
      downloadBtn.addEventListener('click',function(){
        var txt = buildFullPlan();
        var blob = new Blob([txt],{type:'text/plain'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'session-plan.txt';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function(){ URL.revokeObjectURL(url); },1000);
      });
    }

    // copy helper
    function copyToClipboard(text, cb){
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(function(){ cb(true); }).catch(function(){ fallbackCopy(text,cb); });
      } else { fallbackCopy(text,cb); }
    }
    function fallbackCopy(text,cb){
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly','');
      ta.style.position = 'absolute'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      try{ var ok = document.execCommand('copy'); document.body.removeChild(ta); cb(!!ok); }
      catch(e){ document.body.removeChild(ta); cb(false); }
    }

  });
})();