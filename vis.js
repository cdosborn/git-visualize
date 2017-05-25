// let postParams = {
//     method: 'POST',
//     body: JSON.stringify({
//         commits: [
//             "0694699ce81f244b8a43c23c94f36eb3be8213e9",
//             "0694699ce81f244b8a43c23c94f36eb3be8213e9",
//             "7b8947f6d500b1ad3c89d54dc0fd99257690f1a5",
//             "086ff3369e2cc107e7eca712457f459d374e88a6"
//         ]
//     })
// }
// fetch('http://localhost:3000/merge-base/', postParams)

function horizontalOrientation(ref, db) {
    let commits = db.commits;
    let headSha = db.refs[ref];
    let level = 0;

    let head = commits[headSha];

    // tips[i] is a list of tips that were formed on the ith off branch of
    // ref, for example let ref be master, then tips[1] would contain a
    // tip/branch, which merged directly into master, tips[2] would contain a
    // list of tips, which merged into tips[1]

    // When we explore the graph we search all commits along the first parent
    // of ref (i.e. all commits made directly on ref). When we encounter a
    // merge on ref, we add the second parent to tips, but continue exploring
    // along ref. After exploring all of the first parent, we then explore
    // along all second parents to ref. Then we explore all second parents to
    // second parents.

    let curTip = 0;
    let tips = [[ { sha: headSha, level: 0, index: 0, tip: 0, message: head.message } ]];

    let map = {};
    let results = {};
    while (curTip < tips.length) {

        // Explore all nodes formed along the curTip'th off-branch of ref
        let tipsToExplore = tips[curTip] || [];
        tipsToExplore.forEach(tip => {

            // The tip is not in our results yet!
            results[tip.sha] = tip;
            // console.log(`Found tip beginning ${tip.sha.substring(0,5)} on ${curTip}`);

            // While there are parents we have not seen
            while (true) {

                // Search along the first parent
                let tipParents = commits[tip.sha]
                    .parents
                    .filter(sha => !(sha in results));

                if (!tipParents.length)
                    break;

                // For each parent...
                tipParents.forEach((parentSha, ith) => {

                    // We've already explored along this path
                    if (parentSha in results) {
                        return;
                    }

                    let x = tip.index + 1;
                    let y = tip.level + ith
                    while (map[`${x},${y}`]) y++;
                    map[`${x},${y}`] = true;

                    let newTip = {
                        message: commits[parentSha].message,
                        sha: parentSha,
                        index: x,
                        level: y,
                        tip: tip.tip + ith
                    };

                    // Treat the 0th parent specially, because that parent was
                    // made along the current tip
                    if (ith === 0) {
                        console.log(`Found ${newTip.sha.substring(0,5)} on ${curTip + ith}`);
                    // If it was made along another tip, save it in tips, which will be the current tip later
                    } else {
                        console.log(`Add ${newTip.sha.substring(0,5)} for later on ${curTip + ith}`);
                        tips[curTip + ith] = tips[curTip + ith] || [];
                        tips[curTip + ith].push(newTip);
                    }

                    results[parentSha] = newTip;
                });

                // Explore along the 0th parent, i.e. the same branch
                tip = results[tipParents[0]];
            }

        })

        curTip++;
    }

    return results;
}

fetch('http://localhost:3000')
    .then(response => response.json())
    .then(db => {
        const commits =
            Object.keys(db.commits)
                .map(sha => Object.assign({}, db.commits[sha], {sha: sha}));


	var body = d3.select("body").node()
        var width = body.clientWidth;
        var height = body.clientHeight;
        var svg = d3.select("svg")
		.attr("width", width)
		.attr("height", height);
        var root = svg.append('g');

        svg.call(d3.zoom()
	  .scaleExtent([0.25, 2])
	  .on("zoom", () => root.attr('transform', d3.event.transform)));

        let nodes = horizontalOrientation("master", db)

        const links = Array.prototype.concat.apply([],
            commits
                // Filter out commits that are not reachable in nodes,
                // since nodes only contains reachable nodes from a single ref
                .filter(c => nodes[c.sha])
                .map(c => {
                    let child = nodes[c.sha];
                    return c.parents
                        .map(sha => {
                            let parent = nodes[sha];
                            return {
                                source: toCartesian(parent, width, height),
                                target: toCartesian(child, width, height)
                            };
                        })
                }));

        function toCartesian(node, width, height) {
            let { index, level } = node;
            return {
                x: width/2 - 80*index,
                y: height/2 + 80*level
            };
        }

        var link = root.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(links)
            .enter().append("line")
            .attr('stroke', 'red')
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        var node = root.append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(Object.values(nodes))
            .enter().append("circle")
            .attr("r", 20)
            .attr("fill", "black")
            .attr("cx", d => {
                return toCartesian(d, width, height).x;
            })
            .attr("cy", d => {
                return toCartesian(d, width, height).y;
            })

        node.append("title")
            .text(d => `${d.sha.substring(0,5)} ${d.message} (${d.index},${d.level})`);

    });
