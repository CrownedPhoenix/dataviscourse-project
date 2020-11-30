class EngagementTerms {
  constructor(mountPoint, data) {
    this.rootDiv = d3.select(`#${mountPoint}`);

    const left = this.rootDiv.append("div").attr("id", "left");
    this.plotDiv = left.append("div").attr("id", "plot-div");

    left.append("div").attr("id", "slider-div");
    left.append("div").attr("id", "info-div");

    const right = this.rootDiv.append("div").attr("id", "right");
    const controlPanel = right.append("div").attr("id", "control-panel");
    right.append("div").attr("id", "table-div");

    controlPanel
      .selectChildren("button")
      .data([0, 1])
      .join("button")
      .text((d) => (d == 0 ? "Facebook" : "Twitter"))
      .attr("type", "button")
      .attr("id", (d) => (d == 0 ? "facebook-tog" : "twitter-tog"))
      .classed("btn btn-primary", true)
      .classed("facebook-btn", (d) => d == 0)
      .classed("twitter-btn", (d) => d == 1);

    this.infoBox = new InfoBox("info-div", data);

    this.engagementPlot = new EngagementPlot(
      "plot-div",
      data,
      2015,
      (newSelection) => {
        this.table.updateSelection(newSelection);
        if (newSelection.size == 1) {
          this.infoBox.update(Array.from(newSelection)[0]);
        } else {
          this.infoBox.update(undefined);
        }
      }
    );
    this.table = new Table("table-div", data, 2015);
    this.slider = new Slider(
      "slider-div",
      "year-slider",
      2015,
      2020,
      (newYear) => {
        this.engagementPlot.updateYear(newYear);
        this.table.updateYear(newYear);
      }
    );

    d3.select("#facebook-tog").on("click", (e) => {
      this.engagementPlot.updatePlatform("Facebook");
      this.table.updatePlatform("Facebook");
    });
    d3.select("#twitter-tog").on("click", (e) => {
      this.engagementPlot.updatePlatform("Twitter");
      this.table.updatePlatform("Twitter");
    });

    this.data = data;
    this.render();
  }

  render() {}
}

class EngagementPlot {
  constructor(mountPoint, data, activeYear, handleSelectionUpdate) {
    this.rootDiv = d3.select(`#${mountPoint}`);

    const rect = this.rootDiv.node().getBoundingClientRect();
    console.log(rect);
    this.svgFullHeight = 300;
    this.svgFullWidth = rect.width;
    this.margin = { top: 30, right: 10, left: 60, bottom: 50 };
    this.height = this.svgFullHeight - this.margin.top - this.margin.bottom;
    this.width = this.svgFullWidth - this.margin.left - this.margin.right;
    this.origin = { x: this.margin.left, y: this.margin.top };

    this.circleRadius = 5;
    this.circleHighlightRadius = 8;
    this.xBuffer = 1000;
    this.activeYear = activeYear;
    this.handleSelectionUpdate = handleSelectionUpdate;

    this.rootDiv.append("div").attr("id", "plot-tooltip");
    this.setTooltip(undefined);

    this.rootDiv
      .append("div")
      .attr("id", "engagement-title")
      .text("How did different terms affect engagement?");

    this.rootSVG = this.rootDiv
      .append("svg")
      .attr("height", this.svgFullHeight)
      .attr("width", this.svgFullWidth);

    this.data = this.prepareData(data);
    this.dataInfo = this.prepareDataInfo(data);
    this.selection = new Set();

    this.setPlatform("Facebook");
    this.preparePlot();
    this.render();
  }

