const { Octokit } = require('octokit')
const { getPublicId } = require('../util')

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
      allComments = [
        ...allComments,
        ...comments.map((comment) => {
          const validPublicId = getPublicId(comment.body)
          return {
            user: comment.user.login,
            userId: comment.user.id,
            [validPublicId ? 'publicId' : 'invalidSubmission']:
              validPublicId || comment.body,
            submissionUrl: comment.url,
          }
        }),
      ]
    }
    return allComments
  },
}
