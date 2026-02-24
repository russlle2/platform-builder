document.addEventListener('DOMContentLoaded',function(){
  var form=document.getElementById('lead-form');
  if(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var email=(document.getElementById('email')||{}).value||'';
      if(!email||!email.includes('@')){
        alert('Please enter a valid email.');
        return;
      }
      // simulate capture
      try{var list=JSON.parse(localStorage.getItem('leads')||'[]');list.push({email:email,ts:new Date().toISOString()});localStorage.setItem('leads',JSON.stringify(list));}catch(err){}
      form.innerHTML='<p class="success">Thanks — your guide is on the way. Check your inbox.</p>';
    });
  }
  // simple progressive enhancement: make nav clickable on small screens
  var nav=document.querySelector('.main-nav ul');
  if(nav){
    var toggle=document.createElement('button');
    toggle.textContent='Menu';
    toggle.className='nav-toggle';
    toggle.addEventListener('click',function(){
      if(nav.style.display==='flex'){nav.style.display='none';}else{nav.style.display='flex';nav.style.flexDirection='column';}
    });
    document.querySelector('.header-grid').insertBefore(toggle,document.querySelector('.header-grid').children[1]);
  }
});