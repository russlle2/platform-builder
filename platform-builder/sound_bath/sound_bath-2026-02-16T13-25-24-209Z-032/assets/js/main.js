(function(){
  // Ripple triggers
  function makeRipple(e){
    var rect = e.currentTarget.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    var r = Math.max(rect.width, rect.height);
    var el = document.createElement('span');
    el.className = 'ripple';
    el.style.left = (x - r/2) + 'px';
    el.style.top = (y - r/2) + 'px';
    el.style.width = el.style.height = r + 'px';
    e.currentTarget.appendChild(el);
    setTimeout(function(){ el.remove(); }, 950);
  }

  document.addEventListener('DOMContentLoaded', function(){
    // Attach ripple to elements with class ripple-trigger
    var triggers = document.querySelectorAll('.ripple-trigger');
    triggers.forEach(function(btn){
      btn.addEventListener('click', function(ev){
        // For anchors, show ripple on their parent container if possible
        var target = btn;
        // create a temporary ripple container if none
        if(getComputedStyle(target).position === 'static'){
          target.style.position = 'relative';
        }
        makeRipple(ev);
      });
    });

    // Nav toggle for small screens
    var toggle = document.querySelector('.menu-toggle');
    if(toggle){
      toggle.addEventListener('click', function(){
        var nav = document.querySelector('.nav');
        var expanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!expanded));
        if(nav){ nav.style.display = expanded ? 'none' : 'flex'; }
      });
    }

    // Gentle motion seeded for consistent visual
    var seed = 638947372;
    var rx = 40 + (seed % 20);
    var ry = 50 + ((seed>>2) % 20);
    document.documentElement.style.setProperty('--rx', rx + '%');
    document.documentElement.style.setProperty('--ry', ry + '%');

    // Subtle auto move of ripple-pane focus to give sense of flow
    var pane = document.querySelector('.ripple-pane');
    if(pane){
      var i=0;
      setInterval(function(){
        i = (i+1)%100;
        var x = 30 + Math.sin(i/10)*20;
        var y = 40 + Math.cos(i/14)*18;
        pane.style.setProperty('--rx', x + '%');
        pane.style.setProperty('--ry', y + '%');
      },2200);
    }
  });
})();