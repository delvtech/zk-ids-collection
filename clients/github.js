const { Octokit } = require('octokit')

const client = new Octokit({ auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN })

const commentsIterator = client.paginate.iterator(
  client.rest.issues.listComments,
  {
    issue_number: 384,
    owner: 'element-fi',
    repo: 'elf-council-frontend',
    per_page: 100,
  }
)

module.exports = {
  getIds: async () => {
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
    return allComments
  },
}
