(function() {
  const JC_FILE = "AI Impact on Job Market (2024–2030).csv";
  const COL_JOBNAME = "Job Title";
  const COL_JOBNAME_ALT = "Job Role"; // Sometimes datasets do weird things.
  const COL_COUNTRY = "Location";
  const COL_SECTOR = "Industry";
  const COL_RISK = "Automation Risk (%)";
  const COL_IMPACT = "AI Impact Level";

  const BASE_ORBIT_OFFSET = 40;
  const BASE_ORBIT_SPEED = 0.00002;
  const ORBIT_SPEED_STEP = 0.000004;

  // Check if containers exist
  const containerElement = document.getElementById("job-constellation-country");
  const controlsElement = document.getElementById("job-constellation-controls");
  if (!containerElement || !controlsElement) {
    console.error("Containers #job-constellation-country or #job-constellation-controls not found");
    return;
  }

  //  GLOBAL "STUFF" 
  let allRows = []; // full dataset
  let countryList = []; // for dropdown
  let mainSVG, mainG;
  let w, h, radius;
  let orbitTick = null; 
  
  // COLORS 
  const colorImpactScale = d3
    .scaleOrdinal()
    .domain(["Low", "Moderate", "High"])
    .range(["#4CAF50", "#FFB300", "#F44336"]); 
  
  // Tooltip (single global) 
  let tip = d3
    .select("body")
    .append("div")
    .attr("class", "jc-tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0,0,0,0.9)")
    .style("color", "#fff")
    .style("padding", "8px 10px")
    .style("border-radius", "5px")
    .style("font-size", "11px")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("z-index", 1000)
    .style("border", "1px solid white");

  // LOAD CSV
  d3.csv(JC_FILE).then((incoming) => {
  
  allRows = incoming
    .map((d) => ({
      
      jobName: (d[COL_JOBNAME] || d[COL_JOBNAME_ALT] || "").trim(),
      country: (d[COL_COUNTRY] || "").trim(),
      sector: (d[COL_SECTOR] || "").trim(),
      riskPct: +d[COL_RISK],
      impactLevel: (d[COL_IMPACT] || "").trim(),
    }))
    .filter((r) => {
      
      return (
        r.jobName &&
        r.country &&
        r.sector &&
        !isNaN(r.riskPct) &&
        r.riskPct >= 0 &&
        r.riskPct <= 100
      );
    });

  // Collect countries (sorted — mostly aesthetic)
  countryList = Array.from(new Set(allRows.map((r) => r.country))).sort();

  setupSvgStage();
  buildCountryDropdown();

    // autoload the first option (why not)
    if (countryList.length > 0) {
      updateSelectedCountry(countryList[0]);
    }
  })
  .catch((err) => {
    console.error("Error loading job constellation data:", err);
    const container = d3.select("#job-constellation-country");
    if (container.node()) {
      container
        .append("div")
        .style("color", "#f5f5f5")
        .style("padding", "20px")
        .text("Failed to load job constellation data.");
    }
  });

  // INIT SVG 
  function setupSvgStage() {
    const container = d3.select("#job-constellation-country");
    container.selectAll("svg").remove();
    const fullW = container.node().clientWidth || 700;
    const fullH = 600;

  const m = { top: 40, right: 40, bottom: 40, left: 40 };

  w = fullW - m.left - m.right;
  h = fullH - m.top - m.bottom;
  radius = Math.min(w, h) / 2;

    mainSVG = container
      .append("svg")
      .attr("width", fullW)
      .attr("height", fullH)
      .style("max-width", "100%")
      .style("height", "auto");

  mainG = mainSVG
    .append("g")
    .attr("transform", `translate(${m.left + w / 2}, ${m.top + h / 2})`);

  // Just putting a title here
  mainSVG
    .append("text")
    .attr("class", "jc-title")
    .attr("x", fullW / 2)
    .attr("y", 28)
    .attr("text-anchor", "middle")
      .style("fill", "#f5f5f5")
      .style("font-size", "16px")
      .style("font-weight", "600");
  }

  //COUNTRY DROPDOWN 
  function buildCountryDropdown() {
    const controls = d3.select("#job-constellation-controls");
    controls.selectAll("*").remove(); 

    const row = controls.append("div").style("margin-bottom", "10px");

    row
      .append("label")
      .text("Select Country: ")
      .style("color", "#f5f5f5")
      .style("margin-right", "10px");

    const sel = row
      .append("select")
      .attr("class", "form-select form-select-sm")
      .style("width", "auto")
      .style("background", "#111")
      .style("color", "#f5f5f5")
      .style("border", "1px solid #444");

  sel
    .selectAll("option")
    .data(countryList)
    .enter()
    .append("option")
    .attr("value", (d) => d)
    .text((d) => d);

    
    sel.on("change", function () {
      updateSelectedCountry(this.value);
    });
  }

  //MAIN UPDATE (per country)
  function updateSelectedCountry(countryName) {
  
  if (orbitTick) {
    orbitTick.stop();
    orbitTick = null;
  }

  const rows = allRows.filter((r) => r.country === countryName);

  
  mainG.selectAll("*").remove();
  mainSVG.select(".jc-title").text(`Job Constellation — ${countryName}`);

  if (!rows.length) {
      mainG
        .append("text")
        .attr("text-anchor", "middle")
        .style("fill", "#f5f5f5")
        .text(`No jobs for ${countryName}`);
    return;
  }

  // Group jobs by sector
  let grouped = d3
    .rollups(
      rows,
      (v) => v,
      (r) => r.sector
    )
    .map(([sector, jobs]) => ({ sector, jobs }));

  // Sort industries by job count 
  grouped.sort((a, b) => b.jobs.length - a.jobs.length);

  const numOrbits = grouped.length;
  const orbitGap = (radius - BASE_ORBIT_OFFSET) / (numOrbits + 1);

  // Just shifting stars by automation risk 
  const riskRadialShift = d3
    .scaleLinear()
    .domain([0, 100])
    .range([-orbitGap * 0.25, orbitGap * 0.25]);

  const riskToSize = d3.scaleLinear().domain([0, 100]).range([2.5, 6]);

    // Orbit state (grouped vs spread)
  const orbitState = {};
  grouped.forEach((g, idx) => {
    orbitState[g.sector] = {
      idx,
      isSpread: 0, 
    };
  });

  // STAR DATA 
  const starData = grouped.flatMap((grp, idx) => {
    const clusterAngle = (2 * Math.PI * idx) / numOrbits;
    const baseR = BASE_ORBIT_OFFSET + (idx + 1) * orbitGap;
    const jobs = grp.jobs;

    return jobs.map((job, jidx) => {
      const fullSpreadAngle = (2 * Math.PI * jidx) / Math.max(1, jobs.length);

      return {
        label: job.jobName,
        sector: grp.sector,
        risk: job.riskPct,
        impact: job.impactLevel,
        orbitIdx: idx,
        defaultR: baseR,
        groupAngle: clusterAngle,
        freedAngle: fullSpreadAngle,
      };
    });
  });

  const starsBySector = d3.group(starData, (d) => d.sector);

  //Draw orbits & labels
  grouped.forEach((grp, idx) => {
    const R = BASE_ORBIT_OFFSET + (idx + 1) * orbitGap;

    // The faint ring
    mainG
      .append("circle")
      .attr("class", "jc-orbit")
      .attr("data-sector", grp.sector)
      .attr("r", R)
      .attr("fill", "none")
      .attr("stroke", "#333")
      .attr("stroke-dasharray", "2,3")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("click", () => toggleSector(grp.sector));

    // The label for the orbit
    mainG
      .append("text")
      .attr("class", "jc-orbit-label")
      .attr("data-sector", grp.sector)
      .attr("x", 0)
      .attr("y", -R - 10)
      .attr("text-anchor", "middle")
      .style("fill", "#ccc")
      .style("font-size", "10px")
      .style("cursor", "pointer")
      .text(grp.sector)
      .on("click", () => toggleSector(grp.sector));

   
  });

  //Draw Stars 
  const stars = mainG
    .selectAll("circle.jc-star")
    .data(starData)
    .enter()
    .append("circle")
    .attr("class", "jc-star")
    .attr("r", (d) => riskToSize(d.risk)) // risk → size
    .attr("fill", (d) => colorImpactScale(d.impact))
    .attr("stroke", "#111")
    .attr("stroke-width", 0.8)
    .attr("opacity", 0.9)
    .on("mouseover", function (event, d) {
      tip
        .html(
          `
                <strong>${d.label}</strong><br>
                Industry: ${d.sector}<br>
                Automation Risk: ${d.risk}%<br>
                AI Impact: ${d.impact}
            `
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px")
        .transition()
        .duration(120)
        .style("opacity", 1);
    })
    .on("mousemove", function (event) {
      // Keep tooltip following the mouse
      tip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", function () {
      tip.transition().duration(120).style("opacity", 0);
    });

    // Center label for country
    mainG
      .append("text")
      .attr("text-anchor", "middle")
      .style("fill", "#777")
      .style("font-size", "12px")
      .text(countryName);

  // Orbit rotational speeds (inner slower than outer? meh)
  const speeds = [];
  for (let i = 0; i < numOrbits; i++) {
    // This pattern is a bit silly but I like spacing it out visually:
    const sp = BASE_ORBIT_SPEED + ORBIT_SPEED_STEP * i;
    speeds.push(sp);
  }

  // ====== ANIMATION ======
  orbitTick = d3.timer((elapsedMS) => {
    stars
      .attr("cx", (d) => {
        const s = orbitState[d.sector];
        const spread = s ? s.isSpread : 0;

        const effectiveR = d.defaultR + riskRadialShift(d.risk);

        // Weighted angle: clustered angle vs spread-out angle
        const baseAng = d.groupAngle * (1 - spread) + d.freedAngle * spread;
        const ang = baseAng + speeds[d.orbitIdx] * elapsedMS;

        return Math.cos(ang) * effectiveR;
      })
      .attr("cy", (d) => {
        const s = orbitState[d.sector];
        const spread = s ? s.isSpread : 0;

        const effectiveR = d.defaultR + riskRadialShift(d.risk);
        const baseAng = d.groupAngle * (1 - spread) + d.freedAngle * spread;
        const ang = baseAng + speeds[d.orbitIdx] * elapsedMS;

        return Math.sin(ang) * effectiveR;
      });
  });

    // === Toggle sector grouping ===
    function toggleSector(sectorName) {
      const s = orbitState[sectorName];
      if (!s) return;

      // flip state
      s.isSpread = s.isSpread === 0 ? 1 : 0;

      // NOTE: No transition here — stars just gradually rotate
      // and new angles take effect automatically.
    }
  }
})();
