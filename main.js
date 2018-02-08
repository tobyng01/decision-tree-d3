
function ID3(rows, headers, decisionAttr) {
    console.log(rows, headers)

    const decisionCounts = categoryCounts(decisionAttr)
    const decisions = Object.keys(decisionCounts)
    if (decisions.length === 2) { // 'p' & 'n' for I(p,n)
        const tree = new ID3Tree()
        console.log(tree)
        visualizeTree(tree)
    }

    function ID3Tree() {
        // construct tree
        this.root = new Node(0, decisionAttr)

        // ID3 tree node
        function Node(level, attr, value, selectedAttrs) {
            // find suitable attribute i.e. highest info gain vs. other Attributes
            let fieldCounts
            if (level === 0) { // root: find best attribute for root node
                fieldCounts = decisionCounts
            } else if (level > 0) { // levels below root: look at decision on previous level
                fieldCounts = categoryCounts(attr, true, selectedAttrs)[value]
            }
            const [p, n] = decisions.map(decision => fieldCounts[decision])
            // console.log('Attr: %s -> %s , Counts: %o -> %o', attr, value, counts, counts[value])
            if (p === 0 && n === 0) {
                return null // no decision for this path
            } else if (p === 0 || n === 0) { // can classify one side
                this.decision = p === 0 ? decisions[1] : decisions[0]
                // console.log('p = %s, n = %s : classified as %s', p, n, this.decision)
            } else {
                const bestAttr = findBestAttr(decisionAttr, p, n, selectedAttrs)
                if (bestAttr) { // best attribute is found
                    // console.log('p = %s, n = %s, best attr = %s', p, n, bestAttr)
                    this.attr = bestAttr
                    this.children = Object.keys(categoryCounts(bestAttr))
                        .reduce((children, decision) => {
                            // console.log('new node:', level + 1, bestAttr, decision, selectedAttrs.concat([{ name: bestAttr, value: decision }]))
                            const thisAttr = [{ name: bestAttr, value: decision }]
                            const node = new Node(level + 1, bestAttr, decision,
                                selectedAttrs ? selectedAttrs.concat(thisAttr) : thisAttr)
                            if (!isObjectEmpty(node)) children[decision] = node
                            return children
                        }, {})
                } else { // no best attribute i.e. cannot expand further
                    // take decision with larger value
                    this.decision = p > n ? decisions[0] : decisions[1]
                }
            }
            // JS empty object checker
            function isObjectEmpty(obj) { return Object.keys(obj).length === 0 }
        }
        // find best attribute for node, given decision attribute & previous/selected attributes
        function findBestAttr(decisionAttr, p, n, selectedAttrs) {
            // console.log('[find best attr] ', decisionAttr, p, n, selectedAttrs)
            const i = information(p, n)
            const attrGains = []
            headers.forEach(header => {
                // header is not decision attribute
                if (header !== decisionAttr &&
                    // header is not one of selected attributes i.e. attributes in parent nodes
                    (!selectedAttrs || (selectedAttrs && !selectedAttrs.some(attr => attr.name === header)))) {
                    // information gain of attribute = information - entropy
                    attrGains.push({ name: header, gain: i - entropy(header, selectedAttrs) })
                }
            })
            if (attrGains.length > 0) { // exist attribute gains
                // find (array index of) attribute with max. information gain
                const maxAttrGainIdx = attrGains.reduce((maxIdx, attrGain, idx) =>
                    attrGain.gain > attrGains[maxIdx].gain ? idx : maxIdx, 0)
                // console.log('[find best attr] best from = %s', attrGains[maxAttrGainIdx].name)
                return attrGains[maxAttrGainIdx].name
            } else { // no attributes i.e. cannot expand further
                return null
            }
        }
        this.toJson = function () {
            // JSON-ify tree; starting from root node
            return getNodeJson('', this.root, null)

            function getNodeJson(key, node, parent) {
                // make string for node link
                const linkStr = key ? `${key} -> ` : ''
                return node.decision ? // is leaf node?
                    { name: `${linkStr}${node.decision}`, parent: parent } :
                    {
                        name: `${linkStr}${node.attr}`,
                        // recursively get child nodes JSON
                        children: Object.keys(node.children).map(childNodeKey => {
                            return getNodeJson(childNodeKey, node.children[childNodeKey], node.attr)
                        }),
                        parent: parent
                    }
            }
        }
    }
    function categoryCounts(attribute, countDecision, selectedAttrs) {
        const categories = {}
        rows.forEach(row => {
            const item = row[attribute]
            // count decisions of attribute?
            if (countDecision) {
                // category = object with decision counts
                if (!categories[item]) {
                    categories[item] = decisions.reduce((all, value) => (all[value] = 0, all), {})
                }
                // check selected attributes
                if (!selectedAttrs || (selectedAttrs && selectedAttrs.every(attr => row[attr.name] === attr.value))) {
                    categories[item][row[decisionAttr]]++
                }
            } else {
                // category = row count of given attribute
                if (!categories[item]) categories[item] = 0
                categories[item]++
            }
        })
        return categories
    }
    function information(p, n) {
        // zero-check: Math.log(0) returns '-Infinity'; return 0 instead
        if (p / (p + n) === 0 || n / (p + n) === 0) return 0
        return -(p / (p + n)) * Math.log2(p / (p + n)) - (n / (p + n)) * Math.log2(n / (p + n))
    }
    function entropy(attr, selectedAttrs) {
        const counts = categoryCounts(attr, true, selectedAttrs)
        // console.log('entropy category counts for %s :', attr, counts)
        let entropy = 0
        for (let attrValue in counts) {
            const attrDecisionCounts = counts[attrValue]
            const keys = Object.keys(attrDecisionCounts)
            // sum up attribute count of decisions
            const attrValueSum = keys.reduce((sum, key) => (sum += attrDecisionCounts[key], sum), 0)
            // add entropy with attribute's fraction & amount of information of attribute
            entropy += (attrValueSum / rows.length) *
                information(attrDecisionCounts[keys[0]], attrDecisionCounts[keys[1]])
        }
        return entropy
    }

    function visualizeTree(id3Tree) {
        const margin = { top: 40, right: 120, bottom: 20, left: 120 },
            width = (window.innerWidth * 0.95) - margin.right - margin.left,
            height = 500 - margin.top - margin.bottom;

        var i = 0;

        var tree = d3.layout.tree()
            .size([height, width]);

        var diagonal = d3.svg.diagonal()
            .projection(function (d) { return [d.x, d.y]; });

        const svg = d3.select('body').append('svg')
            .attr('width', width + margin.right + margin.left)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

        var root = id3Tree.toJson()
        update(root)

        function update(source) {
            // Compute the new tree layout.
            var nodes = tree.nodes(root).reverse(),
                links = tree.links(nodes);

            // Normalize for fixed-depth.
            nodes.forEach(function (d) { d.y = d.depth * 100; });

            // Declare the nodes…
            var node = svg.selectAll("g.node")
                .data(nodes, function (d) { return d.id || (d.id = ++i); });

            // Enter the nodes.
            var nodeEnter = node.enter().append("g")
                .attr("class", "node")
                .attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });

            nodeEnter.append("circle")
                .attr("r", 10)
                .style("fill", "#fff");

            nodeEnter.append("text")
                .attr("y", function (d) {
                    return d.children || d._children ? -18 : 18;
                })
                .attr("dy", ".35em")
                .attr("text-anchor", "middle")
                .text(function (d) { return d.name; })
                .style("fill-opacity", 1);

            // Declare the links…
            var link = svg.selectAll("path.link")
                .data(links, function (d) { return d.target.id; });

            // Enter the links.
            link.enter().insert("path", "g")
                .attr("class", "link")
                .attr("d", diagonal);
        }
    }
}

