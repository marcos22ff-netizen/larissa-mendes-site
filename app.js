(() => {
  const S = window.SITE || {};
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = matchMedia("(max-width: 760px)").matches;
  const cine = document.querySelector(".cine");
  const canvas = cine?.querySelector(".cine-canvas");
  const moments = [...document.querySelectorAll(".momento")];

  if (cine && canvas && S.frames?.total) {
    const ctx = canvas.getContext("2d");
    const total = S.frames.total;
    const pattern = mobile ? S.frames.mobile : S.frames.desktop;
    const images = new Array(total);
    let target = 0, current = 0, drawn = -1;
    const load = (i) => {
      if (images[i]) return images[i];
      const img = new Image(); img.decoding = "async";
      img.src = pattern.replace("{n}", String(i + 1).padStart(4, "0"));
      img.onload = () => { if (Math.round(current) === i || drawn < 0) draw(i, true); };
      images[i] = img; return img;
    };
    const ready = (i) => images[i]?.complete && images[i].naturalWidth;
    const nearest = (i) => { for (let d = 0; d < total; d++) { if (ready(i-d)) return i-d; if (ready(i+d)) return i+d; } return -1; };
    function draw(i, force = false) {
      const j = nearest(i); if (j < 0 || (j === drawn && !force)) return;
      const img = images[j], w = canvas.width, h = canvas.height;
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, (w-img.naturalWidth*scale)/2, (h-img.naturalHeight*scale)/2, img.naturalWidth*scale, img.naturalHeight*scale);
      drawn = j;
    }
    const resize = () => { const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(canvas.clientWidth*dpr); canvas.height = Math.round(canvas.clientHeight*dpr); drawn = -1; draw(Math.round(current), true); };
    const progress = () => { const r = cine.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / (cine.offsetHeight-innerHeight || 1))); };
    const updateMoments = (p) => { for (const m of moments) { const from = +m.dataset.de || 0, to = +m.dataset.ate || 1; m.classList.toggle("ativo", p >= from && (p < to || (to >= 1 && p >= 1))); } cine.classList.toggle("andou", p > .02); };
    load(0);
    if (!reduceMotion) {
      const queue = []; for (const step of [8,4,2,1]) for (let i=0;i<total;i+=step) if (!queue.includes(i)) queue.push(i);
      let k=0; const batch=()=>{ for(let n=0;n<6&&k<queue.length;n++) load(queue[k++]); if(k<queue.length)setTimeout(batch,40); }; batch();
    }
    const frame=()=>{ target=progress()*(total-1); current += (target-current)*.18; if(Math.abs(target-current)<.05)current=target; draw(Math.round(current)); updateMoments(current/(total-1||1)); requestAnimationFrame(frame); };
    addEventListener("resize", resize); resize();
    if (reduceMotion) updateMoments(0); else requestAnimationFrame(frame);
  }

  const header = document.querySelector(".topo"), whats = document.querySelector(".whats");
  const bookingForm = document.querySelector("#form-agendamento");
  const onScroll = () => {
    header?.classList.toggle("rolou", scrollY > 40);
    const rect = bookingForm?.getBoundingClientRect();
    const formVisible = !!rect && rect.top < innerHeight && rect.bottom > 0;
    whats?.classList.toggle("visivel", scrollY > innerHeight*.6 && !formVisible);
  };
  addEventListener("scroll", onScroll, { passive:true }); onScroll();
  const observer = new IntersectionObserver((entries) => entries.forEach(e => { if(e.isIntersecting){e.target.classList.add("visto");observer.unobserve(e.target);} }), {threshold:.18});
  document.querySelectorAll(".revelar").forEach(el=>observer.observe(el));
  document.querySelectorAll("[data-ano]").forEach(el=>el.textContent=new Date().getFullYear());

  const fundos = [...document.querySelectorAll(".cine-canvas, .arte")];
  if (!reduceMotion && fundos.length) {
    let toqueAtivo = null;
    const moverFundos = (evento) => {
      const x = ((evento.clientX / innerWidth) - .5) * -24;
      const y = ((evento.clientY / innerHeight) - .5) * -24;
      fundos.forEach(fundo => {
        fundo.style.setProperty("--toque-x", `${x.toFixed(1)}px`);
        fundo.style.setProperty("--toque-y", `${y.toFixed(1)}px`);
      });
    };
    const soltarFundos = (evento) => {
      if (evento.pointerId !== toqueAtivo) return;
      toqueAtivo = null;
      fundos.forEach(fundo => {
        fundo.style.setProperty("--toque-x", "0px");
        fundo.style.setProperty("--toque-y", "0px");
      });
    };
    addEventListener("pointerdown", evento => {
      if (evento.pointerType !== "touch") return;
      toqueAtivo = evento.pointerId;
      moverFundos(evento);
    }, {passive:true});
    addEventListener("pointermove", evento => {
      if (evento.pointerId === toqueAtivo) moverFundos(evento);
    }, {passive:true});
    addEventListener("pointerup", soltarFundos, {passive:true});
    addEventListener("pointercancel", soltarFundos, {passive:true});
  }

  const phone = String(S.whatsapp?.numero || "").replace(/\D/g, "");
  const baseMessage = S.whatsapp?.mensagem || "Olá, Larissa! Gostaria de agendar uma sessão de fisioterapia.";
  if (whats) whats.href = `https://wa.me/${phone}?text=${encodeURIComponent(baseMessage)}`;
  if (bookingForm) bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!bookingForm.reportValidity()) return;
    const values = Object.fromEntries(new FormData(bookingForm));
    const message = `${baseMessage}\n\nMeu nome: ${values.nome}\nRegião: ${values.regiao}\nO que gostaria de cuidar: ${values.motivo}\nDias/horários de preferência: ${values.horario}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    const status = bookingForm.querySelector(".form-status");
    if (status) { status.textContent = "Abrindo o WhatsApp com seu pedido de agendamento."; status.className = "form-status campo--inteiro ok"; }
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = url;
  });
})();
