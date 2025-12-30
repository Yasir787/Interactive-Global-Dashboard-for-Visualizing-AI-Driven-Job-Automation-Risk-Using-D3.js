(function() {
  const containerElement = document.getElementById("robot-visualization");
  if (!containerElement) {
    console.error("Container #robot-visualization not found");
    return;
  }

  const container = d3.select("#robot-visualization");
  container.selectAll("svg").remove();

  const containerWidth = containerElement.clientWidth || 950;
  const width = Math.min(containerWidth, 950);
  const height = 400;

  const svgContainer = container.append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("max-width", "100%")
      .style("height", "auto");

  const tooltip = d3.select("body").append("div")
      .attr("class", "robot-tooltip")
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

  const svgPath = "robot.drawio.svg";

const sectors = [
    { name: "Stethoscope", sector: "Healthcare", x: 75, y: 130, rank: 9 },
    { name: "Hammer", sector: "Manufacturing", x: 350, y: 100, rank: 8 },
    { name: "Cart", sector: "Retail", x: 20, y: 300, rank: 7 },
    { name: "Car", sector: "Transportation", x: 270, y: 280, rank: 6 },
    { name: "Calculator", sector: "Finance", x: 0, y: 90, rank: 5 },
    { name: "Headset", sector: "Customer Support", x: 130, y: 30, rank: 4 },
    { name: "Laptop", sector: "IT & Software", x: 30, y: 180, rank: 3 },
    { name: "Clipboard", sector: "Administration & Back Office", x: 10, y: 240, rank: 2 },
    { name: "Notebook", sector: "Education", x: 300, y: 210, rank: 1 },
    { name: "Paintbrush", sector: "Creatives", x: 370, y: 300, rank: 1 }
];

const maxRank = d3.max(sectors, d => d.rank);

d3.xml(svgPath)
    .then(function(data) {
        svgContainer.node().appendChild(data.documentElement);

        sectors.forEach(function(sector) {
            const fontSize = 20 + (sector.rank / maxRank) * 50;

            svgContainer.append("text")
                .attr("x", sector.x)
                .attr("y", sector.y)
                .attr("class", "datapoint")
                .attr("font-size", fontSize)
                .attr("class", "datapoint-text")
                .attr("stroke", "white")
                .attr("stroke-width", "2")
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                .attr("paint-order", "stroke")
                .text(sector.name)
                .on("mouseover", function(event) {
                    tooltip
                        .transition()
                        .duration(200)
                        .style("opacity", 1);
                    tooltip
                        .html(`<strong>${sector.sector}</strong><br/>Rank: ${sector.rank}`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("mousemove", function(event) {
                    tooltip
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("mouseout", function() {
                    tooltip
                        .transition()
                        .duration(200)
                        .style("opacity", 0);
                });
        });

        svgContainer.append("text")
            .attr("x", 145)  
            .attr("y", 200)  
            .attr("class", "ai-text")
            .attr("font-size", 80)
            .attr("stroke", "white")
            .attr("stroke-width", "3")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("paint-order", "stroke")
            .text("AI");
    })
    .catch(function(error) {
        console.error("Error loading the SVG file: ", error);
        container
            .append("div")
            .style("color", "#000000")
            .style("padding", "20px")
            .text("Failed to load robot visualization. SVG file not found.");
    });
})();
