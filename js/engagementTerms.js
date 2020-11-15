class EngagementTerms {
  constructor(mountPoint, data) {
    this.rootDiv = d3
      .select(`#${mountPoint}`)
      .style("border", "1px solid black")
      .style("display", "flex");

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

    this.plotDiv.style("border", "1px solid red");

    this.engagementPlot = new EngagementPlot("plot-div", data, 2015);
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
  constructor(mountPoint, data, activeYear) {
    this.svgFullHeight = 300;
    this.svgFullWidth = 1000;
    this.margin = { top: 10, right: 10, left: 30, bottom: 15 };
    this.height = this.svgFullHeight - this.margin.top - this.margin.bottom;
    this.width = this.svgFullWidth - this.margin.left - this.margin.right;
    this.origin = { x: this.margin.left, y: this.margin.top };

    this.circleRadius = 3;
    this.xBuffer = 1000;
    this.activeYear = activeYear;

    this.rootDiv = d3.select(`#${mountPoint}`);

    this.rootSVG = this.rootDiv
      .append("svg")
      .attr("height", this.svgFullHeight)
      .attr("width", this.svgFullWidth)
      .style("border", "1px dotted black");

    this.data = this.prepareData(data);
    this.dataInfo = this.prepareDataInfo(data);

    this.setPlatform("Facebook");
    this.preparePlot();
    this.render();
  }

  preparePlot() {
    this.xScaleTotal = d3
      .scaleLinear()
      .domain([0, this.dataInfo.totalPosts.max + this.xBuffer])
      .range([this.origin.x, this.width / 3]);

    this.xScaleLeft = d3
      .scaleLinear()
      .domain([0, this.dataInfo.totalPosts.max + this.xBuffer])
      .range([this.width / 3, 2 * (this.width / 3)]);

    this.xScaleRight = d3
      .scaleLinear()
      .domain([0, this.dataInfo.totalPosts.max + this.xBuffer])
      .range([2 * (this.width / 3), this.width]);

    this.yScale = d3
      .scaleLinear()
      .domain([this.dataInfo.pctEffect.max, 0])
      .range([this.origin.y, this.height]);

    this.yAxisGenerator = d3.axisLeft(this.yScale).ticks(10);
    this.xAxisGeneratorTotal = d3.axisBottom(this.xScaleTotal).ticks(5);
    this.xAxisGeneratorLeft = d3.axisBottom(this.xScaleLeft).ticks(5);
    this.xAxisGeneratorRight = d3.axisBottom(this.xScaleRight).ticks(5);

    this.rootSVG
      .append("g")
      .classed("plot-y-axis", true)
      .attr("transform", `translate(${this.origin.x},0)`)
      .call(this.yAxisGenerator);

    this.rootSVG
      .append("g")
      .classed("plot-y-axis", true)
      .attr("transform", `translate(${this.width / 3},0)`)
      .call(this.yAxisGenerator.tickPadding(-20).tickFormat((t) => ""));

    this.rootSVG
      .append("g")
      .classed("plot-y-axis", true)
      .attr("transform", `translate(${2 * (this.width / 3)},0)`)
      .call(this.yAxisGenerator.tickPadding(-20).tickFormat((t) => ""));

    this.rootSVG
      .append("g")
      .classed("plot-x-axis-total", true)
      .attr("transform", `translate(0,${this.height})`)
      .call(this.xAxisGeneratorTotal);

    this.rootSVG
      .append("g")
      .classed("plot-x-axis-left", true)
      .attr("transform", `translate(0,${this.height})`)
      .call(this.xAxisGeneratorLeft.tickFormat((t) => (t == 0 ? "" : t)));

    this.rootSVG
      .append("g")
      .classed("plot-x-axis-right", true)
      .attr("transform", `translate(0,${this.height})`)
      .call(this.xAxisGeneratorRight.tickFormat((t) => (t == 0 ? "" : t)));

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

  prepareData(data) {
    return data;
  }

  prepareDataInfo(data) {
    return { pctEffect: { max: 10 }, totalPosts: { max: 26238 } };
  }

  updateLabel(activeYear, platform) {
    this.labelGroup.select("#year-label").text(this.activeYear);
    this.labelGroup
      .select("#platform-label")
      .text(this.platform)
      .classed("facebook", this.platform == "Facebook")
      .classed("twitter", this.platform == "Twitter");
  }

  render() {
    this.updateLabel(this.activeYear, this.platform);
    const dataForActiveYear = this.data.filter(
      (d) => d.Year == this.activeYear
    );

    this.totalPlotPoints
      .selectChildren("circle")
      .data(dataForActiveYear)
      .join("circle")
      .transition()
      .duration(300)
      .attr("cx", (d) => this.xScaleTotal(this.xTotalGetter(d)))
      .attr("cy", (d) => this.yScale(this.yTotalGetter(d)))
      .attr("r", this.circleRadius)
      .attr("class", (d) => (d.Party == "R" ? "republican" : "democrat"));

    this.leftPlotPoints
      .selectChildren("circle")
      .data(dataForActiveYear)
      .join("circle")
      .transition()
      .duration(300)
      .attr("cx", (d) => this.xScaleLeft(this.xLeftGetter(d)))
      .attr("cy", (d) => this.yScale(this.yLeftGetter(d)))
      .attr("r", this.circleRadius)
      .attr("class", (d) => (d.Party == "R" ? "republican" : "democrat"));

    this.rightPlotPoints
      .selectChildren("circle")
      .data(dataForActiveYear)
      .join("circle")
      .transition()
      .duration(300)
      .attr("cx", (d) => this.xScaleRight(this.xRightGetter(d)))
      .attr("cy", (d) => this.yScale(this.yRightGetter(d)))
      .attr("r", this.circleRadius)
      .attr("class", (d) => (d.Party == "R" ? "republican" : "democrat"));
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

    let dataForActiveYear = this.data.filter((d) => d.Year == this.activeYear);

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
    console.log(header);
    if (header == this.sortInfo.col) {
      return header + (this.sortInfo.ascending ? "&#8650;" : "&#8648;");
    }
    return header;
  }
}
