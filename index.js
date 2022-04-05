require('dotenv').config()
const fs = require('fs')
const github = require('./clients/github')
const discord = require('./clients/discord')

const githubFileName = 'results/github.json'
const discordFileName = 'results/discord.json'

const commands = {
  github: async () => {
    const ids = await github.getIds()
    fs.writeFileSync(githubFileName, JSON.stringify(ids, null, 2), {
      encoding: 'utf8',
      flag: 'w',
    })
    console.log(`Saved ${ids.length} IDs from GitHub as ${githubFileName}.`)
  },
  discord: async () => {
    const ids = await discord.getIds()
    fs.writeFileSync(discordFileName, JSON.stringify(ids, null, 2), {
      encoding: 'utf8',
      flag: 'w',
    })
    console.log(`Saved ${ids.length} IDs from Discord as ${discordFileName}.`)
  },
}

process.argv.slice(2).map((command) => commands[command]())
