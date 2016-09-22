import kua from 'kua'
import * as fs from 'fs'

kua.initialize()

const commands = [
  'generate-tables',
  'generate-triggers',
  'generate-drop-triggers',
]

const usage = `Usage: form <command> <schema-path> [options]

commands:
  ${commands.join('\n  ')}

options:
  --print  # Print the result to stdout
`

class Reformer {
  usage() {
    process.stdout.write(usage)
    process.exit()
  }

  constructor() {
    if (!commands.includes(kua.dasherize(kua.task)) ||
        !kua.args[1] ||
        !fs.existsSync(kua.args[1])) {
      this.usage()
    }
    this.loadSchema()
    this[kua.task]()
  }

  coalesce(lines) {
    lines.push('')
    const result = lines.join('\n')
    if (kua.config.print) {
      process.stdout.write(result)
    }
    return result
  }

  loadSchema() {
    this.schema = kua.loadYaml(kua.args[1])
    this.schema.rules = {}
    for (const table of Object.keys(this.schema.tables)) {
      this.schema.rules[table] = {}
      for (const key of Object.keys(this.schema.tables[table])) {
        if (key[0] === ':') {
          this.schema.rules[table][key.substr(1)] =
            this.schema.tables[table][key]
          delete this.schema.tables[table][key]
        }
      }
    }
    this.iterateTables((table, fields, rules) => {
      if (!rules.preventStandardAdditions) {
        this.schema.tables[table] = kua.extend({
          i: { type: 'bigint', primary: true },
          id: { type: 'uuid', unique: true },
          created: { type: 'timestamp' },
          updated: { type: 'timestamp' },
          extra: { type: 'json', nullable: true },
        }, fields)
      }
    })
  }

  iterateTables(fn) {
    for (const table of Object.keys(this.schema.tables)) {
      fn(table, this.schema.tables[table], this.schema.rules[table])
    }
  }

  iterateFields(table, fn) {
    for (const field of Object.keys(this.schema.tables[table])) {
      fn(field, this.schema.tables[table][field])
    }
  }

