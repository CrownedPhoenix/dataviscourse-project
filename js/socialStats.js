class SocialStats {
    constructor(mountPoint, data) {

        this.rootDiv = d3.select(`#${mountPoint}`).classed('chartBlue', true);
        this.data = data;

        this.SenatorData = this.mergeDataToSenator();

        this.makeAggCards();

        this.makeDenseChart();

    }

    mergeDataToSenator() {
        let senatorDict = new Map();
        for (let i = 0; i < this.data.length; i++) {
            let row = this.data[i];
            let bioMarker = row['Bioguide ID'];

            if (senatorDict.has(bioMarker)) {
                //if it already has it in the map
                let curCopy = senatorDict.get(bioMarker);

                if (row['Platform'] === 'facebook') {
                    curCopy['fb'] = row
                } else {
                    curCopy['tw'] = row
                }
                senatorDict.set(bioMarker, curCopy)
            } else {
                //if it's a new entry
                if (row['Platform'] === 'facebook') {
                    senatorDict.set(bioMarker, {'fb': this.data[i]})
                } else {
                    senatorDict.set(bioMarker, {'tw': this.data[i]})

                }
            }
        }
        return senatorDict;

    }

    makeDenseChart() {
        this.denseChartContainer = this.rootDiv.append('div').classed('denseChartContainer', true);
        this.denseChartToggleContainer = this.denseChartContainer.append('div').classed('denseChartToggle', true);
        this.denseChart = this.denseChartToggleContainer.append('div').classed('denseChart', true);
        this.denseChartDataBreakdown = this.denseChartToggleContainer.append('div').classed('denseChartDataBreakdown', true);
        this.denseChartZoom = this.denseChartContainer.append('div').classed('denseChartZoom', true);

        const denseChartSize = this.denseChart.node().getBoundingClientRect();

        //'Number of Active Accounts'
        this.drawDenseChart('Average Post Favorites/Reactions', denseChartSize.height, denseChartSize.width)
    }

    drawDenseChart(feature, height, elementWidth) {
        const chartHeightOffset = 10;
        const chartSpaceAbove = 10;
        const chartHeight = (height - chartHeightOffset) - chartSpaceAbove;
        const chartStart = 45;

        //get the max element from the selected feature.
        let max = d3.max(Array.from(this.SenatorData, x => {
            let int1 = x[1].fb !== undefined ? x[1].fb[feature] : 0;
            let int2 = x[1].tw !== undefined ? x[1].tw[feature] : 0;
            return d3.max([parseInt(int1), parseInt(int2)])
        }));


        //create svg
        this.denseSVG = this.denseChart.append('svg')
            .attr('width', elementWidth)
            .attr('height', height)
            .classed('bg', true);

        //append axis
        this.denseSVG.append('line')
            .attr('x1', chartStart)
            .attr('x2', elementWidth - 10)
            .attr('y1', chartHeight)
            .attr('y2', chartHeight)
            .attr('stroke-width', 1)
            .attr('stroke', 'black');

        let tickAmount = 5;
        if (feature === 'Number of Active Accounts') {
            tickAmount = 3;
        }

        let yScale = d3.scaleSqrt()
            .domain([0, max])
            .range([0, chartHeight - chartSpaceAbove]);

        let yAxis = d3.axisLeft()
            .scale(yScale)
            .tickFormat(d3.format("d"));

        //Append group and insert axis
        this.denseSVG.append("g")
            .attr('transform', 'translate(' + chartStart + ' ' + chartSpaceAbove + ' )')
            .call(yAxis);

        //draw rectangles
        let barWidth = 1 / this.SenatorData.size * (elementWidth - 30);
        this.denseG = this.denseSVG.selectChildren('g')
            .data(this.SenatorData)
            .join('g');

        let iter = 0;
        //first
        this.denseG.selectChildren('.first').data(d => [d]).join('rect')
            .attr('x', d => iter++ * barWidth + chartStart)
            .attr('y', d => {

                return chartHeight - yScale(this.getFeature(d, true, feature)[0])
            })
            .attr('width', barWidth)
            .attr('height', d => yScale(this.getFeature(d, true, feature)[0]))
            .attr('class', d => this.getFeature(d, true, feature)[1])
            .classed('first', true);

        iter = 0;
        //second
        this.denseG.selectChildren('.second').data(d => [d]).join('rect')
            .attr('x',  d => iter++ * barWidth + chartStart)
            .attr('y', d  => {
                let scl = yScale(this.getFeature(d, false, feature)[0])
                return chartHeight - scl
            })
            .attr('width', barWidth)
            .attr('height', d => yScale(this.getFeature(d, false, feature)[0]))
            .attr('class', d => this.getFeature(d, false, feature)[1])
            .classed('second', true);

    }

    makeAggCards() {
        this.cardContainer = this.rootDiv.append('div').classed('cardContainer', true);

        const avgData = this.getAverageDataByParty();


        this.cards = this.cardContainer.selectAll('.card').data(avgData)
            .join('div')
            .classed('aggCard', true);

        //append title
        this.cards.append('h3')
            .text(d => d.title)
            .classed('cardTitle', true);

        //append table
        this.table = this.cards.append('div').html(d => {

            return `<table>
                        <tr>
                            <th></th>
                            <th>R</th>
                            <th>D</th>
                        </tr>
                        <tr>
                            <th>Facebook</th>
                            <th>` + d.fbR + `</th>
                            <th>` + d.fbD + `</th>
                        </tr>
                        <tr>
                            <th>Twitter</th>
                            <th>` + d.twR + `</th>
                            <th>` + d.twD + `</th>
                        </tr>
                        <tr>
                            <th>Over All</th>
                            <th>` + (d.fbR + d.twR) + `</th>
                            <th>` + (d.fbD + d.twD) + `</th>
                        </tr>
                    </table>`


        })


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
        for (let i = 0; i < this.data.length; i++) {
            const row = this.data[i];
            if (row.Platform === 'facebook') {
                let poli = 0;
                if (row.Party.includes('D')) {
                    poli = 1;
                }
                fbAccounts[poli] += parseInt(row['Number of Active Accounts']);
                fbReactions[poli] += parseInt(row['Average Post Favorites/Reactions']);
                fbAvgShares[poli] += parseInt(row['Average Post Retweets/Shares']);
                fbTotalPosts[poli] += parseInt(row['Total Posts']);
            } else {
                let poli = 0;
                if (row.Party.includes('D')) {
                    poli = 1;
                }
                twAccounts[poli] += parseInt(row['Number of Active Accounts']);
                twReactions[poli] += parseInt(row['Average Post Favorites/Reactions']);
                twAvgShares[poli] += parseInt(row['Average Post Retweets/Shares']);
                twTotalPosts[poli] += parseInt(row['Total Posts']);
            }
        }

        //important that it goes every-other [fb, twitter, fb, twitter....]
        const aggData = [fbAccounts, twAccounts, fbReactions, twReactions, fbTotalPosts, twTotalPosts, fbAvgShares, twAvgShares];
        const aggDataTitles = ['Number of Accounts', 'Number of Reactions', 'Number of Total Posts', 'Average Number of Shares/Reactions'];
        let toRet = [];
        for (let i = 0; i < aggDataTitles.length; i++) {
            let posInAD = i * 2
            toRet.push({
                'title': aggDataTitles[i],
                'fbR': aggData[posInAD][0],
                'fbD': aggData[posInAD][1],
                'twR': aggData[posInAD + 1][0],
                'twD': aggData[posInAD + 1][1]
            })
        }
        return toRet
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
            if (row.Platform === 'facebook') {
                fbAccounts += parseInt(row['Number of Active Accounts']);
                fbReactions += parseInt(row['Average Post Favorites/Reactions']);
                fbAvgShares += parseInt(row['Average Post Retweets/Shares']);
                fbTotalPosts += parseInt(row['Total Posts']);
            } else {
                twAccounts += parseInt(row['Number of Active Accounts']);
                twReactions += parseInt(row['Average Post Favorites/Reactions']);
                twAvgShares += parseInt(row['Average Post Retweets/Shares']);
                twTotalPosts += parseInt(row['Total Posts']);
            }
        }

        //important that it goes every-other [fb, twitter, fb, twitter....]
        const aggData = [fbAccounts, twAccounts, fbReactions, twReactions, fbTotalPosts, twTotalPosts, fbAvgShares, twAvgShares];
        const aggDataTitles = ['Number of Accounts', 'Number of Reactions', 'Number of Total Posts', 'Average Number of Shares/Reactions'];
        return {"aggData": aggData, "titles": aggDataTitles}
    }

    getFeature(d, largest, feature){
        if (this.containsFB(d) && this.containsTW(d)) {
            if (this.faceBookFeatureBigger(d, feature)) {
                if(largest){
                    return [parseInt(d[1].fb[feature]), 'facebook']
                } else {
                    return  [parseInt(d[1].tw[feature]), 'twitter']
                }
            }
            if(largest){
                return  [parseInt(d[1].tw[feature]), 'twitter']
            } else {
                return  [parseInt(d[1].fb[feature]), 'facebook']
            }
        } else {
            if (this.containsFB(d)) {
                return  [parseInt(d[1].fb[feature]), 'facebook']
            } else {
                return  [parseInt(d[1].tw[feature]), 'twitter']
            }
        }
    }

    containsFB(d) {
        return d[1].fb !== undefined
    }

    containsTW(d) {
        return d[1].tw !== undefined
    }

    faceBookFeatureBigger(d, feature) {
        return d[1].fb[feature] > d[1].tw[feature]
    }

    //I made this before we decided to do cards.
    makeAggBarChart() {
        let elementWidth = this.rootDiv.node().getBoundingClientRect();

        this.aggSVG = this.rootDiv.append('svg')
            .attr('width', elementWidth.width * .75)
            .attr('height', 500)
            .classed('bg', true);

        const avgData = this.getAverageData();
        const aggData = avgData.aggData;
        const aggDataTitles = avgData.titles;

        //create scales
        this.Yscale = d3.scaleLinear()
            .domain([0, d3.max(aggData)])
            .range([0, 225]); //250 height of chart


        const bottomBarOffset = elementWidth.height - 250;
        //create lines
        this.aggSVG.append('line')
            .attr('x1', 5)
            .attr('x2', elementWidth.width - 10)
            .attr('y1', bottomBarOffset)
            .attr('y2', bottomBarOffset)
            .attr('stroke-width', 1)
            .attr('stroke', 'black');

        //append charts
        //account number
        const colSpace = 25;
        let nextX = 0;
        this.aggSVG.selectChildren('rect').data(aggData)
            .join('rect')
            .attr('x', (d, iter) => iter % 2 === 0 ? nextX += (colSpace * 2) : nextX += colSpace)
            .attr('y', d => bottomBarOffset - this.Yscale(d))
            .attr('width', colSpace - 4)
            .attr('height', d => this.Yscale(d))
            .attr('class', (d, iter) => iter % 2 === 0 ? 'facebook' : 'twitter');

        this.aggSVG.selectChildren('text').data(aggDataTitles)
            .join('text')
            .text(d => d)
            .attr('x', (d, iter) => (iter * colSpace * 3) + colSpace * 3)
            .attr('y', bottomBarOffset + 10)
            .attr('text-anchor', 'end')
            .attr('transform', (d, iter) => {
                const xPos = (iter * 3 * colSpace) + colSpace * 3;
                return 'rotate(-75,' + xPos + ',' + (bottomBarOffset + 10) + ')'
            })
    }
}
