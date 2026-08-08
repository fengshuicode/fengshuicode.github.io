"""Unit tests for old/raw_to_content.py, the markdown -> plain text converter."""

import importlib.util
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = REPO_ROOT / "old" / "raw_to_content.py"


def _load_module():
    spec = importlib.util.spec_from_file_location("raw_to_content", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def convert():
    return _load_module().markdown_to_text_paragraphs


def test_paragraphs_are_separated_by_blank_lines(convert):
    assert convert("第一段\n\n第二段") == "第一段\n\n第二段"


def test_single_newlines_stay_inside_one_paragraph(convert):
    assert convert("上句\n下句") == "上句\n下句"


def test_inline_markup_is_stripped(convert):
    assert convert("**贾宝玉**与*林黛玉*") == "贾宝玉与林黛玉"


def test_html_entities_are_unescaped(convert):
    assert convert("&ldquo;好&rdquo; &amp; &lt;妙&gt;") == "“好” & <妙>"


def test_headings_are_kept_as_their_own_block(convert):
    assert convert("# 第一回\n\n正文") == "第一回\n\n正文"


def test_list_items_are_flattened_into_one_block(convert):
    assert convert("- 甲\n- 乙") == "甲\n乙"


def test_blockquote_text_is_preserved(convert):
    assert convert("> 引文\n\n正文") == "引文\n\n正文"


def test_leading_and_trailing_whitespace_is_trimmed(convert):
    assert convert("\n\n  正文  \n\n") == "正文"


def test_empty_input_returns_empty_string(convert):
    assert convert("") == ""
    assert convert("   \n\n  ") == ""


def test_conversion_errors_are_reported_and_swallowed(capsys, convert):
    assert convert(None) == ""
    assert "Error during markdown conversion" in capsys.readouterr().out
