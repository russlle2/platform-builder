(function(){
  'use strict';

  // Wait for DOM
  document.addEventListener('DOMContentLoaded',function(){
    // Remove the early hide
    document.documentElement.style.visibility = '';

    // Scroll reveal
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

    if(prefersReduced){
      reveals.forEach(function(el){ el.classList.add('is-visible'); });
    } else if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },{threshold:0.12});
      reveals.forEach(function(el){ io.observe(el); });
    } else {
      // Fallback show all
      reveals.forEach(function(el){ el.classList.add('is-visible'); });
    }

    // Session Planner widget
    var form = document.getElementById('planner-form');
    if(!form) return;
    var output = document.getElementById('plan-output');
    var btnBuild = document.getElementById('build-plan');
    var btnCopy = document.getElementById('copy-plan');
    var btnDownload = document.getElementById('download-plan');

    function tidyText(s){ return (s||'').trim(); }

    function buildSummary(data){
      var lines = [];
      lines.push('Session Planner — ' + (data.name || 'Client'));
      lines.push('Primary concern: ' + (data.concern || '—'));
      lines.push('Desired outcome: ' + (data.outcome || '—'));
      lines.push('Preferred format: ' + (function(v){
        if(v==='single') return 'Single deep session (2 hours)';
        if(v==='short') return 'Short arc (2 x 60 minutes)';
        if(v==='intensive') return 'Intensive arc (3-4 focused sessions)';
        return v;
      })(data.format));
      lines.push('Timeframe: ' + (data.timeframe || '—'));
      lines.push('\nSuggested first steps:');
      // Generate simple tailored suggestions (non-clinical language)
      if(data.concern){
        lines.push('- Clarify the specific decision or pattern to address in session.');
        lines.push('- Identify one small experiment to try between sessions and a way to notice its effect.');
      } else {
        lines.push('- Bring one concrete situation you want to change to the first meeting.');
      }
      lines.push('\nNotes:');
      lines.push('- This is a planning summary to bring to intake. It is not a diagnosis.');
      return lines.join('\n');
    }

    btnBuild.addEventListener('click',function(){
      var fd = new FormData(form);
      var data = {};
      fd.forEach(function(v,k){ data[k]=tidyText(v); });
      var text = buildSummary(data);
      output.textContent = text;
      output.focus();
    });

    btnCopy.addEventListener('click',function(){
      var text = output.textContent || '';
      if(!text) return;
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(function(){
          btnCopy.textContent = 'Copied';
          setTimeout(function(){ btnCopy.textContent = '{{PRIMARY_CTA_LABEL}}'; },1500);
        },function(){ fallbackCopy(text); });
      } else { fallbackCopy(text); }

      function fallbackCopy(t){
        var ta = document.createElement('textarea');
        ta.value = t; document.body.appendChild(ta); ta.select();
        try{ document.execCommand('copy'); btnCopy.textContent = 'Copied'; setTimeout(function(){ btnCopy.textContent = '{{PRIMARY_CTA_LABEL}}'; },1500); }catch(e){ alert('Copy not supported'); }
        document.body.removeChild(ta);
      }
    });

    btnDownload.addEventListener('click',function(){
      var text = output.textContent || '';
      if(!text) return; 
      var blob = new Blob([text],{type:'text/plain;charset=utf-8'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'session-plan.txt';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });

    // Small accessibility: reveal focus outlines
    document.addEventListener('keydown',function(e){ if(e.key==='Tab'){ document.body.classList.add('show-focus'); } });
  });
})();