(function(){
  'use strict';

  // Scroll reveal with prefers-reduced-motion support
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  function showElement(el){ el.classList.add('visible'); }

  if(prefersReduced){
    revealEls.forEach(showElement);
  } else if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          showElement(e.target);
          io.unobserve(e.target);
        }
      });
    },{threshold:0.12});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    // fallback: reveal on scroll
    function onScroll(){
      var viewportH = window.innerHeight;
      revealEls.forEach(function(el){
        var rect = el.getBoundingClientRect();
        if(rect.top < viewportH - 40){ showElement(el); }
      });
      revealEls = revealEls.filter(function(el){return !el.classList.contains('visible');});
      if(revealEls.length===0){ window.removeEventListener('scroll', onScroll); }
    }
    window.addEventListener('scroll', onScroll);
    onScroll();
  }

  // Session Planner widget
  var form = document.getElementById('planner-form');
  if(form){
    var buildBtn = document.getElementById('p-build');
    var copyBtn = document.getElementById('p-copy');
    var output = document.getElementById('p-output');

    function gather(){
      var intent = document.getElementById('p-intent').value;
      var length = document.getElementById('p-length').value;
      var format = document.getElementById('p-format').value;
      var notes = document.getElementById('p-notes').value.trim();
      var texts = Array.prototype.slice.call(document.querySelectorAll('.p-text'))
        .filter(function(cb){ return cb.checked; }).map(function(cb){return cb.value;});

      var mapIntent = {
        rest: 'Prioritize deep rest and softening',
        focus: 'Support sustained attention and clarity',
        sleep: 'Ease into sleep with gentle decrescendo',
        reset: 'A short recalibration to steady the nervous system'
      };

      var lines = [];
      lines.push('Session plan — generated');
      lines.push('Intent: ' + (mapIntent[intent] || intent));
      lines.push('Length: ' + length + ' minutes');
      lines.push('Format: ' + format);
      if(texts.length){ lines.push('Textures: ' + texts.join(', ')); }
      if(notes){ lines.push('Notes / concerns: ' + notes); }
      lines.push('Suggested arrival: 10 minutes early for settling');
      lines.push('Booking tip: bring layers and avoid heavy meals right before session.');

      return lines.join('\n');
    }

    buildBtn.addEventListener('click', function(){
      var txt = gather();
      output.textContent = txt;
      copyBtn.disabled = false;
    });

    copyBtn.addEventListener('click', function(){
      var txt = output.textContent;
      if(!txt) return;
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(txt).then(function(){
          copyBtn.textContent = 'Copied';
          setTimeout(function(){ copyBtn.textContent = 'Copy summary'; },1600);
        });
      } else {
        // fallback
        var ta = document.createElement('textarea');
        ta.value = txt; document.body.appendChild(ta); ta.select();
        try{ document.execCommand('copy'); copyBtn.textContent = 'Copied'; }catch(e){}
        ta.remove();
        setTimeout(function(){ copyBtn.textContent = 'Copy summary'; },1600);
      }
    });
  }

  // Simple next-event inline update (placeholder logic)
  var nextInline = document.getElementById('next-event-inline');
  if(nextInline){
    // In a full site this would fetch upcoming events. Here we provide a friendly placeholder.
    var d = new Date();
    var dd = new Date(d.getTime() + 7*24*60*60*1000); // one week from now
    var opts = { weekday:'short', month:'short', day:'numeric' };
    nextInline.textContent = dd.toLocaleDateString(undefined, opts) + ' • small cohort';
  }

})();