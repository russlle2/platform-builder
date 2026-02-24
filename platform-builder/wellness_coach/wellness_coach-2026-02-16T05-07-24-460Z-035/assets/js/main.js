(function(){
  // Mobile nav
  var toggle=document.getElementById('nav-toggle');
  var nav=document.getElementById('main-nav');
  toggle && toggle.addEventListener('click',function(){
    if(nav.style.display==='block'){nav.style.display=''}else{nav.style.display='block'}
  });

  // Smooth anchor scroll
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var t=document.querySelector(this.getAttribute('href'));
      if(t) t.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // Diagnostic form logic
  var form=document.getElementById('diagnostic-form');
  var resultBox=document.getElementById('diagnostic-result');
  var resetBtn=document.getElementById('reset-diagnostic');
  form && form.addEventListener('submit',function(e){
    e.preventDefault();
    var f=new FormData(form);
    var energy=f.get('energy');
    var sleep=f.get('sleep');
    var focus=f.get('focus');
    var intention=(f.get('intention')||'').trim();

    // Simple clinical-oriented scoring
    var score=0;
    if(energy==='steady') score+=1; if(energy==='high') score+=2;
    if(sleep==='ok') score+=1; if(sleep==='rested') score+=2;
    if(focus==='improving') score+=1; if(focus==='centered') score+=2;

    var profile='Balanced';
    if(score<=2) profile='Fragile rhythm — start with very small rituals.';
    else if(score<=4) profile='On the rise — adopt 2–3 micro-habits.';
    else profile='Stable base — amplify strengths and refine cues.';

    var planMsg='Suggested starter: choose one micro-habit for 2 weeks, pair it with a cue, and track once per day.';
    if(score<=2) planMsg='Begin with a single 60-second ritual each morning and a nightly 60-second review.';

    var html='<strong>Profile:</strong> '+profile+'<br><strong>Intention:</strong> '+(intention||'Not specified')+'<br><strong>Next step:</strong> '+planMsg+'<p class="small muted">This is a reflective diagnostic, not medical advice. For personal guidance, book a discovery call.</p>';
    resultBox.innerHTML=html; resultBox.hidden=false; resultBox.scrollIntoView({behavior:'smooth',block:'center'});
  });
  resetBtn && resetBtn.addEventListener('click',function(){form.reset(); resultBox.hidden=true});

  // Billing toggle updates price text (demo)
  var billingToggle=document.getElementById('billing-toggle');
  billingToggle && billingToggle.addEventListener('change',function(){
    var monthly=this.checked;
    document.querySelectorAll('.plan-card .amount').forEach(function(el){
      var card=el.closest('.plan-card');
      if(card && card.querySelector('h3')){
        var name=card.querySelector('h3').textContent.trim();
        if(name.indexOf('Sustain')!==-1){ el.textContent = monthly ? '$149/month' : '$149/month'; }
        else if(name.indexOf('Transformation')!==-1){ el.textContent = monthly ? '$350 / month (3 months)' : '$997'; }
        else if(name.indexOf('Discovery')!==-1){ el.textContent = monthly ? '$99 / month (3 months)' : '$297'; }
      }
    });
  });

  // Simple form stubs for enroll buttons
  document.querySelectorAll('.enroll').forEach(function(btn){
    btn.addEventListener('click',function(e){
      // allow real navigation if href external; here prevent for demo
      var href=btn.getAttribute('href');
      if(href && href.indexOf('#')===0){ e.preventDefault(); }
      // otherwise let the link work
    });
  });
})();
