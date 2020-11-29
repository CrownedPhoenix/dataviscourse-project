class SocialStats {
  constructor(mountPoint, data) {
    this.rootDiv = d3.select(`#${mountPoint}`).classed("chartBlue", true);
    this.data = data;

    this.SenatorData = this.mergeDataToSenator();

    this.features = {
      "Number of Active Accounts": { comparator: (a, b) => a - b },
      "Max Total Followers": { comparator: (a, b) => a - b },
      "Total Posts": { comparator: (a, b) => a - b },
      "Average Post Favorites/Reactions": { comparator: (a, b) => a - b },
      "Average Post Retweets/Shares": { comparator: (a, b) => a - b },
      Party: {
        comparator: (a, b) => a.toString().localeCompare(b.toString()),
        secondary: true,
      },
    };

    const that = this;
    this.sortStyles = {
      fb: {
        getComparator(feature) {
          const comp = that.features[feature].comparator;
          return (a, b) =>
            comp(this.getFeature(a, feature), this.getFeature(b, feature));
        },
        getFeature(el, feature) {
          return el["fb"]?.[feature] || 0;
        },
      },
      tw: {
        getComparator(feature) {
          const comp = that.features[feature].comparator;
          return (a, b) =>
            comp(this.getFeature(a, feature), this.getFeature(b, feature));
        },
        getFeature(el, feature) {
          return el["tw"]?.[feature] || 0;
        },
      },
      max: {
        getComparator(feature) {
          const comp = that.features[feature].comparator;
          return (a, b) =>
            comp(this.getFeature(a, feature), this.getFeature(b, feature));
        },
        getFeature(el, feature) {
          const vals = [el["tw"]?.[feature] || 0, el["fb"]?.[feature] || 0];
          const comp = that.features[feature].comparator;
          return vals.reduce((max, el) => {
            return comp(el, max) > 0 ? el : max;
          });
        },
      },
      party: {
        secondary: true,
        getComparator(feature) {
          const { style } = that.sortInfo;
          const sortStyle = that.sortStyles[style];
          const comp = that.features[feature].comparator;
          return (a, b) => {
            const partyComp = this.getFeature(a)
              .toString()
              .localeCompare(this.getFeature(b).toString());
            if (partyComp == 0) {
              return comp(
                sortStyle.getFeature(a, feature),
                sortStyle.getFeature(b, feature)
              );
            }
            return partyComp;
          };
        },
        getFeature(el, feature) {
          return el["fb"]?.["Party"] || el["tw"]?.["Party"];
        },
      },
      // TODO: sum
    };

    this.scale = "sqrt";
    this.curSortStyle = "max";
    this.setSort(this.curSortStyle, "Total Posts");

    this.findMaximums();

    this.makeAggCards();

    this.makeDenseChart();

    this.makeZoomChart();
  }

  setSort(style, feature) {
    const [newFeature, newStyle] = this.sortStyles[style].secondary
      ? [this.sortInfo.feature, this.sortInfo.style] // Don't change on secondary feature
      : [feature, style];

    this.sortInfo = {
      style: newStyle,
      feature: newFeature,
      comparator: this.sortStyles[style].getComparator(newFeature),
    };
  }

  findMaximums() {
    this.maximums = {};
    for (const [feature, info] of Object.entries(this.features)) {
      const sortStyle = this.sortStyles["max"];
      const comp = sortStyle.getComparator(feature);
      const maxElement = this.SenatorData.reduce((max, el) => {
        return comp(el, max) > 0 ? el : max;
      });
      this.maximums[feature] = +sortStyle.getFeature(maxElement, feature);
    }
  }

  mergeDataToSenator() {
    let senatorDict = new Map();
    for (let i = 0; i < this.data.length; i++) {
      let row = this.data[i];
      let bioMarker = row["Bioguide ID"];

      if (senatorDict.has(bioMarker)) {
        //if it already has it in the map
        let curCopy = senatorDict.get(bioMarker);

        if (row["Platform"] === "facebook") {
          curCopy["fb"] = row;
        } else {
          curCopy["tw"] = row;
        }
        senatorDict.set(bioMarker, curCopy);
      } else {
        //if it's a new entry
        if (row["Platform"] === "facebook") {
          senatorDict.set(bioMarker, { fb: this.data[i] });
        } else {
          senatorDict.set(bioMarker, { tw: this.data[i] });
        }
      }
    }

    let senatorArr = [];
    for (const ele of senatorDict) {
      senatorArr.push(ele[1]);
    }

    return senatorArr;
  }

  makeZoomChart() {
    this.zoomRoot = d3.select(`.denseChartZoom`);
    this.denseZoomChartSize = this.zoomRoot.node().getBoundingClientRect();

    //create svg
    this.denseZoomSVG = this.zoomRoot
      .append("svg")
      .attr("width", this.denseZoomChartSize.width)
      .attr("height", this.denseZoomChartSize.height);
    // .classed('bg', true); //uncomment for blue bg

    //make this.denseG
    this.denseGZoom = this.denseZoomSVG
      .selectChildren(".bars")
      .data(this.SenatorData)
      .join("g")
      .classed("bars", true);

    //append x-axis
    this.denseZoomSVG
      .append("line")
      .attr("x1", 0)
      .attr("x2", this.denseZoomChartSize.width)
      .attr("y1", this.denseZoomChartSize.height - 20) // -charSpaceAbove -chartHeightOffset
      .attr("y2", this.denseZoomChartSize.height - 20)
      .attr("stroke-width", 1)
      .attr("stroke", "black");

    this.denseZoomSVG
      .append("line")
      .attr("x1", 0)
      .attr("x2", this.denseZoomChartSize.width)
      .attr("y1", this.denseZoomChartSize.height - 20) // -charSpaceAbove -chartHeightOffset
      .attr("y2", this.denseZoomChartSize.height - 20)
      .attr("stroke-width", 1)
      .attr("stroke", "black");

    this.drawZoomChart(45, this.denseChartSize.width - 10, 8);
  }

  drawZoomChart(offset, chartWdith, zoom) {
    const chartHeightOffset = 10;
    const chartSpaceAbove = 10;
    const chartHeight =
      this.denseZoomChartSize.height - chartHeightOffset - chartSpaceAbove;
    const barChartOffset = 1;
    const zoomPosScale = d3
      .scaleLinear()
      .domain([this.chartStart, chartWdith])
      .range([0, this.denseZoomChartSize.width]);
    const zoomOffset = -zoomPosScale(offset) * zoom;

    this.zoomOffset = offset;
    this.zoomchartWdith = chartWdith;
    this.zoomZoom = zoom;

    let feature = this.sortInfo.feature;
    const max = this.getMax(feature);

    //scale
    let yScale = d3
      .scaleSqrt()
      .domain([0, max])
      .range([chartHeight, chartSpaceAbove]);
    if (this.scale !== "sqrt") {
      yScale = d3
        .scaleLinear()
        .domain([0, max])
        .range([chartHeight, chartSpaceAbove]);
    }

    let denseZoomG = this.denseZoomSVG
      .selectChildren(".bars")
      .data(this.SenatorData)
      .join("g");

    //draw rectangles
    let barWidth =
      (1 / this.SenatorData.length) *
      (zoom * this.denseZoomChartSize.width - (10 + barChartOffset));

    let iter = 0;
    //first
    denseZoomG
      .selectChildren(".first")
      .data((d) => [d])
      .join("rect")
      .attr("x", (d) => iter++ * barWidth + barChartOffset + zoomOffset)
      .attr("y", (d) => yScale(this.getFeature(d, true, feature)[0]))
      .attr("width", barWidth)
      .attr(
        "height",
        (d) => chartHeight - yScale(this.getFeature(d, true, feature)[0])
      )
      .attr("class", (d) => this.getFeature(d, true, feature)[1])
      .classed("first", true);

    //second
    iter = 0;
    denseZoomG
      .selectChildren(".second")
      .data((d) => [d])
      .join("rect")
      .attr("x", (d) => iter++ * barWidth + barChartOffset + zoomOffset)
      .attr("y", (d) => yScale(this.getFeature(d, false, feature)[0]))
      .attr("width", barWidth)
      .attr(
        "height",
        (d) => chartHeight - yScale(this.getFeature(d, false, feature)[0])
      )
      .attr("class", (d) => this.getFeature(d, false, feature)[1])
      .classed("second", true);

    // red or blue footer
    iter = 0;
    denseZoomG
      .selectChildren(".footer")
      .data((d) => [d])
      .join("rect")
      .attr("x", (d) => iter++ * barWidth + barChartOffset + zoomOffset)
      .attr(
        "y",
        this.denseZoomChartSize.height - chartHeightOffset - chartSpaceAbove
      )
      .attr("width", barWidth)
      .attr("height", 4)
      .classed("footer", true)
      .classed("republican", (d) => this.isParty("R", d))
      .classed("democrat", (d) => this.isParty("D", d));
  }

  makeDenseChart() {
    this.denseChartContainer = this.rootDiv
      .append("div")
      .classed("denseChartContainer", true);
    this.denseChartToggleContainer = this.denseChartContainer
      .append("div")
      .classed("denseChartToggle", true);
    this.denseChart = this.denseChartToggleContainer
      .append("div")
      .classed("denseChart", true);
    this.denseChartDataBreakdown = this.denseChartToggleContainer
      .append("div")
      .classed("denseChartDataBreakdown", true);
    this.denseChartZoom = this.denseChartContainer
      .append("div")
      .classed("denseChartZoom", true);

    this.denseChartSize = this.denseChart.node().getBoundingClientRect();

    this.SenatorData.sort(this.sortInfo.comparator);

    //create svg
    this.denseSVG = this.denseChart
      .append("svg")
      .attr("width", this.denseChartSize.width)
      .attr("height", this.denseChartSize.height)
      .classed("bg", true);

    this.chartStart = 45;

    //make this.denseG
    this.denseG = this.denseSVG
      .selectChildren(".bars")
      .data(this.SenatorData)
      .join("g")
      .classed("bars", true);

    //append x-axis
    this.denseSVG
      .append("line")
      .attr("x1", this.chartStart)
      .attr("x2", this.denseChartSize.width - 10)
      .attr("y1", this.denseChartSize.height - 20) // -charSpaceAbove -chartHeightOffset
      .attr("y2", this.denseChartSize.height - 20)
      .attr("stroke-width", 1)
      .attr("stroke", "black");

    const chartWidth = this.denseChartSize.width - 15;

    const brushed = ({ selection }) => {
      let left = selection[0];
      let right = selection[1];
      // this.chartStart
      //this.denseChartSize.width - 10

      let zoom = chartWidth / (right - left);

      // console.log('leftMost:' +JSON.stringify(-(leftMost)));
      this.drawZoomChart(left, chartWidth, zoom);
    };

    this.denseSVG.call(
      d3
        .brushX()
        .extent([
          [this.chartStart, 0],
          [this.denseChartSize.width - 10, this.denseChartSize.height],
        ])
        .on("brush", this.brushed)
    );
    //make brush
    this.denseSVG.call(
      d3
        .brushX()
        .extent([
          [this.chartStart, 0],
          [this.denseChartSize.width - 10, this.denseChartSize.height],
        ])
        .on("brush", brushed)
    );

    //'Number of Active Accounts'
    this.drawDenseChart();
  }

  getMax(feature) {
    return d3.max(
      Array.from(this.SenatorData, (x) => {
        let int1 = x.fb !== undefined ? x.fb[feature] : 0;
        let int2 = x.tw !== undefined ? x.tw[feature] : 0;
        return d3.max([parseInt(int1), parseInt(int2)]);
      })
    );
  }

  drawDenseChart() {
    const chartHeightOffset = 10;
    const chartSpaceAbove = 10;
    const chartHeight =
      this.denseChartSize.height - chartHeightOffset - chartSpaceAbove;
    const barChartOffset = 1;

    //get the max element from the selected feature.
    let feature = this.sortInfo.feature;
    let max = this.maximums[feature];

    //sort
    this.SenatorData.sort(this.sortInfo.comparator);

    //scales
    let tickAmount = 5;
    if (feature === "Number of Active Accounts") {
      tickAmount = 3;
    }

    const yBuffer = +max * 0.1;
    let yScale = d3
      .scaleSqrt()
      .domain([0, max + yBuffer])
      .range([chartHeight, chartSpaceAbove]);

    if (this.scale !== "sqrt") {
      yScale = d3
        .scaleLinear()
        .domain([0, max + yBuffer])
        .range([chartHeight, chartSpaceAbove]);
    }

    let yAxis = d3
      .axisLeft()
      .scale(yScale)
      .tickFormat(d3.format("d"))
      .ticks(tickAmount);

    //Append group and insert axis
    this.denseSVG.selectAll(".axis").remove();
    this.denseSVG
      .append("g")
      .classed("axis", true)
      .attr("transform", "translate(" + this.chartStart + " " + 0 + " )")
      .call(yAxis);

    //draw rectangles
    let barWidth =
      (1 / this.SenatorData.length) *
      (this.denseChartSize.width - (55 + barChartOffset));

    this.denseG = this.denseSVG
      .selectChildren(".bars")
      .data(this.SenatorData)
      .join("g");

    let iter = 0;
    //first
    this.denseG
      .selectChildren(".first")
      .data((d) => [d])
      .join("rect")
      .classed("first", true)
      .transition(d3.transition().duration(500))
      .attr("width", barWidth)
      .attr(
        "height",
        (d) => chartHeight - yScale(this.getFeature(d, true, feature)[0])
      )
      .attr("x", (d) => iter++ * barWidth + this.chartStart + barChartOffset)
      .attr("y", (d) => yScale(this.getFeature(d, true, feature)[0]))
      .style("fill", (d) =>
        this.getFeature(d, true, feature)[1] == "facebook"
          ? "#3b5998"
          : "#00acee"
      );
    //second
    iter = 0;
    this.denseG
      .selectChildren(".second")
      .data((d) => [d])
      .join("rect")
      .classed("second", true)
      .transition(d3.transition().duration(500))
      .attr("width", barWidth)
      .attr(
        "height",
        (d) => chartHeight - yScale(this.getFeature(d, false, feature)[0])
      )
      .attr("x", (d) => iter++ * barWidth + this.chartStart + barChartOffset)
      .attr("y", (d) => yScale(this.getFeature(d, false, feature)[0]))
      .style("fill", (d) =>
        this.getFeature(d, false, feature)[1] == "facebook"
          ? "#3b5998"
          : "#00acee"
      );

    // red or blue footer
    iter = 0;
    this.denseG
      .selectChildren(".footer")
      .data((d) => [d])
      .join("rect")
      .classed("footer", true)
      .attr("x", (d) => iter++ * barWidth + this.chartStart + barChartOffset)
      .attr(
        "y",
        this.denseChartSize.height - chartHeightOffset - chartSpaceAbove
      )
      .attr("width", barWidth)
      .attr("height", 4)
      .transition(d3.transition().duration(500))
      .style("fill", (d) => (this.isParty("R", d) ? "#de0100" : "#1405bd"));
  }

  brushed(selection) {}

  makeAggCards() {
    this.cardContainer = this.rootDiv.append("div").classed("simpleFlex", true);

    //build control panel
    let defaultSortToggle = 1; // 1 is fb
    let defaultScaleToggle = 5;
    let toggles = [
      {
        name: "Party",
        lambda: () => (this.curSortStyle = "party"),
        type: "sort",
      },
      {
        name: "Facebook",
        lambda: () => (this.curSortStyle = "fb"),
        type: "sort",
      },
      {
        name: "Twitter",
        lambda: () => (this.curSortStyle = "tw"),
        type: "sort",
      },
      {
        name: "max",
        lambda: () => (this.curSortStyle = "max"),
        type: "sort",
      },
      {
        name: "Linear Scale",
        lambda: () => (this.scale = "linear"),
        type: "scale",
      },
      {
        name: "Square Root Scale",
        lambda: () => (this.scale = "sqrt"),
        type: "scale",
      },
    ];
    const turnOffToggles = (type, name) => {
      for (let i = 0; i < toggles.length; i++) {
        if (
          toggles[i].type === type &&
          toggles[i].name.replace(/\s/g, "") !== name
        ) {
          d3.select(
            "#" + toggles[i].name.replace(/\s/g, "") + "toggle"
          ).property("checked", false);
        }
      }
    };

    const inputs = this.cardContainer
      .append("div")
      .classed("controlPanel", true)
      .selectChildren("input")
      .data(toggles)
      .join("div")
      .classed("toggleParent", true);

    //build inputs
    inputs
      .selectChildren("*")
      .data((d) => [d])
      .join("input")
      .attr("type", "checkbox")
      .classed("toggle", true)
      .attr("id", (d) => d.name.replace(/\s/g, "") + "toggle")
      .on("change", (event, d) => {
        turnOffToggles(d.type, d.name.replace(/\s/g, ""));
        let id = d.name.replace(/\s/g, "") + "toggle";
        if (d3.select("#" + id).property("checked")) {
          d.lambda();
        } else {
          let defaultToggle =
            d.type === "sort" ? defaultSortToggle : defaultScaleToggle;
          d3.select(
            "#" + toggles[defaultToggle].name.replace(/\s/g, "") + "toggle"
          ).property("checked", true);
          toggles[defaultToggle].lambda();
        }

        //redraw charts
        this.setSort(this.curSortStyle, this.sortInfo.feature);
        this.drawDenseChart();
        this.drawZoomChart(this.zoomOffset, this.zoomchartWdith, this.zoomZoom);
      });

    //set default toggle to true defaultScaleToggle
    d3.select(
      "#" + toggles[defaultSortToggle].name.replace(/\s/g, "") + "toggle"
    ).property("checked", true);
    d3.select(
      "#" + toggles[defaultScaleToggle].name.replace(/\s/g, "") + "toggle"
    ).property("checked", true);

    //build inputs titles
    inputs
      .selectChildren("h5")
      .data((d) => [d])
      .join("h5")
      .text((d) => d.name);

    //build the selectable cards.
    const avgData = this.getAverageDataByParty();
    this.cards = this.cardContainer
      .append("div")
      .classed("cardContainer", true)
      .selectAll(".card")
      .data(avgData)
      .join("div")
      .classed("aggCard", true)
      .on("click", (click, d) => {
        this.sortInfo.feature = d.feature;
        this.setSort(this.curSortStyle, d.feature); // TODO: this.setSort(style, feature)
        this.drawDenseChart();
        this.drawZoomChart(this.zoomOffset, this.zoomchartWdith, this.zoomZoom);
      });

    //append title to cards
    this.cards
      .append("h5")
      .text((d) => d.title)
      .classed("cardTitle", true);

    //append table to cards
    this.table = this.cards
      .append("div")
      .classed("tableContainer", true)
      .html((d) => {
        return (
          `<table>
                        <tr>
                            <th></th>
                            <th>R</th>
                            <th>D</th>
                        </tr>
                        <tr>
                            <th>Facebook</th>
                            <th>` +
          d.fbR +
          `</th>
                            <th>` +
          d.fbD +
          `</th>
                        </tr>
                        <tr>
                            <th>Twitter</th>
                            <th>` +
          d.twR +
          `</th>
                            <th>` +
          d.twD +
          `</th>
                        </tr>
                        <tr>
                            <th>Over All</th>
                            <th>` +
          (d.fbR + d.twR) +
          `</th>
                            <th>` +
          (d.fbD + d.twD) +
          `</th>
                        </tr>
                    </table>`
        );
      });
  }

  getAverageDataByParty() {
    //get aggregates, 0 for Republican, 1 for Dem
    let fbAccounts = [0, 0];
    let twAccounts = [0, 0];
    let fbReactions = [0, 0];
    let twReactions = [0, 0];
    let fbTotalPosts = [0, 0];
    let twTotalPosts = [0, 0];
    let fbAvgShares = [0, 0];
    let twAvgShares = [0, 0];
    let fbAvgRetweet = [0, 0];
    let twAvgRetweet = [0, 0];
    for (let i = 0; i < this.data.length; i++) {
      const row = this.data[i];
      if (row.Platform === "facebook") {
        let poli = 0;
        if (row.Party.includes("D")) {
          poli = 1;
        }
        fbAccounts[poli] += parseInt(row["Number of Active Accounts"]);
        fbReactions[poli] += parseInt(row["Average Post Favorites/Reactions"]);
        fbAvgShares[poli] += parseInt(row["Average Post Retweets/Shares"]);
        fbTotalPosts[poli] += parseInt(row["Total Posts"]);
        fbAvgRetweet[poli] += parseInt(row["Max Total Followers"]);
      } else {
        let poli = 0;
        if (row.Party.includes("D")) {
          poli = 1;
        }
        twAccounts[poli] += parseInt(row["Number of Active Accounts"]);
        twReactions[poli] += parseInt(row["Average Post Favorites/Reactions"]);
        twAvgShares[poli] += parseInt(row["Average Post Retweets/Shares"]);
        twTotalPosts[poli] += parseInt(row["Total Posts"]);
        twAvgRetweet[poli] += parseInt(row["Max Total Followers"]);
      }
    }

    //important that it goes every-other [fb, twitter, fb, twitter....]
    const aggData = [
      fbAccounts,
      twAccounts,
      fbReactions,
      twReactions,
      fbTotalPosts,
      twTotalPosts,
      fbAvgShares,
      twAvgShares,
      fbAvgRetweet,
      twAvgRetweet,
    ];
    const aggDataTitles = [
      "Number of Active Accounts",
      "Average Post Favorites/Reactions",
      "Total Posts",
      "Average Post Retweets/Shares",
      "Max Total Followers",
    ];
    const aggFeatureValues = [
      "Number of Active Accounts",
      "Average Post Favorites/Reactions",
      "Total Posts",
      "Average Post Retweets/Shares",
      "Max Total Followers",
    ];
    let toRet = [];
    for (let i = 0; i < aggDataTitles.length; i++) {
      let posInAD = i * 2;
      toRet.push({
        title: aggDataTitles[i],
        feature: aggFeatureValues[i],
        fbR: aggData[posInAD][0],
        fbD: aggData[posInAD][1],
        twR: aggData[posInAD + 1][0],
        twD: aggData[posInAD + 1][1],
      });
    }
    return toRet;
  }

  getAverageData() {
    //get aggregates
    let fbAccounts = 0;
    let twAccounts = 0;
    let fbReactions = 0;
    let twReactions = 0;
    let fbTotalPosts = 0;
    let twTotalPosts = 0;
    let fbAvgShares = 0;
    let twAvgShares = 0;
    for (let i = 0; i < this.data.length; i++) {
      const row = this.data[i];
      if (row.Platform === "facebook") {
        fbAccounts += parseInt(row["Number of Active Accounts"]);
        fbReactions += parseInt(row["Average Post Favorites/Reactions"]);
        fbAvgShares += parseInt(row["Average Post Retweets/Shares"]);
        fbTotalPosts += parseInt(row["Total Posts"]);
      } else {
        twAccounts += parseInt(row["Number of Active Accounts"]);
        twReactions += parseInt(row["Average Post Favorites/Reactions"]);
        twAvgShares += parseInt(row["Average Post Retweets/Shares"]);
        twTotalPosts += parseInt(row["Total Posts"]);
      }
    }

    //important that it goes every-other [fb, twitter, fb, twitter....]
    const aggData = [
      fbAccounts,
      twAccounts,
      fbReactions,
      twReactions,
      fbTotalPosts,
      twTotalPosts,
      fbAvgShares,
      twAvgShares,
    ];
    const aggDataTitles = [
      "Number of Accounts",
      "Number of Reactions",
      "Number of Total Posts",
      "Average Number of Shares/Reactions",
    ];
    return { aggData: aggData, titles: aggDataTitles };
  }

  isParty(party, d) {
    if (this.containsFB(d)) {
      return d.fb["Party"] === party;
    } else {
      return d.tw["Party"] === party;
    }
  }

  getFeature(d, largest, feature) {
    if (this.containsFB(d) && this.containsTW(d)) {
      if (this.faceBookFeatureBigger(d, feature)) {
        if (largest) {
          return [parseInt(d.fb[feature]), "facebook"];
        } else {
          return [parseInt(d.tw[feature]), "twitter"];
        }
      }
      if (largest) {
        return [parseInt(d.tw[feature]), "twitter"];
      } else {
        return [parseInt(d.fb[feature]), "facebook"];
      }
    } else {
      if (this.containsFB(d)) {
        return [parseInt(d.fb[feature]), "facebook"];
      } else {
        return [parseInt(d.tw[feature]), "twitter"];
      }
    }
  }

  containsFB(d) {
    return d.fb !== undefined;
  }

  containsTW(d) {
    return d.tw !== undefined;
  }

  faceBookFeatureBigger(d, feature) {
    return parseInt(d.fb[feature]) > parseInt(d.tw[feature]);
  }

  //I made this before we decided to do cards.
  makeAggBarChart() {
    let elementWidth = this.rootDiv.node().getBoundingClientRect();

    this.aggSVG = this.rootDiv
      .append("svg")
      .attr("width", elementWidth.width * 0.75)
      .attr("height", 500)
      .classed("bg", true);

    const avgData = this.getAverageData();
    const aggData = avgData.aggData;
    const aggDataTitles = avgData.titles;

    //create scales
    this.Yscale = d3
      .scaleLinear()
      .domain([0, d3.max(aggData)])
      .range([0, 225]); //250 height of chart

    const bottomBarOffset = elementWidth.height - 250;
    //create lines
    this.aggSVG
      .append("line")
      .attr("x1", 5)
      .attr("x2", elementWidth.width - 10)
      .attr("y1", bottomBarOffset)
      .attr("y2", bottomBarOffset)
      .attr("stroke-width", 1)
      .attr("stroke", "black");

    //append charts
    //account number
    const colSpace = 25;
    let nextX = 0;
    this.aggSVG
      .selectChildren("rect")
      .data(aggData)
      .join("rect")
      .attr("x", (d, iter) =>
        iter % 2 === 0 ? (nextX += colSpace * 2) : (nextX += colSpace)
      )
      .attr("y", (d) => bottomBarOffset - this.Yscale(d))
      .attr("width", colSpace - 4)
      .attr("height", (d) => this.Yscale(d))
      .attr("class", (d, iter) => (iter % 2 === 0 ? "facebook" : "twitter"));

    this.aggSVG
      .selectChildren("text")
      .data(aggDataTitles)
      .join("text")
      .text((d) => d)
      .attr("x", (d, iter) => iter * colSpace * 3 + colSpace * 3)
      .attr("y", bottomBarOffset + 10)
      .attr("text-anchor", "end")
      .attr("transform", (d, iter) => {
        const xPos = iter * 3 * colSpace + colSpace * 3;
        return "rotate(-75," + xPos + "," + (bottomBarOffset + 10) + ")";
      });
  }
}
