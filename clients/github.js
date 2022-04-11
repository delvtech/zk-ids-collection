const { Octokit } = require('octokit')
const { getPublicId } = require('../util')
const githubWL = require('../whitelist/github.json')

const client = new Octokit({ auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN })

const whitelist = Object.keys(githubWL)

const getIssueSubmissions = async (issueId) => {
  let allComments = []
  const commentsIterator = client.paginate.iterator(
    client.rest.issues.listComments,
    {
      issue_number: issueId,
      owner: 'element-fi',
      repo: 'elf-council-frontend',
      per_page: 100,
    }
  )
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
}

const getGistSubmissions = async (gistId) => {
  let allGists = []
  const gistsIterator = client.paginate.iterator(client.rest.gists.listForks, {
    gist_id: gistId,
    per_page: 100,
  })
  for await (const { data: gistPreviews } of gistsIterator) {
    allGists = [
      ...allGists,
      ...gistPreviews
        // each gist has to be fetched individually to get the raw content, so
        // we filter by eligible here to reduce the number of requests.
        .filter((gistPreview) => whitelist.includes(gistPreview.owner.login))
        .map(async (gistPreview) => {
          const { data: gist } = await client.rest.gists.get({
            gist_id: gistPreview.id,
          })
          const content = Object.values(gist.files)[0].content
          const validPublicId = getPublicId(content)
          return {
            user: gist.owner.login,
            userId: gist.owner.id,
            userUrl: gist.owner.html_url,
            [validPublicId ? 'publicId' : 'invalidSubmission']:
              validPublicId || content,
            submissionUrl: gist.html_url,
          }
        }),
    ]
  }
  return await Promise.all(allGists)
}

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
  getIdSubmissions: async ({ issueIds, gistIds }) => {
    let allSubmissions = []
    for (const issueId of issueIds) {
      allSubmissions = [
        ...allSubmissions,
        ...(await getIssueSubmissions(issueId)),
      ]
    }
    for (const gistId of gistIds) {
      allSubmissions = [
        ...allSubmissions,
        ...(await getGistSubmissions(gistId)),
      ]
    }
    return allSubmissions
  },
  getContributors,
  clearIneligibleSubmissions: async (submissions) => {
    submissions.forEach((sub) => {
      client.rest.issues.deleteComment({
        owner: 'element-fi',
        repo: 'elf-council-frontend',
        comment_id: sub.commentId,
      })
    })
  },
}
