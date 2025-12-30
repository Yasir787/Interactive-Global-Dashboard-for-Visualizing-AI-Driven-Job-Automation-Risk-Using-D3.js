(function() {
  const containerElement = document.getElementById("stock-visualization");
  if (!containerElement) {
    console.error("Container #stock-visualization not found");
    return;
  }

  const container = d3.select("#stock-visualization");
  container.selectAll("svg").remove();

  d3.csv("AI_Impact_(2024–2030).csv").then(rawData => {

  rawData.forEach(d => {
    d["Remote Work Ratio (%)"] = +d["Remote Work Ratio (%)"];
  });

  const industries = Array.from(new Set(rawData.map(d => d.Industry)));

  const counts = industries.map(ind => {
    const filtered = rawData.filter(d =>
      d.Industry === ind &&
      d["Remote Work Ratio (%)"] > 50
    );

    let low = 0;
    let medhigh = 0;

    filtered.forEach(d => {
      if (d["AI Impact Level"] === "Low") {
        low++;
      } else {
        medhigh++;
      }
    });

    return {
      Industry: ind,
      Low: low,
      MedHigh: medhigh
    };
  });

  const containerWidth = containerElement.clientWidth || 900;
  const svgWidth = Math.min(containerWidth, 900);
  const svgHeight = 500;

  const svg = container
  .append("svg")
  .attr("id", "chart_svg")
  .attr("preserveAspectRatio", "xMidYMid")
  .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
  .style("max-width", "100%")
  .style("height", "auto");

  const vbWidth = svgWidth;
  const vbHeight = svgHeight;

  function render() {
    svg.selectAll("*").remove();

    const margin = { top: 30, right: 50, bottom: 60, left: 60 };
    const width = vbWidth - margin.left - margin.right;
    const height = vbHeight - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3.scalePoint()
      .domain(industries)
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, 1500])
      .range([height, 0]);

    g.selectAll(".grid-line")
      .data([0, 500, 1000, 1500])
      .enter()
      .append("line")
      .attr("class", "grid-line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", d => y(d))
      .attr("y2", d => y(d));

    const defs = svg.append("defs");

    const gradientBlue = defs.append("linearGradient")
      .attr("id", "gradientBlue")
      .attr("x1", "0")
      .attr("y1", "0")
      .attr("x2", "0")
      .attr("y2", "1");

    gradientBlue.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#4287f7ff")
      .attr("stop-opacity", 0.4);

    gradientBlue.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#4287f7ff")
      .attr("stop-opacity", 0);

    const gradientGreen = defs.append("linearGradient")
      .attr("id", "gradientGreen")
      .attr("x1", "0")
      .attr("y1", "0")
      .attr("x2", "0")
      .attr("y2", "1");

    gradientGreen.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#1cc45aff")
      .attr("stop-opacity", 0.4);

    gradientGreen.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#1cc45aff")
      .attr("stop-opacity", 0);

    const areaLow = d3.area()
      .x(d => x(d.Industry))
      .y0(y(0))
      .y1(d => y(d.Low))
      .curve(d3.curveMonotoneX);

    const areaMedHigh = d3.area()
      .x(d => x(d.Industry))
      .y0(y(0))
      .y1(d => y(d.MedHigh))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(counts)
      .attr("fill", "url(#gradientGreen)")
      .attr("d", areaMedHigh);

    g.append("path")
      .datum(counts)
      .attr("fill", "url(#gradientBlue)")
      .attr("d", areaLow);

    const lineLow = d3.line()
      .x(d => x(d.Industry))
      .y(d => y(d.Low))
      .curve(d3.curveMonotoneX);

    const lineMedHigh = d3.line()
      .x(d => x(d.Industry))
      .y(d => y(d.MedHigh))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(counts)
      .attr("d", lineMedHigh)
      .attr("stroke", "#1cc45aff")
      .attr("stroke-width", 2)
      .attr("fill", "none");

    g.append("path")
      .datum(counts)
      .attr("d", lineLow)
      .attr("stroke", "#4287f7ff")
      .attr("stroke-width", 2)
      .attr("fill", "none");

    g.append("g")
      .attr("transform", `translate(0, ${height + 10})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(g => g.selectAll(".domain").remove())
      .call(g => g.selectAll(".tick line").remove())
      .selectAll("text")
      .attr("transform", "rotate(-20)")
      .style("text-anchor", "end")
      .style("font-size", "14px");

    g.append("g")
      .call(
        d3.axisLeft(y)
          .tickValues([0, 500, 1000, 1500])
          .tickSize(0)
      )
      .call(g => g.selectAll(".domain").remove())
      .call(g => g.selectAll(".tick line").remove())
      .selectAll("text")
      .style("font-size", "14px");

    const legend = svg.append("g")
      .attr("transform", `translate(${vbWidth - 210}, 20)`);

    legend.append("rect")
      .attr("width", 20)
      .attr("height", 20)
      .attr("fill", "#1cc45aff")
      .attr("opacity", 0.6);

    legend.append("text")
      .attr("x", 25)
      .attr("y", 15)
      .text("Moderate+High AI Impact")
      .style("fill", "#202429ff")
      .style("font-size", "14px");

    legend.append("rect")
      .attr("y", 30)
      .attr("width", 20)
      .attr("height", 20)
      .attr("fill", "#4287f7ff")
      .attr("opacity", 0.6);

    legend.append("text")
      .attr("x", 25)
      .attr("y", 45)
      .text("Low AI Impact")
      .style("fill", "#202429ff")
      .style("font-size", "14px");
  }

  render();
  window.addEventListener("resize", render);

  })
  .catch((err) => {
    console.error("Error loading stock visualization data:", err);
    container
      .append("div")
      .style("color", "#202429ff")
      .style("padding", "20px")
      .text("Failed to load stock visualization data.");
  });
})();

