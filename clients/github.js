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
  getIdSubmissions: async () => {
    let allComments = []
    for await (const { data: comments } of commentsIterator) {
      const nextIds = comments.map((comment) => comment.user.id)
      allComments = [
        // override dupes
        ...allComments.filter((comment) => !nextIds.includes(comment.userId)),
        ...comments.map((comment) => ({
          user: comment.user.login,
          userId: comment.user.id,
          publicId: comment.body.match(/0x.{64}/)?.[0],
          submissionUrl: comment.url,
        })),
      ]
    }
    return allComments
  },
}
