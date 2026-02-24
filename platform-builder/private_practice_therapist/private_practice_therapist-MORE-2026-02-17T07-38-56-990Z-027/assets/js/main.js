(function(){
  'use strict';
  // Set year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Simple nav toggle for small screens
  var toggle = document.querySelector('.nav-toggle');
  if(toggle){
    toggle.addEventListener('click', function(){
      document.querySelector('.main-nav').classList.toggle('open');
    });
  }

  // Scroll-triggered reveal respecting prefers-reduced-motion
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if(prefersReduced){
    reveals.forEach(function(el){ el.classList.add('reveal-visible'); });
  } else if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('reveal-visible');
          io.unobserve(entry.target);
        }
      });
    },{threshold:0.12});
    reveals.forEach(function(el){ io.observe(el); });
  } else {
    // Fallback: reveal all
    reveals.forEach(function(el){ el.classList.add('reveal-visible'); });
  }

  // Session Planner widget
  var form = document.getElementById('planner-form');
  var out = document.getElementById('planner-output');
  var btnGenerate = document.getElementById('planner-generate');
  var btnCopy = document.getElementById('planner-copy');

  function buildPlan(){
    if(!form || !out) return '';
    var fd = new FormData(form);
    var name = (fd.get('name')||'').trim();
    var concern = (fd.get('concern')||'').trim();
    var freq = fd.get('frequency') || '2';
    var duration = fd.get('duration') || '6';
    var focuses = fd.getAll('focus') || [];

    var lines = [];
    lines.push('Personalized Session Plan');
    lines.push('-------------------------');
    if(name) lines.push('Name: ' + name);
    lines.push('Primary concern: ' + (concern || 'Not specified'));
    lines.push('Sessions per month: ' + freq);
    lines.push('Planned duration (weeks): ' + duration);
    if(focuses.length){
      lines.push('Focus areas: ' + focuses.join(', '));
    } else {
      lines.push('Focus areas: To be decided in session');
    }
    lines.push('Suggested next step: Schedule an intake to clarify goals and discuss fit.');
    lines.push('\nNotes: This plan is a starting point for conversation with a clinician.');

    return lines.join('\n');
  }

  btnGenerate && btnGenerate.addEventListener('click', function(){
    var text = buildPlan();
    out.value = text;
    // save to localStorage as a convenience
    try{ localStorage.setItem('lastPlan', text); }catch(e){}
  });

  btnCopy && btnCopy.addEventListener('click', function(){
    if(!out.value){
      var txt = buildPlan();
      out.value = txt;
    }
    out.select();
    try{
      var ok = document.execCommand('copy');
      // Provide lightweight feedback
      var prev = btnCopy.textContent;
      btnCopy.textContent = ok ? 'Copied' : 'Copy';
      setTimeout(function(){ btnCopy.textContent = prev; }, 1600);
    }catch(e){
      // Fallback: show text to user
      window.prompt('Copy the plan below (Ctrl/Cmd+C):', out.value);
    }
  });

  // Try restore last plan
  try{
    var saved = localStorage.getItem('lastPlan');
    if(saved && out && !out.value) out.value = saved;
  }catch(e){}

})();