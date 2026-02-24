(function(){
  // Diagnostic logic
  var diagForm = document.getElementById('diag-form');
  var diagResult = document.getElementById('diag-result');
  var diagReset = document.getElementById('diag-reset');

  function scoreDiag(form){
    var energy = parseInt(form.energy.value,10);
    var stress = parseInt(form.stress.value,10);
    var sleep = parseInt(form.sleep.value,10);
    var total = energy + stress + sleep;
    return total;
  }

  function interpret(total){
    // Lower scores indicate more immediate stabilization needs
    if(total <= 5) return {path:'Hearth Path',desc:'Begin with rhythm and safety practices: daily anchors, evening rituals, and nervous-system pauses.'};
    if(total <= 7) return {path:'Flow Path',desc:'Focus on energy-tuning micro-habits and peer rhythm work to restore momentum.'};
    return {path:'Thrive Path',desc:'Layered practices and coaching for deeper identity and long-term integration.'};
  }

  if(diagForm){
    diagForm.addEventListener('submit',function(e){
      e.preventDefault();
      var total = scoreDiag(diagForm);
      var r = interpret(total);
      diagResult.innerHTML = '<strong>'+r.path+'</strong> — '+r.desc+' <div style="margin-top:10px"><a class="btn primary" href="/programs.html">See programs for '+r.path+'</a></div>';
      window.scrollTo({top:document.getElementById('diagnostic').offsetTop-20,behavior:'smooth'});
    });
  }
  if(diagReset){ diagReset.addEventListener('click',function(){diagForm.reset();diagResult.textContent='Complete the questionnaire to see a tailored recommendation — one of three pathways designed for steady change.'})}

  // Pricing selection
  var selects = document.querySelectorAll('.select');
  selects.forEach(function(btn){
    btn.addEventListener('click',function(){
      var plan = btn.getAttribute('data-plan');
      var url = '/book.html?plan='+encodeURIComponent(plan);
      window.location.href = url;
    });
  });

  // Lead magnet form
  var lead = document.getElementById('lead-form');
  var leadSuccess = document.getElementById('lead-success');
  if(lead){
    lead.addEventListener('submit',function(e){
      e.preventDefault();
      var email = lead.elements['email'].value;
      // Simulate success
      leadSuccess.hidden = false;
      lead.reset();
      setTimeout(function(){leadSuccess.hidden=true},5000);
    });
  }

  // Minimal accessibility and motion preference
  var media = window.matchMedia('(prefers-reduced-motion: reduce)');
  if(media.matches){
    document.documentElement.classList.add('reduced-motion');
  }
})();
