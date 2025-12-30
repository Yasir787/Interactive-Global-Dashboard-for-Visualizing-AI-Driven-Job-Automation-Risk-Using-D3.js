(function() {
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "radar-tooltip")
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

  function buildRadarPathPoint(value, axisIndex, axisCount, scale, centerX, centerY) {
    const angleSlice = (Math.PI * 2) / axisCount;
    const angle = angleSlice * axisIndex - Math.PI / 2;
    const radius = scale(value);
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return [x, y];
  }

  function drawDestructionRadar(data) {
    d3.select("#radar-visualization").selectAll("svg").remove();

    const container = d3.select("#radar-visualization");
    const containerWidth = document.getElementById("radar-visualization").clientWidth || 900;
    const svgWidth = Math.min(containerWidth, 900);
    const svgHeight = 700;

    const svg = container
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .style("max-width", "100%")
      .style("height", "auto");

    const centerX = svgWidth / 2 - 40;
    const centerY = svgHeight / 2;
    const margin = 120;
    const outerRadius = Math.min(svgWidth, svgHeight) / 2 - margin;
    const radialLevels = 5;
    const maxScore = 10;

    const metricKeys = data.columns
      ? data.columns.slice(1)
      : Object.keys(data[0]).slice(1);

    const axisCount = metricKeys.length;
    const angleSlice = (Math.PI * 2) / axisCount;

    const radiusScale = d3.scaleLinear()
      .domain([0, maxScore])
      .range([0, outerRadius]);

    const colourScale = d3.scaleOrdinal(d3.schemeCategory10);

    const gridGroup = svg.append("g")
      .attr("transform", `translate(${centerX},${centerY})`);

    for (let level = 1; level <= radialLevels; level++) {
      const r = (outerRadius / radialLevels) * level;

      gridGroup.append("circle")
        .attr("r", r)
        .attr("fill", "none")
        .attr("stroke", "white");

      gridGroup.append("text")
        .attr("x", 4)
        .attr("y", -r)
        .attr("dy", "-0.3em")
        .attr("font-size", "11px")
        .attr("fill", "white")
        .text(((maxScore * level) / radialLevels).toFixed(0));
    }

    const axisGroup = gridGroup.append("g");

    metricKeys.forEach((metric, index) => {
      const x = radiusScale(maxScore) * Math.cos(angleSlice * index - Math.PI / 2);
      const y = radiusScale(maxScore) * Math.sin(angleSlice * index - Math.PI / 2);

      axisGroup.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", x)
        .attr("y2", y)
        .attr("stroke", "white");

      axisGroup.append("text")
        .attr("x", x * 1.1)
        .attr("y", y * 1.1)
        .attr("font-size", "13px")
        .attr("text-anchor", x >= 0 ? "start" : "end")
        .attr("dominant-baseline", "middle")
        .attr("fill", "white")
        .text(metric.replace(/_/g, " "));
    });

    function buildPolygonPath(row) {
      const points = metricKeys.map((metric, index) => {
        const value = +row[metric];
        return buildRadarPathPoint(value, index, axisCount, radiusScale, centerX, centerY);
      });
      return d3.line().curve(d3.curveLinearClosed)(points);
    }

    const polygonGroup = svg.append("g");

    const polygons = polygonGroup.selectAll("path.radar-area")
      .data(data)
      .enter()
      .append("path")
      .attr("class", "radar-area")
      .attr("d", d => buildPolygonPath(d))
      .attr("fill", (d, i) => colourScale(i))
      .attr("fill-opacity", 0.15)
      .attr("stroke", (d, i) => colourScale(i))
      .attr("stroke-width", 2)
      .attr("data-index", (d, i) => i)
      .on("mouseover", function (event, d) {
        const index = +d3.select(this).attr("data-index");
        highlightPolygon(index, polygons);
        showTooltip(event, d.Sector, d);
      })
      .on("mousemove", event => moveTooltip(event))
      .on("mouseout", () => {
        resetHighlight(polygons);
        hideTooltip();
      });

    function resetHighlight(selection) {
      selection
        .attr("fill-opacity", 0.15)
        .attr("stroke-width", 2);
    }

    function highlightPolygon(index, selection) {
      selection
        .attr("fill-opacity", 0.05)
        .attr("stroke-width", 1.5);

      selection
        .filter((d, i) => i === index)
        .attr("fill-opacity", 0.4)
        .attr("stroke-width", 3);
    }

    function showTooltip(event, label, data) {
      const metrics = metricKeys.map(key => {
        return `${key.replace(/_/g, " ")}: ${data[key]}`;
      }).join("<br/>");
      
      tooltip
        .transition()
        .duration(200)
        .style("opacity", 1);
      tooltip
        .html(`<strong>${label.replace(/_/g, " ")}</strong><br/>${metrics}`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    }

    function moveTooltip(event) {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    }

    function hideTooltip() {
      tooltip
        .transition()
        .duration(200)
        .style("opacity", 0);
    }

    const legendEntries = data.map((row, index) => ({
      label: row.Sector.replace(/_/g, " "),
      color: colourScale(index),
      index
    }));

    const legendX = svgWidth - 140;
    const legendY = 120;
    const legendGroup = svg.append("g")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    const legendItems = legendGroup.selectAll("g.legend-item")
      .data(legendEntries)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 22})`)
      .on("mouseover", (event, d) => {
        highlightPolygon(d.index, polygons);
        const rowData = data[d.index];
        showTooltip(event, d.label, rowData);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout", () => {
        resetHighlight(polygons);
        hideTooltip();
      });

    legendItems.append("rect")
      .attr("x", 0)
      .attr("y", -10)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", d => d.color);

    legendItems.append("text")
      .attr("x", 18)
      .attr("y", 0)
      .attr("font-size", "12px")
      .attr("dominant-baseline", "middle")
      .attr("fill", "white")
      .text(d => d.label);
  }

  d3.csv("ai_jobs_radar.csv").then(drawDestructionRadar);
})();