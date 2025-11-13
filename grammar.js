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
  SUM: 2,
  PRODUCT: 3,
  CALL: 4,
};

module.exports = grammar({
  name: "cherri",

  extras: ($) => [/\s+/, $.comment],

  word: ($) => $.identifier,

  rules: {
    source_file: ($) => repeat($._statement),

    _statement: ($) => choice($.pragma, $.assignment, $._expression),

    // Pragmas: #include, #define, etc.
    pragma: ($) =>
      seq(
        choice("#include", "#define", "#import", "#question"),
        field("value", choice($.string, $.identifier)),
      ),

    // Variable assignment
    assignment: ($) =>
      seq(
        optional("const"),
        field("name", $.identifier),
        "=",
        field("value", $._expression),
      ),

    // Expressions
    _expression: ($) =>
      choice(
        $.binary_expression,
        $.call,
        $.parenthesized_expression,
        $.identifier,
        $.number,
        $.string,
        $.named_constant,
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
      ),

    // Function calls: name(arg1, arg2, ...)
    call: ($) =>
      prec.left(
        PREC.CALL,
        seq($.identifier, "(", optional(commaSep($._expression)), ")"),
      ),

    // Strings
    string: ($) =>
      choice(
        seq('"', repeat(choice(/[^"\\{}]+/, /\\./, /\{[^}]*\}/)), '"'),
        seq("'", repeat(/[^']+/), "'"),
      ),

    // Numbers
    number: ($) => /[0-9]+(\.[0-9]+)?/,

    // Identifiers
    identifier: ($) => /[A-Za-z_][A-Za-z0-9_]*/,

    // Named constants
    named_constant: ($) =>
      token(
        choice(
          "CurrentDate",
          "Device",
          "RepeatIndex",
          "RepeatItem",
          "ShortcutInput",
          "Ask",
        ),
      ),

    // Types
    type_name: ($) =>
      token(
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
      ),

    // Comments
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
