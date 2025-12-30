let industryData = [];

d3.csv("AI Impact on Job Market (2024–2030).csv").then(data => {

  const impactLevelToNumber = (level) => {
    if (level === "Low") return 1;
    if (level === "Moderate") return 2;
    if (level === "High") return 3;
    return 0; //Shouldn't ever get here since all of the data is Low, Moderate, or High.
  };

  const parsedData = data.map(d => ({
    industry: d.Industry,
    automationRisk: +d["Automation Risk (%)"],
    aiImpactLevel: d["AI Impact Level"],
    aiImpactNumber: impactLevelToNumber(d["AI Impact Level"])
  })).filter(d => !isNaN(d.automationRisk) && d.industry && d.aiImpactNumber > 0);

  const industryMap = new Map();
  
  parsedData.forEach(d => {
    if (!industryMap.has(d.industry)) {
      industryMap.set(d.industry, { risks: [], impacts: [] });
    }
    industryMap.get(d.industry).risks.push(d.automationRisk);
    industryMap.get(d.industry).impacts.push(d.aiImpactNumber);
  });

  industryData = Array.from(industryMap.entries()).map(([industry, data]) => ({
    industry: industry,
    avgAutomationRisk: d3.mean(data.risks),
    avgAiImpactLevel: d3.mean(data.impacts),
    count: data.risks.length
  })).sort((a, b) => b.avgAutomationRisk - a.avgAutomationRisk); //Sort by risk, highest risk first

  createBarChart();
});

function createBarChart() {
  d3.select("#industry-bar-chart").selectAll("svg").remove();

  const margin = { top: 40, right: 20, bottom: 120, left: 80 };
  const containerWidth = document.getElementById("industry-bar-chart").clientWidth || 900;
  const width = containerWidth - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#industry-bar-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
//scaleBands from https://d3js.org/d3-scale/band to position the bars horizontally
  const xScale = d3.scaleBand()
    .domain(industryData.map(d => d.industry))
    .range([0, width])
    .padding(0.2);

  const maxRisk = d3.max(industryData, d => d.avgAutomationRisk);
  const yScale = d3.scaleLinear()
    .domain([0, maxRisk * 1.1])
    .nice()
    .range([height, 0]);

  const minImpact = 1;
  const maxImpact = 3;
  const colorScale = d3.scaleSequential()
    .domain([d3.min(industryData, d => d.avgAiImpactLevel), d3.max(industryData, d => d.avgAiImpactLevel)])
    .interpolator(d3.interpolateRgb("#ffffff", "#ff0000"));

  const bars = svg.selectAll(".bar")
    .data(industryData)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => xScale(d.industry))
    .attr("y", d => yScale(d.avgAutomationRisk))
    .attr("width", xScale.bandwidth())
    .attr("height", d => height - yScale(d.avgAutomationRisk))
    .attr("fill", d => colorScale(d.avgAiImpactLevel))
    .attr("stroke", "#666")
    .attr("stroke-width", 1)
    .attr("opacity", 0.9)
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("opacity", 1)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2);
    })
    .on("mouseout", function() {
      d3.select(this)
        .attr("opacity", 0.9)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1);
    });

  svg.selectAll(".bar-label")
    .data(industryData)
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", d => xScale(d.industry) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d.avgAutomationRisk) - 5)
    .attr("text-anchor", "middle")
    .style("fill", "#ffffff")
    .style("font-size", "11px")
    .style("font-weight", "bold")
    .text(d => d.avgAutomationRisk.toFixed(1) + "%");

  const xAxis = d3.axisBottom(xScale);
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-45)")
    .style("fill", "#ffffff")
    .style("font-size", "11px");

  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => d + "%");
  svg.append("g")
    .call(yAxis)
    .style("color", "#ffffff");

  svg.append("text")
    .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 20})`)
    .style("text-anchor", "middle")
    .style("fill", "#ffffff")
    .style("font-size", "14px")
    .text("Industry");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("fill", "#ffffff")
    .style("font-size", "14px")
    .text("Average Automation Risk (%)");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("fill", "#ffffff")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Average Automation Risk by Industry");

  const legendWidth = 200;
  const legendHeight = 20;
  const legendX = width - legendWidth - 10;
  const legendY = -25;

  const legendScale = d3.scaleLinear()
    .domain([minImpact, maxImpact])
    .range([0, legendWidth]);

  const legendAxis = d3.axisBottom(legendScale)
    .ticks(2) //TBH I dont know why turning this to 2 ticks makes the legend have its proper 3 ticks, but 3 ticks mean it has 5
    // and 1 tick means it has 1 total. It works now and thats good enough.
    .tickFormat(d => {
      if (d <= 1.5) return "Low";
      if (d <= 2.5) return "Moderate";
      return "High";
    });

  const legendSvg = svg.append("g")
    .attr("transform", `translate(${legendX}, ${legendY})`);

  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", "risk-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%");

  gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#ffffff");

  gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#ff0000");

  legendSvg.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#risk-gradient)")
    .attr("stroke", "#666")
    .attr("stroke-width", 1);

  legendSvg.append("text")
    .attr("x", legendWidth / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .style("fill", "#ffffff")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .text("AI Impact Level");

  legendSvg.append("g")
    .attr("transform", `translate(0, ${legendHeight})`)
    .call(legendAxis)
    .style("color", "#ffffff")
    .style("font-size", "10px");
}

