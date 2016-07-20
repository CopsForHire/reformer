import kua from 'kua'
import * as fs from 'fs'
import * as R from 'ramda'

const usage = `Usage: form <command> [options]

commands:
  generate-create-tables

options:
  --schema <filepath> *required*
`

const historyTable = `CREATE TABLE \`history\` (
  \`i\`       BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`session\` CHAR(36) BINARY NOT NULL,
  \`table\`   VARCHAR(255) NOT NULL,
  \`id\`      CHAR(36) BINARY NOT NULL,
  \`at\`      TIMESTAMP(6) NOT NULL DEFAULT NOW(6),
  \`op\`      CHAR(1) NOT NULL,
  \`column\`  VARCHAR(255),
  \`value\`   TEXT
);`

class Formation {
  constructor() {
    kua.initialize()
    if (!['generateCreateTables',
         ].includes(kua.task) ||
        !kua.option.schema ||
        !fs.existsSync(kua.option.schema)) {
      this.usage()
    }
    const schema = kua.loadYaml(kua.option.schema)
    this[kua.task](schema)
  }

  usage() {
    process.stdout.write(usage)
    process.exit()
  }

  generateCreateTables(schema) {
    const lines = []
    for (const table of Object.keys(schema.tables)) {
      const tableName = kua.camelize(table)
      const parts = []
      const rules = {}
      const fields = {}
      for (const key of Object.keys(schema.tables[table])) {
        if (key[0] === ':') {
          rules[kua.camelize(key.substr(1))] = schema.tables[table][key]
        } else {
          fields[kua.camelize(key)] = schema.tables[table][key]
        }
      }
      const structure = {}
      if (!rules.preventStandardAdditions) {
        kua.extend(structure, {
          i: { type: 'bigint', primary: true },
          id: { type: 'uuid', unique: true },
          created: { type: 'timestamp' },
          updated: { type: 'timestamp' },
          extra: { type: 'json', null: true },
        })
      }
      kua.extend(structure, fields)
      lines.push(`CREATE TABLE \`${tableName}\``)
      lines.push('(')
      const maxKeyLength =
        R.mapAccum((a, b) => [R.max(a, b.length), a], 0, Object.keys(structure))[0]
      for (const column of Object.keys(structure)) {
        const def = structure[column]
        if (def.ref) {
          def.type = 'uuid'
        }
        const c = { default: '', null: ' NOT NULL', primary: '', ref: '', unique: '' }
        if (def.type === 'timestamp') {
          def.default = 'NOW(6)'
        }
        c.type = {
          uuid: 'CHAR(36) BINARY',
          hash: 'CHAR(64)',
          string: 'VARCHAR(255)',
          boolean: 'TINYINT(1)',
          latitude: 'DECIMAL(8,6)',
          longitude: 'DECIMAL(9,6)',
          datetime: 'DATETIME(6)',
          date: 'DATE',
          time: 'TIME',
          timestamp: 'TIMESTAMP(6)',
          text: 'TEXT',
          json: 'JSON',
          phone: 'CHAR(10)',
          state: 'CHAR(2)',
          money: 'DECIMAL(18,4)',
          int: 'INT',
          tinyint: 'TINYINT',
          bigint: 'BIGINT',
          geometry: 'GEOMETRY',
          bigstring: 'VARCHAR(10000)',
        }[def.type]
        if (def.unsigned) {
          c.type += ' UNSIGNED'
        }
        if (def.default !== undefined) {
          if (def.type === 'boolean') {
            c.default = ` DEFAULT ${def.default && 1 || 0}`
          } else if (['tinyint', 'number', 'timestamp'].includes(def.type)) {
            c.default = ` DEFAULT ${def.default}`
          } else {
            c.default = ` DEFAULT '${def.default}''`
          }
        }
        if (def.null) {
          c.null = ''
        }
        if (def.unique) {
          c.unique = ' UNIQUE'
        }
        if (def.primary) {
          c.primary = ' AUTO_INCREMENT PRIMARY KEY'
        }
        parts.push([
          '  `',
          column,
          '` ',
          ' '.repeat(maxKeyLength - column.length),
          c.type,
          c.primary,
          c.null,
          c.unique,
          c.default,
        ].join(''))
      }
      for (const column of Object.keys(structure)) {
        const def = structure[column]
        if (def.index) {
          parts.push(`  KEY (${column})`)
        }
      }
      const [t1, t2] = table.split(/-/)
      if (t1 && t2) {
        parts.push(`  KEY \`${t1}\` (\`${t1}\`)`)
        parts.push(`  KEY \`${t2}\` (\`${t2}\`)`)
        parts.push(`  UNIQUE KEY \`${tableName}\` (\`${t1}\`, \`${t1}\`)`)
      }
      for (const column of Object.keys(structure)) {
        const def = structure[column]
        if (def.ref) {
          parts.push(`  FOREIGN KEY (\`${column}\`) REFERENCES \`${def.ref}\`(id)`)
        }
      }
      lines.push(parts.join(',\n'))
      if (rules.engine) {
        lines.push(`) ENGINE = ${rules.engine};\n`)
      } else {
        lines.push(');\n')
      }
      for (const column of Object.keys(structure)) {
        const def = structure[column]
        if (def.type === 'geometry') {
          lines.push(`ALTER TABLE \`${tableName}\` ADD SPATIAL INDEX(\`${column}\`);`)
        }
      }
    }
    lines.push(historyTable)
    lines.push('')
    const result = lines.join('\n')
    if (kua.option.print) {
      process.stdout.write(result)
    }
    return result
  }
}

export default new Formation()