  preparePlot() {
    this.xScaleTotal = d3
      .scaleLinear()
      .range([this.origin.x, this.origin.x + this.width / 3]);

    this.xScaleLeft = d3
      .scaleLinear()
      .range([
        this.origin.x + this.width / 3,
        this.origin.x + 2 * (this.width / 3),
      ]);

    this.xScaleRight = d3
      .scaleLinear()
      .range([
        this.origin.x + 2 * (this.width / 3),
        this.origin.x + this.width,
      ]);

    this.yScale = d3.scaleLinear().range([this.origin.y, this.height]);

    this.plotWidth = this.width / 3;
    this.plotHeight = this.height;
    this.updatePlotData();

    this.currentBrush;

    this.rootSVG
      .selectChildren(".brush")
      .data(this.plotData)
      .join("g")
      .attr("transform", ({ x, y, h, w }) => `translate(${x}, ${y})`)
      .classed("brush", true)
      .call(this.brush, this.plotHeight, this.plotWidth, this);

    this.totalPlotPoints = this.rootSVG
      .append("g")
      .attr("id", "total-plot-points");

    this.leftPlotPoints = this.rootSVG
      .append("g")
      .attr("id", "left-plot-points");

    this.rightPlotPoints = this.rootSVG
      .append("g")
      .attr("id", "right-plot-points");

    this.labelGroup = this.rootSVG.append("g").attr("id", "plot-label");

    this.labelGroup
      .append("text")
      .text(this.activeYear)
      .attr("id", "year-label")
      .attr("x", this.width - 100)
      .attr("y", 50);

    this.labelGroup
      .append("text")
      .text(this.platform)
      .attr("id", "platform-label")
      .attr("x", this.width - 100)
      .attr("y", 75)
      .classed("facebook", this.platform == "Facebook")
      .classed("twitter", this.platform == "Twitter");
  }

  brush(plot, height, width, that) {
    const brush = d3
      .brush()
      .extent([
        [0, 0],
        [width, height],
      ])
      .on("start", brushstarted)
      .on("brush", brushed)
      .on("end", brushended);

    plot.call(brush);

    function brushstarted() {
      if (that.currentBrush !== this) {
        d3.select(that.currentBrush).call(brush.move, null);
        that.currentBrush = this;
      }
    }

    function brushed({ selection }, offset) {
      if (selection) {
        const inside = that.rootSVG.selectAll("circle").filter((d, i, c) => {
          const [[sx0, sy0], [sx1, sy1]] = selection;
          const [[x0, y0], [x1, y1]] = [
            [sx0 + offset.x, sy0 + offset.y],
            [sx1 + offset.x, sy1 + offset.y],
          ];

          const [cx, cy] = [c[i].cx.animVal.value, c[i].cy.animVal.value];
          return cx > x0 && cx < x1 && cy > y0 && cy < y1;
        });
        const newSelection = inside
          .data()
          .reduce((set, el) => set.add(el.Party + el.Term), new Set());
        that.updateSelection(newSelection);
        that.render();
      }
    }

    function brushended({ selection }) {
      if (selection) return;
      that.currentBrush = undefined;
      that.updateSelection(new Set());
      that.render();
    }
  }

  prepareData(data) {
    return data;
  }

  prepareDataInfo(data) {
    const info = { pctEffect: {}, totalPosts: {} };
    const years = [2015, 2016, 2017, 2018, 2019, 2020];
    for (const year of years) {
      info.pctEffect[year] = { Facebook: {}, Twitter: {} };
      info.totalPosts[year] = { Facebook: {}, Twitter: {} };

      for (const platform of ["Facebook", "Twitter"]) {
        info.pctEffect[year].Facebook = {
          max: d3.max(data, (d) =>
            d.Year == year
              ? Math.max(
                  +d["Percentage Effect on Facebook Reactions"],
                  +d["Percentage Effect on Facebook Shares"]
                )
              : 0
          ),
        };
        info.pctEffect[year].Twitter = {
          max: d3.max(data, (d) =>
            d.Year == year
              ? Math.max(
                  +d["Percentage Effect on Twitter Favorites"],
                  +d["Percentage Effect on Twitter Retweets"]
                )
              : 0
          ),
        };
        info.pctEffect[year].Total = {
          max: d3.max(data, (d) =>
            d.Year == year
              ? Math.max(
                  +d["Percentage Effect on Facebook Reactions"],
                  +d["Percentage Effect on Facebook Shares"],
                  +d["Percentage Effect on Twitter Favorites"],
                  +d["Percentage Effect on Twitter Retweets"]
                )
              : 0
          ),
        };
        info.totalPosts[year].Facebook = {
          max: d3.max(data, (d) =>
            d.Year == year ? +d["Number of Facebook Posts"] : 0
          ),
        };
        info.totalPosts[year].Twitter = {
          max: d3.max(data, (d) =>
            d.Year == year ? +d["Number of Tweets"] : 0
          ),
        };
        info.totalPosts[year].Total = {
          max: d3.max(data, (d) =>
            d.Year == year
              ? +d["Number of Tweets"] + +d["Number of Facebook Posts"]
              : 0
          ),
        };
      }
    }
    return info;
  }

