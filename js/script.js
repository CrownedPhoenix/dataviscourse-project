loadData("https://github.com/CrownedPhoenix/dataviscourse-project/blob/all-three/data/termsParty.csv").then((data) => {
  console.log(data);

  const mountPoint = "partyTopTerms";
  const partyTopTerms = new PartyTopTerms(mountPoint, data);
});

loadData("https://github.com/CrownedPhoenix/dataviscourse-project/blob/all-three/data/termsEngagement.csv").then((data) => {
  console.log(data);

  const mountPoint = "engagementTerms";
  const engagementTerms = new EngagementTerms(mountPoint, data);
});

loadData("https://github.com/CrownedPhoenix/dataviscourse-project/blob/all-three/data/Bioguide%20IDs.csv").then((bID) => {
  loadData("https://github.com/CrownedPhoenix/dataviscourse-project/blob/all-three/data/socialStats.csv").then((data) => {
    bioMap = bID.reduce((map, el) => {
      map[el.ID] = el.Name;
      return map;
    }, {});
    const mergedData = data.map((el) => {
      el["Name"] = bioMap[el["Bioguide ID"]];
      return el;
    });
    console.log(mergedData);

    const mountPoint = "socialStats";
    const socialStats = new SocialStats(mountPoint, mergedData);
  });
});

// TODO: Add any inter-com callbacks

async function loadData(file) {
  return await d3.csv(file);
}
