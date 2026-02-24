(function(){
  'use strict';
  // utility
  function $(sel, ctx){return (ctx||document).querySelector(sel)}
  function $all(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // set year
  var yr = new Date().getFullYear(); var yrEl = $('#yr'); if(yrEl) yrEl.textContent = yr;

  // Scroll reveal with prefers-reduced-motion support
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = $all('.reveal');
  if(prefersReduced){ revealEls.forEach(function(el){ el.classList.add('revealed'); }); }
  else if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('revealed'); io.unobserve(e.target); } });
    },{rootMargin:'0px 0px -10% 0px',threshold:0.08});
    revealEls.forEach(function(el){ io.observe(el); });
  } else { revealEls.forEach(function(el){ el.classList.add('revealed'); }); }

  // Session Planner
  var form = $('#plannerForm');
  var buildBtn = $('#buildBtn');
  var copyBtn = $('#copyBtn');
  var downloadBtn = $('#downloadBtn');
  var summaryEl = $('#summary');

  function buildSummary(){
    var goal = $('#goal').value;
    var length = $('#length').value;
    var freq = $('#frequency').value;
    var notes = $('#notes').value.trim();
    var goalText = {
      calm: 'Calm & unwind',
      focus: 'Focus & clarity',
      sleep: 'Support sleep',
      mood: 'Gentle mood lift'
    }[goal]||goal;
    var dilution = (length <= 5) ? '1-2% for short inhalation' : '2-3% for brief topical use (if appropriate)';
    var plan = [];
    plan.push('Session plan — created on ' + new Date().toLocaleDateString());
    plan.push('Primary aim: ' + goalText);
    plan.push('Length: ' + length + ' minutes');
    plan.push('Frequency: ' + freq + ' days per week');
    if(notes) plan.push('Notes: ' + notes);
    plan.push('Suggested approach:');
    plan.push('- Begin with 1 minute mindful breathing with chosen aroma.');
    plan.push('- Use 2–3 short inhales across the session, rest between steps.');
    plan.push('- Blend guidance: ' + dilution + '. Patch-test suggested before topical use.');
    plan.push('Safety reminders: keep oils away from eyes and pets\' faces; consult a provider for pregnancy or major medical concerns.');
    plan.push('\nPrepared by: ' + '{{BUSINESS_NAME}}');
    return plan.join('\n');
  }

  function showSummary(text){ summaryEl.textContent = text; summaryEl.focus(); }

  if(buildBtn){ buildBtn.addEventListener('click', function(e){ e.preventDefault(); var t = buildSummary(); showSummary(t); }); }

  if(copyBtn){ copyBtn.addEventListener('click', function(){ var text = summaryEl.textContent || ''; if(!text) return; navigator.clipboard && navigator.clipboard.writeText(text).then(function(){ copyBtn.textContent='Copied'; setTimeout(()=>copyBtn.textContent='Copy summary',1400); }).catch(function(){ fallbackCopy(text); }); }); }

  function fallbackCopy(text){ var ta = document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.left='-9999px'; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); alert('Copied'); }catch(e){ alert('Copy failed'); } document.body.removeChild(ta); }

  if(downloadBtn){ downloadBtn.addEventListener('click', function(){ var text = summaryEl.textContent || ''; if(!text) return; var blob = new Blob([text],{type:'text/plain'}); var url = URL.createObjectURL(blob); downloadBtn.setAttribute('href',url); downloadBtn.setAttribute('download','session-plan.txt'); setTimeout(function(){ URL.revokeObjectURL(url); }, 4000); }); }

  // simple keyboard accessibility for summary (allow select all)
  if(summaryEl){ summaryEl.addEventListener('keydown', function(e){ if((e.ctrlKey||e.metaKey) && e.key==='a'){ e.stopPropagation(); } }); }
})();