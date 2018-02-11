# Decision Tree D3

Visualize [decision tree](https://en.wikipedia.org/wiki/Decision_tree) with D3.

- [x] Constructs a decision tree structure for some given dataset (transactions/logs) using some implementation similar to the [ID3 algorithm](https://en.wikipedia.org/wiki/ID3_algorithm).
- [x] Display decision tree diagram.
- [ ] Support CSV file upload & processing.
    - [ ] Select an attribute/field as decision; and any fields to disregard during tree construction.
- [ ] Add/Modify/Remove data from table and updates decision tree.
- [ ] Animation of tree construction (with D3).

_Related to HK PolyU Computing course - COMP4433 Data Mining & Data Warehousing_

## Datasets

Test data can be found in [datasets folder](datasets/)

- Hong Kong postage log (20 rows) [link](datasets/hk_postage.csv)

## Dependencies

All powered by HTML/CSS/JS.

- [PapaParse](http://papaparse.com/): CSV parsing
- [D3](https://d3js.org/) (version 3): data-driven documents/data visualization
- [Bootstrap](https://getbootstrap.com/): UI components & styles
