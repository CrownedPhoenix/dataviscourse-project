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
    right.append("div").attr("id", "control-panel");
    right.append("div").attr("id", "table-div");

    d3.select("#control-panel")
      .selectChildren("button")
      .data([0, 1])
      .join("button")
      .text((d) => (d == 0 ? "Facebook" : "Twitter"))
      .attr("type", "button")
      .attr("id", (d) => (d == 0 ? "faceboook-tog" : "twitter-tog"))
      .classed("btn btn-primary", true)
      .classed("facebook-btn", (d) => d == 0)
      .classed("twitter-btn", (d) => d == 1);

    this.plotDiv.style("border", "1px solid red");

    this.engagementPlot = new EngagementPlot("plot-div", data);

    this.data = data;
    this.render();
  }

  render() {}
}

class EngagementPlot {
  constructor(mountPoint, data) {
    this.svgFullHeight = 300;
    this.svgFullWidth = 1000;
    this.margin = { top: 10, right: 10, left: 30, bottom: 15 };
    this.height = this.svgFullHeight - this.margin.top - this.margin.bottom;
    this.width = this.svgFullWidth - this.margin.left - this.margin.right;
    this.origin = { x: this.margin.left, y: this.margin.top };

    this.rootDiv = d3.select(`#${mountPoint}`);

    this.rootSVG = this.rootDiv
      .append("svg")
      .attr("height", this.svgFullHeight)
      .attr("width", this.svgFullWidth)
      .style("border", "1px dotted black");

    this.data = this.prepareData(data);
    this.dataInfo = this.prepareDataInfo(data);

    this.preparePlot();
    this.render();
  }

  preparePlot() {
    this.xScaleTotal = d3
      .scaleLinear()
      .domain([0, this.dataInfo.totalPosts.max])
      .range([this.origin.x, this.width / 3]);

    this.xScaleLeft = d3
      .scaleLinear()
      .domain([0, this.dataInfo.totalPosts.max])
      .range([this.width / 3, 2 * (this.width / 3)]);

    this.xScaleRight = d3
      .scaleLinear()
      .domain([0, this.dataInfo.totalPosts.max])
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
  }

  prepareData(data) {}

  prepareDataInfo(data) {
    return { pctEffect: { max: 6 }, totalPosts: { max: 26238 } };
  }

  render() {}
}
