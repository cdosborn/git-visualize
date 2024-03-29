fetch('http://localhost:3000')
    .then(response => response.json())
    .then(db => {
        const commits =
            Object.keys(db.commits)
                .map(sha => Object.assign({}, db.commits[sha], {sha: sha}));


        const links = Array.prototype.concat.apply([],
            commits.map(c =>
                c.parents.map(p => ({ source: p, target: c.sha }))));

        var svg = d3.select("svg");
        var root = svg.append('g');
        var width = +svg.attr("width");
        var height = +svg.attr("height");

        var simulation = d3.forceSimulation()
            .force("link", d3.forceLink()
                    .id(d => d.sha)
                    .strength(1))
            .force("charge", d3.forceManyBody().strength(-200))
            .force("center", d3.forceCenter(width / 2, height / 2));

        svg.call(d3.zoom()
            .scaleExtent([0.5, 8])
            .on("zoom", () => root.attr('transform', d3.event.transform)));

        const dragstarted = function(d) {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        };

        const dragged = d => {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        };

        const dragended = d => {
            if (!d3.event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        };

        var link = root.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(links)
            .enter().append("line")
            .attr('stroke', 'red');

        var node = root.append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(commits)
            .enter().append("circle")
            .attr("r", 20)
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));


        node.append("title")
            .text(d => d.sha);

        simulation
            .nodes(commits)
            .on("tick", () => {
                link
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);

                node
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y);
            });

        simulation.force("link")
            .links(links);

    });

