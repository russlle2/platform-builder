// Mood-to-Method and accordions
document.addEventListener('DOMContentLoaded',function(){
  // Mood selector
  var moodButtons = document.querySelectorAll('.selector .mood');
  var methodText = document.querySelector('.method-recommendation');
  var dynamicCta = document.querySelector('.dynamic-cta');
  var primaryCta = document.querySelectorAll('.primary-cta');

  function clearActive(){moodButtons.forEach(function(b){b.classList.remove('active')})}

  moodButtons.forEach(function(btn){
    btn.addEventListener('click',function(){
      clearActive();
      btn.classList.add('active');
      var method = btn.getAttribute('data-method') || 'A thoughtful session';
      var ctaLabel = btn.getAttribute('data-cta-label') || '{{PRIMARY_CTA_LABEL}}';
      var ctaUrl = btn.getAttribute('data-cta-url') || '{{PRIMARY_CTA_URL}}';
      methodText.textContent = method + ': a suggested way to use a session now — short, practical steps and collaborative planning.';
      dynamicCta.textContent = ctaLabel;
      dynamicCta.setAttribute('href', ctaUrl);
      // update other primary CTAs on page for consistency
      primaryCta.forEach(function(c){c.textContent = ctaLabel; c.setAttribute('href', ctaUrl)});

      // slight visual nudge
      methodText.animate([{opacity:0.3,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:300,easing:'ease-out'})
    })
  })

  // Accordions for boundaries/confidentiality
  var toggles = document.querySelectorAll('.acc-toggle');
  toggles.forEach(function(t){
    t.addEventListener('click',function(){
      var panel = t.nextElementSibling;
      var open = panel.style.display === 'block';
      // close all
      document.querySelectorAll('.acc-panel').forEach(function(p){p.style.display = 'none'});
      if(!open){panel.style.display = 'block'; panel.scrollIntoView({behavior:'smooth',block:'center'})}
    })
  })

  // small accessibility: keyboard for mood buttons
  document.querySelectorAll('.selector .mood').forEach(function(b){
    b.setAttribute('tabindex','0');
    b.addEventListener('keypress',function(e){ if(e.key === 'Enter' || e.key === ' ') b.click(); })
  });

});