(function(){
  // Simple UI behaviors: nav toggle, chips, quiz, pricing toggle, year
  document.addEventListener('DOMContentLoaded',function(){
    // year
    var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

    // nav toggle
    var navToggle=document.getElementById('navToggle');
    var mainNav=document.getElementById('mainNav');
    navToggle&&navToggle.addEventListener('click',function(){
      var expanded=this.getAttribute('aria-expanded')==='true';
      this.setAttribute('aria-expanded',!expanded);
      mainNav.style.display = expanded? 'none':'flex';
    });

    // chips for scent quiz
    var chips=document.querySelectorAll('.chip');
    var selected=new Set();
    chips.forEach(function(c){
      c.addEventListener('click',function(){
        var v=this.getAttribute('data-value');
        if(this.classList.contains('active')){ this.classList.remove('active'); selected.delete(v); }
        else{ this.classList.add('active'); selected.add(v); }
      });
    });

    // quiz form
    var quiz=document.getElementById('scentQuiz');
    var result=document.getElementById('quizResult');
    var reset=document.getElementById('quizReset');
    reset&&reset.addEventListener('click',function(){
      chips.forEach(function(c){c.classList.remove('active')}); selected.clear(); document.getElementById('sensitivities').value=''; result.textContent='';
    });

    quiz&&quiz.addEventListener('submit',function(e){
      e.preventDefault();
      var sens=document.getElementById('sensitivities').value.trim();
      var picks=Array.from(selected);
      if(picks.length===0){ result.textContent='Pick at least one aroma family to receive a starter suggestion.'; return; }
      // build gentle plan suggestion (no medical claims)
      var profile = picks.join(', ');
      var note = sens? ('Noted cautions: '+sens+'.') : 'No cautions noted.';
      var suggestion = 'Suggested starter scent family: '+profile+". " + note + ' We recommend a starter kit with sample vials and a 1% topical dilution guide. For pregnancy or severe sensitivities, schedule a consult.';
      result.textContent = suggestion;
      // optional gentle UX: highlight plan card
      var pc=document.querySelector('.plan-card.highlighted'); if(pc){ pc.classList.add('pulse'); setTimeout(function(){pc.classList.remove('pulse')},1200); }
    });

    // pricing toggle stub
    var billingRadios=document.querySelectorAll('input[name="billing"]');
    billingRadios.forEach(function(r){ r.addEventListener('change',function(){
      var sub=this.value==='sub';
      document.querySelectorAll('.price').forEach(function(p){
        var base=parseFloat(p.textContent.replace('$',''))||0;
        if(sub) p.textContent = '$'+(Math.round(base*0.9)); else p.textContent = '$'+base;
      });
    })});

    // small accessibility: ensure nav hides on resize >880
    window.addEventListener('resize',function(){ if(window.innerWidth>880){ mainNav.style.display='flex'; } else { mainNav.style.display='none'; navToggle && navToggle.setAttribute('aria-expanded','false'); } });

    // micro-habits checkbox interactions (progressive enhancement)
    var habitItems=document.querySelectorAll('.habits-grid li');
    habitItems.forEach(function(li){ li.addEventListener('click',function(){ li.classList.toggle('done'); }); });

    // simple local link protection: validate CTA URL placeholder
    var primary = document.querySelector('.btn.primary');
    if(primary && primary.getAttribute('href').includes('{{')){ primary.addEventListener('click',function(e){ e.preventDefault(); alert('Please set your primary CTA URL in site settings before publishing.'); }); }
  });
})();