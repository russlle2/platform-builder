(function(){document.getElementById('year').textContent=new Date().getFullYear();
var navToggle=document.getElementById('navToggle');var mainNav=document.getElementById('mainNav');navToggle&&navToggle.addEventListener('click',function(){if(mainNav.style.display==='flex'){mainNav.style.display='none'}else{mainNav.style.display='flex';mainNav.style.flexDirection='column';mainNav.style.gap='10px'}});
// Simple diagnostic logic
var quizRun=document.getElementById('quizRun');var quizResult=document.getElementById('quizResult');quizRun&&quizRun.addEventListener('click',function(){var mood=document.querySelector('input[name="mood"]:checked').value;var safety=document.getElementById('safety').value;var rec='';if(safety==='pregnancy'){rec='Safety note: consult your prenatal care provider. Consider citrus/light florals only with approval.'}else if(safety==='pets'){rec='Pet-safe suggestion: avoid tea tree, eucalyptus, and citrus in closed spaces; favor low-volatility florals at small doses.'}else if(safety==='sensitive'){rec='Sensitivity: choose low-dilution (0.5–1%) and single-note trials; favor gentle options like chamomile or diluted citrus.'}
if(mood==='calm'){rec=(rec?rec+'\n\n':'')+'Suggested profile: floral-woody — top: bergamot, heart:lavender, base:cedar. Gentle dilution 1–2%.'}
if(mood==='focus'){rec=(rec?rec+'\n\n':'')+'Suggested profile: bright-herbal — top: rosemary, heart:lemon verbena, base:light pine. Short diffuser bursts.'}
if(mood==='uplift'){rec=(rec?rec+'\n\n':'')+'Suggested profile: citrus-blend — top: sweet orange, heart:geranium, base:soft vanilla. Keep in 20–30 minute sessions.'}
if(mood==='sleep'){rec=(rec?rec+'\n\n':'')+'Suggested profile: lullaby blend — top: sweet marjoram, heart:lavender, base:vetiver. Use low dilution and patch-test.'}
quizResult.textContent=rec});
// Price card click interactions
Array.from(document.querySelectorAll('.price-card .btn')).forEach(function(btn){btn.addEventListener('click',function(e){e.preventDefault();window.location.href='/book.html'})});
})();