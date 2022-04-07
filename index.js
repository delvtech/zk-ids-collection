require('dotenv').config()
const github = require('./clients/github')
const discord = require('./clients/discord')
const eligibleGithubUsers = require('./eligible-users/github.json')
const eligibleDiscordUsers = require('./eligible-users/discord.json')
const { writeJSONFile, dedupeByProperty, writeCSVFile } = require('./util')

const githubResultsPath = 'results/github.json'
const discordResultsPath = 'results/discord.json'

const commands = {
  github: async () => {
    const eligibleUsers = Object.keys(eligibleGithubUsers)
    const idSubmissions = await github.getIdSubmissions()
    const [unique, dupes] = dedupeByProperty(idSubmissions, 'userId')
    const invalidSubmissions = []
    const ineligibleUsers = []
    const result = unique
      .filter((submission) => {
        if (submission.invalidSubmission) {
          invalidSubmissions.push(submission)
          return false
        }
        return true
      })
      .filter((submission) => {
        const isEligible = eligibleUsers.includes(submission.user)
        if (!isEligible) {
          ineligibleUsers.push(submission)
        }
        return isEligible
      })
    writeJSONFile('extra/github_invalid.json', invalidSubmissions)
    writeCSVFile('extra/github_invalid.csv', invalidSubmissions)
    writeJSONFile('extra/github_dupes.json', dupes)
    writeJSONFile('extra/github_ineligible.json', ineligibleUsers)
    writeCSVFile('extra/github_ineligible.csv', ineligibleUsers)
    writeJSONFile(githubResultsPath, result)
    writeCSVFile('extra/github_eligible.csv', result)
    console.log(
      `Collected ${idSubmissions.length} submissions from GitHub, filtered down to ${unique.length} unique users, and found ${result.length} eligible. Results saved as ${githubResultsPath}.`
    )
  },
  discord: async () => {
    const eligibleUsers = eligibleDiscordUsers.map((user) => user.userID)
    const idSubmissions = await discord.getIdSubmissions()
    const [unique, dupes] = dedupeByProperty(idSubmissions, 'userId')
    const invalidSubmissions = []
    const ineligibleUsers = []
    const result = unique
      .filter((submission) => {
        if (submission.invalidSubmission) {
          invalidSubmissions.push(submission)
          return false
        }
        return true
      })
      .filter((submission) => {
        const isEligible = eligibleUsers.includes(submission.userId)
        if (!isEligible) {
          ineligibleUsers.push(submission)
        }
        return isEligible
      })
      .map((submission) => ({
        user: eligibleDiscordUsers.find(
          (user) => user.userID === submission.userId
        ).user,
        ...submission,
      }))
    writeJSONFile('extra/discord_invalid.json', invalidSubmissions)
    writeCSVFile('extra/discord_invalid.csv', invalidSubmissions)
    writeJSONFile('extra/discord_dupes.json', dupes)
    writeJSONFile('extra/discord_ineligible.json', ineligibleUsers)
    writeCSVFile('extra/discord_ineligible.csv', ineligibleUsers)
    writeJSONFile(discordResultsPath, result)
    writeCSVFile('extra/discord_eligible.csv', result)
    console.log(
      `Collected ${idSubmissions.length} submissions from Discord, filtered down to ${unique.length} unique users, and found ${result.length} eligible. Results saved as ${discordResultsPath}.`
    )
  },
}

process.argv.slice(2).map((command) => commands[command]())
console.log(new Date())