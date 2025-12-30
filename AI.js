(function() {
  const containerElement = document.getElementById("ai-visualization");
  if (!containerElement) {
    console.error("Container #ai-visualization not found");
    return;
  }

  const container = d3.select("#ai-visualization");
  container.selectAll("svg").remove();

  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "ai-tooltip")
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

  d3.csv("ai_job_market_insights.csv").then(data => {
    const getColor = (riskLevel) => {
        if (riskLevel === "High") {
            return "red";
        } else if (riskLevel === "Medium") {
            return "yellow";
        } else {
            return "blue";
        }
    };

    const sortedData = data.sort((a, b) => {
        const order = { "High": 0, "Medium": 1, "Low": 2 };
        return order[a.AI_Adoption_Level] - order[b.AI_Adoption_Level];
    });

    const containerWidth = containerElement.clientWidth || 1200;
    const width = Math.min(containerWidth, 1200);
    const height = 300;
    const margin = { top: 100, right: 20, bottom: 100, left: 50 };

    const svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("max-width", "100%")
        .style("height", "auto");

    const yScale = d3.scaleBand()
        .domain(["High", "Medium", "Low"])
        .range([0, height - 50])
        .padding(0.1);

    const xScale = d3.scaleLinear()
        .domain([0, sortedData.length])
        .range([margin.left, width - margin.right]);

    svg.selectAll(".datapoint")
        .data(sortedData)
        .enter()
        .append("circle")
        .attr("class", "datapoint")
        .attr("cx", (d, i) => xScale(i))
        .attr("cy", d => {
            const adoptionLevel = d.AI_Adoption_Level;
            if (adoptionLevel === "High") return yScale("High") + yScale.bandwidth() / 2;
            else if (adoptionLevel === "Medium") return yScale("Medium") + yScale.bandwidth() / 2;
            else return yScale("Low") + yScale.bandwidth() / 2;
        })
        .attr("r", 6)
        .attr("fill", d => getColor(d.Automation_Risk))
        .on("mouseenter", (event, d) => {
            tooltip
              .transition()
              .duration(200)
              .style("opacity", 1);
            tooltip
              .html(`<strong>${d.Job_Title}</strong><br/>AI Adoption: ${d.AI_Adoption_Level}<br/>Automation Risk: ${d.Automation_Risk}`)
              .style("left", `${event.pageX + 10}px`)
              .style("top", `${event.pageY - 10}px`);
        })
        .on("mousemove", (event) => {
            tooltip
              .style("left", `${event.pageX + 10}px`)
              .style("top", `${event.pageY - 10}px`);
        })
        .on("mouseleave", () => {
            tooltip
              .transition()
              .duration(200)
              .style("opacity", 0);
        });

    const legend = svg.append("g")
        .attr("transform", "translate(50, 220)");

    const legendData = [
        { label: "Low Risk", color: "blue" },
        { label: "Medium Risk", color: "yellow" },
        { label: "High Risk", color: "red" }
    ];

    const legendItem = legend.selectAll(".legend-item")
        .data(legendData)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(${i * 120}, 0)`);

    legendItem.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 6)
        .attr("fill", d => d.color);

    legendItem.append("text")
        .attr("x", 15)
        .attr("y", 5)
        .attr("dy", ".35em")
        .style("fill", "#ffffff")
        .text(d => d.label);
  })
  .catch((err) => {
    console.error("Error loading AI visualization data:", err);
    container
      .append("div")
      .style("color", "#ffffff")
      .style("padding", "20px")
      .text("Failed to load AI visualization data.");
  });
})();
