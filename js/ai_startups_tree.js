// set SVG style n shape configs
const margin = { top: 50, right: 50, bottom: 50, left: 50 };

// Make the visualization responsive to the container size
const getContainerDimensions = () => {
  const container = document.getElementById("radial_tree");
  const containerWidth = container ? container.clientWidth : 900;
  // Use a reasonable aspect ratio (1:1 for radial tree works well)
  const containerHeight = Math.min(containerWidth, 900); // Cap at 900px for very wide screens
  return { width: containerWidth, height: containerHeight };
};

const dims = getContainerDimensions();
const svgWidth = dims.width;
const svgHeight = dims.height;
const width = svgWidth - margin.left - margin.right;
const height = svgHeight - margin.top - margin.bottom;
const radius = Math.min(width, height) / 2 - 50; // Max radius for radial tree, responsive

const dataPath = "ai_startups_data.json";

// Setup Prebuilt color scheme
const color = d3.scaleOrdinal(d3.schemeCategory10);
const sectorColorScale = d3
  .scaleOrdinal()
  .domain([
    "Healthcare AI",
    "Developer Tools",
    "Creative AI",
    "Enterprise AI",
    "Finance AI",
    "Legal AI",
    "Sales & Marketing AI",
    "Security AI",
    "Education AI",
    "Robotics & Autonomous",
  ])
  .range(d3.schemeCategory10);

//Flag that Changes vis to make the tree look like a circut board
const USE_CHIP_DESIGN = true;

// --- setup global SVG ----
const svg = d3
  .select("#radial_tree")
  .append("svg")
  .attr("width", svgWidth)
  .attr("height", svgHeight)
  .append("g")
  .attr("transform", `translate(${svgWidth / 2}, ${svgHeight / 2})`); // Center it, root node will go here

//---- setup Global Tree and Root ---
const tree = d3
  .tree()
  .size([2 * Math.PI, radius])
  .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

let root;

// --------- Helper Functions --------

// Load data from path
async function loadDataset(path) {
  try {
    const data = await d3.json(path);

    // console.log("[DEBUG] Data loaded: " + data);

    return data;
  } catch (error) {
    console.error("[ai_startups_tree.js] ERROR Failed to load: ", error);
    return null;
  }
}
// Draw regular circular node
function drawNormalNode(nodeGroup, d) {
  nodeGroup
    .append("circle")
    .attr("r", 5)
    .attr("fill", (d) => {
      // for Sector nodes, use their own color
      if (d.depth === 1) {
        return sectorColorScale(d.data.name);
      }
      // for company nodes use parent's color
      if (d.parent && d.parent.depth === 1) {
        return sectorColorScale(d.parent.data.name);
      }
      //Root or other nodes
      return d.children ? "#555" : "#999";
    });
}

// Draw root as a uniqe AI Chip
function drawRootChipSVG(nodeGroup) {
  const chipSize = 60; //60x60 px

  //Inject SVG icon directly, source https://freesvgicons.com/search?q=chip
  nodeGroup.html(`
    
      <svg xmlns="http://www.w3.org/2000/svg" 
           width="${chipSize}" 
           height="${chipSize}" 
           viewBox="0 0 512 512"
           x="${-chipSize / 2}" 
           y="${-chipSize / 2}">
        <path fill="none" d="M352 128H160a32 32 0 0 0-32 32v192a32 32 0 0 0 32 32h192a32 32 0 0 0 32-32V160a32 32 0 0 0-32-32m0 216a8 8 0 0 1-8 8H168a8 8 0 0 1-8-8V168a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8Z"/>
        <rect width="192" height="192" x="160" y="160" fill="#fad000" rx="8" ry="8"/>
        <path fill="#fad000" d="M464 192a16 16 0 0 0 0-32h-16v-32a64.07 64.07 0 0 0-64-64h-32V48a16 16 0 0 0-32 0v16h-48V48a16 16 0 0 0-32 0v16h-48V48a16 16 0 0 0-32 0v16h-32a64.07 64.07 0 0 0-64 64v32H48a16 16 0 0 0 0 32h16v48H48a16 16 0 0 0 0 32h16v48H48a16 16 0 0 0 0 32h16v32a64.07 64.07 0 0 0 64 64h32v16a16 16 0 0 0 32 0v-16h48v16a16 16 0 0 0 32 0v-16h48v16a16 16 0 0 0 32 0v-16h32a64.07 64.07 0 0 0 64-64v-32h16a16 16 0 0 0 0-32h-16v-48h16a16 16 0 0 0 0-32h-16v-48Zm-80 160a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32V160a32 32 0 0 1 32-32h192a32 32 0 0 1 32 32Z"/>
      </svg>
    `);

  // Add "AI" text overlay on top of the chip
  nodeGroup
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("fill", "#0d3320")
    .attr("font-family", "monospace")
    .attr("font-size", "15px")
    .attr("font-weight", "700")
    .text("AI");
}