  render() {
    this.renderPlot();

    this.updateLabel(this.activeYear, this.platform);
    const dataForActiveYear = this.data.filter(
      (d) => d.Year == this.activeYear
    );

    this.totalPlotPoints
      .selectChildren("circle")
      .data(dataForActiveYear)
      .join("circle")
      .classed("republican", (d) => d.Party === "R")
      .classed("democrat", (d) => d.Party === "D")
      .classed("transparent", (d) =>
        this.currentBrush || this.selection.size > 0
          ? !this.selection.has(d.Party + d.Term)
          : false
      )
      .on("mouseenter", (e, d) => {
        const el = d3.select(e.target);
        const html = this.genTooltipHtml(
          d.Term,
          this.platform == "Facebook" ? "Avg Reaction %" : "Avg Favorite %",
          this.yTotalGetter(d),
          this.platform == "Facebook" ? "Total Posts" : "Total Tweets",
          this.xTotalGetter(d)
        );
        this.setTooltip(html, e.pageX, e.pageY);
        el.transition()
          .duration(100)
          .attr("r", this.circleHighlightRadius)
          .style("stroke", "black")
          .style("stroke-width", 2);
      })
      .on("mouseleave", (e) => {
        const el = d3.select(e.target);
        this.setTooltip(undefined);
        el.transition()
          .duration(100)
          .attr("r", this.circleRadius)
          .style("stroke", "")
          .style("stroke-width", "");
      })
      .on("click", (e, d) => {
        const selection = new Set().add(d.Party + d.Term);
        this.updateSelection(selection);
      })
      .transition()
      .duration(300)
      .attr("cx", (d) => this.xScaleTotal(this.xTotalGetter(d)))
      .attr("cy", (d) => this.yScale(this.yTotalGetter(d)))
      .attr("r", this.circleRadius);

    this.leftPlotPoints
      .selectChildren("circle")
      .data(dataForActiveYear)
      .join("circle")
      .classed("republican", (d) => d.Party === "R")
      .classed("democrat", (d) => d.Party === "D")
      .classed("transparent", (d) =>
        this.currentBrush || this.selection.size > 0
          ? !this.selection.has(d.Party + d.Term)
          : false
      )
      .on("mouseenter", (e, d) => {
        const el = d3.select(e.target);
        const html = this.genTooltipHtml(
          d.Term,
          this.platform == "Facebook" ? "Reaction %" : "Favorite %",
          this.yLeftGetter(d),
          this.platform == "Facebook" ? "Posts" : "Tweets",
          this.xLeftGetter(d)
        );
        this.setTooltip(html, e.pageX, e.pageY);
        el.transition()
          .duration(100)
          .attr("r", this.circleHighlightRadius)
          .style("stroke", "black")
          .style("stroke-width", 2);
      })
      .on("mouseleave", (e) => {
        const el = d3.select(e.target);
        this.setTooltip(undefined);
        el.transition()
          .duration(100)
          .attr("r", this.circleRadius)
          .style("stroke", "")
          .style("stroke-width", "");
      })
      .on("click", (e, d) => {
        const selection = new Set().add(d.Party + d.Term);
        this.updateSelection(selection);
      })
      .transition()
      .duration(300)
      .attr("cx", (d) => this.xScaleLeft(this.xLeftGetter(d)))
      .attr("cy", (d) => this.yScale(this.yLeftGetter(d)))
      .attr("r", this.circleRadius);

    this.rightPlotPoints
      .selectChildren("circle")
      .data(dataForActiveYear)
      .join("circle")
      .classed("republican", (d) => d.Party === "R")
      .classed("democrat", (d) => d.Party === "D")
      .classed("transparent", (d) =>
        this.currentBrush || this.selection.size > 0
          ? !this.selection.has(d.Party + d.Term)
          : false
      )
      .on("mouseenter", (e, d) => {
        const el = d3.select(e.target);
        const html = this.genTooltipHtml(
          d.Term,
          this.platform == "Facebook" ? "Shares %" : "Retweets %",
          this.yRightGetter(d),
          this.platform == "Facebook" ? "Posts" : "Tweets",
          this.xRightGetter(d)
        );
        this.setTooltip(html, e.pageX, e.pageY);
        el.transition()
          .duration(100)
          .attr("r", this.circleHighlightRadius)
          .style("stroke", "black")
          .style("stroke-width", 2);
      })
      .on("mouseleave", (e) => {
        const el = d3.select(e.target);
        this.setTooltip(undefined);
        el.transition()
          .duration(100)
          .attr("r", this.circleRadius)
          .style("stroke", "")
          .style("stroke-width", "");
      })
      .on("click", (e, d) => {
        const selection = new Set().add(d.Party + d.Term);
        this.updateSelection(selection);
      })
      .transition()
      .duration(300)
      .attr("cx", (d) => this.xScaleRight(this.xRightGetter(d)))
      .attr("cy", (d) => this.yScale(this.yRightGetter(d)))
      .attr("r", this.circleRadius);
  }

