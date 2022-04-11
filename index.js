require('dotenv').config()
const github = require('./clients/github')
const discord = require('./clients/discord')
const githubWL = require('./whitelist/github.json')
const githubRepoWL = require('./whitelist/github_repos.json')
const discordWL = require('./whitelist/discord.json')
const { writeJSONFile, dedupeByProperty, writeCSVFile } = require('./util')

const githubCommand = async () => {
  const whitelist = Object.keys(githubWL)
  const allSubmissions = await github.getIdSubmissions({
    issueIds: [384, 724],
    gistIds: ['64763b68ab4479aa46429c194d476b82'],
  })
  const [unique, dupes] = dedupeByProperty(allSubmissions, 'userId')
  const invalidSubmissions = []
  const ineligibleUsers = []
  const eligible = unique
    .filter((submission) => {
      if (submission.invalidSubmission) {
        invalidSubmissions.push({
          isEligible: whitelist.includes(submission.user),
          ...submission,
        })
        return false
      }
      return true
    })
    .filter((submission) => {
      const isEligible = whitelist.includes(submission.user)
      if (!isEligible) {
        ineligibleUsers.push(submission)
      }
      return isEligible
    })
  const idSubmissionUsers = unique.map((user) => user.user)
  const missingEligible = whitelist
    .filter((user) => !idSubmissionUsers.includes(user))
    .map((user) => ({ user }))

  // CSVs
  writeCSVFile('extra/csv/github_invalid.csv', invalidSubmissions)
  writeCSVFile('extra/csv/github_ineligible.csv', ineligibleUsers)
  writeCSVFile('extra/csv/github_eligible_missing.csv', missingEligible)
  writeCSVFile('extra/csv/github_eligible.csv', eligible)

  // JSONs
  writeJSONFile('extra/json/github_dupes.json', dupes)
  writeJSONFile('extra/json/github_invalid.json', invalidSubmissions)
  writeJSONFile('extra/json/github_ineligible.json', ineligibleUsers)
  writeJSONFile('extra/json/github_eligible_missing.json', missingEligible)
  writeJSONFile('extra/json/github_eligible.json', eligible)

  // results
  writeCSVFile('results/csv/github.csv', unique)
  writeJSONFile('results/json/github.json', unique)
  // github.clearIneligibleSubmissions(ineligibleUsers)
  console.log(
    `Collected ${allSubmissions.length} submissions from GitHub, filtered down to ${unique.length} unique users, and found ${eligible.length} eligible. Unique submissions in the results directory.`
  )
}

const commands = {
  autoGithub: async () => {
    setInterval(() => {
      githubCommand()
    }, 600000)
  },
  github: githubCommand,
  discord: async () => {
    const whitelist = discordWL.map((user) => user.userID)
    const idSubmissions = await discord.getIdSubmissions()
    const [unique, dupes] = dedupeByProperty(idSubmissions, 'userId')
    const invalidSubmissions = []
    const ineligibleUsers = []
    const uniqueWithNames = unique.map((submission) => ({
      user:
        discordWL.find((user) => user.userID === submission.userId)?.user || '',
      ...submission,
    }))
    const eligible = uniqueWithNames
      .filter((submission) => {
        if (submission.invalidSubmission) {
          invalidSubmissions.push({
            isEligible: whitelist.includes(submission.userId),
            ...submission,
          })
          return false
        }
        return true
      })
      .filter((submission) => {
        const isEligible = whitelist.includes(submission.userId)
        if (!isEligible) {
          ineligibleUsers.push(submission)
        }
        return isEligible
      })
    const idSubmissionUsers = unique.map((user) => user.userId)
    const missingEligible = whitelist
      .filter((user) => !idSubmissionUsers.includes(user))
      .map((userId) => ({
        userId,
        user: discordWL.find((user) => user.userID === userId).user,
      }))

    // CSVs
    writeCSVFile('extra/csv/discord_invalid.csv', invalidSubmissions)
    writeCSVFile('extra/csv/discord_ineligible.csv', ineligibleUsers)
    writeCSVFile('extra/csv/discord_eligible_missing.csv', missingEligible)
    writeCSVFile('extra/csv/discord_eligible.csv', eligible)

    // JSONs
    writeJSONFile('extra/json/discord_dupes.json', dupes)
    writeJSONFile('extra/json/discord_invalid.json', invalidSubmissions)
    writeJSONFile('extra/json/discord_ineligible.json', ineligibleUsers)
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
}

process.argv.slice(2).map((command) => commands[command]())
console.log(new Date())
