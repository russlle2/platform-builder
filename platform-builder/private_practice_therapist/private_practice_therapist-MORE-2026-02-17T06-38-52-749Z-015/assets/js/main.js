// Interactive behavior for Pricing Comparator and Mood-to-Method
document.addEventListener('DOMContentLoaded',function(){
  // Set current year
  var yr = document.getElementById('year'); if(yr) yr.textContent = new Date().getFullYear();

  // Pricing comparator
  var toggle = document.getElementById('pricingToggle');
  var monthlyEls = document.querySelectorAll('[data-monthly]');
  var packageEls = document.querySelectorAll('[data-package]');

  // parse numbers
  function parseNum(el){ return Number(el.getAttribute('data-monthly') || el.getAttribute('data-package') || el.textContent.replace(/[^0-9.]/g,'')) }

  function animateValue(el, start, end, duration){
    var startTime = null;
    var step = function(time){
      if(!startTime) startTime = time;
      var progress = Math.min((time - startTime)/duration,1);
      var val = Math.round(start + (end-start)*progress);
      el.textContent = val;
      if(progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function showMonthly(){
    // show monthly values if data-monthly present; otherwise compute from package
    monthlyEls.forEach(function(el){
      var to = parseNum(el);
      var cur = Number(el.textContent.replace(/[^0-9.]/g,'')) || 0;
      animateValue(el,cur,to,500);
    });
    packageEls.forEach(function(el){
      // convert package to monthly estimate if data-package exists
      var pkg = Number(el.getAttribute('data-package')) || parseNum(el);
      var to = Math.round(pkg / 6); // assume 6-week pathway conversion
      var cur = Number(el.textContent.replace(/[^0-9.]/g,'')) || 0;
      animateValue(el,cur,to,500);
    });
  }
  function showPackage(){
    packageEls.forEach(function(el){
      var to = Number(el.getAttribute('data-package')) || parseNum(el);
      var cur = Number(el.textContent.replace(/[^0-9.]/g,'')) || 0;
      animateValue(el,cur,to,500);
    });
    monthlyEls.forEach(function(el){
      var monthly = Number(el.getAttribute('data-monthly')) || parseNum(el);
      var to = Math.round(monthly * 6); // convert to package estimate
      var cur = Number(el.textContent.replace(/[^0-9.]/g,'')) || 0;
      animateValue(el,cur,to,500);
    });
  }

  if(toggle){
    toggle.addEventListener('change',function(){
      if(toggle.checked){
        document.querySelectorAll('.monthly-hide').forEach(function(n){n.style.display='inline'});
        showPackage();
      } else {
        document.querySelectorAll('.monthly-hide').forEach(function(n){n.style.display='none'});
        showMonthly();
      }
    });
    // initialize to monthly
    toggle.checked = false; document.querySelectorAll('.monthly-hide').forEach(function(n){n.style.display='none'}); showMonthly();
  }

  // Mood-to-Method selector
  var moods = document.querySelectorAll('.mood');
  var methodTitle = document.getElementById('methodTitle');
  var methodDesc = document.getElementById('methodDesc');
  var methodCTA = document.getElementById('methodCTA');
  var primaryCtaBtn = document.getElementById('primaryCtaBtn');

  var map = {
    'overwhelmed':{
      title: 'Short anchors and immediate choices',
      desc: 'We prioritize calming practices, a brief safety plan if needed, and a tiny set of doable tasks to ease everyday pressure.',
      cta: 'Schedule a short support session',
      url: '{{PRIMARY_CTA_URL}}?focus=calm'
    },
    'stuck':{
      title: 'Break the loop — clarify a next step',
      desc: 'We map what keeps you stuck, try a small behavioral experiment, and make a plan designed to test change with low risk.',
      cta: 'Book a focused planning session',
      url: '{{PRIMARY_CTA_URL}}?focus=plan'
    },
    'grieving':{
      title: 'Gentle space for loss',
      desc: 'Support that honors time and feeling, with attention to routines and tasks that help maintain functioning while you grieve.',
      cta: 'Find a session for grief support',
      url: '{{PRIMARY_CTA_URL}}?focus=grief'
    },
    'transitioning':{
      title: 'A map for the new chapter',
      desc: 'We look at values and goals, planning steps that match your priorities and the practical realities of change.',
      cta: 'Explore a pathway package',
      url: '{{PRIMARY_CTA_URL}}?focus=transition'
    },
    'anxious':{
      title: 'Skills, structure, and small exposure',
      desc: 'We develop coping tools, practice them in small doses, and shape a plan to reduce avoidance while staying compassionate with yourself.',
      cta: 'Start with an anxiety-focused session',
      url: '{{PRIMARY_CTA_URL}}?focus=anxiety'
    }
  };

  moods.forEach(function(btn){
    btn.addEventListener('click',function(){
      moods.forEach(function(b){b.setAttribute('aria-checked','false')});
      btn.setAttribute('aria-checked','true');
      var key = btn.getAttribute('data-key');
      var data = map[key];
      if(data){
        // animate text crossfade
        methodTitle.style.opacity=0; methodDesc.style.opacity=0; methodCTA.style.opacity=0;
        setTimeout(function(){
          methodTitle.textContent = data.title;
          methodDesc.textContent = data.desc;
          methodCTA.textContent = data.cta;
          methodCTA.setAttribute('href', data.url);
          if(primaryCtaBtn){ primaryCtaBtn.textContent = data.cta; primaryCtaBtn.setAttribute('href', data.url); }
          methodTitle.style.opacity=1; methodDesc.style.opacity=1; methodCTA.style.opacity=1;
        },260);
      }
    });
  });

  // Mobile menu toggle
  var menuToggle = document.querySelector('.menu-toggle');
  var mainNav = document.querySelector('.main-nav');
  menuToggle && menuToggle.addEventListener('click',function(){
    var open = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', String(!open));
    if(mainNav) mainNav.style.display = open ? 'none' : 'flex';
  });
});