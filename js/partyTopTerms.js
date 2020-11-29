class PartyTopTerms {
  //sort by alphabet
  //posNegRatio
  //Rep proportion
  //Dem proportion

  constructor(mountPoint, data) {
    this.data = data;
    this.mountPoint = d3.select(`#${mountPoint}`);

    //make the nav
    this.nav = this.mountPoint.append("div").classed("nav", true);

    this.lastSort = "";
    this.nav
      .append("button")
      .html(
        "alphabetical <span id=\"topTermsArrow\" style='font-size:17px;'>&#8648;</span>"
      )
      .classed("topTermsNavButton", true)
      .on("click", () => {
        if (this.lastSort === "topTermsNavButton") {
          this.data.reverse();
          d3.select("#topTermsArrow").html(
            "<span id=\"topTermsArrow\" style='font-size:17px;'>&#8648;</span>"
          );
          this.lastSort = "";
        } else {
          this.setAllArrowsUp();
          d3.select("#topTermsArrow").html(
            "<span id=\"topTermsArrow\" style='font-size:17px;'>&#8650;</span>"
          );
          this.lastSort = "topTermsNavButton";
          this.data.sort((a, b) => {
            return a.Term.localeCompare(b.Term);
          });
        }

        this.drawColumns();
      });
    this.nav
      .append("button")
      .html(
        "posNegRatio <span id=\"posNegArrow\" style='font-size:17px;'>&#8648;</span>"
      )
      .classed("topTermsNavButton", true)
      .on("click", () => {
        if (this.lastSort === "posNegRatioButton") {
          this.data.reverse();
          d3.select("#posNegArrow").html(
            "<span id=\"posNegArrow\" style='font-size:17px;'>&#8648;</span>"
          );
          this.lastSort = "";
        } else {
          this.setAllArrowsUp();
          d3.select("#posNegArrow").html(
            "<span id=\"posNegArrow\" style='font-size:17px;'>&#8650;</span>"
          );
          this.lastSort = "posNegRatioButton";
          this.data.sort((a, b) => {
            return (
              parseFloat(a["Positive-to-Negative Ratio"]) -
              parseFloat(b["Positive-to-Negative Ratio"])
            );
          });
        }

        this.drawColumns();
      });
    this.nav
      .append("button")
      .html(
        "Rep proportion <span id=\"repPortionArrow\"  style='font-size:17px;'>&#8648;</span>"
      )
      .classed("topTermsNavButton", true)
      .on("click", () => {
        if (this.lastSort === "repPortionButton") {
          this.data.reverse();
          d3.select("#repPortionArrow").html(
            "<span id=\"repPortionArrow\" style='font-size:17px;'>&#8648;</span>"
          );
          this.lastSort = "";
        } else {
          this.setAllArrowsUp();
          d3.select("#repPortionArrow").html(
            "<span id=\"repPortionArrow\" style='font-size:17px;'>&#8650;</span>"
          );
          this.lastSort = "repPortionButton";
          this.data.sort((a, b) => {
            const alpha = parseFloat(this.getPartyProportion(a, "R"));
            const beta = parseFloat(this.getPartyProportion(b, "R"));
            return alpha - beta;
          });
        }

        this.drawColumns();
      });
    this.nav
      .append("button")
      .html(
        "Dem proportion <span id=\"demPortionArrow\" style='font-size:17px;'>&#8648;</span>"
      )
      .classed("topTermsNavButton", true)
      .on("click", () => {
        if (this.lastSort === "demPortionButton") {
          this.data.reverse();
          d3.select("#demPortionArrow").html(
            "<span id=\"demPortionArrow\" style='font-size:17px;'>&#8648;</span>"
          );
          this.lastSort = "";
        } else {
          this.setAllArrowsUp();
          d3.select("#demPortionArrow").html(
            "<span id=\"demPortionArrow\" style='font-size:17px;'>&#8650;</span>"
          );
          this.lastSort = "demPortionButton";
          this.data.sort((a, b) => {
            const alpha = parseFloat(this.getPartyProportion(a, "B"));
            const beta = parseFloat(this.getPartyProportion(b, "B"));
            return alpha - beta;
          });
        }

        this.drawColumns();
      });

    //Make the svg
    const rowSpacing = 25;
    const rowOffset = 15;
    const colSpacing = 350;
    const colOffset = 15;
    const columnSize = 10;

    this.width = (data.length / columnSize) * colSpacing;
    this.height = 250;
    this.rootSVG = this.mountPoint
      .append("div")
      .classed("topTermsParent", true)
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .classed("bg", true);

    this.divider = this.rootSVG
      .selectChildren("rect")
      .data([
        0,
        0.00125,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
      ])
      .join("rect")
      .attr("x", (d) =>
        d === 0 ? d * colSpacing : d * colSpacing + colOffset - 2
      )
      .attr("y", 0)
      .attr("width", colSpacing - 4)
      .attr("height", this.height)
      .attr("fill", "#dce6f5");

    this.gEle = this.rootSVG
      .selectChildren("g")
      .data(this.data)
      .join("g")
      .attr(
        "transform",
        (d, i) =>
          "translate(" +
          (this.columnPosition(i, columnSize) * colSpacing + colOffset) +
          ", " +
          ((i % columnSize) * rowSpacing + rowOffset) +
          ")"
      );

    this.drawColumns();
  }

  drawColumns() {
    this.gEle = this.rootSVG.selectChildren("g").data(this.data).join("g");
    //draw text element
    this.gEle
      .selectChildren(".text")
      .data((d) => [d])
      .join("text")
      .text((d) => d.Term)
      .classed("text", true);

    const startingSpot = 146;
    const maxBarLength = 100;
    const middleGround = startingSpot + maxBarLength;

    //draw republican rect
    this.gEle
      .selectChildren(".rectRep")
      .data((d) => [d])
      .join("rect")
      .attr("x", startingSpot + maxBarLength)
      .attr("y", -8)
      .attr("width", (d) =>
        d.Party === "R"
          ? maxBarLength * d["Proportion of Party"]
          : maxBarLength * d["Proportion of Other Party"]
      )
      .attr("height", 10)
      .classed("republican", true)
      .classed("rectRep", true);

    //draw dem rect
    this.gEle
      .selectChildren(".rectDem")
      .data((d) => [d])
      .join("rect")
      .attr("x", (d) =>
        d.Party === "D"
          ? middleGround - maxBarLength * d["Proportion of Party"]
          : middleGround - maxBarLength * d["Proportion of Other Party"]
      )
      .attr("y", -8)
      .attr("height", 10)
      .attr("width", (d) =>
        d.Party === "D"
          ? maxBarLength * d["Proportion of Party"]
          : maxBarLength * d["Proportion of Other Party"]
      )
      .classed("democrat", true)
      .classed("rectDem", true);
  }

  //returns the column position by dividing and then casting to an int.
  columnPosition(pos, columnSize) {
    return (pos / columnSize) | 0;
  }

  getPartyProportion(d, PartyLetter) {
    return d.Party === PartyLetter
      ? d["Proportion of Party"]
      : d["Proportion of Other Party"];
  }

  setAllArrowsUp() {
    d3.select("#repPortionArrow").html(
      "<span id=\"demPortionArrow\" style='font-size:17px;'>&#8648;</span>"
    );
    d3.select("#demPortionArrow").html(
      "<span id=\"demPortionArrow\" style='font-size:17px;'>&#8648;</span>"
    );
    d3.select("#topTermsArrow").html(
      "<span id=\"topTermsArrow\" style='font-size:17px;'>&#8648;</span>"
    );
    d3.select("#posNegArrow").html(
      "<span id=\"posNegArrow\" style='font-size:17px;'>&#8648;</span>"
    );
  }
}
