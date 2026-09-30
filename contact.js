/* Contact page (contact.html).
   Two glyphs sit on the page. Clicking one makes both disappear and puts its content in their place, on the
   white background (no animation): ✉︎ an email form (posted to FormSubmit, so no mail program is needed),
   ✆ a box with the phone number typed out letter by letter with a blinking caret, and two buttons below it:
   🗨 to text (an sms: link) and ☎ to call (a tel: link), which become active once the number is complete.
   The x, or Escape, closes the content and brings the glyphs back. */
(function(){
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var choices = document.getElementById("contact-choices");
  var openEmail = document.getElementById("open-email");
  var openPhone = document.getElementById("open-phone");
  var emailPane = document.getElementById("email-panel");
  var phonePane = document.getElementById("phone-panel");
  if(!choices || !openEmail || !openPhone || !emailPane || !phonePane) return;

  var current = null, typeTimer = null;
  var pairs = [
    { key: "email", btn: openEmail, pane: emailPane },
    { key: "phone", btn: openPhone, pane: phonePane }
  ];

  function show(key){
    current = key;
    clearTimeout(typeTimer);
    choices.hidden = !!key;                            // the glyphs disappear while a panel is showing
    pairs.forEach(function(p){
      p.pane.hidden = p.key !== key;
      p.btn.setAttribute("aria-expanded", p.key === key ? "true" : "false");
    });
    centerGlyphs();
    if(key === "email"){ status.textContent = ""; clearErrors(); form.querySelector("input").focus(); }
    if(key === "phone"){ typeNumber(); phonePane.querySelector(".cf-close").focus(); }
  }
  function closePanel(){
    var p = pairs.filter(function(x){ return x.key === current; })[0];
    show(null);
    if(p) p.btn.focus();
  }

  openEmail.addEventListener("click", function(){ show("email"); });
  openPhone.addEventListener("click", function(){ show("phone"); });
  emailPane.querySelector(".cf-close").addEventListener("click", closePanel);
  phonePane.querySelector(".cf-close").addEventListener("click", closePanel);
  document.addEventListener("keydown", function(e){
    if(e.key === "Escape" && current) closePanel();
  });

  /* ---- email ---- */
  var form = document.getElementById("email-form");
  var status = document.getElementById("email-status");
  var send = form.querySelector(".cf-send");
  var ENDPOINT = "https://formsubmit.co/ajax/robmphipps@gmail.com";

  function clearErrors(){ ["name", "email", "message"].forEach(function(n){ setError(form.elements[n], ""); }); }
  // Our own validation messages (the form has novalidate): simple red text next to the label.
  function setError(el, msg){
    var err = el.closest(".cf-field").querySelector(".cf-err");
    err.textContent = msg;
    if(msg) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
  }
  function validate(){
    var firstBad = null;
    ["name", "email", "message"].forEach(function(n){
      var el = form.elements[n], v = el.value.trim(), msg = "";
      if(!v) msg = "please fill this in";
      else if(el.type === "email" && el.validity.typeMismatch) msg = "please check this address";
      setError(el, msg);
      if(msg && !firstBad) firstBad = el;
    });
    if(firstBad) firstBad.focus();
    return !firstBad;
  }
  ["name", "email", "message"].forEach(function(n){
    form.elements[n].addEventListener("input", function(){ setError(this, ""); });
  });

  form.addEventListener("submit", function(e){
    e.preventDefault();
    if(!validate()) return;
    if(form.elements._honey.value) return;              // a bot filled in the hidden field
    var data = {};
    [].forEach.call(form.elements, function(el){ if(el.name) data[el.name] = el.value; });
    send.disabled = true;
    status.textContent = "sending\u2026";
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(data)
    }).then(function(r){
      if(!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function(j){
      if(j && (j.success === true || j.success === "true")){
        form.reset();
        status.textContent = "sent. thank you.";
        setTimeout(function(){ if(current === "email") closePanel(); }, 2200);
      } else { throw new Error("not sent"); }
    }).catch(function(){
      status.textContent = "";
      var a = document.createElement("a");
      a.href = "mailto:robmphipps@gmail.com?subject=" + encodeURIComponent("Message from robertphipps.com") +
               "&body=" + encodeURIComponent(data.message || "");
      a.textContent = "email me directly";
      status.appendChild(document.createTextNode("couldn\u2019t send \u2014 "));
      status.appendChild(a);
    }).then(function(){ send.disabled = false; });
  });

  /* ---- phone ---- */
  var phone = document.getElementById("phone-text");
  var callBtn = document.getElementById("call-btn");
  var textBtn = document.getElementById("text-btn");
  var NUMBER = phone.getAttribute("data-number");
  var TEL = phone.getAttribute("data-tel");
  var caret = document.createElement("span");
  caret.className = "tw-caret";

  function typeNumber(){
    clearTimeout(typeTimer);
    callBtn.removeAttribute("href");
    textBtn.removeAttribute("href");
    phone.textContent = "";
    var text = document.createTextNode("");
    phone.appendChild(text);
    phone.appendChild(caret);
    function done(){
      callBtn.setAttribute("href", "tel:" + TEL);
      callBtn.setAttribute("aria-label", "call " + NUMBER);
      textBtn.setAttribute("href", "sms:" + TEL);
      textBtn.setAttribute("aria-label", "text " + NUMBER);
    }
    if(reduceMotion){ text.data = NUMBER; done(); return; }
    var n = 0;
    typeTimer = setTimeout(function tick(){
      n++;
      text.data = NUMBER.slice(0, n);
      if(n >= NUMBER.length){ done(); return; }
      typeTimer = setTimeout(tick, 85 + Math.random() * 70);
    }, 450);
  }

  /* ---- optical centring of the symbol glyphs ----
     Symbol characters come from whatever fallback font the device has, and often sit low (or high) in their
     text box. For each element marked data-center, measure where the glyph's ink really is and nudge it so
     the ink is centred in the element's box. */
  var probeCtx = document.createElement("canvas").getContext("2d");
  function centerGlyphs(){
    [].forEach.call(document.querySelectorAll("[data-center]"), function(el){
      el.style.transform = "";
      var box = el.getBoundingClientRect();
      if(!box.width || !box.height) return;                 // hidden right now
      var probe = document.createElement("i");              // zero-size marker on the text baseline
      probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
      el.insertBefore(probe, el.firstChild);
      var origin = probe.getBoundingClientRect();
      el.removeChild(probe);
      probeCtx.font = getComputedStyle(el).font;
      var m = probeCtx.measureText(el.textContent);
      if(!m.actualBoundingBoxAscent && !m.actualBoundingBoxDescent) return;
      var inkTop = origin.bottom - m.actualBoundingBoxAscent, inkBottom = origin.bottom + m.actualBoundingBoxDescent;
      var dy = (box.top + box.bottom) / 2 - (inkTop + inkBottom) / 2;
      var dx = 0;
      if(el.hasAttribute("data-center-x")){
        var inkLeft = origin.left - m.actualBoundingBoxLeft, inkRight = origin.left + m.actualBoundingBoxRight;
        dx = (box.left + box.right) / 2 - (inkLeft + inkRight) / 2;
      }
      el.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)";
    });
  }
  var centerRaf = 0;
  window.addEventListener("resize", function(){ cancelAnimationFrame(centerRaf); centerRaf = requestAnimationFrame(centerGlyphs); });
  window.addEventListener("load", centerGlyphs);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(centerGlyphs);
  centerGlyphs();
})();
