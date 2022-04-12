const discordJSON = require("../extra/json/discord_eligible.json");
const githubJSON = require("../extra/json/github_eligible.json");
const fs = require("fs");

// a mapping from the amountPerRedemption to the associated PrivateAirdrop contract address
const githubAmountToAddress = {
  // github
  "613.8986657935664": "0x5ae69B714859A3C15281e0a227D9B8C82F03b966",
  "409.2657771957109": "0x63A2548f0a3795a35Ff62121E5f8C24Ada9831F8",
  "204.63288859785547": "0x72D3acDAd21dF959DB2C112A0a5982d03759a154",
};
const githubAddressToAmount = swapKeysAndValues(githubAmountToAddress);
console.log('githubAddressToAmount', githubAddressToAmount);

const discordAmountToAddress = {
  // discord
//   "817.2605426610004": "0x508071cEEf3d24D94b6783c0808fe1A417DDa485",
//   "408.6302713305002": "0x805bb52e4D9795B44C1ecd191Bd31F1D4a9C2dA5",
//   "204.3151356652501": "0xb7726ee8d589fd3e74C0369aB8F08D5d847bC86A",
  "818.5315543914218": "0x508071cEEf3d24D94b6783c0808fe1A417DDa485",
  "409.2657771957109": "0x805bb52e4D9795B44C1ecd191Bd31F1D4a9C2dA5",
  "204.63288859785544": "0xb7726ee8d589fd3e74C0369aB8F08D5d847bC86A"
};
const discordAddressToAmount = swapKeysAndValues(discordAmountToAddress);
console.log('discordAddressToAmount', discordAddressToAmount);

const contractAddresses = [
  "0x5ae69B714859A3C15281e0a227D9B8C82F03b966",
  "0x63A2548f0a3795a35Ff62121E5f8C24Ada9831F8",
  "0x72d3acdad21df959db2c112a0a5982d03759a154",
  "0x508071cEEf3d24D94b6783c0808fe1A417DDa485",
  "0x805bb52e4D9795B44C1ecd191Bd31F1D4a9C2dA5",
  "0xb7726ee8d589fd3e74C0369aB8F08D5d847bC86A"
];

function createPublicIdsCSV() {
  const publicIdsByAddress = {};

  // calculate all the elfi that's claimable from the jsons
  let result = BigInt("0");
  discordJSON.forEach(({claimAmount, publicId }) => {
    const [mantissa, decimal] = claimAmount.split('.');
    const bn = BigInt(mantissa + decimal.padEnd(18, '0'))
    result = result + bn;
  });

  githubJSON.forEach(({claimAmount, publicId }) => {
    const [mantissa, decimal] = claimAmount.split('.');
    const bn = BigInt(mantissa + decimal.padEnd(18, '0'))
    result = result + bn;
  });
  console.log(result);
  const claimableElfi = result.toString();
  console.log('claimableElfi', `${claimableElfi.slice(0, claimableElfi.length - 18)}.${claimableElfi.slice(-18)}`);

  // populate publicIdsByAddress
  contractAddresses.forEach(address => {

    const publicIds = [];

    discordJSON.forEach(({claimAmount, publicId }) => {
      if (discordAmountToAddress[claimAmount] === address) {
        publicIds.push(publicId);
      }
    });

    githubJSON.forEach(({claimAmount, publicId }) => {
      if (githubAmountToAddress[claimAmount] === address) {
        publicIds.push(publicId);
      }
    });

    publicIdsByAddress[address] = publicIds;
  });


  // compare elligible to public id lists, should be same length
  const numAllEligible = discordJSON.length + githubJSON.length;
  console.log('numAllEligible', numAllEligible);

  let numPublicIds = 0;
  contractAddresses.forEach(address => {
    numPublicIds += publicIdsByAddress[address].length;
  });
  console.log('numPublicIds', numPublicIds);

  // display some info about each public id list
  contractAddresses.forEach(address => {
    const numPublicIds = publicIdsByAddress[address].length;
    const amount = githubAddressToAmount[address] || discordAddressToAmount[address];
    console.log(`contract ${address} is giving ${String(amount)} to `, numPublicIds, ' people');
  });

  contractAddresses.forEach(address => {
    const publicIds = publicIdsByAddress[address].join(',');
    fs.writeFileSync(`./results/csv/publicIds_${address}.csv`, publicIds, { flag: 'w'});
  });
}

createPublicIdsCSV();

function swapKeysAndValues(obj) {
  const swapped = Object.entries(obj).map(
    ([key, value]) => [String(value), String(key)]
  );

  return Object.fromEntries(swapped);
}