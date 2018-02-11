
function ID3(rows, headers, decisionAttr) {
    console.log(rows, headers)

    const decisionCounts = categoryCounts(decisionAttr)
    const decisions = Object.keys(decisionCounts)
    if (decisions.length === 2) { // 'p' & 'n' for I(p,n)
        const tree = new ID3Tree()
        console.log(tree)
        visualizeTree(tree, 'd3-tree')
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
            // JSON-ify tree starting from root node
            return getNodeJson('', this.root, null)

            function getNodeJson(key, node, parent) {
                // make string for node link
                return node.decision ? // is leaf node?
                    { key: key, label: node.decision, parent: parent } :
                    {
                        key: key,
                        label: node.attr,
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
        // zero-check: Math.log(0) returns '-Infinity' return 0 instead
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
    // display decision tree as D3 diagram
    function visualizeTree(id3Tree, elementID) {
        document.getElementById(elementID).innerHTML = '' // clear SVG first

        const margin = { top: 40, right: 0, bottom: 20, left: 140 },
            height = 500 - margin.top - margin.bottom
        var width = window.innerWidth - margin.right - margin.left
        var i = 0

        const svgContainer = d3.select('#' + elementID)
        // SVG width relative to container width
        width = svgContainer[0][0].clientWidth - margin.right - margin.left
        const svg = svgContainer.append('svg')
            .attr('width', width + margin.right + margin.left)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left + width / 2},${margin.top})`)

        var root = id3Tree.toJson((key, node) => `${key ? key + ':' : ''} ${node}`)
        update()

        // resize SVG element according to parent container
        window.addEventListener('resize', () => {
            width = svgContainer[0][0].clientWidth - margin.right - margin.left
            svgContainer.select('svg')
                .attr('width', width + margin.right + margin.left)
                .select('g')
                .attr('transform', `translate(${margin.left + width / 2},${margin.top})`)
            update()
        })

        function update() {
            // clamp node width between 100px & some fraction of window width
            const nodeWidth = window.innerWidth / 8 > 100 ? 100 : window.innerWidth / 8,
                nodeHeight = nodeWidth * 0.6

            const tree = d3.layout.tree()
                // .size([width, height])
                .nodeSize([nodeWidth * 1.2, nodeHeight])
            const nodes = tree.nodes(root).reverse(), links = tree.links(nodes)
            nodes.forEach(d => { d.y = d.depth * 120 })

            // tree nodes
            const node = svg.selectAll('g.node')
                .data(nodes, d => d.id || (d.id = ++i))

            // ENTER: make nodes
            const nodeEnter = node.enter().append('g')
                .attr('class', 'node')
            nodeEnter.append('polygon') // node shape
            // node text: decision & attribute
            nodeEnter.append('text').attr('class', 'decision')
            nodeEnter.append('text').attr('class', 'label')

            // UPDATE: set node position
            node.attr('transform', d => `translate(${d.x},${d.y})`)
            // make node polygon shape
            node.selectAll('polygon')
                .attr('points', makeDiamond(nodeWidth, nodeHeight))
            // node key: decision leading to node
            setNodeText(node.selectAll('text.decision'), -nodeHeight * 3 / 4, d => d.key)
            // node label: attribute
            setNodeText(node.selectAll('text.label'), 0, d => d.label)

            // draw line connecting tree nodes
            const link = svg.selectAll('line.link')
                .data(links, d => d.target.id)
            link.enter().insert('line', 'g')
                .attr('class', 'link')
            // update all
            link.attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y + nodeHeight / 2)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y - nodeHeight / 2)
        }

        function setNodeText(textNode, y, textFn) {
            textNode.attr('y', y)
                .attr('dy', '.35em')
                .attr('text-anchor', 'middle')
                .text(textFn)
        }

        function makeDiamond(width, height) {
            const top = '0,' + (-height / 2)
            const right = (width / 2) + ',0'
            const bottom = '0,' + (height / 2)
            const left = (-width / 2) + ',0'
            return `${top} ${right} ${bottom} ${left}`
        }
    }
}

function showDataTable(rows, headers) {
    const dataTable = document.getElementById('data-table')
    dataTable.innerHTML = '' // clear HTML first
    // add table headers
    const thead = document.createElement('thead')
    const trHeader = document.createElement('tr')
    for (let header of headers) {
        const th = document.createElement('th')
        th.innerHTML = header
        trHeader.appendChild(th)
    }
    thead.appendChild(trHeader)
    dataTable.appendChild(thead)
    // add table rows
    const tbody = document.createElement('tbody')
    for (let row of rows) {
        const trBody = document.createElement('tr')
        for (let attr in row) {
            const td = document.createElement('td')
            td.innerHTML = row[attr]
            trBody.appendChild(td)
        }
        tbody.appendChild(trBody)
    }
    dataTable.appendChild(tbody)
}

function parseData(textData) {
    Papa.parse(textData, {
        header: true,
        complete: res => {
            // show data on table view
            showDataTable(res.data, res.meta.fields)
            // run ID3 algorithm on data
            // removing 'Parcel ID' Attr: no need for decision tree
            res.data.forEach(row => { delete row['Parcel ID'] })
            res.meta.fields.splice(res.meta.fields.indexOf('Parcel ID'), 1)
            ID3(res.data, res.meta.fields, 'Type')
        }
    })
}

// Datasets
const datasets = {
    'HK Postage (20 rows)': 'hk_postage.csv'
}
// Populate datasets menu
const ddDatasetsMenu = document.getElementById('ddDatasetsMenu')
for (let key in datasets) {
    const btnDataset = document.createElement('button')
    btnDataset.type = 'button'
    btnDataset.classList.add('dropdown-item')
    btnDataset.innerHTML = `${key}`
    btnDataset.addEventListener('click', e => {
        // read & process dataset file
        fetch(`datasets/${datasets[key]}`)
            .then(res => res.text())
            .then(text => {
                parseData(text)
            })
    })
    ddDatasetsMenu.appendChild(btnDataset)
}

// TODO: Obtain data file from HTML file input element, then read and parse
// const inputFileData = document.getElementById('inputFileData')
// inputFileData.addEventListener('change', e => {
//     const file = e.target.files[0]
//     if (file) readFile(file)
// })
// function readFile(file) {
//     Papa.parse(file, {
//         header: true,
//         complete: res => {
//             // TODO: prompt user for selecting fields for generating decision tree
//             // ID3(res.data, res.meta.fields, 'Type')
//         }
//     })
// }

// TODO: test data as string, just for rapid development
parseData(
    `Parcel ID,Origin,Destination,Type,Weight
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
20,HK,HK,Parcel,Light`)
