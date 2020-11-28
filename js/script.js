loadData("/data/termsParty.csv").then((data) => {
  console.log(data);

  const mountPoint = "partyTopTerms";
  const partyTopTerms = new PartyTopTerms(mountPoint, data);
});

loadData("/data/termsEngagement.csv").then((data) => {
  console.log(data);

  const mountPoint = "engagementTerms";
  // const engagementTerms = new EngagementTerms(mountPoint, data);
});

loadData("/data/socialStats.csv").then((data) => {
  console.log(data);

  const mountPoint = "socialStats";
  const socialStats = new SocialStats(mountPoint, data);
});

// TODO: Add any inter-com callbacks

async function loadData(file) {
  return await d3.csv(file);
}