  setTooltip(html, x, y) {
    const tooltip = d3.select("#plot-tooltip");
    if (html) {
      tooltip
        .classed("hidden", false)
        .style("left", x + "px")
        .style("top", y + "px")
        .html(html);
    } else {
      tooltip.classed("hidden", true);
    }
  }

  genTooltipHtml(term, label1, content1, label2, content2) {
    return `<h6>${term}</h6>
    <p><b>${label1}:</b> ${content1}</p>
    <br>
    <b>${label2}:</b> ${content2}</p>`;
  }

  renderPlot(year) {
    if (year != this.activeYear) {
      this.updatePlotData();
      this.rootSVG
        .selectChildren(".plot-y-axis")
        .data(this.plotData)
        .join("g")
        .classed("plot-y-axis", true)
        .attr("transform", (d) => `translate(${d.x},0)`)
        .each((d, i, nodes) =>
          d3.select(nodes[i]).transition().duration(300).call(d.yAxisGenerator)
        );

      this.rootSVG
        .selectChildren(".plot-x-axis")
        .data(this.plotData)
        .join("g")
        .classed("plot-x-axis", true)
        .attr("transform", `translate(0,${this.height})`)
        .each((d, i, nodes) =>
          d3.select(nodes[i]).transition().duration(300).call(d.xAxisGenerator)
        );
    }
  }

  updatePlotData() {
    this.xScaleTotal.domain([
      0,
      this.dataInfo.totalPosts[this.activeYear].Total.max + this.xBuffer,
    ]);

    this.xScaleLeft.domain([
      0,
      this.dataInfo.totalPosts[this.activeYear][this.platform].max +
        this.xBuffer,
    ]);

    this.xScaleRight.domain([
      0,
      this.dataInfo.totalPosts[this.activeYear][this.platform].max +
        this.xBuffer,
    ]);
    this.yScale.domain([this.dataInfo.pctEffect[this.activeYear].Total.max, 0]);

    this.plotData = [
      {
        x: this.origin.x,
        y: 0,
        yAxisGenerator: d3.axisLeft(this.yScale).ticks(10),
        xAxisGenerator: d3.axisBottom(this.xScaleTotal).ticks(5),
      },
      {
        x: this.origin.x + this.width / 3,
        y: 0,
        yAxisGenerator: d3
          .axisLeft(this.yScale)
          .ticks(10)
          .tickPadding(-20)
          .tickFormat((t) => ""),
        xAxisGenerator: d3.axisBottom(this.xScaleLeft).ticks(5),
      },
      {
        x: this.origin.x + 2 * (this.width / 3),
        y: 0,
        yAxisGenerator: d3
          .axisLeft(this.yScale)
          .ticks(10)
          .tickPadding(-20)
          .tickFormat((t) => ""),
        xAxisGenerator: d3.axisBottom(this.xScaleRight).ticks(5),
      },
    ];
  }

  setPlatform(platform) {
    this.platform = platform;
    this.xTotalGetter = (d) =>
      +d["Number of Facebook Posts"] + +d["Number of Tweets"];
    this.yTotalGetter = (d) => +d["Average Percentage Effect"];

    switch (platform) {
      case "Facebook":
        this.xLeftGetter = (d) => +d["Number of Facebook Posts"];
        this.yLeftGetter = (d) => +d["Percentage Effect on Facebook Reactions"];

        this.xRightGetter = (d) => +d["Number of Facebook Posts"];
        this.yRightGetter = (d) => +d["Percentage Effect on Facebook Shares"];
        break;
      case "Twitter":
        this.xLeftGetter = (d) => +d["Number of Tweets"];
        this.yLeftGetter = (d) => +d["Percentage Effect on Twitter Favorites"];

        this.xRightGetter = (d) => +d["Number of Tweets"];
        this.yRightGetter = (d) => +d["Percentage Effect on Twitter Retweets"];
        break;
      default:
        throw "Platform must be 'Facebook' or 'Twitter'";
    }
  }

  updatePlatform(platform) {
    this.setPlatform(platform);
    this.render();
  }

  updateYear(newYear) {
    this.activeYear = newYear;
    this.render();
  }

