/**
 * @file Cherri grammar for tree-sitter
 * @author videah <me@videah.net>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// grammar.js
// Safe Tree-sitter grammar for "Cherri" language
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
        $.assignment,
        $.declaration,
        $.if_statement,
        $.for_statement,
        $.repeat_statement,
        $.menu_statement,
        $.item_statement,
        $.block,
        $._expression,
      ),

    // Pragmas: #include, #define, #import, #question
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

    // Pragma directives as tokens
    pragma_directive: ($) =>
      choice("#include", "#define", "#import", "#question"),

    // Type annotations like @variable: type
    declaration: ($) =>
      seq(
        field("name", $.at_variable),
        ":",
        field("type", choice($.type_keyword, $.identifier)),
      ),

    // Variable assignment
    assignment: ($) =>
      prec(
        PREC.ASSIGN,
        seq(
          optional("const"),
          field("name", choice($.identifier, $.at_variable)),
          "=",
          field("value", $._expression),
        ),
      ),

    // Control structures
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

    _expression: ($) =>
      choice(
        $.binary_expression,
        $.call,
        $.parenthesized_expression,
        $.dictionary,
        $.identifier,
        $.at_variable,
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

    // Boolean literals
    boolean: ($) => choice("true", "false"),

    // Built-in keywords as a single rule
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

    // Built-in constants as a single rule
    builtin_constant: ($) =>
      choice(
        "CurrentDate",
        "Device",
        "RepeatIndex",
        "RepeatItem",
        "ShortcutInput",
        "Ask",
      ),

    // Type keywords as a single rule
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

    at_variable: ($) => /@[^ \t\n\r:]+/,

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
