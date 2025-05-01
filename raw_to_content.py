import os
import re
import markdown
import html
from bs4 import BeautifulSoup # Requires: pip install beautifulsoup4

# --- Configuration ---
source_dir = 'text/'
dest_dir = 'content/'
# -------------------

def markdown_to_text_paragraphs(md_content):
    """Converts a markdown string to plain text, preserving paragraph breaks."""
    try:
        # Convert Markdown to HTML
        html_content = markdown.markdown(md_content)

        # Use BeautifulSoup to parse the HTML and extract text from paragraphs
        soup = BeautifulSoup(html_content, 'html.parser')
        paragraphs = soup.find_all('p')

        plain_text_lines = []
        for p in paragraphs:
            # Get the text content of each paragraph
            para_text = p.get_text()
            # Decode HTML entities within the paragraph text
            para_text = html.unescape(para_text)
            # Add the cleaned paragraph text to our list, followed by a newline
            plain_text_lines.append(para_text)

        # Join the paragraph texts with double newlines to represent paragraph breaks
        text_content = "\n\n".join(plain_text_lines)

        # Handle potential other tags or text outside <p> (e.g., headings)
        # This part is a bit more nuanced depending on what other markdown you use.
        # For simplicity, we'll get the text from the body and then replace the
        # concatenated paragraphs to ensure we don't lose content outside <p>.
        # A more robust approach might be needed for complex markdown structures.
        full_text_from_html = html.unescape(re.sub('<[^>]*>', '', html_content))

        # A simple way to retain content not in <p> tags while prioritizing <p> breaks:
        # This might need refinement based on your specific markdown usage.
        if not plain_text_lines: # If there were no paragraph tags
             text_content = full_text_from_html.strip()
        else:
             # This part is an oversimplification and might need adjustment.
             # A better approach would iterate through soup.contents and handle different tag types.
             # For this specific request focusing on <p> breaks, the above paragraph extraction is the primary logic.
             # We'll keep the double newline joining for paragraphs as requested.

             # Let's try a slightly better approach: Iterate through the children of the body/main element.
             body_children = soup.body.contents if soup.body else soup.contents
             processed_parts = []
             for child in body_children:
                 if child.name == 'p':
                     para_text = html.unescape(child.get_text())
                     processed_parts.append(para_text)
                 elif isinstance(child, str) and child.strip():
                     # Handle raw text between tags
                     processed_parts.append(html.unescape(child.strip()))
                 elif child.name and child.get_text().strip():
                     # Handle other tags with text content, treating them as separate blocks
                     processed_parts.append(html.unescape(child.get_text().strip()))

             # Join non-empty parts with double newlines
             text_content = "\n\n".join(filter(None, processed_parts))


        return text_content.strip()

    except Exception as e:
        print(f"Error during markdown conversion: {e}")
        return "" # Return empty string on conversion error

# --- Main Script ---
if __name__ == "__main__":
    # Create destination directory if it doesn't exist
    if not os.path.exists(dest_dir):
        try:
            os.makedirs(dest_dir)
            print(f"Created directory: {dest_dir}")
        except OSError as e:
            print(f"Error creating directory {dest_dir}: {e}")
            exit() # Exit if we can't create the output directory

    # Check if source directory exists
    if not os.path.isdir(source_dir):
        print(f"Error: Source directory '{source_dir}' not found or is not a directory.")
        exit()

    print(f"Starting conversion from '{source_dir}' to '{dest_dir}'...")
    file_count = 0
    error_count = 0

    # Iterate through files in the source directory
    for filename in sorted(os.listdir(source_dir)):
        if filename.lower().endswith('.md'):
            source_path = os.path.join(source_dir, filename)

            # Ensure it's a file
            if not os.path.isfile(source_path):
                continue

            # Define the output path
            base_name = os.path.splitext(filename)[0]
            dest_filename = f"{base_name}.txt"
            dest_path = os.path.join(dest_dir, dest_filename)

            try:
                # Read markdown file
                with open(source_path, 'r', encoding='utf-8') as infile:
                    md_content = infile.read()

                # Convert to plain text with paragraph breaks
                plain_text = markdown_to_text_paragraphs(md_content)

                # Write plain text file
                with open(dest_path, 'w', encoding='utf-8') as outfile:
                    outfile.write(plain_text)

                file_count += 1
                # print(f"Converted: {filename} -> {dest_filename}") # Uncomment for verbose output

            except Exception as e:
                print(f"Error processing file {filename}: {e}")
                error_count += 1

    print(f"\nConversion complete.")
    print(f"Successfully converted {file_count} files.")
    if error_count > 0:
        print(f"Failed to process {error_count} files.")
    print(f"Output files are in '{dest_dir}'.")