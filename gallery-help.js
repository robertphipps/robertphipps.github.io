/* Gallery "what is this?" helper (shared by gallery-main.html and gallery-misc.html).
   Click the image at the top right -> a "what is this?" label slides out of it.
   Click the label -> the text from <template id="gallery-intro-text"> is typed out above the
   image, pushing it down as it goes; "what is this?" stays where it is. When the text has finished,
   "ok got it" appears below it and hides both the text and the label. */
(function(){
  var mark   = document.getElementById("help-mark");
  var bubble = document.getElementById("help-bubble");
  var intro  = document.getElementById("gallery-intro");
  var tpl    = document.getElementById("gallery-intro-text");
  if(!mark || !bubble || !intro || !tpl) return;

  var paras = [].map.call(tpl.content.querySelectorAll("p"), function(p){
    return p.textContent.replace(/\s+/g, " ").trim();
  }).filter(Boolean);

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SPEED = 28;          // ms per character
  var timer = null, shown = false;

  function setBubbleOpen(open){
    bubble.classList.toggle("open", open);
    mark.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function stop(){ if(timer){ clearTimeout(timer); timer = null; } }

  function renderPlain(){
    intro.textContent = "";
    paras.forEach(function(t){
      var p = document.createElement("p");
      p.textContent = t;
      intro.appendChild(p);
    });
  }
  function finish(){
    stop();
    renderPlain();                         // swap the typing markup for clean text
    intro.removeAttribute("aria-busy");
    // "ok got it" on its own line under the text; fades in (see .gallery-intro-close in styles.css)
    var line = document.createElement("p");
    line.className = "gallery-intro-close";
    var ok = document.createElement("button");
    ok.type = "button";
    ok.className = "gallery-intro-ok";
    ok.textContent = "ok got it \u2934";
    ok.addEventListener("click", dismiss);
    line.appendChild(ok);
    intro.appendChild(line);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ line.classList.add("visible"); }); });
  }

  function startTyping(){
    stop();
    intro.textContent = "";
    shown = true;
    if(reduceMotion){ finish(); return; }
    intro.setAttribute("aria-busy", "true");

    var words = paras.map(function(t){ return t.split(" "); });
    var pi = 0, wi = 0, ci = 0;            // paragraph, word, character
    var p = null, shownNode = null, rest = null;
    var caret = document.createElement("span");
    caret.className = "tw-caret";

    function step(){
      if(pi >= paras.length){ finish(); return; }
      var w = words[pi][wi];
      if(ci === 0){
        if(!p){ p = document.createElement("p"); intro.appendChild(p); }
        // Each word is a no-wrap span whose not-yet-typed letters are invisible but still take up
        // room, so a word moves to the next line before it is typed rather than jumping mid-word.
        var span = document.createElement("span");
        span.className = "tw-word";
        shownNode = document.createTextNode("");
        rest = document.createElement("span");
        rest.className = "tw-rest";
        span.appendChild(shownNode);
        span.appendChild(caret);
        span.appendChild(rest);
        if(wi > 0) p.appendChild(document.createTextNode(" "));
        p.appendChild(span);
      }
      ci++;
      shownNode.data = w.slice(0, ci);
      rest.textContent = w.slice(ci);

      var delay = SPEED, ch = w.charAt(ci - 1);
      if(/[.!?]/.test(ch)) delay += 260; else if(/[,;:]/.test(ch)) delay += 120;
      if(ci >= w.length){
        ci = 0; wi++;
        if(wi >= words[pi].length){ pi++; wi = 0; p = null; delay += 320; }
      }
      timer = setTimeout(step, delay);
    }
    step();
  }

  // Hides the text and slides the "what is this?" label back into the image.
  function dismiss(){
    stop();
    intro.textContent = "";
    intro.removeAttribute("aria-busy");
    shown = false;
    setBubbleOpen(false);
    mark.focus();
  }

  mark.addEventListener("click", function(){
    if(shown){ dismiss(); return; }
    setBubbleOpen(!bubble.classList.contains("open"));
  });
  bubble.addEventListener("click", function(){
    if(!shown) startTyping();              // the label stays put while the text is typed
  });
  document.addEventListener("keydown", function(e){
    if(e.key !== "Escape") return;
    if(shown){ dismiss(); }
    else if(bubble.classList.contains("open")){ setBubbleOpen(false); }
  });
})();
