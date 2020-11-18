class SocialStats {
    constructor(mountPoint, data) {

        this.rootDiv = d3.select(`#${mountPoint}`).classed('chartBlue', true);
        this.data = data;
        this.buttons = this.rootDiv.append('div')
            .classed('platformButtonContainer', true);
        this.makeAggBarChart()


    }

    makeAggBarChart() {
        let elementWidth = this.rootDiv.node().getBoundingClientRect();

        this.aggSVG = this.rootDiv.append('svg')
            .attr('width', elementWidth.width * .75)
            .attr('height', 500)
            .classed('bg', true);

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
        const aggDataTitles = ['number of accounts', 'number of reactions', 'number of total posts', 'average number of shares/reactions']
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
            .attr('x', (d, iter) => (iter * colSpace*3) + colSpace*3)
            .attr('y', bottomBarOffset+10)
            .attr('text-anchor', 'end')
            .attr('transform', (d, iter) => {
                const xPos = (iter * 3*colSpace) + colSpace*3;
              return 'rotate(-75,'+xPos+',' + (bottomBarOffset+10)+')'
            })
    }

}