  updateSelection(selection) {
    if (this.selection != selection) {
      this.selection = selection;
      this.handleSelectionUpdate(selection);
      this.render();
    }
  }

  updateLabel(activeYear, platform) {
    this.labelGroup.select("#year-label").text(activeYear);
    this.labelGroup
      .select("#platform-label")
      .text(this.platform)
      .classed("facebook", platform == "Facebook")
      .classed("twitter", platform == "Twitter");
  }
}

class Slider {
  constructor(mountPoint, id, min, max, onInput) {
    this.root = d3.select(`#${mountPoint}`);

    this.root
      .append("input")
      .attr("id", id)
      .attr("type", "range")
      .attr("min", min)
      .attr("max", max)
      .attr("step", 1)
      .on("input", (e) => onInput(e.target.value));

    this.dataList = this.root.append("datalist").attr("id", "slider-list");

    this.range = Array.from(Array(max - min), (_, x) => min + x);
    this.render();
  }

  render() {
    this.dataList
      .selectChildren("option")
      .data(this.range)
      .join("option")
      .attr("value", (d) => d)
      .attr("label", (d) => d);
  }
}

class Table {
  constructor(mountPoint, data, activeYear) {
    this.root = d3.select(`#${mountPoint}`);
    this.activeYear = activeYear;
    this.selection = new Set();
    this.sortInfo = { col: undefined, ascending: undefined };
    this.columnInfo = {
      ordered: ["Term", "Avg %", "Party", "Reaction %", "Share %"],
      Term: {
        comparator: (a, b) => a["Term"].localeCompare(b["Term"]),
        get: (d) => d["Term"],
      },
      "Avg %": {
        comparator: (a, b) =>
          +a["Average Percentage Effect"] - +b["Average Percentage Effect"],
        get: (d) => d["Average Percentage Effect"],
      },
      Party: {
        comparator: (a, b) => a["Party"].localeCompare(b["Party"]),
        get: (d) => d["Party"],
      },
      "Reaction %": {
        comparator: (a, b) =>
          +a["Percentage Effect on Facebook Reactions"] -
          +b["Percentage Effect on Facebook Reactions"],
        get: (d) => d["Percentage Effect on Facebook Reactions"],
      },
      "Favorite %": {
        comparator: (a, b) =>
          +a["Percentage Effect on Twitter Favorites"] -
          +b["Percentage Effect on Twitter Favorites"],
        get: (d) => d["Percentage Effect on Twitter Favorites"],
      },
      "Share %": {
        comparator: (a, b) =>
          +a["Percentage Effect on Facebook Shares"] -
          +b["Percentage Effect on Facebook Shares"],
        get: (d) => d["Percentage Effect on Facebook Shares"],
      },
      "Retweet %": {
        comparator: (a, b) =>
          +a["Percentage Effect on Twitter Retweets"] -
          +b["Percentage Effect on Twitter Retweets"],
        get: (d) => d["Percentage Effect on Twitter Retweets"],
      },
    };

    this.tableRoot = this.root.append("table").attr("id", "engagement-table");

    this.thead = this.tableRoot
      .append("thead")
      .classed("engagement-thead", true);

    // this.thead
    //   .append("tr")
    //   .classed("engagement-thr", true)
    //   .append("th")
    //   .classed("engagement-top-th", true)
    //   .attr("colspan", 3)
    //   .text("Header");

    this.colHeaders = this.thead.append("tr").classed("engagement-thr", true);

    this.colHeaders
      .selectChildren("th")
      .data(this.columnInfo.ordered)
      .join("th")
      .classed("engagement-th", true)
      .attr("colspan", 1)
      .html((d) => this.getHeaderHtml(d))
      .on("click", (e, d) => this.updateSort(d));

    this.tbody = this.tableRoot.append("tbody");

    this.data = data;
    this.render();
  }