Papa.parse(`Parcel ID,Origin,Destination,Type,Weight
1,HK,HK,Parcel,Light
2,Kln,Kln,Letter,Light
3,NT,Kln,Letter,Light
4,HK,HK,Parcel,Heavy
5,Kln,Kln,Parcel,Light
6,NT,NT,Letter,Light
7,HK,HK,Letter,Light
8,Kln,Kln,Parcel,Heavy
9,Kln,Kln,Letter,Light
10,HK,HK,Letter,Light
11,HK,HK,Parcel,Heavy
12,Kln,Kln,Letter,Light
13,HK,HK,Letter,Light
14,Kln,Kln,Parcel,Light
15,HK,NT,Parcel,Heavy
16,NT,Kln,Letter,Light
17,HK,NT,Letter,Light
18,Kln,HK,Parcel,Light
19,HK,NT,Parcel,Heavy
20,HK,HK,Parcel,Light`, {
        header: true,
        complete: res => {
            // removing 'Parcel ID' Attr: no need for decision tree
            res.data.forEach(row => { delete row['Parcel ID'] })
            res.meta.fields.splice(res.meta.fields.indexOf('Parcel ID'), 1)
            // run ID3 algorithm on data
            ID3(res.data, res.meta.fields, 'Type')
        }
    })

// obtain data file from HTML input element, then read and parse
const inputFileData = document.getElementById('inputFileData')
inputFileData.addEventListener('change', e => {
    const file = e.target.files[0]
    if (file) readFile(file)
})
function readFile(file) {
    Papa.parse(file, {
        header: true,
        complete: res => {
            ID3(res.data, res.meta.fields, 'Type')
        }
    })
}
