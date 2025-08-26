# Contributing to the Chinese Wedding Survival Guide

Thank you for helping improve this guide for our guests!

## How to Update the Guides
- Edit or add Markdown files in the relevant folders (guide/, itinerary/, etc).
- Add images to the images/ folder (they will not be tracked by git, but you can share them directly).

## How to Regenerate PDFs
1. Make sure you have Python 3 and [Pandoc](https://pandoc.org/) installed (recommended for best results).
2. Install fallback dependencies if needed:
   ```
   pip install reportlab markdown2
   ```
3. Run the script:
   ```
   python scripts/md2pdf.py
   ```
4. PDFs will be generated next to each Markdown file.

## Adding Itinerary Days
- Each day from October 1st to 10th has its own file in the itinerary/ folder.
- Fill in the details for each day as needed.

## Need Help?
Open an issue or contact Joel.
