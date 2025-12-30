(function() {
  const CSV_FILE = "AI Impact on Job Market (2024–2030).csv";
  const JOB_COLUMN = "Job Title";

  // loading CSV + geojson world map
  Promise.all([
    d3.csv(CSV_FILE),
    d3.json(
      "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
    ),
  ])
    .then(([rawCsv, worldData]) => {
      const containerElement = document.getElementById("world-map");
      if (!containerElement) {
        console.error("Container #world-map not found");
        return;
      }

      let jobList = rawCsv
        .map((r) => r[JOB_COLUMN])
        .filter((j) => j && j.trim() !== "");
      jobList = Array.from(new Set(jobList)).sort(d3.ascending);

      const container = d3.select("#world-map");
      const controlsDiv = container
        .insert("div", ":first-child")
        .attr("class", "world-map-controls mb-3");

      controlsDiv
        .append("label")
        .attr("for", "job-select")
        .text("Filter by Job Title: ")
        .style("color", "white")
        .style("margin-right", "10px");

      const jobSelect = controlsDiv
        .append("select")
        .attr("id", "job-select")
        .attr("class", "form-select")
        .style("display", "inline-block")
        .style("width", "auto")
        .style("background-color", "black")
        .style("color", "white")
        .style("border", "1px solid white");

      jobSelect.append("option").attr("value", "__ALL__").text("All jobs");

      // add job options
      jobSelect
        .selectAll("option.job-item")
        .data(jobList)
        .enter()
        .append("option")
        .attr("class", "job-item")
        .attr("value", (d) => d)
        .text((d) => d);

    //name fixes   
    const nameFixes = {
      USA: "United States",
      US: "United States",
      "U.S.": "United States",
      "U.S.A.": "United States",
      UK: "United Kingdom",
      "U.K.": "United Kingdom",
      "KOREA, SOUTH": "South Korea",
    };

    function tidyName(s) {
      if (!s) return s;
      let t = s.trim();
      const up = t.toUpperCase();
      if (nameFixes[up]) return nameFixes[up];
      return t;
    }

      // 3) Basic SVG setup
      container.selectAll("svg").remove(); 

      const margin = { top: 30, right: 10, bottom: 20, left: 10 };
      const containerWidth = containerElement.clientWidth || 900;
      const w = containerWidth - margin.left - margin.right;
      const h = 420 - margin.top - margin.bottom;

      const svg = container
        .append("svg")
        .attr("width", w + margin.left + margin.right)
        .attr("height", h + margin.top + margin.bottom)
        .style("max-width", "100%")
        .style("height", "auto")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const projection = d3.geoNaturalEarth1().fitSize([w, h], worldData);
      const worldPath = d3.geoPath().projection(projection);

      // tooltip 
      const hoverBox = d3
        .select("body")
        .append("div")
        .attr("class", "world-map-tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.9)")
        .style("color", "white")
        .style("padding", "8px 12px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("font-size", "13px")
        .style("z-index", "1000")
        .style("border", "1px solid white");

      const countryShapes = svg
        .selectAll("path")
        .data(worldData.features)
        .enter()
        .append("path")
        .attr("d", worldPath)
        .attr("fill", "#2b2b2b")
        .attr("stroke", "#111")
        .attr("stroke-width", 0.5)
        .on("mouseover", function (e, d) {
          d3.select(this).attr("stroke-width", 1.5).attr("stroke", "#fff");

          const risk = d.properties.avgAutomationRisk;
          hoverBox
            .transition()
            .duration(200)
            .style("opacity", 1);
          hoverBox
            .html(
              `<strong>${d.properties.name}</strong><br/>` +
                (risk == null
                  ? "No data"
                  : `Avg automation risk: ${risk.toFixed(1)}%`)
            )
            .style("left", e.pageX + 10 + "px")
            .style("top", e.pageY - 10 + "px");
        })
        .on("mousemove", function(e) {
          hoverBox
            .style("left", e.pageX + 10 + "px")
            .style("top", e.pageY - 10 + "px");
        })
        .on("mouseout", function () {
          d3.select(this).attr("stroke-width", 0.5).attr("stroke", "#666");
          hoverBox
            .transition()
            .duration(200)
            .style("opacity", 0);
        });

      // 4) Color scale (it's almost flat––only 49–51% but whatever)
      
      const RISK_MIN = 49;
      const RISK_MAX = 51;

      const riskColor = d3
        .scaleSequential()
        .domain([RISK_MIN, RISK_MAX])
        .interpolator(d3.interpolateYlOrRd);


      // 5) Functions for computing / applying risk by country
     
      function computeRisk(selected) {
        let subset = rawCsv;

        // maybe overkill but leaving it explicit
        if (selected && selected !== "__ALL__") {
          subset = rawCsv.filter((r) => r[JOB_COLUMN] === selected);
        }

        // group by Location and average Automation Risk
        // NOTE: d.Location isn't normalized earlier… maybe revisit someday.
        const grouped = d3.rollups(
          subset,
          (rows) => d3.mean(rows, (d) => +d["Automation Risk (%)"] || 0),
          (row) => row.Location
        );

        const riskMap = new Map(grouped);

        // special UK handling -> replicate into UK subregions
        const ukRisk =
          riskMap.get("UK") || riskMap.get("Uk") || riskMap.get("uk"); // yeah, slightly lazy, but functional

        if (ukRisk != null) {
          ["England", "Scotland", "Wales", "Northern Ireland"].forEach((r) => {
            if (!riskMap.has(r)) riskMap.set(r, ukRisk);
          });
        }

        return riskMap;
      }

      function attachRisk(riskMap) {
        // This loop is a bit brute force but it works.
        worldData.features.forEach((f) => {
          const name = f.properties.name;
          let val = riskMap.get(name);

          if (val == null) {
            // fallback: compare normalized names in multiple ways
            for (let [key, v] of riskMap.entries()) {
              const nk = tidyName(key);
              if (
                nk === name ||
                nk.toLowerCase() === name.toLowerCase() ||
                name.toLowerCase().includes(nk.toLowerCase()) ||
                nk.toLowerCase().includes(name.toLowerCase())
              ) {
                val = v;
                break;
              }
            }
          }

          // storing as a property so the tooltip can read it
          f.properties.avgAutomationRisk = val == null ? null : +val;
        });
      }

      function redraw(selectedRole) {
        const map = computeRisk(selectedRole);
        attachRisk(map);

        // update fill colors; left the transition smooth because it's pretty
        countryShapes
          .transition()
          .duration(800)
          .attr("fill", (d) =>
            d.properties.avgAutomationRisk == null
              ? "#2b2b2b"
              : riskColor(d.properties.avgAutomationRisk)
          );
      }

     
      // 6)legend 
      
      const L_W = 200,
        L_H = 10;
      const L_X = 10,
        L_Y = h - 18;

      const defs = svg.append("defs");
      const gradient = defs.append("linearGradient").attr("id", "map-grad");

      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", riskColor(RISK_MIN));
      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", riskColor(RISK_MAX));

      svg
        .append("rect")
        .attr("x", L_X)
        .attr("y", L_Y)
        .attr("width", L_W)
        .attr("height", L_H)
        .style("fill", "url(#map-grad)")
        .attr("stroke", "#666");

      // labels
      svg
        .append("text")
        .attr("x", L_X)
        .attr("y", L_Y - 6)
        .style("fill", "#cbd5e1")
        .style("font-size", "11px")
        .text("Automation risk (%)");

      svg
        .append("text")
        .attr("x", L_X)
        .attr("y", L_Y + L_H + 12)
        .style("fill", "#cbd5e1")
        .style("font-size", "11px")
        .text("49%");

      svg
        .append("text")
        .attr("x", L_X + L_W)
        .attr("y", L_Y + L_H + 12)
        .style("fill", "#cbd5e1")
        .style("font-size", "11px")
        .attr("text-anchor", "end")
        .text("51%");

      // title — centered-ish
      svg
        .append("text")
        .attr("x", w / 2)
        .attr("y", -8)
        .attr("text-anchor", "middle")
        .style("fill", "#cbd5e1")
        .style("font-weight", "600")
        .text("Average Automation Risk by Country (49–51% scale)");

      
      // 7) Dropdown + first paint
      //Fixed dropdown display on integration, it used to require a html element which wasn't in the github.
      redraw("__ALL__");

      jobSelect.on("change", (ev) => {
        redraw(ev.target.value);
      });
    })
    .catch((err) => {
      console.error("Something went wrong loading map/data", err);
      const container = d3.select("#world-map");
      if (container.node()) {
        container
          .append("div")
          .style("color", "#cbd5e1")
          .style("padding", "20px")
          .text("Failed to load world map data. Might be a network issue 😕");
      }
    });
})();
