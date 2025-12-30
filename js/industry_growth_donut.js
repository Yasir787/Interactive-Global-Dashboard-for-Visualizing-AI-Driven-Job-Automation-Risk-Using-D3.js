// Industry Growth Distribution - doughnut showing different industries with growth cuz of ai

d3.csv("test/ai_job_market_insights.csv").then((data) => {
  // Filter for growth jobs only
  const growthJobs = data.filter((d) => d.Job_Growth_Projection === "Growth");

  // Aggregate by industry
  const industryGroups = d3.rollup(
    growthJobs,
    (v) => v.length,
    (d) => d.Industry
  );

  // Convert to array format for D3
  const industryData = Array.from(industryGroups, ([industry, count]) => ({
    industry,
    count,
  })).sort((a, b) => b.count - a.count); // Sort descending

  // Calculate total growth jobs
  const totalGrowthJobs = d3.sum(industryData, (d) => d.count);

  const width = 900;
  const height = 600;
  const margin = 40;
  const radius = Math.min(width - 300, height) / 2 - margin; // Leave space for legend

  // SVG view box to fix display issues
  const svg = d3
    .select("#industry-donut")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("max-width", "100%")
    .style("height", "auto")
    .append("g")
    .attr("transform", `translate(${width / 2 - 100}, ${height / 2})`);

  // Color scale
  const colorScale = d3
    .scaleOrdinal()
    .domain(industryData.map((d) => d.industry))
    .range([
      "#2563eb",
      "#10b981",
      "#8b5cf6",
      "#f59e0b",
      "#ec4899",
      "#14b8a6",
      "#f97316",
      "#6366f1",
      "#06b6d4",
    ]);

  // Create pie layout
  const pie = d3
    .pie()
    .value((d) => d.count)
    .sort(null);

  // Create arc
  const arc = d3
    .arc()
    .innerRadius(radius * 0.5) // Donut hole
    .outerRadius(radius);

  // hover increase effect
  const arcHover = d3
    .arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius * 1.08); // 1.08 x bigger on hover

  // Build tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "donut-tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "rgba(255, 255, 255, 0.95)")
    .style("color", "#212529")
    .style("border", "1px solid #dee2e6")
    .style("padding", "10px")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("font-size", "14px")
    .style("box-shadow", "0 2px 8px rgba(0, 0, 0, 0.15)");

  // Draw arcs
  const arcs = svg
    .selectAll(".arc")
    .data(pie(industryData))
    .enter()
    .append("g")
    .attr("class", "arc");

  arcs
    .append("path")
    .attr("d", arc)
    .attr("fill", (d) => colorScale(d.data.industry))
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .style("cursor", "pointer")
    .style("transition", "all 0.3s ease")
    .on("mouseover", function (event, d) {
      d3.select(this).transition().duration(200).attr("d", arcHover); // Make arc bigger on hover
      // display tooltip
      const percentage = ((d.data.count / totalGrowthJobs) * 100).toFixed(1);
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip
        .html(
          `
        <strong>${d.data.industry}</strong><br/>
        Growth Jobs: <strong>${d.data.count}</strong><br/>
        Percentage: <strong>${percentage}%</strong>
      `
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", function () {
      d3.select(this).transition().duration(200).attr("d", arc); // bring arc back to init size

      // Hide tooltip
      tooltip.transition().duration(200).style("opacity", 0);
    });

  // Add % labels on arc
  arcs
    .append("text")
    .attr("transform", (d) => {
      const pos = arc.centroid(d);
      return `translate(${pos})`;
    })
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .style("fill", "#fff")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("pointer-events", "none")
    .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.5)")
    .text((d) => {
      const percentage = ((d.data.count / totalGrowthJobs) * 100).toFixed(1);
      return percentage > 5 ? `${percentage}%` : ""; // Display only if bigger than 5%
    });

  // Add center text - total growth jobs
  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "-0.5em")
    .style("fill", "#212529")
    .style("font-size", "48px")
    .style("font-weight", "bold")
    .text(totalGrowthJobs);

  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "1.5em")
    .style("fill", "#6c757d")
    .style("font-size", "16px")
    .text("Total Industries with Growth");

  // Add legend
  const legend = svg
    .append("g")
    .attr("transform", `translate(${radius + 40}, ${-radius + 20})`);

  const legendItems = legend
    .selectAll(".legend-item")
    .data(industryData)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 25})`);

  legendItems
    .append("rect")
    .attr("width", 18)
    .attr("height", 18)
    .attr("fill", (d) => colorScale(d.industry))
    .attr("stroke", "#dee2e6")
    .attr("stroke-width", 1);

  legendItems
    .append("text")
    .attr("x", 24)
    .attr("y", 9)
    .attr("dy", "0.35em")
    .style("fill", "#212529")
    .style("font-size", "12px")
    .text((d) => d.industry);

  // Add the title
  svg
    .append("text")
    .attr("x", 0)
    .attr("y", -radius - 10)
    .attr("text-anchor", "middle")
    .style("fill", "#212529")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .text("AI Job Growth by Industry");
});
