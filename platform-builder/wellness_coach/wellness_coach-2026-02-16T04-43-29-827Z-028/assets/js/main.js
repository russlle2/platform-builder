document.getElementById('year').textContent = new Date().getFullYear();

function handleLead(e){
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  if(!email) return false;
  // Simulate sending to CRM - replace with real endpoint integration later
  console.log('Lead captured:', email);
  // Show a thank-you microinteraction
  const form = document.getElementById('lead-form');
  form.innerHTML = '<p style="font-weight:700">Thanks — check your inbox for the guide.</p><p style="font-size:13px;color:#6b7280">We just sent a PDF with simple, repeatable rituals.</p>';
  return false;
}

// Light UI touches
window.addEventListener('DOMContentLoaded',()=>{
  // Simple intersection-based reveal for sections
  const els = document.querySelectorAll('section');
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
      }
    });
  },{threshold:0.12});
  els.forEach(el=>obs.observe(el));
});