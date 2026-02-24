(function(){
  // Small interactivity: menu toggle + lead form
  const menu = document.getElementById('menuToggle');
  const nav = document.querySelector('.nav');
  if(menu && nav){
    menu.addEventListener('click', ()=>{
      const open = nav.style.display !== 'block';
      nav.style.display = open ? 'block' : '';
    });
  }

  const form = document.getElementById('leadForm');
  if(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const email = form.email.value.trim();
      if(!email) return alert('Please provide an email');
      // local optimistic UI: thank you message
      form.innerHTML = '<p class="thanks">Thank you. We will send the next gathering notice to ' + email + '.</p>';
      // Simulate network event — in real life, hook to API
      console.log('Lead captured (simulated):', email);
    });
  }

  // testimonial rotation (gentle)
  const tests = document.querySelectorAll('.testimonials blockquote');
  if(tests.length>1){
    let i=0;
    setInterval(()=>{
      tests.forEach((t,idx)=> t.style.display = (idx===i)?'block':'none');
      i = (i+1)%tests.length;
    },4500);
  }
})();