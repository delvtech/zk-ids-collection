require('dotenv').config()
const fs = require('fs')
const github = require('./clients/github')
const discord = require('./clients/discord')
const eligibleGithubUsers = require('./eligibility/github.json')
const eligibleDiscordUsers = require('./eligibility/discord.json')

const githubFileName = 'results/github.json'
const discordFileName = 'results/discord.json'

const commands = {
  github: async () => {
    const eligibleUsers = Object.keys(eligibleGithubUsers)
    const idSubmissions = await github.getIdSubmissions()
    const result = idSubmissions.filter((submission) =>
      eligibleUsers.includes(submission.user)
    )
    fs.writeFileSync(githubFileName, JSON.stringify(result, null, 2), {
      encoding: 'utf8',
      flag: 'w',
    })
    console.log(
      `Collected ${idSubmissions.length} IDs from GitHub and found ${result.length} eligible. Results saved as ${githubFileName}.`
    )
  },
  discord: async () => {
    const eligibleUsers = eligibleDiscordUsers.map((user) =>
      user.userID.toString()
    )
    const idSubmissions = await discord.getIdSubmissions()
    const filtered = idSubmissions.filter((submission) =>
      eligibleUsers.includes(submission.userId)
    )
    const result = filtered.map((submission) => ({
      ...submission,
      user: eligibleDiscordUsers.find(
        (user) => user.userID.toString() === submission.userId
      ).user,
    }))
    fs.writeFileSync(discordFileName, JSON.stringify(result, null, 2), {
      encoding: 'utf8',
      flag: 'w',
    })
    console.log(
      `Collected ${idSubmissions.length} IDs from Discord and found ${result.length} eligible. Results saved as ${discordFileName}.`
    )
  },
}

process.argv.slice(2).map((command) => commands[command]())
