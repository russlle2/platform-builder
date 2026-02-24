(function(){
  // Utilities
  function qs(sel, ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Next event module (mocked for local use)
  var nextEventEl = qs('#next-event .when');
  function loadNextEvent(){
    // In a live site we'd fetch an API. Here we simulate.
    var now = new Date();
    var options = {weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'};
    var next = new Date(now.getTime() + 5*24*60*60*1000); // 5 days from now
    nextEventEl.textContent = next.toLocaleString(undefined, options);
    // also show brief session details
    var link = qs('#next-event a');
    link.href = 'events.html#'+next.toISOString().slice(0,10);
  }
  loadNextEvent();

  // Credibility badges + tooltips
  var badges = [
    {label:'Local Health Collective', tip:'Contributed space and community outreach.'},
    {label:'Continuing Ed: 6hrs', tip:'Eligible for continuing education credit.'},
    {label:'Community Sponsor', tip:'Partnered with neighborhood non-profit for sliding scale spots.'}
  ];
  var credList = qs('#cred-list');
  var credBadges = qs('#cred-badges');
  badges.forEach(function(b,i){
    var li = document.createElement('li'); li.className='badge';
    li.innerHTML = '<span>'+b.label+'</span><div class="tip">'+b.tip+'</div>';
    credList.appendChild(li);

    // also add small badge in hero
    var hb = document.createElement('div'); hb.className='badge'; hb.textContent = b.label; var t = document.createElement('div'); t.className='tip'; t.textContent = b.tip; hb.appendChild(t); credBadges.appendChild(hb);
  });

  // Proof gallery: rotating testimonials and badge tooltips
  var testimonials = [
    {text:'I noticed calmer nights after three sessions; the group rhythm helped me anchor.', who:'— A. from town'},
    {text:'The facilitator listened and adjusted tone—felt safe and clear.', who:'— J. local participant'},
    {text:'Monthly gatherings make it simple to keep a practice going.', who:'— R. member'}
  ];
  var tContainer = qs('.testimonials');
  testimonials.forEach(function(t,i){
    var div = document.createElement('div'); div.className='testimonial';
    if(i===0) div.className += ' active';
    div.innerHTML = '<p>"'+t.text+'"</p><p class="who">'+t.who+'</p>';
    tContainer.appendChild(div);
  });
  var tEls = qsa('.testimonial');
  var current = 0;
  function rotateTestimonials(){
    tEls[current].classList.remove('active');
    current = (current+1) % tEls.length;
    tEls[current].classList.add('active');
  }
  setInterval(rotateTestimonials,6000);

  // Pricing comparator toggle with animated numbers
  var pricing = qs('#pricing');
  if(pricing){
    var opts = qsa('.toggle .opt');
    var amounts = qsa('.amount');
    function animateValue(el, start, end, duration){
      var range = end - start; var startTime = null;
      function step(timestamp){
        if(!startTime) startTime = timestamp;
        var progress = Math.min((timestamp-startTime)/duration,1);
        var value = Math.round(start + range * progress);
        el.textContent = '$'+value;
        if(progress<1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    }
    function setMode(mode){
      opts.forEach(function(o){o.classList.toggle('active', o.dataset.mode===mode)});
      amounts.forEach(function(a){
        var monthly = parseFloat(a.dataset.monthly || 0);
        var pack = parseFloat(a.dataset.package || 0);
        if(!isNaN(monthly) && !isNaN(pack)){
          if(mode==='membership'){
            animateValue(a, parseInt(a.textContent.replace(/[^0-9]/g,''))||0, monthly, 600);
          } else {
            animateValue(a, parseInt(a.textContent.replace(/[^0-9]/g,''))||0, pack, 600);
          }
        } else {
          // fallback for non-numeric
          a.textContent = mode==='membership' ? a.dataset.monthly : a.dataset.package;
        }
      });
    }
    opts.forEach(function(o){
      o.addEventListener('click', function(){ setMode(o.dataset.mode); });
    });
    // initialize display: read dataset and show monthly
    setTimeout(function(){ setMode('membership'); }, 300);
  }

  // Simple menu toggle for mobile
  var menuToggle = qs('.menu-toggle');
  menuToggle && menuToggle.addEventListener('click', function(){
    var nav = qs('.nav');
    var open = nav.style.display === 'flex';
    nav.style.display = open ? 'none' : 'flex';
    this.setAttribute('aria-expanded', String(!open));
  });

  // small accessibility: reveal tooltips on keyboard focus
  qsa('.badge').forEach(function(b){
    b.tabIndex = 0;
    b.addEventListener('focus', function(){ var tip = b.querySelector('.tip'); tip && (tip.style.display='block'); });
    b.addEventListener('blur', function(){ var tip = b.querySelector('.tip'); tip && (tip.style.display='none'); });
  });

})();