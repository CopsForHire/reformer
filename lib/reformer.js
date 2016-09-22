'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _kua = require('kua');

var _kua2 = _interopRequireDefault(_kua);

var _fs = require('fs');

var fs = _interopRequireWildcard(_fs);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

_kua2.default.initialize();

var commands = ['generate-tables', 'generate-triggers', 'generate-drop-triggers'];

var _usage = 'Usage: form <command> <schema-path> [options]\n\ncommands:\n  ' + commands.join('\n  ') + '\n\noptions:\n  --print  # Print the result to stdout\n';

var Reformer = function () {
  _createClass(Reformer, [{
    key: 'usage',
    value: function usage() {
      process.stdout.write(_usage);
      process.exit();
    }
  }]);

  function Reformer() {
    _classCallCheck(this, Reformer);

    if (!commands.includes(_kua2.default.dasherize(_kua2.default.task)) || !_kua2.default.args[1] || !fs.existsSync(_kua2.default.args[1])) {
      this.usage();
    }
    this.loadSchema();
    this[_kua2.default.task]();
  }

  _createClass(Reformer, [{
    key: 'coalesce',
    value: function coalesce(lines) {
      lines.push('');
      var result = lines.join('\n');
      if (_kua2.default.config.print) {
        process.stdout.write(result);
      }
      return result;
    }
  }, {
    key: 'loadSchema',
    value: function loadSchema() {
      var _this = this;

      this.schema = _kua2.default.loadYaml(_kua2.default.args[1]);
      this.schema.rules = {};
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = Object.keys(this.schema.tables)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var table = _step.value;

          this.schema.rules[table] = {};
          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {
            for (var _iterator2 = Object.keys(this.schema.tables[table])[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var key = _step2.value;

              if (key[0] === ':') {
                this.schema.rules[table][key.substr(1)] = this.schema.tables[table][key];
                delete this.schema.tables[table][key];
              }
            }
          } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion2 && _iterator2.return) {
                _iterator2.return();
              }
            } finally {
              if (_didIteratorError2) {
                throw _iteratorError2;
              }
            }
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      this.iterateTables(function (table, fields, rules) {
        if (!rules.preventStandardAdditions) {
          _this.schema.tables[table] = _kua2.default.extend({
            i: { type: 'bigint', primary: true },
            id: { type: 'uuid', unique: true },
            created: { type: 'timestamp' },
            updated: { type: 'timestamp' },
            extra: { type: 'json', nullable: true }
          }, fields);
        }
      });
    }
  }, {
    key: 'iterateTables',
    value: function iterateTables(fn) {
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = Object.keys(this.schema.tables)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var table = _step3.value;

          fn(table, this.schema.tables[table], this.schema.rules[table]);
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }
    }
  }, {
    key: 'iterateFields',
    value: function iterateFields(table, fn) {
      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = Object.keys(this.schema.tables[table])[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var field = _step4.value;

          fn(field, this.schema.tables[table][field]);
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }
    }
  }, {
    key: 'generateTables',
    value: function generateTables() {
      var _this2 = this;

      var lines = [];
      this.iterateTables(function (table, fields, rules) {
        var parts = [];
        lines.push('CREATE TABLE `' + table + '`');
        lines.push('(');
        var maxKeyLength = _kua2.default.fp.mapAccum(function (a, b) {
          return [_kua2.default.fp.max(a, b.length), a];
        }, 0, Object.keys(fields))[0];
        _this2.iterateFields(table, function (field, def) {
          if (def.ref) {
            def.type = 'uuid';
          }
          var c = { default: '', null: ' NOT NULL', primary: '', ref: '', unique: '' };
          if (def.type === 'timestamp') {
            def.default = 'NOW(6)';
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
            bigstring: 'VARCHAR(10000)'
          }[def.type];
          if (def.unsigned) {
            c.type += ' UNSIGNED';
          }
          if (def.default !== undefined) {
            if (def.type === 'boolean') {
              c.default = ' DEFAULT ' + (def.default && 1 || 0);
            } else if (['tinyint', 'number', 'timestamp'].includes(def.type)) {
              c.default = ' DEFAULT ' + def.default;
            } else {
              c.default = ' DEFAULT \'' + def.default + '\'';
            }
          }
          if (def.nullable) {
            c.null = '';
          }
          if (def.unique) {
            c.unique = ' UNIQUE';
          }
          if (def.primary) {
            c.primary = ' AUTO_INCREMENT PRIMARY KEY';
          }
          parts.push(['  `', field, '` ', ' '.repeat(maxKeyLength - field.length), c.type, c.primary, c.null, c.unique, c.default].join(''));
        });
        _this2.iterateFields(table, function (field, def) {
          if (def.index) {
            parts.push('  KEY (' + field + ')');
          }
        });

        var _kua$dasherize$split = _kua2.default.dasherize(table).split(/-/);

        var _kua$dasherize$split2 = _slicedToArray(_kua$dasherize$split, 2);

        var t1 = _kua$dasherize$split2[0];
        var t2 = _kua$dasherize$split2[1];

        if (t1 && t2) {
          parts.push('  KEY `' + t1 + '` (`' + t1 + '`)');
          parts.push('  KEY `' + t2 + '` (`' + t2 + '`)');
          parts.push('  UNIQUE KEY `' + table + '` (`' + t1 + '`, `' + t1 + '`)');
        }
        _this2.iterateFields(table, function (field, def) {
          if (def.ref) {
            parts.push('  FOREIGN KEY (`' + field + '`) REFERENCES `' + def.ref + '`(id)');
          }
        });
        lines.push(parts.join(',\n'));
        if (rules.engine) {
          lines.push(') ENGINE = ' + rules.engine + ';\n');
        } else {
          lines.push(');\n');
        }
        _this2.iterateFields(table, function (field, def) {
          if (def.type === 'geometry') {
            lines.push('ALTER TABLE `' + table + '` ADD SPATIAL INDEX(`' + field + '`);\n');
          }
        });
      });
      lines.push(_kua2.default.leftAlign('\n      CREATE TABLE `history` (\n        `i`       BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        `session` CHAR(36) BINARY NOT NULL,\n        `table`   VARCHAR(255) NOT NULL,\n        `id`      CHAR(36) BINARY NOT NULL,\n        `at`      TIMESTAMP(6) NOT NULL DEFAULT NOW(6),\n        `op`      CHAR(1) NOT NULL,\n        `column`  VARCHAR(255),\n        `value`   TEXT\n      );'));
      return this.coalesce(lines);
    }
  }, {
    key: 'generateTriggers',
    value: function generateTriggers() {
      var _this3 = this;

      var lines = [];
      lines.push('DELIMITER $$');
      this.iterateTables(function (table, fields, rules) {
        if (!rules.preventTriggers) {
          lines.push(_kua2.default.leftAlign('\n          CREATE TRIGGER before_insert_' + table + ' before insert on `' + table + '`\n          FOR EACH ROW BEGIN\n          IF NOT (\n            NEW.id REGEXP\n            \'[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}\'\n          ) THEN\n          SIGNAL SQLSTATE \'45000\' SET message_text = "You must provide a UUID for the \'id\' column";\n          END IF;\n          END $$\n        '));
          lines.push(_kua2.default.leftAlign('\n          CREATE TRIGGER after_insert_' + table + ' after insert on `' + table + '`\n          FOR EACH ROW BEGIN\n        '));
          _this3.iterateFields(table, function (field) {
            if (!['i', 'id', 'created', 'updated'].includes(field)) {
              lines.push(_kua2.default.leftAlign('\n              IF NEW.`' + field + '` IS NOT NULL THEN\n                INSERT `history`\n                  (`session`, `table`, `id`, `at`, `op`, `column`, `value`)\n                VALUES\n                  (@session, \'' + table + '\', NEW.id, NOW(6), \'c\', \'' + field + '\',\n                   CAST(NEW.`' + field + '` AS CHAR));\n              END IF;'));
            }
          });
          lines.push(_kua2.default.leftAlign('\n          END $$\n          CREATE TRIGGER before_update_' + table + ' before update on `' + table + '`\n          FOR EACH ROW BEGIN\n          SET NEW.updated = NOW(6);\n          END $$\n          CREATE TRIGGER after_update_' + table + ' after update on `' + table + '`\n          FOR EACH ROW BEGIN'));
          _this3.iterateFields(table, function (field) {
            if (!['i', 'id', 'created', 'updated'].includes(field)) {
              lines.push(_kua2.default.leftAlign('\n              IF NEW.`' + field + '` <> OLD.`' + field + '` THEN\n                INSERT `history`\n                  (`session`, `table`, `id`, `at`, `op`, `column`, `value`)\n                VALUES\n                  (@session, \'' + table + '\', NEW.id, NOW(6), \'u\', \'' + field + '\',\n                   CAST(NEW.`' + field + '` AS CHAR));\n              END IF;'));
            }
          });
          lines.push(_kua2.default.leftAlign('\n          END $$\n          CREATE TRIGGER before_delete_' + table + ' before delete on `' + table + '`\n          FOR EACH ROW BEGIN\n          INSERT history\n            (`session`, `table`, `id`, `at`, `op`)\n          VALUES\n            (@session, \'' + table + '\', OLD.id, NOW(6), \'d\');\n          END $$'));
        }
        lines.push('DELIMITER ;');
      });
      return this.coalesce(lines);
    }
  }, {
    key: 'generateDropTriggers',
    value: function generateDropTriggers() {
      var lines = [];
      this.iterateTables(function (table, fields, rules) {
        if (!rules.preventTriggers) {
          var _arr = ['before_insert', 'after_insert', 'before_update', 'after_update', 'after_delete'];

          for (var _i = 0; _i < _arr.length; _i++) {
            var it = _arr[_i];
            lines.push('DROP TRIGGER IF EXISTS ' + it + '_' + table + ';');
          }
        }
      });
      return this.coalesce(lines);
    }
  }]);

  return Reformer;
}();

exports.default = new Reformer();