// Draw chips for nodes at depth=1
function drawSectorChip(nodeGroup, d) {
  const chipSize = 20;
  //Color based on sector name
  const chipColor = sectorColorScale(d.data.name);
  // const chipColor = "#062315ff";

  // Inject SVG chip icon with dynamic color
  nodeGroup.html(`
    <svg
    xmlns="http://www.w3.org/2000/svg"
    width="${chipSize}"
    height="${chipSize}"
    viewBox="0 0 24 24"
    x="${-chipSize / 2}"
    y="${-chipSize / 2}"
  >
    <path
      fill="${chipColor}"
      d="M7 2a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H7zm3 1.938c1.132 0 2.063.93 2.063 2.062A2.073 2.073 0 0 1 10 8.063A2.072 2.072 0 0 1 7.937 6c0-1.132.931-2.063 2.063-2.063zM2.437 4A.433.433 0 0 0 2 4.438V5H.437A.433.433 0 0 0 0 5.438v1.125C0 6.809.193 7 .438 7H2v.563c0 .245.192.437.438.437h1.124A.433.433 0 0 0 4 7.562V4.438A.433.433 0 0 0 3.562 4H2.438zm20 0a.433.433 0 0 0-.437.438v3.125c0 .245.192.437.438.437h1.125A.433.433 0 0 0 24 7.562V7h1.563A.433.433 0 0 0 26 6.562V5.438A.433.433 0 0 0 25.562 5H24v-.563A.433.433 0 0 0 23.562 4h-1.125zm-20 7a.433.433 0 0 0-.437.438V12H.437a.433.433 0 0 0-.437.438v1.124c0 .247.193.438.438.438H2v.563c0 .244.192.437.438.437h1.124A.433.433 0 0 0 4 14.562v-3.124A.433.433 0 0 0 3.562 11H2.438zm20 0a.433.433 0 0 0-.437.438v3.124c0 .245.192.438.438.438h1.125a.433.433 0 0 0 .437-.438V14h1.563a.433.433 0 0 0 .437-.438v-1.124a.433.433 0 0 0-.438-.438H24v-.563a.433.433 0 0 0-.438-.437h-1.125zm-20 7a.433.433 0 0 0-.437.438V19H.437a.433.433 0 0 0-.437.438v1.125c0 .245.193.437.438.437H2v.563c0 .245.192.437.438.437h1.124A.433.433 0 0 0 4 21.562v-3.125A.433.433 0 0 0 3.562 18H2.438zm20 0a.433.433 0 0 0-.437.438v3.125c0 .245.192.437.438.437h1.125a.433.433 0 0 0 .437-.438V21h1.563a.433.433 0 0 0 .437-.438v-1.125a.433.433 0 0 0-.438-.437H24v-.563a.433.433 0 0 0-.438-.437h-1.125z"
    />
  </svg>;
  `);
}

