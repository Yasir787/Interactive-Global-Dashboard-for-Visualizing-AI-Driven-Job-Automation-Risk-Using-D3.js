let scatterData = [];
let filteredData = [];

d3.csv("AI Impact on Job Market (2024–2030).csv").then(data => {

  scatterData = data.map(d => ({
    jobTitle: d["Job Title"],
    industry: d.Industry,
    aiImpactLevel: d["AI Impact Level"],
    medianSalary: +d["Median Salary (USD)"],
    requiredEducation: d["Required Education"],
    automationRisk: +d["Automation Risk (%)"],
    growthRate: +d.Growth_Rate
  })).filter(d => !isNaN(d.automationRisk) && !isNaN(d.growthRate) && !isNaN(d.medianSalary));

  filteredData = scatterData;

  const industries = ["All Industries", ...Array.from(new Set(scatterData.map(d => d.industry))).sort()];
  
  const select = d3.select("#scatter-plot-container")
    .insert("div", ":first-child")
    .attr("class", "scatter-controls mb-3")
    .append("label")
    .attr("for", "industry-select")
    .text("Filter by Industry: ")
    .style("color", "#f5f5f5")
    .style("margin-right", "10px");

  select.append("select")
    .attr("id", "industry-select")
    .attr("class", "form-select")
    .style("display", "inline-block")
    .style("width", "auto")
    .style("background-color", "#1a1a1a")
    .style("color", "#f5f5f5")
    .style("border", "1px solid #444")
    .selectAll("option")
    .data(industries)
    .enter()
    .append("option")
    .text(d => d)
    .attr("value", d => d);

  d3.select("#industry-select").on("change", function() {
    const selectedIndustry = this.value;
    if (selectedIndustry === "All Industries") {
      filteredData = scatterData;
    } else {
      filteredData = scatterData.filter(d => d.industry === selectedIndustry);
    }
    updateScatterPlot();
  });

  createScatterPlot();
});

function createScatterPlot() {
  d3.select("#scatter-plot").selectAll("svg").remove();

  const margin = { top: 40, right: 20, bottom: 60, left: 80 };
  const containerWidth = document.getElementById("scatter-plot").clientWidth || 900;
  const width = containerWidth - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#scatter-plot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear()
    .domain(d3.extent(filteredData, d => d.automationRisk))
    .nice()
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain(d3.extent(filteredData, d => d.growthRate))
    .nice()
    .range([height, 0]);

  const colorScale = d3.scaleOrdinal()
    .domain(["Low", "Moderate", "High"])
    .range(["#4CAF50", "#FF9800", "#F44336"]); //Colors are green, orange, and red, like the original no.1.


  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "scatter-tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "rgba(0, 0, 0, 0.9)")
    .style("color", "#f5f5f5")
    .style("padding", "10px")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("z-index", "1000")
    .style("border", "1px solid #666");

  const dots = svg.selectAll(".dot")
    .data(filteredData)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", d => xScale(d.automationRisk))
    .attr("cy", d => yScale(d.growthRate))
    .attr("r", 3)
    .attr("fill", d => colorScale(d.aiImpactLevel))
    .attr("opacity", 0.7)
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .on("mouseover", function(event, d) {
      tooltip.transition()
        .duration(200)
        .style("opacity", 1);
      tooltip.html(`
        <strong>${d.jobTitle}</strong><br/>
        Industry: ${d.industry}<br/>
        Median Salary: $${d.medianSalary.toLocaleString()}<br/>
        Required Education: ${d.requiredEducation}<br/>
        AI Impact: ${d.aiImpactLevel}<br/>
        Automation Risk: ${d.automationRisk.toFixed(1)}%<br/>
        Growth Rate: ${d.growthRate.toFixed(2)}%
      `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
      
      d3.select(this)
        .attr("opacity", 1)
        .attr("stroke-width", 2);
    })
    .on("mouseout", function() {
      tooltip.transition()
        .duration(200)
        .style("opacity", 0);
      
      d3.select(this)
        .attr("opacity", 0.7)
        .attr("stroke-width", 0.5);
    });

  const xAxis = d3.axisBottom(xScale)
    .tickFormat(d => d + "%");
  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => d + "%");

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .style("color", "#f5f5f5");

  svg.append("g")
    .call(yAxis)
    .style("color", "#f5f5f5");

  svg.append("text")
    .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
    .style("text-anchor", "middle")
    .style("fill", "#f5f5f5")
    .style("font-size", "14px")
    .text("Automation Risk (%)");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("fill", "#f5f5f5")
    .style("font-size", "14px")
    .text("Growth Rate (%)");

}

function updateScatterPlot() {
  createScatterPlot();
}

