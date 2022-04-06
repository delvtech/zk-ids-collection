const fs = require('fs')

module.exports = {
  dedupeByProperty: (objects, uniqueProperty) => {
    const dupes = {}
    const byUniqueProperty = {}
    objects.forEach((obj) => {
      const id = obj[uniqueProperty]
      const existing = byUniqueProperty[id]
      if (existing) {
        dupes[id] = [...(dupes[id] || [existing]), obj]
      }
      byUniqueProperty[id] = obj
    })
    return [Object.values(byUniqueProperty), dupes]
  },
  getPublicId: (s) => s.match(/0x.{64}/)?.[0],
  writeJSONFile: (path, data) =>
    fs.writeFileSync(path, JSON.stringify(data, null, 2), {
      encoding: 'utf8',
      flag: 'w',
    }),
}
