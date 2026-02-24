// Minimal interactivity for navigation, lead form, and FAQ
document.addEventListener('DOMContentLoaded',function(){
  // year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // mobile nav toggle
  var btn=document.getElementById('nav-toggle');
  var nav=document.getElementById('main-nav');
  if(btn&&nav){
    btn.addEventListener('click',function(){
      nav.classList.toggle('open');
      if(nav.classList.contains('open')){nav.style.display='flex';nav.style.flexDirection='column';nav.style.background='#fff';nav.style.position='absolute';nav.style.right='24px';nav.style.top='64px';nav.style.padding='12px';nav.style.boxShadow='0 8px 30px rgba(11,18,32,0.08)'}
      else{nav.style.display='none'}
    });
  }

  // lead form submit
  var form=document.getElementById('lead-form');
  if(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var name=form.querySelector('input[name="name"]').value.trim();
      var email=form.querySelector('input[name="email"]').value.trim();
      if(!email){alert('Please enter your email.'); return}
      // Emulate sending
      var btn=form.querySelector('button');
      var old=btn.textContent; btn.textContent='Sending...'; btn.disabled=true;
      setTimeout(function(){
        btn.textContent='Sent';
        form.reset();
        setTimeout(function(){btn.textContent=old; btn.disabled=false},1800);
        alert('Thanks '+(name||'there')+"! We'll send your guide to " + email + '.');
      },900);
    });
  }

  // accessible details polyfill (basic)
  document.querySelectorAll('.faq-list details').forEach(function(d){
    d.addEventListener('toggle',function(){
      if(d.open) d.scrollIntoView({behavior:'smooth',block:'center'});
    });
  });
});