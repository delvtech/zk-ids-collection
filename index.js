const fs = require('fs')
const { Octokit } = require('octokit')
require('dotenv').config()

const octokit = new Octokit({ auth: process.env.PERSONAL_ACCESS_TOKEN })

const commentsIterator = octokit.paginate.iterator(
  octokit.rest.issues.listComments,
  {
    issue_number: 384,
    owner: 'element-fi',
    repo: 'elf-council-frontend',
    per_page: 100,
  }
)

const collect = async () => {
  let allComments = []
  for await (const { data: comments } of commentsIterator) {
    allComments = [
      ...allComments,
      ...comments.map((comment) => ({
        user: comment.user.login,
        user_id: comment.user.id,
        public_id: comment.body,
        comment_url: comment.url,
      })),
    ]
  }
  await fs.promises.writeFile(
    'results.json',
    JSON.stringify(allComments, null, 2),
    {
      encoding: 'utf8',
      flag: 'w',
    }
  )
}

collect()
