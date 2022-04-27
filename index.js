require('dotenv').config()
const github = require('./clients/github')
const discord = require('./clients/discord')
const githubWLFile = require('./whitelist/github.json')
const githubRepoWL = require('./whitelist/github_repos.json')
const githubManuallyCollected = require('./manually_collected.json')
const previousIneligibleGithubSubmissions = require('./extra/json/github_ineligible.json')
const discordWLFile = require('./whitelist/discord.json')
const { writeJSONFile, dedupeByProperty, writeCSVFile } = require('./util')

// The time of the last pull for each batch
// const batchCutoffs = [new Date('2022-04-11T23:00:11.440Z')]

const commands = {
  github: async () => {
    const whitelist = Object.keys(githubWLFile)
    const allSubmissions = (
      await github.getIdSubmissions({
        issueIds: [384, 724],
        gistIds: ['64763b68ab4479aa46429c194d476b82'],
      })
    )
      .concat(githubManuallyCollected)
      .concat(previousIneligibleGithubSubmissions)
    const [unique] = dedupeByProperty(allSubmissions, 'userId')
    const ineligible = []
    const invalidEligible = []
    const eligible = unique
      .filter((submission) => {
        const isEligible = whitelist.includes(submission.user)
        if (!isEligible) {
          ineligible.push(submission)
          return false
        }
        if (submission.invalidSubmission) {
          invalidEligible.push(submission)
          return false
        }
        return true
      })
      .map((submission) => ({
        ...submission,
        claimAmount: githubWLFile[submission.user],
      }))
    const idSubmissionUsers = unique.map((user) => user.user)
    const missingEligible = whitelist
      .filter((user) => !idSubmissionUsers.includes(user))
      .map((user) => ({ user }))
    const deleted = await github.removeSubmissions(ineligible)
    const [ineligibleMarkedDeleted] = dedupeByProperty(
      ineligible.concat(deleted),
      'submissionUrl'
    )

    // CSVs
    writeCSVFile('extra/csv/github_eligible_invalid.csv', invalidEligible)
    writeCSVFile('extra/csv/github_ineligible.csv', ineligibleMarkedDeleted)
    writeCSVFile('extra/csv/github_eligible_missing.csv', missingEligible)
    writeCSVFile('extra/csv/github_eligible.csv', eligible)

    // JSONs
    writeJSONFile('extra/json/github_eligible_invalid.json', invalidEligible)
    writeJSONFile('extra/json/github_ineligible.json', ineligibleMarkedDeleted)
    writeJSONFile('extra/json/github_eligible_missing.json', missingEligible)
    writeJSONFile('extra/json/github_eligible.json', eligible)

    // results
    writeCSVFile('results/csv/github.csv', unique)
    writeJSONFile('results/json/github.json', unique)

    console.log(
      `Collected ${allSubmissions.length} submissions from GitHub, filtered down to ${unique.length} unique users, and found ${eligible.length} eligible. Unique submissions saved in the results directory.`
    )
  },
  discord: async () => {
    const whitelist = discordWLFile.map((user) => user.userID)
    const idSubmissions = await discord.getIdSubmissions()
    const [unique] = dedupeByProperty(idSubmissions, 'userId')
    const invalidEligible = []
    const ineligible = []
    const uniqueWithNames = unique.map((submission) => ({
      user:
        discordWLFile.find((user) => user.userID === submission.userId)?.user ||
        '',
      ...submission,
    }))
    const eligible = uniqueWithNames
      .filter((submission) => {
        const isEligible = whitelist.includes(submission.userId)
        if (!isEligible) {
          ineligible.push(submission)
          return false
        }
        if (submission.invalidSubmission) {
          invalidEligible.push(submission)
          return false
        }
        return true
      })
      .map((submission) => ({
        ...submission,
        claimAmount: discordWLFile.find(
          (user) => user.userID === submission.userId
        )?.tokens,
      }))
    const idSubmissionUsers = unique.map((user) => user.userId)
    const missingEligible = whitelist
      .filter((user) => !idSubmissionUsers.includes(user))
      .map((userId) => ({
        userId,
        user: discordWLFile.find((user) => user.userID === userId).user,
      }))

    // CSVs
    writeCSVFile('extra/csv/discord_eligible_invalid.csv', invalidEligible)
    writeCSVFile('extra/csv/discord_ineligible.csv', ineligible)
    writeCSVFile('extra/csv/discord_eligible_missing.csv', missingEligible)
    writeCSVFile('extra/csv/discord_eligible.csv', eligible)

    // JSONs
    writeJSONFile('extra/json/discord_eligible_invalid.json', invalidEligible)
    writeJSONFile('extra/json/discord_ineligible.json', ineligible)
    writeJSONFile('extra/json/discord_eligible_missing.json', missingEligible)
    writeJSONFile('extra/json/discord_eligible.json', eligible)

    // results
    writeCSVFile('results/csv/discord.csv', uniqueWithNames)
    writeJSONFile('results/json/discord.json', uniqueWithNames)
    console.log(
      `Collected ${idSubmissions.length} submissions from Discord, filtered down to ${uniqueWithNames.length} unique users, and found ${eligible.length} eligible. Unique submissions saved in the results directory.`
    )
  },
  githubContributors: async () => {
    const contributors = await github.getContributors(githubRepoWL)
    writeJSONFile('whitelist/github_contributors.json', contributors)
  },
  updateClaimAmounts: () => {
    const discordEligible = require('./extra/json/discord_eligible.json')
    const discordWithClaimAmount = discordEligible.map((submission) => ({
      ...submission,
      claimAmount: discordWLFile.find(
        (user) => user.userID === submission.userId
      )?.tokens,
    }))
    writeJSONFile('./extra/json/discord_eligible.json', discordWithClaimAmount)
    writeCSVFile('./extra/csv/discord_eligible.csv', discordWithClaimAmount)

    const githubEligible = require('./extra/json/github_eligible.json')
    const githubWithClaimAmount = githubEligible.map((submission) => ({
      ...submission,
      claimAmount: githubWLFile[submission.user],
    }))
    writeJSONFile('./extra/json/github_eligible.json', githubWithClaimAmount)
    writeCSVFile('./extra/csv/github_eligible.csv', githubWithClaimAmount)
  },
  test: github.getStrayIssueSubmissions,
}

process.argv.slice(2).map((command) => commands[command]())
console.log(new Date())
