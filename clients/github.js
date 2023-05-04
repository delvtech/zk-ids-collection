const { Octokit } = require('octokit')
const { getPublicId } = require('../util')
const githubWL = require('../whitelist/github.json')

const client = new Octokit({ auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN })

const whitelist = Object.keys(githubWL)

const getIssueSubmissions = async (issueId) => {
  let submissions = []
  const commentsIterator = client.paginate.iterator(
    client.rest.issues.listComments,
    {
      issue_number: issueId,
      owner: 'delvtech',
      repo: 'elf-council-frontend',
      per_page: 100,
    }
  )
  for await (const { data: comments } of commentsIterator) {
    submissions = submissions.concat(
      comments.map((comment) => {
        const validPublicId = getPublicId(comment.body)
        return {
          user: comment.user.login,
          userId: comment.user.id,
          userUrl: comment.user.html_url,
          [validPublicId ? 'publicId' : 'invalidSubmission']:
            validPublicId || comment.body,
          submissionUrl: comment.html_url,
          submittedAt: comment.created_at,
        }
      })
    )
  }
  return submissions
}

const getGistSubmissions = async (gistId) => {
  let submissions = []
  const gistsIterator = client.paginate.iterator(client.rest.gists.listForks, {
    gist_id: gistId,
    per_page: 100,
  })
  for await (const { data: gistPreviews } of gistsIterator) {
    submissions = submissions.concat(
      gistPreviews
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
            submittedAt: gist.created_at,
          }
        })
    )
  }
  return await Promise.all(submissions)
}

const getStrayIssueSubmissions = async () => {
  let submissions = []
  const commentsIterator = client.paginate.iterator(
    client.rest.issues.listForRepo,
    {
      owner: 'delvtech',
      repo: 'elf-council-frontend',
      state: 'open',
      per_page: 100,
    }
  )
  for await (const { data: issues } of commentsIterator) {
    for (const issue of issues) {
      const publicIdInTitle = getPublicId(issue.title)
      const publicIdInBody = getPublicId(issue.body)
      if (publicIdInTitle || publicIdInBody) {
        submissions.push({
          user: issue.user.login,
          userId: issue.user.id,
          userUrl: issue.user.html_url,
          publicId: publicIdInTitle || publicIdInBody,
          submissionUrl: issue.html_url,
          submittedAt: issue.created_at,
        })
      }
    }
  }
  return submissions
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
  getStrayIssueSubmissions,
  getIdSubmissions: async ({ issueIds, gistIds }) => {
    let allSubmissions = []
    for (const issueId of issueIds) {
      allSubmissions = allSubmissions.concat(await getIssueSubmissions(issueId))
    }
    for (const gistId of gistIds) {
      allSubmissions = allSubmissions.concat(await getGistSubmissions(gistId))
    }

    return allSubmissions.concat(await getStrayIssueSubmissions())
  },
  getContributors,
  removeSubmissions: async (submissions) => {
    const deleted = []
    const notYetDeleted = submissions.filter((sub) => !sub.deleted)
    for (const sub of notYetDeleted) {
      const issueId = sub.submissionUrl.match(/\/issues\/([\d]+)$/)?.[1]
      const commentId = sub.submissionUrl.match(/#issuecomment-([\w\d]+)$/)?.[1]
      if (issueId) {
        try {
          await client.rest.issues.update({
            owner: 'delvtech',
            repo: 'elf-council-frontend',
            issue_number: issueId,
            state: 'closed',
          })
          deleted.push(sub)
        } catch {
          console.log(err)
          if (err.status === 403) {
            break
          }
        }
      } else if (commentId) {
        try {
          await client.rest.issues.deleteComment({
            owner: 'delvtech',
            repo: 'elf-council-frontend',
            comment_id: commentId,
          })
          deleted.push(sub)
        } catch (err) {
          if (err.status === 404) {
            deleted.push(sub)
          } else {
            console.log(err)
          }
          if (err.status === 403) {
            break
          }
        }
      }
    }
    return deleted.map((sub) => ({ ...sub, deleted: true }))
  },
}