// Draw Radial Labels for ndoes
function drawRadialLabel(nodeGroup, d) {
  nodeGroup
    .append("text")
    .attr("dy", "0.31em")

    .attr("x", (d) => {
      // Label points INWARD only if node has visible children
      // Otherwise (leaf or collapsed), point OUTWARD
      const hasVisibleChildren = d.children && d.children.length > 0;
      const offset = d.depth === 1 ? 12 : 8; // Sectors: 12px, companies: 8px
      return d.x < Math.PI === !hasVisibleChildren ? offset : -offset;
    })

    .attr("text-anchor", (d) => {
      const hasVisibleChildren = d.children && d.children.length > 0;
      return d.x < Math.PI === !hasVisibleChildren ? "start" : "end";
    })

    .attr("transform", (d) => (d.x >= Math.PI ? "rotate(180)" : "rotate(0)"))

    .attr("font-size", "11px")
    .attr("fill", "#050505ff")
    .attr("font-family", "monospace")
    .attr("font-weight", "500")
    .text(d.data.name);
}

// ----- Initial Tree Render Function -----
function renderRadialTree(data) {
  root = d3.hierarchy(data);

  // Start tree colapsed (at sectors) state
  root.descendants().forEach((node) => {
    node._children = node.children; // Save original children in a backup `_children`
    if (node.depth === 1) {
      node.children = null;
    }
  });

  // Apply tree layout
  tree(root);

  // Draw links: Edges connecting parent -> child
  svg
    .append("g")
    .attr("class", "links") // Add class name for selecting later
    .selectAll("path")
    .data(root.links()) // Returns array of {source, target} pairs
    .enter()
    .append("path")
    .attr(
      "d",
      d3
        .linkRadial() // Creates curved radial path generator
        .angle((d) => d.x)
        .radius((d) => d.y)
    )
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-width", 1);

  // Draw nodes
  const nodeGroup = svg
    .append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(root.descendants()) // Get all visible nodes
    .enter()
    .append("g")
    .attr("transform", (d) => {
      if (d.depth === 0) {
        //Dont rotate root
        return `translate(0, 0)`;
      }
      // Radial tranasform other nodes
      return `
          rotate(${(d.x * 180) / Math.PI - 90}) 
          translate(${d.y}, 0)
          `;
    })
    .style("cursor", "pointer") // change pointer to cursor on hover
    .on("click", toggleNode); // Call toggleNode function on click event

  // For each node group, draw either chip or circle
  nodeGroup.each(function (d) {
    const group = d3.select(this); // Select current group

    if (USE_CHIP_DESIGN && d.depth === 0) {
      // Depth 0 = Root node: Draw AI chip
      drawRootChipSVG(group);
    } else if (USE_CHIP_DESIGN && d.depth === 1) {
      // Depth 1 = Sectors: Draw colored chip
      drawSectorChip(group, d);
      drawRadialLabel(group, d); //Add radial label
    } else {
      // All other nodes: Draw regular circle
      drawNormalNode(group, d);
    }
    // Add label for non all root nodes
    if (d.depth > 0) {
      drawRadialLabel(group, d);
    }
  });

  // console.log("[DEBUG] Tree rendered with", root.descendants().length, "nodes");
}

// ---- Handle Node Clicks ---
// Toggle nodes between expand and colapse on click
function toggleNode(event, d) {
  if (d.children) {
    // Case: Currently expanded, so collapse
    d._children = d.children;
    d.children = null;
  } else if (d._children) {
    // Case: currenlty Collapsed, so expand
    d.children = d._children;
    d._children = null;
  }
  // Re-render tree with updated nodes state
  updateTree(d);
}

