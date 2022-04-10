require('dotenv').config()
const github = require('./clients/github')
const discord = require('./clients/discord')
const githubWL = require('./whitelist/github.json')
const githubRepoWL = require('./whitelist/github_repos.json')
const discordWL = require('./whitelist/discord.json')
const { writeJSONFile, dedupeByProperty, writeCSVFile } = require('./util')

// issues: 384, 724
const githubIssueId = 724;

const githubCommand = async () => {
  const whitelist = Object.keys(githubWL)
  const idSubmissions = await github.getIdSubmissions(githubIssueId)
  const [unique, dupes] = dedupeByProperty(idSubmissions, 'userId')
  const invalidSubmissions = []
  const ineligibleUsers = []
  const eligible = unique
    .filter((submission) => {
      if (submission.invalidSubmission) {
        invalidSubmissions.push(submission)
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
  writeCSVFile(`extra/csv/github_invalid_issue-${githubIssueId}.csv`, invalidSubmissions)
  writeCSVFile(`extra/csv/github_eligible_missing_issue-${githubIssueId}.csv`, missingEligible)
  writeCSVFile(`extra/csv/github_eligible_issue-${githubIssueId}.csv`, eligible)
  writeJSONFile(`extra/json/github_dupes_issue-${githubIssueId}.json`, dupes)
  writeJSONFile(`extra/json/github_invalid_issue-${githubIssueId}.json`, invalidSubmissions)
  writeJSONFile(
    `extra/json/ineligible/github_ineligible_issue-${githubIssueId}_${Date.now()}.json`,
    ineligibleUsers
  )
  writeJSONFile(`extra/json/github_eligible_missing_issue-${githubIssueId}.json`, missingEligible)
  writeJSONFile(`results/json/github_issue-${githubIssueId}.json`, unique)
  writeCSVFile(`results/csv/github_issue-${githubIssueId}.csv`, unique)
  github.clearIneligibleSubmissions(ineligibleUsers)
  console.log(
    `Collected ${idSubmissions.length} submissions from GitHub, filtered down to ${unique.length} unique users, and found ${eligible.length} eligible. Unique submissions in the results directory.`
  )
}

const commands = {
  autoGithub: async () => {
    setInterval(() => {
      githubCommand();
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
      user: discordWL.find((user) => user.userID === submission.userId)?.user || '',
      ...submission,
    }))
    const eligible = uniqueWithNames
      .filter((submission) => {
        if (submission.invalidSubmission) {
          invalidSubmissions.push(submission)
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
    writeCSVFile('extra/csv/discord_invalid.csv', invalidSubmissions)
    writeCSVFile('extra/csv/discord_ineligible.csv', ineligibleUsers)
    writeCSVFile('extra/csv/discord_eligible_missing.csv', missingEligible)
    writeCSVFile('extra/csv/discord_eligible.csv', eligible)
    writeJSONFile('extra/json/discord_dupes.json', dupes)
    writeJSONFile('extra/json/discord_invalid.json', invalidSubmissions)
    writeJSONFile('extra/json/discord_ineligible.json', ineligibleUsers)
    writeJSONFile('extra/json/discord_eligible_missing.json', missingEligible)
    writeJSONFile('results/json/discord.json', uniqueWithNames)
    writeCSVFile('results/csv/discord.csv', uniqueWithNames)
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
