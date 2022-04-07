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

const getContributors = async (repos) => {
  let contributors = {}
  let missingRepos = {}
  for (const dirtyPath of repos) {
    const path = dirtyPath.toLowerCase()
    const [owner, repo] = path.split('/')
    if (repo) {
      const result = await client.rest.repos.listContributors({ owner, repo })
      if (result.data) {
        contributors[path] = result.data.map((user) => user.login)
      } else {
        missingRepos[path] = { status: result.status }
      }
    } else {
      const result = await client.rest.repos.listForOrg({ org: owner })
      if (result.data) {
        const { contributors: orgContributors, missingRepos: orgMissingRepos } =
          await getContributors(result.data.map((repo) => repo.full_name))
        contributors = {
          ...contributors,
          ...orgContributors,
        }
        missingRepos = {
          ...missingRepos,
          ...orgMissingRepos,
        }
      } else {
        missingRepos[path] = { status: result.status }
      }
    }
  }
  return { contributors, missingRepos }
}

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
            userUrl: comment.user.html_url,
            [validPublicId ? 'publicId' : 'invalidSubmission']:
              validPublicId || comment.body,
            submissionUrl: comment.html_url,
          }
        }),
      ]
    }
    return allComments
  },
  getContributors,
}
