import kua from 'kua'
import * as fs from 'fs'

kua.initialize()

const commands = [
  'generate-create-tables',
  'generate-drop-triggers',
  'generate-triggers',
]

const usage = `Usage: form <command> [options]

commands:
  ${commands.join('\n  ')}

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
  usage() {
    process.stdout.write(usage)
    process.exit()
  }

  constructor() {
    if (!commands.includes(kua.dasherize(kua.task)) ||
        !kua.option.schema ||
        !fs.existsSync(kua.option.schema)) {
      this.usage()
    }
    this.loadSchema()
    this[kua.task]()
  }

  loadSchema() {
    this.schema = kua.loadYaml(kua.option.schema)
    this.schema.rules = {}
    for (const table of Object.keys(this.schema.tables)) {
      this.schema.rules[table] = {}
      for (const key of Object.keys(this.schema.tables[table])) {
        if (key[0] === ':') {
          this.schema.rules[table][kua.camelize(key.substr(1))] =
            this.schema.tables[table][key]
          delete this.schema.tables[table][key]
        }
      }
    }
  }

  iterateTables(fn) {
    for (const table of Object.keys(this.schema.tables)) {
      fn(kua.camelize(table), this.schema.tables[table], this.schema.rules[table])
    }
  }

  generateDropTriggers() {
    const lines = []
    this.iterateTables((table, fields, rules) => {
      if (!rules.preventTriggers) {
        for (const it of [
          'before_insert',
          'after_insert',
          'before_update',
          'after_update',
          'after_delete',
        ]) {
          lines.push(`DROP TRIGGER IF EXISTS ${it}_${table};`)
        }
      }
    })
    lines.push('')
    const result = lines.join('\n')
    if (kua.option.print) {
      process.stdout.write(result)
    }
    return result
  }

  generateTriggers() {
    const lines = []
    lines.push('DELIMITER $$')
    this.iterateTables((table, fields, rules) => {
      if (!rules.preventTriggers) {
        lines.push(kua.leftAlign(`
          CREATE TRIGGER before_insert_#table before insert on \`${table}\`
          FOR EACH ROW BEGIN
          IF NOT (
            NEW.id REGEXP
            '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}'
          ) THEN
          SIGNAL SQLSTATE '45000' SET message_text = "You must provide a UUID for the 'id' column";
          END IF;
          END $$
        `))
        lines.push(kua.leftAlign(`
          CREATE TRIGGER after_insert_#table after insert on \`${table}\`
          FOR EACH ROW BEGIN
        `))
        lines.push(kua.leftAlign(`
        `))
        lines.push(kua.leftAlign(`
        `))
        lines.push(kua.leftAlign(`
        `))
        lines.push(kua.leftAlign(`
        `))
      }
    })
    lines.push('')
    const result = lines.join('\n')
    if (kua.option.print) {
      process.stdout.write(result)
    }
    return result
  }

//     for column, def of structure
//       lines.push "INSERT history (`session`, `table`, `id`, `at`, `op`, `column`, `value`) VALUES (@session, '#table', NEW.id, NOW(6), 'c', '#column', CAST(NEW.`#column` AS CHAR));"
//     lines.push 'END $$'
//     lines.push """
//       CREATE TRIGGER before_update_#table before update on `#table`
//       FOR EACH ROW BEGIN
//       SET NEW.updated = NOW(6);
//       END $$
//     """
//     lines.push """
//       CREATE TRIGGER after_update_#table after update on `#table`
//       FOR EACH ROW BEGIN
//     """
//     for column, def of structure
//       lines.push """
//         IF NEW.`#column` <> OLD.`#column` THEN
//         INSERT history (`session`, `table`, `id`, `at`, `op`, `column`, `value`) VALUES (@session, '#table', NEW.id, NOW(6), 'u', '#column', CAST(NEW.`#column` AS CHAR));
//         END IF;
//       """
//     lines.push 'END $$'
//     lines.push """
//       CREATE TRIGGER after_delete_#table after delete on `#table`
//       FOR EACH ROW BEGIN
//       INSERT history (`session`, `table`, `id`, `at`, `op`) VALUES (@session, '#table', OLD.id, NOW(6), 'd');
//       END $$
//     """
//   lines.push 'DELIMITER ;'
//   info lines.join '\n'

  generateCreateTables() {
    const lines = []
    this.iterateTables((table, fields, rules) => {
      const parts = []
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
      lines.push(`CREATE TABLE \`${table}\``)
      lines.push('(')
      const maxKeyLength =
        kua.fp.mapAccum((a, b) => [kua.fp.max(a, b.length), a], 0, Object.keys(structure))[0]
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
        parts.push(`  UNIQUE KEY \`${table}\` (\`${t1}\`, \`${t1}\`)`)
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
          lines.push(`ALTER TABLE \`${table}\` ADD SPATIAL INDEX(\`${column}\`);\n`)
        }
      }
    })
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
