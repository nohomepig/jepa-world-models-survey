(function () {
  "use strict";

  var FAMILY_META = {
    F: { label: "JEPA-F · Foundational & Static", cls: "fam-f", badge: "f", tag: "JEPA-F" },
    T: { label: "JEPA-T · Temporal", cls: "fam-t", badge: "t", tag: "JEPA-T" },
    A: { label: "JEPA-A · Action-Conditioned", cls: "fam-a", badge: "a", tag: "JEPA-A" },
    M: { label: "JEPA-M · Multimodal", cls: "fam-m", badge: "m", tag: "JEPA-M" },
    SC: { label: "JEPA-SC · Structured & Scene-Centric", cls: "fam-sc", badge: "sc", tag: "JEPA-SC" }
  };

  var FAMILY_ORDER = ["F", "T", "A", "M", "SC"];

  var ARCH_DATA = {
    ijepa: {
      src: "../figures/arch-ijepa.png",
      alt: "Schematic of I-JEPA masked-region latent prediction",
      caption: "Figure 4 · Masked-current latent prediction in JEPA-F, illustrated with I-JEPA.",
      title: "Figure 4 · Masked-Region Latent Prediction (I-JEPA)",
      desc: "A context encoder processes visible image blocks while an EMA target encoder provides target block representations; the predictor estimates target latents conditioned on mask position tokens under an L2 loss.",
      pdf: "../paper/survey.pdf#page=6",
      pdfLabel: "PDF p. 6 ↗"
    },
    vjepa2: {
      src: "../figures/arch-vjepa2.png",
      alt: "Schematic of V-JEPA 2 temporal latent prediction",
      caption: "Figure 5 · Temporal latent prediction in JEPA-T, illustrated with V-JEPA 2.",
      title: "Figure 5 · Temporal Latent Prediction (V-JEPA 2)",
      desc: "Applies spatiotemporal masking across video frames, predicting masked latent tubes from visible context using an EMA target encoder, stop-gradient, and L1 regression loss.",
      pdf: "../paper/survey.pdf#page=6",
      pdfLabel: "PDF p. 6 ↗"
    },
    vjepa2ac: {
      src: "../figures/arch-vjepa2ac.png",
      alt: "Schematic of V-JEPA 2-AC action-conditioned latent prediction",
      caption: "Figure 6 · Action-conditioned latent prediction in JEPA-A, illustrated with V-JEPA 2-AC.",
      title: "Figure 6 · Action-Conditioned Latent Prediction (V-JEPA 2-AC)",
      desc: "Keeps the pretrained visual encoder frozen on robot trajectories and trains an autoregressive predictor conditioned on visual representations and candidate actions or poses to forecast future latent states.",
      pdf: "../paper/survey.pdf#page=7",
      pdfLabel: "PDF p. 7 ↗"
    },
    vljepa: {
      src: "../figures/arch-vljepa.png",
      alt: "Schematic of VL-JEPA cross-modal target prediction",
      caption: "Figure 7 · Cross-modal target prediction in JEPA-M, illustrated with VL-JEPA.",
      title: "Figure 7 · Cross-Modal Target Prediction (VL-JEPA)",
      desc: "Encodes visual inputs and textual queries to predict continuous language-side embeddings produced by a Y-encoder, aligning vision and language semantics in latent space.",
      pdf: "../paper/survey.pdf#page=8",
      pdfLabel: "PDF p. 8 ↗"
    },
    causaljepa: {
      src: "../figures/arch-causaljepa.png",
      alt: "Schematic of Causal-JEPA object-level structured prediction",
      caption: "Figure 8 · Entity-structured target prediction in JEPA-SC, illustrated with Causal-JEPA.",
      title: "Figure 8 · Entity-Structured Target Prediction (Causal-JEPA)",
      desc: "Extracts object-centric latent slots from frame histories, masks selected object tracks, and predicts missing object states from remaining entities and auxiliary variables.",
      pdf: "../paper/survey.pdf#page=8",
      pdfLabel: "PDF p. 8 ↗"
    }
  };

  var listEl = document.getElementById("paper-list");
  var countEl = document.getElementById("paper-count");
  var searchEl = document.getElementById("paper-search");
  var familyButtons = Array.prototype.slice.call(document.querySelectorAll(".filter[data-filter]"));
  var capButtons = Array.prototype.slice.call(document.querySelectorAll(".filter[data-cap]"));
  var viewButtons = Array.prototype.slice.call(document.querySelectorAll(".view-btn[data-view]"));
  var jumpButtons = Array.prototype.slice.call(document.querySelectorAll("[data-jump-family]"));

  var papers = [];
  var activeFamily = "all";
  var activeCap = "all";
  var viewMode = "grouped";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function makeLink(href, className, text, ariaLabel) {
    var a = el("a", className, text);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    if (ariaLabel) a.setAttribute("aria-label", ariaLabel);
    return a;
  }

  function venueClass(venue) {
    if (!venue) return "venue-pill venue-arxiv";
    var v = venue.toLowerCase();
    if (v === "arxiv") return "venue-pill venue-arxiv";
    if (v.indexOf("workshop") !== -1 || v.indexOf("access") !== -1 || v.indexOf("knowledge") !== -1) {
      return "venue-pill venue-journal";
    }
    return "venue-pill venue-conf";
  }

  function makeEvidenceChip(label, sub, val) {
    var stateCls = val === "D" ? " is-d" : val === "Q" ? " is-q" : "";
    var chip = el("span", "ev-chip" + stateCls);
    chip.appendChild(document.createTextNode(label));
    if (sub) {
      chip.appendChild(el("sub", "", sub));
    }
    chip.appendChild(document.createTextNode(":" + (val === "-" ? "—" : val)));
    return chip;
  }

  function makeEvidenceRow(ev) {
    var wrap = el("div", "paper-ev-row");
    var data = ev || {};
    wrap.appendChild(makeEvidenceChip("R", null, data.R || "-"));
    wrap.appendChild(makeEvidenceChip("P", null, data.P || "-"));
    wrap.appendChild(makeEvidenceChip("I", null, data.I || "-"));
    wrap.appendChild(makeEvidenceChip("C", "sys", data.Csys || "-"));
    wrap.appendChild(makeEvidenceChip("C", "attr", data.Cattr || "-"));
    return wrap;
  }

  function matchesCap(paper) {
    if (activeCap === "all") return true;
    var ev = paper.evidence || {};
    if (activeCap === "P") return ev.P === "D" || ev.P === "Q";
    if (activeCap === "I") return ev.I === "D" || ev.I === "Q";
    if (activeCap === "C") return ev.Csys === "D" || ev.Csys === "Q" || ev.Cattr === "D" || ev.Cattr === "Q";
    return true;
  }

  function filterPapers() {
    var q = (searchEl && searchEl.value ? searchEl.value : "").trim().toLowerCase();
    return papers.filter(function (p) {
      if (activeFamily !== "all" && p.family !== activeFamily) return false;
      if (!matchesCap(p)) return false;
      if (!q) return true;
      var haystack = [p.name, p.title, p.venue, p.citeKey, String(p.year)].join(" ").toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
  }

  function renderGrouped(visible) {
    var frag = document.createDocumentFragment();
    FAMILY_ORDER.forEach(function (famKey) {
      var groupItems = visible.filter(function (p) { return p.family === famKey; });
      if (groupItems.length === 0) return;

      var meta = FAMILY_META[famKey];
      var block = el("div", "group-block");
      var header = el("div", "group-header " + meta.cls);
      header.appendChild(el("span", "", meta.label));
      header.appendChild(el("span", "group-count", groupItems.length + (groupItems.length === 1 ? " paper" : " papers")));
      block.appendChild(header);

      var rows = el("div", "group-rows");
      groupItems.forEach(function (p) {
        var row = el("article", "paper-row");
        row.appendChild(el("span", "paper-year", String(p.year)));

        var main = el("div", "paper-main");
        var titleLine = el("div", "paper-title-line");
        titleLine.appendChild(el("span", "paper-name", p.name));
        titleLine.appendChild(el("span", venueClass(p.venue), p.venue || "Preprint"));
        main.appendChild(titleLine);
        main.appendChild(el("div", "paper-title-text", p.title));
        main.appendChild(el("div", "paper-cite", p.citeKey));
        row.appendChild(main);

        row.appendChild(makeEvidenceRow(p.evidence));

        var links = el("div", "paper-links-col");
        if (p.url) {
          links.appendChild(makeLink(p.url, "mini-link", "Paper ↗", "Open " + p.name + " paper"));
        }
        if (p.code) {
          links.appendChild(makeLink(p.code, "mini-link", (p.codeLabel || "Code") + " ↗", "Open " + p.name + " code or project"));
        }
        row.appendChild(links);
        rows.appendChild(row);
      });

      block.appendChild(rows);
      frag.appendChild(block);
    });
    listEl.appendChild(frag);
  }

  function renderTable(visible) {
    var scroll = el("div", "table-scroll");
    var table = el("table");
    var thead = el("thead");
    var headRow = el("tr");
    ["Year", "Venue", "Method", "Paper", "R / P / I / C", "Code"].forEach(function (label) {
      var th = el("th", "", label);
      th.setAttribute("scope", "col");
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = el("tbody");
    visible.forEach(function (p) {
      var tr = el("tr");
      tr.appendChild(el("td", "", String(p.year)));

      var venueTd = el("td");
      venueTd.appendChild(el("span", venueClass(p.venue), p.venue || "Preprint"));
      tr.appendChild(venueTd);

      var methodTd = el("td");
      var fam = FAMILY_META[p.family] || { badge: "f", tag: "JEPA" };
      var badge = el("span", "fam-badge " + fam.badge, fam.tag);
      badge.style.marginRight = "6px";
      methodTd.appendChild(badge);
      methodTd.appendChild(el("strong", "", p.name));
      tr.appendChild(methodTd);

      var paperTd = el("td");
      if (p.url) {
        paperTd.appendChild(makeLink(p.url, "", p.title, "Open " + p.name + " paper"));
      } else {
        paperTd.textContent = p.title;
      }
      tr.appendChild(paperTd);

      var evTd = el("td");
      evTd.appendChild(makeEvidenceRow(p.evidence));
      tr.appendChild(evTd);

      var codeTd = el("td");
      if (p.code) {
        codeTd.appendChild(makeLink(p.code, "mini-link", (p.codeLabel || "Code") + " ↗", "Open " + p.name + " repository"));
      } else {
        codeTd.textContent = "—";
      }
      tr.appendChild(codeTd);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    scroll.appendChild(table);
    listEl.appendChild(scroll);
  }

  function renderCollection() {
    if (!listEl || !countEl) return;
    var visible = filterPapers();
    listEl.replaceChildren();
    countEl.textContent = visible.length + " / " + papers.length + " entries";

    if (visible.length === 0) {
      listEl.appendChild(el("p", "empty-state", "No methods match the current filters."));
      return;
    }

    if (viewMode === "table") {
      renderTable(visible);
    } else {
      renderGrouped(visible);
    }
  }

  function setActiveFamily(nextFamily) {
    activeFamily = nextFamily;
    familyButtons.forEach(function (b) {
      var active = b.dataset.filter === activeFamily;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    renderCollection();
  }

  function alignHash() {
    if (!window.location.hash) return;
    var anchor = document.getElementById(window.location.hash.slice(1));
    if (anchor) anchor.scrollIntoView({ behavior: "instant", block: "start" });
  }

  /* Collection event listeners */
  familyButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setActiveFamily(button.dataset.filter);
    });
  });

  capButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      activeCap = button.dataset.cap;
      capButtons.forEach(function (b) {
        var active = b === button;
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      renderCollection();
    });
  });

  viewButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      viewMode = button.dataset.view;
      viewButtons.forEach(function (b) {
        var active = b === button;
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      renderCollection();
    });
  });

  jumpButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setActiveFamily(button.dataset.jumpFamily);
      var target = document.getElementById("collection");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  if (searchEl) {
    searchEl.addEventListener("input", renderCollection);
  }

  /* Architecture Switcher */
  var archTabs = Array.prototype.slice.call(document.querySelectorAll(".arch-tab[data-arch]"));
  var archImg = document.getElementById("arch-img");
  var archTitle = document.getElementById("arch-title");
  var archDesc = document.getElementById("arch-desc");
  var archPdf = document.getElementById("arch-pdf");

  archTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var item = ARCH_DATA[tab.dataset.arch];
      if (!item || !archImg) return;
      archTabs.forEach(function (t) {
        var active = t === tab;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", String(active));
      });
      archImg.src = item.src;
      archImg.alt = item.alt;
      archImg.dataset.caption = item.caption;
      if (archTitle) archTitle.textContent = item.title;
      if (archDesc) archDesc.textContent = item.desc;
      if (archPdf) {
        archPdf.href = item.pdf;
        archPdf.textContent = item.pdfLabel;
      }
    });
  });

  /* Copy BibTeX */
  var copyBtn = document.getElementById("copy-bibtex");
  var bibCode = document.getElementById("bibtex-code");
  if (copyBtn && bibCode) {
    copyBtn.addEventListener("click", function () {
      var text = bibCode.textContent || "";
      function markCopied() {
        copyBtn.textContent = "Copied!";
        copyBtn.classList.add("copied");
        window.setTimeout(function () {
          copyBtn.textContent = "Copy BibTeX";
          copyBtn.classList.remove("copied");
        }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(markCopied).catch(fallbackCopy);
      } else {
        fallbackCopy();
      }
      function fallbackCopy() {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          markCopied();
        } finally {
          document.body.removeChild(ta);
        }
      }
    });
  }

  /* Lightbox modal for zoomable figures */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxCaption = document.getElementById("lightbox-caption");
  var lightboxClose = document.getElementById("lightbox-close");

  function openLightbox(img) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt || "";
    if (lightboxCaption) {
      lightboxCaption.textContent = img.dataset.caption || img.alt || "";
    }
    lightbox.classList.add("open");
    if (lightboxClose) lightboxClose.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("open");
  }

  document.addEventListener("click", function (e) {
    var img = e.target && e.target.closest ? e.target.closest("img.zoomable") : null;
    if (img) openLightbox(img);
  });

  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLightbox();
  });

  /* Reading Progress Bar & TOC Scroll-Spy */
  var progressBar = document.getElementById("progress-bar");
  var progressPending = false;
  function updateProgress() {
    progressPending = false;
    if (!progressBar) return;
    var doc = document.documentElement;
    var scrollMax = doc.scrollHeight - window.innerHeight;
    var pct = scrollMax > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollMax) * 100)) : 0;
    progressBar.style.width = pct.toFixed(1) + "%";
  }
  window.addEventListener("scroll", function () {
    if (!progressPending) {
      progressPending = true;
      window.requestAnimationFrame(updateProgress);
    }
  }, { passive: true });
  updateProgress();

  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc-nav a[href^='#']"));
  var sections = tocLinks
    .map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length > 0) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        tocLinks.forEach(function (a) {
          a.classList.toggle("active", a.getAttribute("href") === "#" + id);
        });
      });
    }, { rootMargin: "-20% 0px -65% 0px", threshold: 0 });
    sections.forEach(function (sec) { observer.observe(sec); });
  }

  /* Load Method Collection JSON */
  fetch("./papers.json")
    .then(function (r) {
      if (!r.ok) throw new Error("Failed to load papers.json");
      return r.json();
    })
    .then(function (data) {
      papers = Array.isArray(data) ? data : [];
      renderCollection();
      alignHash();
      window.requestAnimationFrame(alignHash);
    })
    .catch(function () {
      if (countEl) countEl.textContent = "Unavailable";
      if (listEl) listEl.appendChild(el("p", "empty-state", "Unable to load method collection. Serve via HTTP (e.g. python3 -m http.server 8000)."));
    });
})();
