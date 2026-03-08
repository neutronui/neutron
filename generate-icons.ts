import fs from 'node:fs';
import path from 'node:path';

const iconsSourceDir = path.join('./src', 'icons');
const iconsOutputFile = path.join('./src', 'icons.svg');
const stylesOutputFile = path.join('./src', 'icons.css');

// Read all SVG files from the source directory
const svgFiles = fs.readdirSync(iconsSourceDir).filter(file => file.endsWith('.svg'));
if (svgFiles.length === 0) {
  console.error('No SVG files found in', iconsSourceDir);
  process.exit(1);
}

type IconData = {
  id: string;
  viewBox: string;
  symbol: string;
  svg: string;
}

const icons: IconData[] = [];

for (const file of svgFiles) {
  const filePath = path.join(iconsSourceDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const id = path.basename(file, '.svg');
  const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';
  const innerContentMatch = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
  const innerContent = innerContentMatch ? innerContentMatch[1].trim() : content.trim();

  const innerContentWithCurrentColor = innerContent.replace(/fill="[^"]*"/g, '');

  // <symbol> for <use> in markup
  const symbol = `<symbol id="${id}" viewBox="${viewBox}" fill="currentColor">${innerContentWithCurrentColor}</symbol>`;
  // nested <svg> for mask-image (uses the symbol to avoid duplicating paths)
  const svg = `<svg id="${id}-icon" viewBox="${viewBox}" width="100%" height="100%"><use href="#${id}" fill="currentColor" /></svg>`;

  icons.push({ id, viewBox, symbol, svg });
}

// Generate icons.svg
// <symbol> elements are hidden by default and work with <use>
// nested <svg> elements use :target stacking for mask-image
const svgContent = [
  `<svg xmlns="http://www.w3.org/2000/svg">`,
  `<style>svg > svg { display: none; } svg > svg:target { display: block; }</style>`,
  icons.map(icon => icon.symbol).join('\n'),
  icons.map(icon => icon.svg).join('\n'),
  `</svg>`,
].join('\n');

// Generate icons.css (mask-image references the -icon suffixed SVG)
const cssContent = icons.map(icon => {
  const iconUrl = `url("/src/icons.svg#${icon.id}-icon")`;
  return `.icon-${icon.id} {\n  --_icon-url: ${iconUrl};\n}`;
}).join('\n\n');

fs.writeFileSync(stylesOutputFile, cssContent, 'utf-8');
fs.writeFileSync(iconsOutputFile, svgContent, 'utf-8');