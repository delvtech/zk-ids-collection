const { Client, Intents } = require('discord.js')

// #public-ids channel
const channelId = '938531467716337714'

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
})

const parseMsg = (msg) => {
  const [userId, publicId] = msg.embeds.at(0).description.split('\n')
  return {
    userId: userId.replace(/[^\d]/g, ''),
    publicId,
    submissionUrl: `https://discord.com/channels/${msg.guildId}/${msg.channelId}/${msg.id}`,
  }
}

module.exports = {
  getIdSubmissions: () =>
    new Promise((resolve) => {
      client.on('ready', async () => {
        let allMessages = []
        const channel = client.channels.cache.get(channelId)
        let cursor = await channel.messages
          .fetch({ limit: 1 })
          .then((messages) => {
            allMessages = messages.map(parseMsg)
            return messages.at(0)?.id
          })
        while (cursor) {
          await channel.messages
            .fetch({ limit: 100, before: cursor })
            .then((messages) => {
              allMessages = [...allMessages, ...messages.map(parseMsg)]
              cursor = messages.at(messages.size - 1)?.id
            })
        }
        resolve(allMessages)
        client.destroy()
      })
      client.login(process.env.DISCORD_BOT_TOKEN)
    }),
}
