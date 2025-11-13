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
        field("directive", $.pragma_directive),
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

    // Create actual nodes for pragma directives
    pragma_directive: ($) =>
      choice(
        alias("#include", $.include_directive),
        alias("#define", $.define_directive),
        alias("#import", $.import_directive),
        alias("#question", $.question_directive),
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
          optional(field("const_modifier", alias("const", $.const_keyword))),
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
          field("if_keyword", alias("if", $.if_keyword)),
          field("condition", $._expression),
          field("consequence", choice($.block, $._statement)),
          optional(
            seq(
              field("else_keyword", alias("else", $.else_keyword)),
              field("alternative", choice($.block, $._statement)),
            ),
          ),
        ),
      ),

    for_statement: ($) =>
      prec(
        PREC.STATEMENT,
        seq(
          field("for_keyword", alias("for", $.for_keyword)),
          field("variable", $.identifier),
          field("in_keyword", alias("in", $.in_keyword)),
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
            field("repeat_keyword", alias("repeat", $.repeat_keyword)),
            field("variable", $.identifier),
            field("for_keyword", alias("for", $.for_keyword)),
            field("count", $._expression),
            field("body", choice($.block, $._statement)),
          ),
          // repeat count { ... }
          seq(
            field("repeat_keyword", alias("repeat", $.repeat_keyword)),
            field("count", $._expression),
            field("body", choice($.block, $._statement)),
          ),
          // repeat { ... }
          seq(
            field("repeat_keyword", alias("repeat", $.repeat_keyword)),
            field("body", choice($.block, $._statement)),
          ),
        ),
      ),

    menu_statement: ($) =>
      prec(
        PREC.STATEMENT,
        seq(
          field("menu_keyword", alias("menu", $.menu_keyword)),
          optional(field("title", $._expression)),
          field("body", $.block),
        ),
      ),

    item_statement: ($) =>
      prec(
        PREC.STATEMENT,
        seq(
          field("item_keyword", alias("item", $.item_keyword)),
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

    // Boolean literals - create actual nodes
    boolean: ($) =>
      choice(alias("true", $.true_literal), alias("false", $.false_literal)),

    // Keywords from TextMate - now create actual nodes
    keyword: ($) =>
      choice(
        alias("name", $.name_keyword),
        alias("glyph", $.glyph_keyword),
        alias("from", $.from_keyword),
        alias("mac", $.mac_keyword),
        alias("inputs", $.inputs_keyword),
        alias("noinput", $.noinput_keyword),
        alias("askfor", $.askfor_keyword),
        alias("getclipboard", $.getclipboard_keyword),
        alias("list", $.list_keyword),
        alias("nil", $.nil_keyword),
        alias("action", $.action_keyword),
        alias("stop", $.stop_keyword),
        alias("makeVCard", $.makevcard_keyword),
        alias("rawAction", $.rawaction_keyword),
        alias("embedFile", $.embedfile_keyword),
        alias("nothing", $.nothing_keyword),
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

    // Named constants - now create actual nodes
    named_constant: ($) =>
      choice(
        alias("CurrentDate", $.currentdate_constant),
        alias("Device", $.device_constant),
        alias("RepeatIndex", $.repeatindex_constant),
        alias("RepeatItem", $.repeatitem_constant),
        alias("ShortcutInput", $.shortcutinput_constant),
        alias("Ask", $.ask_constant),
      ),

    // Types - now create actual nodes
    type_name: ($) =>
      choice(
        alias("text", $.text_type),
        alias("number", $.number_type),
        alias("bool", $.bool_type),
        alias("dictionary", $.dictionary_type),
        alias("array", $.array_type),
        alias("variable", $.variable_type),
        alias("color", $.color_type),
        alias("float", $.float_type),
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
