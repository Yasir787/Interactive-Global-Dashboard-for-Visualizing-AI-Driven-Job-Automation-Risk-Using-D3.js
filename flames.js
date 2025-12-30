(function() {
  function buildFlamePath(centerX, bottomY, height, halfWidth) {
    const topY = bottomY - height;

    const leftBottomX = centerX - halfWidth;
    const leftBottomY = bottomY - height * 0.20;

    const leftMidX = centerX - halfWidth * 0.45;
    const leftMidY = topY + height * 0.18;

    const rightMidX = centerX + halfWidth * 0.45;
    const rightMidY = topY + height * 0.18;

    const rightBottomX = centerX + halfWidth;
    const rightBottomY = bottomY - height * 0.20;

    return `
      M ${centerX} ${bottomY}
      C ${leftBottomX} ${leftBottomY}, ${leftMidX} ${leftMidY}, ${centerX} ${topY}
      C ${rightMidX} ${rightMidY}, ${rightBottomX} ${rightBottomY}, ${centerX} ${bottomY} Z
    `;
  }

  const baseCenterX = 0;
  const baseBottomY = 260;

  const layerConfig = {
    High:   { height: 260, width: 100 },
    Medium: { height: 210, width: 70 },
    Low:    { height: 150, width: 40 }
  };

  const flamePathByLayer = {
    High:   buildFlamePath(baseCenterX, baseBottomY, layerConfig.High.height,   layerConfig.High.width),
    Medium: buildFlamePath(baseCenterX, baseBottomY, layerConfig.Medium.height, layerConfig.Medium.width),
    Low:    buildFlamePath(baseCenterX, baseBottomY, layerConfig.Low.height,    layerConfig.Low.width)
  };

  const layerColor = {
    High: "red",
    Medium: "orange",
    Low: "gold"
  };

  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "flames-tooltip")
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

  d3.csv("data.csv").then(rows => {
    d3.select("#flames-visualization").selectAll("svg").remove();

    const container = d3.select("#flames-visualization");
    const containerWidth = document.getElementById("flames-visualization").clientWidth || 1000;
    const svgWidth = Math.min(containerWidth, 1000);
    const svgHeight = 700;

    const svg = container
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .style("max-width", "100%")
      .style("height", "auto");

    const hitGroup = svg.append("g")
      .attr("id", "hit-layer")
      .attr("visibility", "hidden")
      .attr("opacity", 0);

    const hitPathByLayer = {};
    Object.keys(flamePathByLayer).forEach(key => {
      hitPathByLayer[key] = hitGroup.append("path")
        .attr("d", flamePathByLayer[key])
        .attr("fill", "white")
        .node();
    });

    const scaleFactor = Math.min(svgWidth / 1000, 1) * 2.8;
    const translateX = (svgWidth / 2) - (150 * scaleFactor / 2.8);
    const translateY = 40;

    const flameGroup = svg.append("g")
      .attr("transform", `translate(${translateX}, ${translateY}) scale(${scaleFactor})`);

    flameGroup.append("path")
      .attr("d", flamePathByLayer.High)
      .attr("fill", "none")
      .attr("stroke", layerColor.High)
      .attr("stroke-width", 5);

    flameGroup.append("path")
      .attr("d", flamePathByLayer.Medium)
      .attr("fill", "none")
      .attr("stroke", layerColor.Medium)
      .attr("stroke-width", 5);

    flameGroup.append("path")
      .attr("d", flamePathByLayer.Low)
      .attr("fill", "none")
      .attr("stroke", layerColor.Low)
      .attr("stroke-width", 5);

    function pickRandomPointInRing(layerKey) {
      const outerPath = hitPathByLayer[layerKey];
      const bbox = outerPath.getBBox();

      while (true) {
        const x = Math.random() * bbox.width + bbox.x;
        const y = Math.random() * bbox.height + bbox.y;
        const point = new DOMPoint(x, y);

        if (!outerPath.isPointInFill(point)) continue;

        if (layerKey === "High" && hitPathByLayer.Medium.isPointInFill(point)) continue;
        if (layerKey === "Medium" && hitPathByLayer.Low.isPointInFill(point)) continue;

        return [x, y];
      }
    }

    rows.forEach(row => {
      const [x, y] = pickRandomPointInRing(row.AI_Adoption_Level);
      row.x = x;
      row.y = y;
    });

    flameGroup.selectAll("circle")
      .data(rows)
      .enter()
      .append("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => Math.sqrt(+d.Population) / 2000)
      .attr("fill", d => layerColor[d.AI_Adoption_Level])
      .attr("opacity", 0.85)
      .on("mouseover", (event, d) => {
        tooltip
          .transition()
          .duration(200)
          .style("opacity", 1);
        tooltip
          .html(`<strong>${d.Country}</strong><br/>Population: ${(+d.Population).toLocaleString()}<br/>AI Adoption: ${d.AI_Adoption_Level}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", () => {
        tooltip
          .transition()
          .duration(200)
          .style("opacity", 0);
      });

    const legendEntries = [
      { label: "High AI adoption & job risk",   color: layerColor.High },
      { label: "Medium AI adoption & job risk", color: layerColor.Medium },
      { label: "Low AI adoption & job risk",    color: layerColor.Low }
    ];

    const legendX = svgWidth - 280;
    const legendY = 260;
    const legendGroup = svg.append("g")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    legendGroup.selectAll("circle")
      .data(legendEntries)
      .enter()
      .append("circle")
      .attr("cx", 0)
      .attr("cy", (d, i) => i * 35)
      .attr("r", 10)
      .attr("fill", d => d.color);

    legendGroup.selectAll("text")
      .data(legendEntries)
      .enter()
      .append("text")
      .attr("x", 20)
      .attr("y", (d, i) => i * 35 + 4)
      .text(d => d.label)
      .attr("font-size", "14px")
      .attr("fill", "white");
  });
})();