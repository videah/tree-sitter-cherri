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
        choice("#include", "#define", "#import", "#question"),
        field(
          "value",
          choice(
            $.string,
            $.single_quoted_string,
            $.identifier,
            $.keyword,
            $.type_name,
          ),
        ),
      ),

    // Type annotations like @variable: type
    declaration: ($) =>
      seq(
        field("name", $.at_variable),
        ":",
        field("type", choice($.type_name, $.identifier)),
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

    // Control structures - right associativity for if to resolve dangling else
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

    // More specific repeat statement variants
    repeat_statement: ($) =>
      prec(
        PREC.STATEMENT,
        choice(
          // repeat variable for count { ... }
          seq(
            "repeat",
            field("variable", $.identifier),
            "for",
            field("count", $._expression),
            field("body", choice($.block, $._statement)),
          ),
          // repeat count { ... }
          seq(
            "repeat",
            field("count", $._expression),
            field("body", choice($.block, $._statement)),
          ),
          // repeat { ... }
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

    // Block of statements - lower precedence than dictionary
    block: ($) => prec(1, seq("{", repeat($._statement), "}")),

    // Expressions
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
        $.named_constant,
        $.keyword,
        $.type_name,
      ),

    // Dictionary literals - higher precedence than block
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

    // Keywords from TextMate (removing control keywords that are now statements)
    keyword: ($) =>
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

    // Parenthesized expression for grouping
    parenthesized_expression: ($) => seq("(", $._expression, ")"),

    // Binary expressions with proper precedence
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

    // Function calls: name(arg1, arg2, ...)
    call: ($) =>
      prec.left(
        PREC.CALL,
        seq(
          field("function", choice($.identifier, $.keyword, $.type_name)),
          "(",
          optional(field("arguments", commaSep($._expression))),
          ")",
        ),
      ),

    // At-variables (@variable) - matches @[^ ]+ pattern from TextMate
    at_variable: ($) => /@[^ \t\n\r:]+/,

    // Double-quoted strings with interpolation support
    string: ($) =>
      seq(
        '"',
        repeat(choice($.string_content, $.escape_sequence, $.interpolation)),
        '"',
      ),

    // Single-quoted strings (simpler, no interpolation)
    single_quoted_string: ($) =>
      seq(
        "'",
        repeat(choice(token.immediate(prec(1, /[^'\\]+/)), $.escape_sequence)),
        "'",
      ),

    string_content: ($) => token.immediate(prec(1, /[^"\\{]+/)),

    escape_sequence: ($) => token.immediate(seq("\\", /./)),

    // String interpolation {content}
    interpolation: ($) => seq("{", repeat(/[^}]/), "}"),

    // Numbers - matches \b[0-9]+\b pattern from TextMate
    number: ($) => /[0-9]+(\.[0-9]+)?/,

    // Identifiers
    identifier: ($) => /[A-Za-z_][A-Za-z0-9_]*/,

    // Named constants - exact match from TextMate
    named_constant: ($) =>
      choice(
        "CurrentDate",
        "Device",
        "RepeatIndex",
        "RepeatItem",
        "ShortcutInput",
        "Ask",
      ),

    // Types - exact match from TextMate
    type_name: ($) =>
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

    // Comments - both line and block comments
    comment: ($) =>
      choice(
        seq("//", /.*/),
        seq("/*", repeat(choice(/[^*]/, /\*+[^*/]/)), "*/"),
      ),
  },
});

// Utility for comma-separated lists
function commaSep(rule) {
  return seq(rule, repeat(seq(",", rule)));
}
