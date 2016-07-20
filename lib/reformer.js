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

var commands = ['generate-create-tables', 'generate-drop-triggers', 'generate-triggers'];

var _usage = 'Usage: form <command> [options]\n\ncommands:\n  ' + commands.join('\n  ') + '\n\noptions:\n  --schema <filepath> *required*\n';

var historyTable = 'CREATE TABLE `history` (\n  `i`       BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n  `session` CHAR(36) BINARY NOT NULL,\n  `table`   VARCHAR(255) NOT NULL,\n  `id`      CHAR(36) BINARY NOT NULL,\n  `at`      TIMESTAMP(6) NOT NULL DEFAULT NOW(6),\n  `op`      CHAR(1) NOT NULL,\n  `column`  VARCHAR(255),\n  `value`   TEXT\n);';

var Formation = function () {
  _createClass(Formation, [{
    key: 'usage',
    value: function usage() {
      process.stdout.write(_usage);
      process.exit();
    }
  }]);

  function Formation() {
    _classCallCheck(this, Formation);

    if (!commands.includes(_kua2.default.dasherize(_kua2.default.task)) || !_kua2.default.option.schema || !fs.existsSync(_kua2.default.option.schema)) {
      this.usage();
    }
    this.loadSchema();
    this[_kua2.default.task]();
  }

  _createClass(Formation, [{
    key: 'loadSchema',
    value: function loadSchema() {
      this.schema = _kua2.default.loadYaml(_kua2.default.option.schema);
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
                this.schema.rules[table][_kua2.default.camelize(key.substr(1))] = this.schema.tables[table][key];
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

          fn(_kua2.default.camelize(table), this.schema.tables[table], this.schema.rules[table]);
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
      lines.push('');
      var result = lines.join('\n');
      if (_kua2.default.option.print) {
        process.stdout.write(result);
      }
      return result;
    }
  }, {
    key: 'generateTriggers',
    value: function generateTriggers() {
      var lines = [];
      lines.push('DELIMITER $$');
      this.iterateTables(function (table, fields, rules) {
        if (!rules.preventTriggers) {
          lines.push(_kua2.default.leftAlign('\n          CREATE TRIGGER before_insert_#table before insert on `' + table + '`\n          FOR EACH ROW BEGIN\n          IF NOT (\n            NEW.id REGEXP\n            \'[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}\'\n          ) THEN\n          SIGNAL SQLSTATE \'45000\' SET message_text = "You must provide a UUID for the \'id\' column";\n          END IF;\n          END $$\n        '));
          lines.push(_kua2.default.leftAlign('\n          CREATE TRIGGER after_insert_#table after insert on `' + table + '`\n          FOR EACH ROW BEGIN\n        '));
          lines.push(_kua2.default.leftAlign('\n        '));
          lines.push(_kua2.default.leftAlign('\n        '));
          lines.push(_kua2.default.leftAlign('\n        '));
          lines.push(_kua2.default.leftAlign('\n        '));
        }
      });
      lines.push('');
      var result = lines.join('\n');
      if (_kua2.default.option.print) {
        process.stdout.write(result);
      }
      return result;
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

  }, {
    key: 'generateCreateTables',
    value: function generateCreateTables() {
      var lines = [];
      this.iterateTables(function (table, fields, rules) {
        var parts = [];
        var structure = {};
        if (!rules.preventStandardAdditions) {
          _kua2.default.extend(structure, {
            i: { type: 'bigint', primary: true },
            id: { type: 'uuid', unique: true },
            created: { type: 'timestamp' },
            updated: { type: 'timestamp' },
            extra: { type: 'json', null: true }
          });
        }
        _kua2.default.extend(structure, fields);
        lines.push('CREATE TABLE `' + table + '`');
        lines.push('(');
        var maxKeyLength = _kua2.default.fp.mapAccum(function (a, b) {
          return [_kua2.default.fp.max(a, b.length), a];
        }, 0, Object.keys(structure))[0];
        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          for (var _iterator4 = Object.keys(structure)[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var column = _step4.value;

            var def = structure[column];
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
                c.default = ' DEFAULT \'' + def.default + '\'\'';
              }
            }
            if (def.null) {
              c.null = '';
            }
            if (def.unique) {
              c.unique = ' UNIQUE';
            }
            if (def.primary) {
              c.primary = ' AUTO_INCREMENT PRIMARY KEY';
            }
            parts.push(['  `', column, '` ', ' '.repeat(maxKeyLength - column.length), c.type, c.primary, c.null, c.unique, c.default].join(''));
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

        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;
        var _iteratorError5 = undefined;

        try {
          for (var _iterator5 = Object.keys(structure)[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            var _column = _step5.value;

            var _def = structure[_column];
            if (_def.index) {
              parts.push('  KEY (' + _column + ')');
            }
          }
        } catch (err) {
          _didIteratorError5 = true;
          _iteratorError5 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion5 && _iterator5.return) {
              _iterator5.return();
            }
          } finally {
            if (_didIteratorError5) {
              throw _iteratorError5;
            }
          }
        }

        var _table$split = table.split(/-/);

        var _table$split2 = _slicedToArray(_table$split, 2);

        var t1 = _table$split2[0];
        var t2 = _table$split2[1];

        if (t1 && t2) {
          parts.push('  KEY `' + t1 + '` (`' + t1 + '`)');
          parts.push('  KEY `' + t2 + '` (`' + t2 + '`)');
          parts.push('  UNIQUE KEY `' + table + '` (`' + t1 + '`, `' + t1 + '`)');
        }
        var _iteratorNormalCompletion6 = true;
        var _didIteratorError6 = false;
        var _iteratorError6 = undefined;

        try {
          for (var _iterator6 = Object.keys(structure)[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
            var _column2 = _step6.value;

            var _def2 = structure[_column2];
            if (_def2.ref) {
              parts.push('  FOREIGN KEY (`' + _column2 + '`) REFERENCES `' + _def2.ref + '`(id)');
            }
          }
        } catch (err) {
          _didIteratorError6 = true;
          _iteratorError6 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion6 && _iterator6.return) {
              _iterator6.return();
            }
          } finally {
            if (_didIteratorError6) {
              throw _iteratorError6;
            }
          }
        }

        lines.push(parts.join(',\n'));
        if (rules.engine) {
          lines.push(') ENGINE = ' + rules.engine + ';\n');
        } else {
          lines.push(');\n');
        }
        var _iteratorNormalCompletion7 = true;
        var _didIteratorError7 = false;
        var _iteratorError7 = undefined;

        try {
          for (var _iterator7 = Object.keys(structure)[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
            var _column3 = _step7.value;

            var _def3 = structure[_column3];
            if (_def3.type === 'geometry') {
              lines.push('ALTER TABLE `' + table + '` ADD SPATIAL INDEX(`' + _column3 + '`);\n');
            }
          }
        } catch (err) {
          _didIteratorError7 = true;
          _iteratorError7 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion7 && _iterator7.return) {
              _iterator7.return();
            }
          } finally {
            if (_didIteratorError7) {
              throw _iteratorError7;
            }
          }
        }
      });
      lines.push(historyTable);
      lines.push('');
      var result = lines.join('\n');
      if (_kua2.default.option.print) {
        process.stdout.write(result);
      }
      return result;
    }
  }]);

  return Formation;
}();

exports.default = new Formation();