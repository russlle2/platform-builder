// Minimal interactivity: nav toggle, FAQ accordion, lead form handling, update year
document.addEventListener('DOMContentLoaded',function(){
  var navToggle=document.getElementById('navToggle');
  var mainNav=document.getElementById('mainNav');
  if(navToggle){
    navToggle.addEventListener('click',function(){
      var expanded=this.getAttribute('aria-expanded')==='true';
      this.setAttribute('aria-expanded',!expanded);
      var ul=mainNav.querySelector('ul');
      if(ul){ ul.style.display = expanded? 'none' : 'flex'; }
    });
  }

  // FAQ accordion
  var qBtns=document.querySelectorAll('.faq-q');
  qBtns.forEach(function(btn){
    btn.addEventListener('click',function(){
      var id=this.getAttribute('data-target');
      var ans=document.getElementById(id);
      if(!ans) return;
      var open = ans.style.display === 'block';
      // close all
      document.querySelectorAll('.faq-a').forEach(function(a){ a.style.display='none'; });
      // open selected
      ans.style.display = open ? 'none' : 'block';
    });
  });

  // Lead form: prevent default and simulate submission
  var leadForm=document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email = leadForm.querySelector('input[name="email"]').value;
      if(!email) return alert('Please enter your email.');
      // basic feedback
      var btn = leadForm.querySelector('button');
      var orig = btn.innerText;
      btn.innerText = 'Sending...'; btn.disabled = true;
      setTimeout(function(){
        btn.innerText = 'Sent!';
        leadForm.reset();
        setTimeout(function(){ btn.innerText = orig; btn.disabled = false; },1500);
      },900);
      // In a real site we would POST to server: action="{{PRIMARY_CTA_URL}}"
    });
  }

  // set year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
});