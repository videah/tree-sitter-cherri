import XCTest
import SwiftTreeSitter
import TreeSitterCherri

final class TreeSitterCherriTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_cherri())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Cherri grammar")
    }
}
