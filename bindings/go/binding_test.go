package tree_sitter_cherri_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_cherri "github.com/tree-sitter/tree-sitter-cherri/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_cherri.Language())
	if language == nil {
		t.Errorf("Error loading Cherri grammar")
	}
}
