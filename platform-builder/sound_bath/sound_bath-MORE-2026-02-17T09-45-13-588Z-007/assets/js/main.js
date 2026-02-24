// Main JS for interactive micro-widgets
(function(){
  // Utility: animate numbers
  function animateValue(el, start, end, duration){
    var startTime = null;
    var step = function(timestamp){
      if(!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime)/duration, 1);
      var value = Math.floor(start + (end - start) * progress);
      el.textContent = value;
      if(progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }

  // Pricing toggle logic
  var toggle = document.getElementById('pricing-toggle');
  if(toggle){
    toggle.addEventListener('click', function(e){
      var btn = e.target.closest('button');
      if(!btn) return;
      var mode = btn.getAttribute('data-mode');
      // set active state
      Array.from(toggle.querySelectorAll('button')).forEach(function(b){b.classList.toggle('active', b===btn)});
      // for each price, animate
      Array.from(document.querySelectorAll('.price')).forEach(function(p){
        var numEl = p.querySelector('.num');
        var from = parseInt(numEl.textContent,10) || 0;
        var to = parseInt(p.getAttribute(mode==='package'?'data-package':'data-month'),10) || from;
        animateValue(numEl, from, to, 500);
      });
    });
  }

  // Mood-to-Method selector logic (works for multiple instances)
  function setupMoodSelectors(){
    var mapping = {
      anxious:{title:'Gentle Resonance',copy:'Short guided bath to ease tension; focus on long exhale and soft tones.',ctaText:'Book a calming slot',ctaHref:'book.html'},
      tired:{title:'Slow Restore',copy:'A quieter, slower sequence aimed at restful reset and slowed nervous system.',ctaText:'Claim a slow session',ctaHref:'events.html'},
      wired:{title:'Ground & Settle',copy:'Rhythmic low tones and breath anchors to steady energy and focus.',ctaText:'Try a grounding session',ctaHref:'book.html'},
      curious:{title:'Explore Series',copy:'A mini-series to learn tools and notice sustainable change.',ctaText:'See the mini-series',ctaHref:'pricing.html'}
    };

    Array.from(document.querySelectorAll('.mood-selector')).forEach(function(wrapper){
      wrapper.addEventListener('click', function(e){
        var btn = e.target.closest('button');
        if(!btn) return;
        var mood = btn.getAttribute('data-mood');
        var rec = wrapper.parentElement.querySelector('.mood-recommendation');
        var title = rec.querySelector('.method-title');
        var copy = rec.querySelector('.method-copy');
        var cta = rec.querySelector('.mood-cta');
        var map = mapping[mood] || mapping['curious'];
        // little morph animation
        title.style.opacity = 0; copy.style.opacity = 0; cta.style.opacity = 0;
        setTimeout(function(){
          title.textContent = map.title;
          copy.textContent = map.copy;
          if(cta){ cta.textContent = map.ctaText; cta.setAttribute('href', map.ctaHref); }
          title.style.opacity = 1; copy.style.opacity = 1; if(cta) cta.style.opacity = 1;
        }, 120);
      });
    });
  }
  setupMoodSelectors();

  // Small UX: initialize pricing numbers to monthly values
  document.addEventListener('DOMContentLoaded', function(){
    Array.from(document.querySelectorAll('.price')).forEach(function(p){
      var numEl = p.querySelector('.num');
      var val = p.getAttribute('data-month') || numEl.textContent;
      numEl.textContent = val;
    });
  });

})();