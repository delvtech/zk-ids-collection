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
  writeJSONFile: (path, data) => {
    if (!data || !data.length) {
      return null
    }
    fs.writeFileSync(path, JSON.stringify(data, null, 2), {
      encoding: 'utf8',
      flag: 'w',
    })
  },
  writeCSVFile: (path, data) => {
    if (!data || !data.length) {
      return null
    }
    const colNames = Object.keys(data[0])
    fs.writeFileSync(
      path,
      [
        colNames,
        ...data.map((row) =>
          colNames.map((colName) => `"${row[colName]}"`).join(',')
        ),
      ].join('\n'),
      {
        encoding: 'utf8',
        flag: 'w',
      }
    )
  },
}