  render() {
    this.colHeaders
      .selectChildren("th")
      .data(this.columnInfo.ordered)
      .html((d) => this.getHeaderHtml(d));

    let dataForActiveYear = this.data.filter(
      (d) =>
        d.Year == this.activeYear &&
        (this.selection.size > 0 ? this.selection.has(d.Party + d.Term) : true)
    );

    this.rows = this.tbody
      .selectChildren()
      .data(dataForActiveYear)
      .join("tr")
      .classed("engagement-tr", true);
    this.rows
      .selectChildren(".table-term")
      .data((d) => [d])
      .join("td")
      .classed("table-term", true)
      .text((d) => this.columnInfo[this.columnInfo.ordered[0]].get(d));

    this.rows
      .selectChildren(".table-avg")
      .data((d) => [d])
      .join("td")
      .classed("table-avg", true)
      .text((d) => this.columnInfo[this.columnInfo.ordered[1]].get(d));

    this.rows
      .selectChildren(".table-party")
      .data((d) => [d])
      .join("td")
      .classed("table-party", true)
      .text((d) => this.columnInfo[this.columnInfo.ordered[2]].get(d));

    this.rows
      .selectChildren(".table-react-faves")
      .data((d) => [d])
      .join("td")
      .classed("table-react-faves", true)
      .text((d) => this.columnInfo[this.columnInfo.ordered[3]].get(d));

    this.rows
      .selectChildren(".table-share-retweets")
      .data((d) => [d])
      .join("td")
      .classed("table-share-retweets", true)
      .text((d) => this.columnInfo[this.columnInfo.ordered[4]].get(d));
  }

  updateYear(year) {
    this.activeYear = year;
    this.render();
  }

  updatePlatform(platform) {
    switch (platform) {
      case "Facebook":
        this.columnInfo.ordered = [
          "Term",
          "Avg %",
          "Party",
          "Reaction %",
          "Share %",
        ];
        break;
      case "Twitter":
        this.columnInfo.ordered = [
          "Term",
          "Avg %",
          "Party",
          "Favorite %",
          "Retweet %",
        ];
        break;
      default:
        throw "Platform must be 'Facebook' or 'Twitter'";
    }
    this.render();
  }

  updateSelection(selection) {
    this.selection = selection;
    this.render();
  }

  updateSort(col) {
    if (this.sortInfo.col == col) {
      this.sortInfo.ascending = !this.sortInfo.ascending;
    } else {
      this.sortInfo = { col, ascending: false };
    }
    let asc = this.sortInfo.ascending;
    let comp = this.columnInfo[col].comparator;
    this.data.sort((a, b) => (asc ? -comp(a, b) : comp(a, b)));
    this.render();
  }

  getHeaderHtml(header) {
    if (header == this.sortInfo.col) {
      return header + (this.sortInfo.ascending ? "&#8650;" : "&#8648;");
    }
    return header;
  }
}

class InfoBox {
  constructor(mountPoint, data) {
    this.root = d3.select(`#${mountPoint}`);
    this.data = data;
    this.label = this.root.append("div").attr("id", "info-box-label");
    this.table = this.root.append("table");
    this.update(undefined);
  }

  update(selection) {
    if (selection) {
      const datapoint = this.data.find((d) => selection == d.Party + d.Term);
      this.updateLabel(
        datapoint.Term,
        datapoint.Party,
        datapoint.Year,
        datapoint["Average Percentage Effect"]
      );

      this.displayData = [
        [
          "Number of Facebook Posts",
          datapoint["Number of Facebook Posts"],
          "Number of Tweets",
          datapoint["Number of Tweets"],
        ],
        [
          "Percentage Effect on Facebook Reactions",
          datapoint["Percentage Effect on Facebook Reactions"],
          "Percentage Effect on Twitter Favorites",
          datapoint["Percentage Effect on Twitter Favorites"],
        ],
        [
          "Percentage Effect on Facebook Shares",
          datapoint["Percentage Effect on Facebook Shares"],
          "Percentage Effect on Twitter Retweets",
          datapoint["Percentage Effect on Twitter Retweets"],
        ],
      ];
    } else {
      this.displayData = [[], [], []];
    }
    this.rows = this.table
      .selectChildren("tr")
      .data(this.displayData)
      .join("tr");
    this.rows
      .selectChildren("td")
      .data((d) => [...d])
      .join("td")
      .text((d) => d);
  }

  updateLabel(term, party, year, avg) {
    const d = [term, party, year, avg];
    this.label
      .selectChildren("div")
      .data(d)
      .join("div")
      .style("display", "inline")
      .text((d, i) => {
        switch (i) {
          case 0:
            return `Term: ${d}`;

          case 1:
            return `Party: ${d}`;
          case 2:
            return `Year: ${d}`;
          case 3:
            return `Average % Effect: ${d}`;
        }
      })
      .attr("class", (d, i) => {
        switch (i) {
          case 0:
            return "term";

          case 1:
            return "party";
          case 2:
            return "year";
          case 3:
            return `avg`;
        }
      });
  }
}