// ---- Update Tree after toggle ----
/*
re-render tree with currently visible nodes, this causes recalc postions for all visible nodes 
  - When nodes are clicked, state changes, some nodes are expanded (visible) some collapsed
   - D3 needs to figure out:
    - ENTER: Which nodes are NEW (need to be created)
    - UPDATE: Which nodes ALREADY EXIST (need to be moved/updated)
    - EXIT: Which nodes DISAPPEARED (need to be removed)
*/
function updateTree(source) {
  // compute new tree layout with updated nodes state
  tree(root);

  // --- Update links (edges) ---
  const links = svg
    .select(".links") // Select the links class
    .selectAll("path")
    .data(root.links(), (d) => d.target.data.name); // Bind new data, Match links by their target's name

  // EXIT: Remove links that no longer exist in data
  links.exit().remove();

  // ENTER: Create new links that appear from expanding
  const linksEnter = links.enter().append("path");

  // UPDATE: Merge entering (new) links with existing links
  linksEnter
    .merge(links) // Combines existing + new
    .transition() // Animate the change
    .duration(750)
    .attr(
      "d",
      d3
        .linkRadial()
        .angle((d) => d.x)
        .radius((d) => d.y)
    )
    .attr("fill", "none")
    .attr("stroke", "#737372ff")
    .attr("stroke-width", 1.5);

  // --- Update nodes ---
  const nodes = svg
    .select(".nodes")
    .selectAll("g")
    .data(root.descendants(), (d) => d.data.name); // Bind new data, match nodes/circles with name

  // EXIT: remove invisible nodes
  nodes.exit().remove();

  // ENTER: Create new nodes that appear from expanding
  const nodesEnter = nodes
    .enter()
    .append("g")
    .style("cursor", "pointer")
    .on("click", toggleNode);

  //Disply chip version or nomal version based on USE_CHIP_DESIGN
  nodesEnter.each(function (d) {
    const group = d3.select(this);
    if (USE_CHIP_DESIGN && d.depth === 0) {
      drawRootChipSVG(group);
    } else if (USE_CHIP_DESIGN && d.depth === 1) {
      // Depth 1 = Sectors: Draw colored chip
      drawSectorChip(group, d);
      drawRadialLabel(group, d); // u
    } else {
      drawNormalNode(group, d);
    }
    // Add label for non all root nodes
    if (d.depth > 0) {
      drawRadialLabel(group, d);
    }
  });

  // UPDATE: Merge entering (new) nodes with existing nodes
  nodesEnter
    .merge(nodes) // Combine new + existing circles
    .transition() // Animate change, 750ms
    .duration(750)
    .attr("transform", (d) => {
      if (d.depth === 0) {
        //Dont rotate root
        return `translate(0, 0)`;
      }
      // Radial trnasform other nodes
      return `
          rotate(${(d.x * 180) / Math.PI - 90}) 
          translate(${d.y}, 0)
          `;
    });

  // Update labels for EXISITNG nodes inward or outward (except root)
  const labels = nodes
    .merge(nodesEnter)
    .filter((d) => d.depth > 0)
    .selectAll("text");

  labels
    .transition()
    .duration(750)
    .attr("x", function (d) {
      const hasVisibleChildren = d.children && d.children.length > 0;
      const offset = d.depth === 1 ? 12 : 8; // Sectors: 12px, companies: 8px
      return d.x < Math.PI === !hasVisibleChildren ? offset : -offset;
    })
    .attr("text-anchor", function (d) {
      const hasVisibleChildren = d.children && d.children.length > 0;
      return d.x < Math.PI === !hasVisibleChildren ? "start" : "end";
    })
    .attr("transform", (d) => (d.x >= Math.PI ? "rotate(180)" : "rotate(0)"));

  // console.log(
  //   "[DEBUG] Tree updated -",
  //   root.descendants().length,
  //   "nodes visible"
  // );
}
// ----- Init function -----
// Loads data and renders tree on page load
async function init() {
  // console.log("[DEBUG -init()] Initializing visualization...");

  const data = await loadDataset(dataPath);
  if (data) {
    renderRadialTree(data);
    // console.log("[DEBUG] Radial Tree Vis Rendered!");
  } else {
    console.error(
      "[ai_startups_tree.js] ERROR: Could not initialize visualization"
    );
  }
}

// Start the visualization
init();
