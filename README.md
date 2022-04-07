# ZK IDs Collection

This is a script to collect the ZK Public IDs posted on the [GitHub Airdrop issue](https://github.com/element-fi/elf-council-frontend/issues/384) and the [#public-ids Discord channel](https://discord.com/channels/754739461707006013/938531467716337714).

The results are saved in the [results](https://github.com/element-fi/zk-ids-collection/blob/main/results/) folder.

**Last run: 4/7/2022:**

```sh
Collected 1172 submissions from Discord, filtered down to 1002 unique users, and found 211 eligible. Results saved as results/discord.json.
Collected 1342 submissions from GitHub, filtered down to 1289 unique users, and found 428 eligible. Results saved as results/github.json.
```

## Running

### 1. Get Required Tokens

For GitHub, create a new [personal access token (PAT)](https://github.com/settings/tokens/new?scopes=repo).

For Discord, get the "DevOps Discord Bot Token" from LastPass.

### 2. Add the tokens to a `.env` file

Create a copy of the `.env.sample` file and rename it `.env`. Then, paste your new PAT and the bot token.

### 3. Install dependencies

```
npm i
```

### 4. Run

```sh
# Collect from both GitHub and Discord
npm start

# Collect from GitHub
npm run github

# Collect from Discord
npm run discord
```