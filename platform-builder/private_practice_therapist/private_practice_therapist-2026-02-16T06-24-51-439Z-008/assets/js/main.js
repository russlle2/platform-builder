// Minimal interactions: menu toggle, diagnostic result, smooth scroll
(function(){
  document.addEventListener('DOMContentLoaded',function(){
    var menu = document.querySelector('.menu-toggle');
    var nav = document.querySelector('.main-nav');
    if(menu && nav){
      menu.addEventListener('click',function(){
        nav.classList.toggle('open');
      });
    }

    // Diagnostic form
    var form = document.getElementById('miniDiagnostic');
    var result = document.getElementById('diagResult');
    if(form && result){
      form.addEventListener('submit',function(e){
        e.preventDefault();
        var area = form.elements['area'].value;
        var frequency = form.elements['frequency'].value;
        var goal = form.elements['goal'].value;
        var advice = '';
        if(frequency === 'often'){
          advice += 'It sounds like this is coming up frequently. '; }
        else if(frequency === 'sometimes'){ advice += 'This is occasional but worth attending to. '; }
        else { advice += 'Mild and intermittent—practices may help. '; }

        if(area === 'anxiety') advice += 'Try a short grounding practice and schedule a check-in to develop steady tools.';
        if(area === 'trauma') advice += 'Safety and pacing matter; consider an intake to plan slow, contained work.';
        if(area === 'relationships') advice += 'We can clarify boundaries and communication patterns in session.';
        if(area === 'work') advice += 'We’ll look at rhythm, limits, and micro-habits to reduce burnout.';
        if(area === 'transition') advice += 'Focus on values and practical steps to create forward momentum.';

        result.textContent = advice;
        result.classList.add('visible');
      });
    }

    // Smooth anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        var href = a.getAttribute('href');
        if(href.length>1){
          e.preventDefault();
          var el = document.querySelector(href);
          if(el){ el.scrollIntoView({behavior:'smooth',block:'start'}); }
        }
      });
    });
  });
})();