  generateTables() {
    const lines = []
    this.iterateTables((table, fields, rules) => {
      const parts = []
      lines.push(`DROP TABLE IF EXISTS \`${table}\`;\n`)
      lines.push(`CREATE TABLE \`${table}\``)
      lines.push('(')
      const maxKeyLength =
        kua.fp.mapAccum((a, b) => [kua.fp.max(a, b.length), a], 0, Object.keys(fields))[0]
      this.iterateFields(table, (field, def) => {
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
          string: `VARCHAR(${def.size || 255})`,
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
            c.default = ` DEFAULT '${def.default}'`
          }
        }
        if (def.nullable) {
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
          field,
          '` ',
          ' '.repeat(maxKeyLength - field.length),
          c.type,
          c.primary,
          c.null,
          c.unique,
          c.default,
        ].join(''))
      })
      this.iterateFields(table, (field, def) => {
        if (def.index) {
          parts.push(`  KEY (${field})`)
        }
      })
      const [t1, t2] = kua.dasherize(table).split(/-/)
      if (t1 && t2) {
        parts.push(`  KEY \`${t1}\` (\`${t1}\`)`)
        parts.push(`  KEY \`${t2}\` (\`${t2}\`)`)
        parts.push(`  UNIQUE KEY \`${table}\` (\`${t1}\`, \`${t1}\`)`)
      }
      this.iterateFields(table, (field, def) => {
        if (def.ref) {
          parts.push(`  FOREIGN KEY (\`${field}\`) REFERENCES \`${def.ref}\`(id)`)
        }
      })
      lines.push(parts.join(',\n'))
      if (rules.engine) {
        lines.push(`) ENGINE = ${rules.engine};\n`)
      } else {
        lines.push(');\n')
      }
      this.iterateFields(table, (field, def) => {
        if (def.type === 'geometry') {
          lines.push(`ALTER TABLE \`${table}\` ADD SPATIAL INDEX(\`${field}\`);\n`)
        }
      })
    })
    lines.push(kua.leftAlign(`
      CREATE TABLE \`history\` (
        \`i\`       BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`session\` CHAR(36) BINARY NOT NULL,
        \`table\`   VARCHAR(255) NOT NULL,
        \`id\`      CHAR(36) BINARY NOT NULL,
        \`at\`      TIMESTAMP(6) NOT NULL DEFAULT NOW(6),
        \`op\`      CHAR(1) NOT NULL,
        \`column\`  VARCHAR(255),
        \`value\`   TEXT
      );`))
    return this.coalesce(lines)
  }

  generateTriggers() {
    const lines = []
    lines.push('DELIMITER $$')
    this.iterateTables((table, fields, rules) => {
      if (!rules.preventTriggers) {
        lines.push(kua.leftAlign(`
          CREATE TRIGGER before_insert_${table} BEFORE INSERT on \`${table}\`
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
          CREATE TRIGGER after_insert_${table} AFTER INSERT on \`${table}\`
          FOR EACH ROW BEGIN
            IF @session IS NULL THEN SET @session = '00000000-0000-0000-0000-000000000000'; END IF;
        `))
        this.iterateFields(table, (field) => {
          if (!['i', 'id', 'created', 'updated'].includes(field)) {
            lines.push(kua.leftAlign(`
              IF NEW.\`${field}\` IS NOT NULL THEN
                INSERT \`history\`
                  (\`session\`, \`table\`, \`id\`, \`at\`, \`op\`, \`column\`, \`value\`)
                VALUES
                  (@session, '${table}', NEW.id, NOW(6), 'c', '${field}',
                   CAST(NEW.\`${field}\` AS CHAR));
              END IF;`))
          }
        })
        lines.push(kua.leftAlign(`
          END $$
          CREATE TRIGGER before_update_${table} BEFORE UPDATE on \`${table}\`
          FOR EACH ROW BEGIN
          SET NEW.updated = NOW(6);
          END $$
          CREATE TRIGGER after_update_${table} AFTER UPDATE on \`${table}\`
          FOR EACH ROW BEGIN
            IF @session IS NULL THEN SET @session = '00000000-0000-0000-0000-000000000000'; END IF;
        `))
        this.iterateFields(table, (field) => {
          if (!['i', 'id', 'created', 'updated'].includes(field)) {
            lines.push(kua.leftAlign(`
              IF NEW.\`${field}\` <> OLD.\`${field}\` THEN
                INSERT \`history\`
                  (\`session\`, \`table\`, \`id\`, \`at\`, \`op\`, \`column\`, \`value\`)
                VALUES
                  (@session, '${table}', NEW.id, NOW(6), 'u', '${field}',
                   CAST(NEW.\`${field}\` AS CHAR));
              END IF;`))
          }
        })
        lines.push(kua.leftAlign(`
          END $$
          CREATE TRIGGER before_delete_${table} BEFORE DELETE on \`${table}\`
          FOR EACH ROW BEGIN
          IF @session IS NULL THEN SET @session = '00000000-0000-0000-0000-000000000000'; END IF;
          INSERT history
            (\`session\`, \`table\`, \`id\`, \`at\`, \`op\`)
          VALUES
            (@session, '${table}', OLD.id, NOW(6), 'd');
          END $$`))
      }
    })
    lines.push('DELIMITER ;')
    return this.coalesce(lines)
  }

  generateDropTriggers() {
    const lines = []
    this.iterateTables((table, fields, rules) => {
      if (!rules.preventTriggers) {
        for (const it of [
          'before_insert',
          'after_insert',
          'before_update',
          'before_delete',
          'after_update',
          'after_delete',
        ]) {
          lines.push(`DROP TRIGGER IF EXISTS ${it}_${table};`)
        }
      }
    })
    return this.coalesce(lines)
  }
}

export default new Reformer()
