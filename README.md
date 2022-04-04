# ZK IDs Collection

This is a script to collect the ZK Public IDs posted on the [GitHub Airdrop Issue](https://github.com/element-fi/elf-council-frontend/issues/384). (*The script for collecting from Discord is in progress.*)

The results are saved in [results.json](https://github.com/element-fi/zk-ids-collection/blob/main/results.json).

## Running

### 1. Create a new [personal access token (PAT)](https://github.com/settings/tokens/new?scopes=repo)

### 2. Add the PAT to a `.env` file

Create a copy of the `.env.sample` file and rename it `.env`. Then, paste your new PAT.

### 3. Install dependencies

```
npm i
```

### 4. Run

```
npm start
```