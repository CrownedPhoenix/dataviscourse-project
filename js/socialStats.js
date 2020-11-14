class SocialStats {
  constructor(mountPoint, data) {

    this.rootSVG = d3.select(`#${mountPoint}`).append('svg')
  }
}
