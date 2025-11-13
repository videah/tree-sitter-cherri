/**
 * @file Cherri grammar for tree-sitter
 * @author videah <me@videah.net>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// grammar.js
const PREC = {
  ASSIGN: 1,
  OR: 2,
  AND: 3,
  EQUALITY: 4,
  RELATIONAL: 5,
  SUM: 6,
  PRODUCT: 7,
  CALL: 8,
  STATEMENT: 10,
  DICTIONARY: 11,
};

module.exports = grammar({
  name: "cherri",

  extras: ($) => [/\s+/, $.comment],

  word: ($) => $.identifier,

  rules: {
    source_file: ($) => repeat($._statement),

    _statement: ($) =>
      choice(
        $.pragma,
        $.variable_assignment, // @var = value
        $.constant_assignment, // const var = value
        $.identifier_assignment, // var = value
        $.declaration, // @var: type
        $.if_statement,
        $.for_statement,
        $.repeat_statement,
        $.menu_statement,
        $.item_statement,
        $.block,
        $._expression,
      ),

    pragma: ($) =>
      seq(
        $.pragma_directive,
        field(
          "value",
          choice(
            $.string,
            $.single_quoted_string,
            $.identifier,
            $.builtin_keyword,
            $.type_keyword,
          ),
        ),
      ),

    pragma_directive: ($) =>
      choice("#include", "#define", "#import", "#question"),

    // Type annotations: @variable: type
    declaration: ($) =>
      seq(
        field("name", $.at_variable),
        ":",
        field("type", choice($.type_keyword, $.identifier)),
      ),

    // @variable = value
    variable_assignment: ($) =>
      prec(
        PREC.ASSIGN,
        seq(field("name", $.at_variable), "=", field("value", $._expression)),
      ),

    // const identifier = value
    constant_assignment: ($) =>
      prec(
        PREC.ASSIGN,
        seq(
          "const",
          field("name", $.identifier),
          "=",
          field("value", $._expression),
        ),
      ),

    // identifier = value (regular assignment)
    identifier_assignment: ($) =>
      prec(
        PREC.ASSIGN,
        seq(field("name", $.identifier), "=", field("value", $._expression)),
      ),

    if_statement: ($) =>
      prec.right(
        PREC.STATEMENT,
        seq(
          "if",
          field("condition", $._expression),
          field("consequence", choice($.block, $._statement)),
          optional(
            seq("else", field("alternative", choice($.block, $._statement))),
          ),
        ),
      ),

    for_statement: ($) =>
      prec(
        PREC.STATEMENT,
        seq(
          "for",
          field("variable", $.identifier),
          "in",
          field("iterable", $._expression),
          field("body", choice($.block, $._statement)),
        ),
      ),

    repeat_statement: ($) =>
      prec(
        PREC.STATEMENT,
        choice(
          seq(
            "repeat",
            field("variable", $.identifier),
            "for",
            field("count", $._expression),
            field("body", choice($.block, $._statement)),
          ),
          seq(
            "repeat",
            field("count", $._expression),
            field("body", choice($.block, $._statement)),
          ),
          seq("repeat", field("body", choice($.block, $._statement))),
        ),
      ),

    menu_statement: ($) =>
      prec(
        PREC.STATEMENT,
        seq(
          "menu",
          optional(field("title", $._expression)),
          field("body", $.block),
        ),
      ),

    item_statement: ($) =>
      prec(
        PREC.STATEMENT,
        seq(
          "item",
          field("title", $._expression),
          ":",
          field("body", choice($.block, $._statement)),
        ),
      ),

    block: ($) => prec(1, seq("{", repeat($._statement), "}")),

    // Note: at_variable is now only allowed in expressions for references,
    // not as standalone statements
    _expression: ($) =>
      choice(
        $.binary_expression,
        $.call,
        $.parenthesized_expression,
        $.dictionary,
        $.identifier,
        $.at_variable, // Allow @var references in expressions
        $.number,
        $.string,
        $.single_quoted_string,
        $.boolean,
        $.builtin_constant,
        $.builtin_keyword,
        $.type_keyword,
      ),

    dictionary: ($) =>
      prec(
        PREC.DICTIONARY,
        seq("{", optional(commaSep($.dictionary_pair)), "}"),
      ),

    dictionary_pair: ($) =>
      seq(
        field("key", choice($.string, $.identifier)),
        ":",
        field("value", $._expression),
      ),

    boolean: ($) => choice("true", "false"),

    builtin_keyword: ($) =>
      choice(
        "name",
        "glyph",
        "from",
        "mac",
        "inputs",
        "noinput",
        "askfor",
        "getclipboard",
        "list",
        "nil",
        "action",
        "stop",
        "makeVCard",
        "rawAction",
        "embedFile",
        "nothing",
      ),

    builtin_constant: ($) =>
      choice(
        "CurrentDate",
        "Device",
        "RepeatIndex",
        "RepeatItem",
        "ShortcutInput",
        "Ask",
      ),

    type_keyword: ($) =>
      choice(
        "text",
        "number",
        "bool",
        "dictionary",
        "array",
        "variable",
        "color",
        "float",
      ),

    parenthesized_expression: ($) => seq("(", $._expression, ")"),

    binary_expression: ($) =>
      choice(
        prec.left(PREC.PRODUCT, seq($._expression, "*", $._expression)),
        prec.left(PREC.PRODUCT, seq($._expression, "/", $._expression)),
        prec.left(PREC.SUM, seq($._expression, "+", $._expression)),
        prec.left(PREC.SUM, seq($._expression, "-", $._expression)),
        prec.left(PREC.EQUALITY, seq($._expression, "==", $._expression)),
        prec.left(PREC.EQUALITY, seq($._expression, "!=", $._expression)),
        prec.left(PREC.RELATIONAL, seq($._expression, "<", $._expression)),
        prec.left(PREC.RELATIONAL, seq($._expression, ">", $._expression)),
        prec.left(PREC.RELATIONAL, seq($._expression, "<=", $._expression)),
        prec.left(PREC.RELATIONAL, seq($._expression, ">=", $._expression)),
      ),

    call: ($) =>
      prec.left(
        PREC.CALL,
        seq(
          field(
            "function",
            choice($.identifier, $.builtin_keyword, $.type_keyword),
          ),
          "(",
          optional(field("arguments", commaSep($._expression))),
          ")",
        ),
      ),

    at_variable: ($) => /@[^ \t\n\r:=]+/,

    string: ($) =>
      seq(
        '"',
        repeat(choice($.string_content, $.escape_sequence, $.interpolation)),
        '"',
      ),

    single_quoted_string: ($) =>
      seq(
        "'",
        repeat(choice(token.immediate(prec(1, /[^'\\]+/)), $.escape_sequence)),
        "'",
      ),

    string_content: ($) => token.immediate(prec(1, /[^"\\{]+/)),

    escape_sequence: ($) => token.immediate(seq("\\", /./)),

    interpolation: ($) => seq("{", repeat(/[^}]/), "}"),

    number: ($) => /[0-9]+(\.[0-9]+)?/,

    identifier: ($) => /[A-Za-z_][A-Za-z0-9_]*/,

    comment: ($) =>
      choice(
        seq("//", /.*/),
        seq("/*", repeat(choice(/[^*]/, /\*+[^*/]/)), "*/"),
      ),
  },
});

function commaSep(rule) {
  return seq(rule, repeat(seq(",", rule)));
}
