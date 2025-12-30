(function() {
  const clean = (value) => {
    if((value===null) || (value===undefined))
    {
        return ""
    }
    value = value.toString()
    value = value.normalize("NFKC");
    value = value.trim();
    return value;
  }

  const containerElement = document.getElementById("matrix-heatmap");
  if (!containerElement) {
    console.error("Container #matrix-heatmap not found");
    return;
  }

  const container = d3.select("#matrix-heatmap");
  container.selectAll("svg").remove();

  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "matrix-tooltip")
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

  const ai_roles = ["AI Researcher", "Data Scientist", "Software Engineer"];

  d3.csv("ai_job_market_insights.csv").then(raw => {
        raw.forEach(d => {
            d.Industry = clean(d.Industry)
            d.Job_Growth_Projection = clean(d.Job_Growth_Projection);
            d.Job_Title = clean(d.Job_Title);
        })

        const ai_jobs = raw.filter(d => ai_roles.includes(d.Job_Title) && d.Industry !== "Manufacturing");

        let industries = [];
        for (let i = 0; i < ai_jobs.length; i++) {
          if (industries.indexOf(ai_jobs[i].Industry) == -1) {
              industries.push(ai_jobs[i].Industry);
          }
        }
        const projections = ["Growth","Stable","Decline"];
        const counts = {};
        for (const ind of industries) {
            counts[ind] = { Growth: 0, Decline: 0, Stable: 0 };
        }
        for (const job of ai_jobs) {
            const industry = job.Industry;
            const proj = job.Job_Growth_Projection;
            const industryCounts = counts[industry];
            if (industryCounts) {
                industryCounts[proj] += 1;
            }
        }

        
        const data = [];
        industries.forEach(ind => {
            const total = counts[ind].Growth + counts[ind].Decline + counts[ind].Stable;
            projections.forEach( p => {
                let percent = 0;
                if(total>0)
                {
                    percent = (counts[ind][p] / total) * 100;
                    percent = percent.toFixed(1);
                }
                data.push({
                    industry: ind,
                    projection: p,
                    count: counts[ind][p],
                    percent: percent
                })
            })

        })
        const margin = {top: 50, right: 50, bottom: 50, left: 180};
        const containerWidth = containerElement.clientWidth || 900;
        const width = Math.min(containerWidth, 900) - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        const svg = container
                      .append("svg")
                      .attr("viewBox", `0 0 ${width + margin.left + margin.right * 2.3} ${height + margin.top + margin.bottom *2}`)
                      .attr("preserveAspectRatio", "xMidYMid")
                      .style("max-width", "100%")
                      .style("height", "auto")
                      .append("g")
                      .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
                    .domain(industries)
                    .range([0, width])
                    .padding(0.1);

        const y = d3.scaleBand()
                    .domain(projections)
                    .range([0, height])
                    .padding(0.1);

        function colorScale(d){
            const p = d.percent/100;
            if(d.projection === "Growth") return d3.interpolateRgb("#a5d6a7", "#2e7d32")(p)
            if(d.projection === "Decline") return d3.interpolateRgb("#bfbfbf", "#7b7d7b")(p)
            if(d.projection === "Stable") return d3.interpolateRgb("#ff9999", "#c0392b")(p);
        }
        const x_axis = svg.append("g")
                          .attr("transform", `translate(0,${height})`)
                          .attr("class","axis")
                          .call(d3.axisBottom(x))
        
        x_axis.selectAll("line, path")
              .remove()     
        
        x_axis.selectAll("text")
              .attr("transform","rotate(-30)")
              .style("text-anchor","end")
          

        svg.append("g")
          .attr("class","axis")
          .call(d3.axisLeft(y))
          .selectAll("line, path")
          .remove()     
        

        svg.selectAll("rect")
          .data(data)
          .enter()
          .append("rect")
          .attr("class","cell")
          .attr("x", d => x(d.industry))
          .attr("y", d => y(d.projection))
          .attr("width", x.bandwidth())
          .attr("height", y.bandwidth())
          .style("fill", d => colorScale(d))
          .on("mouseover", (event,d) => {
                d3.select(event.currentTarget)
                  .style("stroke", colorScale(d))
                  .style("stroke-width", 5);
            tooltip
              .transition()
              .duration(200)
              .style("opacity", 1);
            tooltip
              .html(`<strong>${d.industry}</strong><br/>${d.projection}: ${d.count} jobs<br/>(${d.percent}%)`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px");
              })
          .on("mousemove", (event,d) => {
            tooltip
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px");
              })
          .on("mouseout", (event) => {
              d3.select(event.currentTarget)
                .style("stroke", "none");
            tooltip
              .transition()
              .duration(200)
              .style("opacity", 0);
              });

        svg.selectAll(".cell-text")
           .data(data)
           .enter()
           .append("text")
           .attr("class","cell-text")
           .attr("x", d => x(d.industry)+x.bandwidth()/2)
           .attr("y", d => y(d.projection)+y.bandwidth()/2+5)
           .attr("text-anchor", "middle")
           .text(d => d.percent + "%")
           .style("pointer-events", "none")
           .style("font-size", "10px")

        const legend_data = ["Growth","Decline","Stable"];
        const legend = svg.append("g")
          .attr("transform", `translate(${width}, 0)`);

        legend.selectAll("rect")
              .data(legend_data)
              .enter()
              .append("rect")
              .attr("x",40)
              .attr("y", (d,i) => i*25)
              .attr("width",20)
              .attr("height",20)
              .style("fill", d => {
                if(d === "Growth") return "#2e7d32";
                if(d === "Decline") return "#d3d3d3";
                return "#c0392b";
              })
              .style("stroke","#555");

        legend.selectAll("text")
              .data(legend_data)
              .enter()
              .append("text")
              .attr("x",70)
              .attr("y", (d,i) => i*25+15)
              .text(d => d)
              .style("font-size","10px")
              .style("fill","#25282cff");


          
        svg.append("line")
           .attr("x1", -3)
           .attr("y1", 0)
           .attr("x2", -3)
           .attr("y2", height)
           .attr("stroke", "#25282cff")
           .attr("stroke-width", 2);


        svg.append("line")
           .attr("x1", width + 3) 
           .attr("y1", 0)
           .attr("x2", width + 3)
           .attr("y2", height)
           .attr("stroke", "#25282cff")
           .attr("stroke-width", 2); 


        svg.append("text")
          .attr("x", width + 40)
          .attr("y", height + 5)
          .attr("text-anchor", "end")
          .style("fill", "#25282cff")
          .style("font-size", "8px")
          .text("3 × 9");
      })
      .catch((err) => {
        console.error("Error loading matrix visualization data:", err);
        container
          .append("div")
          .style("color", "#25282cff")
          .style("padding", "20px")
          .text("Failed to load matrix visualization data.");
      });
})();

  